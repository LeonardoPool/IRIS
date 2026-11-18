// ==============================================================================
// IRIS by WYLEN — SERVICIO: SEGUIMIENTO COMERCIAL KANBAN Y ESTADOS DINÁMICOS
// ==============================================================================

import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type {
  EstadoComercialLead,
  LeadPool,
  HistorialEstadoLead,
} from "@/tipos/leads";

export class ServicioSeguimientoKanban {
  /**
   * Lista los estados comerciales configurados para la organización con conteo de leads
   */
  async listarEstadosComerciales(organizacionId: string): Promise<EstadoComercialLead[]> {
    const supabase = crearClienteSupabaseAdministrador();

    // 1. Obtener estados ordenados
    const { data: estados, error } = await supabase
      .from("estados_comerciales_lead")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error || !estados || estados.length === 0) {
      // Fallback predeterminado según requerimiento si aún no se ejecutan semillas
      return [
        {
          id: "est-1",
          organizacion_id: organizacionId,
          nombre: "No contestó",
          codigo: "no_contesto",
          descripcion: "Primer contacto sin respuesta",
          color: "#f59e0b",
          orden: 1,
          activo: true,
          es_predeterminado: true,
          es_cierre: false,
          total_leads: 0,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
        },
        {
          id: "est-2",
          organizacion_id: organizacionId,
          nombre: "Seguimiento",
          codigo: "seguimiento",
          descripcion: "En conversación activa y prospección",
          color: "#3b82f6",
          orden: 2,
          activo: true,
          es_predeterminado: false,
          es_cierre: false,
          total_leads: 0,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
        },
        {
          id: "est-3",
          organizacion_id: organizacionId,
          nombre: "Cierre",
          codigo: "cierre",
          descripcion: "Negociación formal, apartado o cierre comercial",
          color: "#10b981",
          orden: 3,
          activo: true,
          es_predeterminado: false,
          es_cierre: true,
          total_leads: 0,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
        },
      ];
    }

    // 2. Conteo de leads asociados por estado
    const { data: conteos } = await supabase
      .from("prospectos")
      .select("estado_comercial_id")
      .eq("organizacion_id", organizacionId);

    const mapaConteos: Record<string, number> = {};
    if (conteos) {
      conteos.forEach((c: any) => {
        if (c.estado_comercial_id) {
          mapaConteos[c.estado_comercial_id] = (mapaConteos[c.estado_comercial_id] || 0) + 1;
        }
      });
    }

    return estados.map((e: any) => ({
      ...e,
      total_leads: mapaConteos[e.id] || 0,
    }));
  }

  /**
   * Crea un nuevo estado comercial personalizado para la inmobiliaria
   */
  async crearEstadoComercial(
    organizacionId: string,
    datos: {
      nombre: string;
      color?: string;
      descripcion?: string;
      es_cierre?: boolean;
    }
  ): Promise<{ exito: boolean; estado?: EstadoComercialLead; error?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    // Generar código slug en minúsculas y sin acentos
    const codigo = datos.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 45);

    // Obtener siguiente número de orden
    const { data: maxOrdenData } = await supabase
      .from("estados_comerciales_lead")
      .select("orden")
      .eq("organizacion_id", organizacionId)
      .order("orden", { ascending: false })
      .limit(1);

    const siguienteOrden = (maxOrdenData?.[0]?.orden || 0) + 1;

    const { data, error } = await supabase
      .from("estados_comerciales_lead")
      .insert({
        organizacion_id: organizacionId,
        nombre: datos.nombre.trim(),
        codigo,
        descripcion: datos.descripcion || null,
        color: datos.color || "#6b7280",
        orden: siguienteOrden,
        activo: true,
        es_predeterminado: false,
        es_cierre: Boolean(datos.es_cierre),
      })
      .select("*")
      .single();

    if (error) {
      return { exito: false, error: `Error al crear estado: ${error.message}` };
    }

    return { exito: true, estado: data };
  }

  /**
   * Actualiza el nombre, color o configuración de un estado comercial
   */
  async actualizarEstadoComercial(
    id: string,
    organizacionId: string,
    datos: {
      nombre?: string;
      color?: string;
      descripcion?: string;
      activo?: boolean;
      es_cierre?: boolean;
    }
  ): Promise<{ exito: boolean; error?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    const actualizacion: Record<string, any> = {};
    if (datos.nombre) actualizacion.nombre = datos.nombre.trim();
    if (datos.color) actualizacion.color = datos.color;
    if (datos.descripcion !== undefined) actualizacion.descripcion = datos.descripcion;
    if (datos.activo !== undefined) actualizacion.activo = datos.activo;
    if (datos.es_cierre !== undefined) actualizacion.es_cierre = datos.es_cierre;

    const { error } = await supabase
      .from("estados_comerciales_lead")
      .update(actualizacion)
      .eq("id", id)
      .eq("organizacion_id", organizacionId);

    if (error) {
      return { exito: false, error: error.message };
    }

    return { exito: true };
  }

  /**
   * Reordena las columnas de estados comerciales
   */
  async reordenarEstadosComerciales(
    organizacionId: string,
    estadosOrdenados: { id: string; orden: number }[]
  ): Promise<{ exito: boolean; error?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    for (const item of estadosOrdenados) {
      await supabase
        .from("estados_comerciales_lead")
        .update({ orden: item.orden })
        .eq("id", item.id)
        .eq("organizacion_id", organizacionId);
    }

    return { exito: true };
  }

  /**
   * Elimina un estado con validación estricta de protección de prospectos
   */
  async eliminarEstadoComercial(
    id: string,
    organizacionId: string,
    migrarLeadsAEstadoId?: string
  ): Promise<{ exito: boolean; error?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    // 1. Verificar si existen leads con este estado
    const { count, error: errCount } = await supabase
      .from("prospectos")
      .select("id", { count: "exact", head: true })
      .eq("estado_comercial_id", id);

    const cantidadLeads = count || 0;

    if (cantidadLeads > 0) {
      if (!migrarLeadsAEstadoId) {
        return {
          exito: false,
          error: `No es posible eliminar el estado: existen ${cantidadLeads} prospectos asociados. Debes seleccionar un estado destino para migrar sus prospectos antes de eliminarlo.`,
        };
      }

      // Migrar prospectos al estado de destino especificado
      const { error: errMigracion } = await supabase
        .from("prospectos")
        .update({ estado_comercial_id: migrarLeadsAEstadoId })
        .eq("estado_comercial_id", id)
        .eq("organizacion_id", organizacionId);

      if (errMigracion) {
        return {
          exito: false,
          error: `Error al migrar prospectos hacia el nuevo estado: ${errMigracion.message}`,
        };
      }
    }

    // 2. Eliminar el estado de la base de datos
    const { error: errEliminar } = await supabase
      .from("estados_comerciales_lead")
      .delete()
      .eq("id", id)
      .eq("organizacion_id", organizacionId);

    if (errEliminar) {
      return { exito: false, error: errEliminar.message };
    }

    return { exito: true };
  }

  /**
   * Consulta los leads activos agrupados para el Tablero Kanban
   */
  async listarLeadsParaKanban(
    organizacionId: string,
    filtros: { agenteId?: string; busqueda?: string } = {}
  ): Promise<LeadPool[]> {
    const supabase = crearClienteSupabaseAdministrador();

    let consulta = supabase
      .from("prospectos")
      .select(`
        id,
        organizacion_id,
        nombre,
        correo_electronico,
        telefono,
        empresa_nombre,
        desarrollo_interes,
        notas,
        puntuacion,
        plataforma_origen,
        categoria,
        estado_comercial_id,
        estado_comercial:estados_comerciales_lead (
          id,
          nombre,
          codigo,
          color,
          orden,
          es_cierre
        ),
        agente_asignado_id,
        agente_asignado:usuarios (
          id,
          nombre_completo,
          correo_electronico,
          avatar_url,
          rol_jerarquico
        ),
        metadatos_adquisicion,
        fecha_asignacion,
        fecha_creacion,
        fecha_actualizacion
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_actualizacion", { ascending: false });

    if (filtros.agenteId && filtros.agenteId !== "todos") {
      consulta = consulta.eq("agente_asignado_id", filtros.agenteId);
    }

    if (filtros.busqueda) {
      const q = filtros.busqueda.trim();
      consulta = consulta.or(
        `nombre.ilike.%${q}%,correo_electronico.ilike.%${q}%,telefono.ilike.%${q}%`
      );
    }

    const { data, error } = await consulta;
    if (error) {
      console.error("[Kanban] Error al listar leads para Kanban:", error);
      return [];
    }

    return (data as any) || [];
  }

  /**
   * Mueve un lead a una nueva columna del Kanban y registra la bitácora
   */
  async moverLeadDeEstado(
    leadId: string,
    nuevoEstadoId: string,
    organizacionId: string,
    usuarioId: string,
    notas?: string
  ): Promise<{ exito: boolean; error?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    // 1. Obtener estado anterior
    const { data: leadActual } = await supabase
      .from("prospectos")
      .select("id, estado_comercial_id")
      .eq("id", leadId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (!leadActual) {
      return { exito: false, error: "Prospecto no encontrado en la organización." };
    }

    const estadoAnteriorId = leadActual.estado_comercial_id;

    // 2. Actualizar estado comercial en prospectos
    const { error: errUpdate } = await supabase
      .from("prospectos")
      .update({
        estado_comercial_id: nuevoEstadoId,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("organizacion_id", organizacionId);

    if (errUpdate) {
      return { exito: false, error: `Error al mover lead: ${errUpdate.message}` };
    }

    // 3. Registrar en historial inmutable de cambios de estado
    await supabase.from("historial_estados_lead").insert({
      organizacion_id: organizacionId,
      prospecto_id: leadId,
      estado_anterior_id: estadoAnteriorId,
      estado_nuevo_id: nuevoEstadoId,
      usuario_id: usuarioId,
      notas: notas || "Cambio de columna en Tablero de Seguimiento",
    });

    return { exito: true };
  }
}

export const servicioSeguimientoKanban = new ServicioSeguimientoKanban();
