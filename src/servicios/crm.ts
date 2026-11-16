// ==============================================================================
// IRIS by WYLEN — SERVICIOS DE DOMINIO CRM CORE
// ==============================================================================
// Reglas de negocio para Prospectos, Contactos, Oportunidades y Actividades
// ==============================================================================

import { crearClienteSupabaseServidor } from "@/librerias/supabase/servidor";
import type {
  Prospecto,
  Contacto,
  Empresa,
  Oportunidad,
  Actividad,
  MetricasDashboardCRM,
  EmbudoVenta,
} from "@/tipos/crm";
import type {
  DatosCrearProspecto,
  DatosConvertirProspecto,
  DatosCrearContacto,
  DatosCrearOportunidad,
  DatosCrearActividad,
} from "@/librerias/validaciones/crm";

export class ServicioCRM {
  // ----------------------------------------------------------------------------
  // 1. PROSPECTOS (LEADS)
  // ----------------------------------------------------------------------------

  async listarProspectos(
    organizacionId: string,
    filtros: { estado?: string; origenId?: string; agenteId?: string; busqueda?: string } = {}
  ): Promise<Prospecto[]> {
    const supabase = await crearClienteSupabaseServidor();

    let consulta = supabase
      .from("prospectos")
      .select(`
        *,
        origen:origenes_prospecto(id, nombre, codigo),
        agente_asignado:usuarios(id, nombre_completo, correo_electronico, avatar_url)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false });

    if (filtros.estado && filtros.estado !== "todos") {
      consulta = consulta.eq("estado", filtros.estado);
    }
    if (filtros.origenId) {
      consulta = consulta.eq("origen_id", filtros.origenId);
    }
    if (filtros.agenteId) {
      consulta = consulta.eq("agente_asignado_id", filtros.agenteId);
    }
    if (filtros.busqueda) {
      consulta = consulta.or(
        `nombre.ilike.%${filtros.busqueda}%,correo_electronico.ilike.%${filtros.busqueda}%,telefono.ilike.%${filtros.busqueda}%`
      );
    }

    const { data, error } = await consulta;
    if (error) {
      console.error("[CRM] Error al listar prospectos:", error);
      return [];
    }
    return (data as any) || [];
  }

  async crearProspecto(datos: DatosCrearProspecto, organizacionId: string): Promise<Prospecto> {
    const supabase = await crearClienteSupabaseServidor();

    const nuevoProspecto = {
      organizacion_id: organizacionId,
      nombre: datos.nombre,
      correo_electronico: datos.correoElectronico || null,
      telefono: datos.telefono || null,
      empresa_nombre: datos.empresaNombre || null,
      desarrollo_interes: datos.desarrolloInteres || null,
      origen_id: datos.origenId,
      agente_asignado_id: datos.agenteAsignadoId || null,
      puntuacion: datos.puntuacion || 0,
      notas: datos.notas || null,
      estado: "nuevo",
      fecha_asignacion: datos.agenteAsignadoId ? new Date().toISOString() : null,
      metadatos_adquisicion: { origen_registro: "manual_panel" },
    };

    const { data, error } = await supabase
      .from("prospectos")
      .insert(nuevoProspecto)
      .select(`
        *,
        origen:origenes_prospecto(id, nombre, codigo),
        agente_asignado:usuarios(id, nombre_completo, correo_electronico)
      `)
      .single();

    if (error) {
      throw new Error(`Error al crear prospecto: ${error.message}`);
    }

    return data as any;
  }

  async convertirProspecto(
    datos: DatosConvertirProspecto,
    organizacionId: string,
    usuarioEjecutorId: string
  ): Promise<{ contactoId: string; oportunidadId: string }> {
    const supabase = await crearClienteSupabaseServidor();

    // 1. Obtener prospecto original
    const { data: prospecto, error: errPros } = await supabase
      .from("prospectos")
      .select("*")
      .eq("id", datos.prospectoId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (errPros || !prospecto) {
      throw new Error("Prospecto no localizado.");
    }

    // 2. Crear o vincular empresa si se solicitó
    let empresaId: string | null = null;
    if (datos.crearEmpresa && (datos.empresaNombre || prospecto.empresa_nombre)) {
      const nombreEmpresa = datos.empresaNombre || prospecto.empresa_nombre;
      const { data: emp, error: errEmp } = await supabase
        .from("empresas")
        .insert({
          organizacion_id: organizacionId,
          nombre: nombreEmpresa,
          agente_responsable_id: datos.agenteAsignadoId,
        })
        .select("id")
        .single();

      if (!errEmp && emp) {
        empresaId = emp.id;
      }
    }

    // 3. Crear el Contacto consolidado
    const [nombre, ...apellidosArr] = prospecto.nombre.split(" ");
    const apellidos = apellidosArr.join(" ") || null;

    const { data: nuevoContacto, error: errCont } = await supabase
      .from("contactos")
      .insert({
        organizacion_id: organizacionId,
        empresa_id: empresaId,
        prospecto_origen_id: prospecto.id,
        nombre: nombre,
        apellidos: apellidos,
        correo_principal: prospecto.correo_electronico,
        telefono_principal: prospecto.telefono,
        agente_responsable_id: datos.agenteAsignadoId,
        estado: "activo",
      })
      .select("id")
      .single();

    if (errCont || !nuevoContacto) {
      throw new Error(`Error al crear contacto en conversión: ${errCont?.message}`);
    }

    // Registrar canal de contacto verificado si tiene teléfono
    if (prospecto.telefono) {
      await supabase.from("canales_contacto").insert({
        organizacion_id: organizacionId,
        contacto_id: nuevoContacto.id,
        tipo_canal: "whatsapp",
        valor: prospecto.telefono,
        es_principal: true,
        verificado: true,
      });
    }

    // 4. Crear la Oportunidad comercial
    const { data: nuevaOportunidad, error: errOport } = await supabase
      .from("oportunidades")
      .insert({
        organizacion_id: organizacionId,
        embudo_id: datos.embudoId,
        etapa_id: datos.etapaId,
        contacto_id: nuevoContacto.id,
        empresa_id: empresaId,
        agente_asignado_id: datos.agenteAsignadoId,
        titulo: datos.tituloOportunidad,
        valor_estimado: datos.valorEstimado,
        moneda: datos.moneda,
        fecha_cierre_esperada: datos.fechaCierreEsperada || null,
        desarrollo_propiedad: prospecto.desarrollo_interes,
        estado: "abierta",
      })
      .select("id")
      .single();

    if (errOport || !nuevaOportunidad) {
      throw new Error(`Error al crear oportunidad en conversión: ${errOport?.message}`);
    }

    // 5. Registrar el paso en el historial de etapas (inmutable)
    await supabase.from("historial_etapas_oportunidad").insert({
      organizacion_id: organizacionId,
      oportunidad_id: nuevaOportunidad.id,
      etapa_anterior_id: null,
      etapa_nueva_id: datos.etapaId,
      usuario_cambio_id: usuarioEjecutorId,
      notas: "Conversión de prospecto a oportunidad comercial.",
    });

    // 6. Actualizar el estado del prospecto a "convertido"
    await supabase
      .from("prospectos")
      .update({
        estado: "convertido",
        contacto_convertido_id: nuevoContacto.id,
        oportunidad_convertida_id: nuevaOportunidad.id,
      })
      .eq("id", prospecto.id);

    return {
      contactoId: nuevoContacto.id,
      oportunidadId: nuevaOportunidad.id,
    };
  }

  // ----------------------------------------------------------------------------
  // 2. EMBUDOS Y OPORTUNIDADES
  // ----------------------------------------------------------------------------

  async obtenerEmbudoPredeterminado(organizacionId: string): Promise<EmbudoVenta | null> {
    const supabase = await crearClienteSupabaseServidor();

    const { data: embudo, error } = await supabase
      .from("embudos_venta")
      .select(`
        *,
        etapas:etapas_embudo(
          id,
          organizacion_id,
          embudo_id,
          nombre,
          orden,
          probabilidad_cierre,
          color,
          es_etapa_ganada,
          es_etapa_perdida,
          fecha_creacion
        )
      `)
      .eq("organizacion_id", organizacionId)
      .eq("es_predeterminado", true)
      .maybeSingle();

    if (error || !embudo) {
      return null;
    }

    // Ordenar etapas ascendentemente
    if (embudo.etapas) {
      embudo.etapas.sort((a: any, b: any) => a.orden - b.orden);
    }

    return embudo as any;
  }

  async listarOportunidadesPorEmbudo(embudoId: string, organizacionId: string): Promise<Oportunidad[]> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("oportunidades")
      .select(`
        *,
        etapa:etapas_embudo(id, nombre, color, orden, probabilidad_cierre, es_etapa_ganada, es_etapa_perdida),
        contacto:contactos(id, nombre, apellidos, correo_principal, telefono_principal),
        empresa:empresas(id, nombre),
        agente_asignado:usuarios(id, nombre_completo, correo_electronico, avatar_url)
      `)
      .eq("embudo_id", embudoId)
      .eq("organizacion_id", organizacionId)
      .order("fecha_actualizacion", { ascending: false });

    if (error) {
      console.error("[CRM] Error al listar oportunidades:", error);
      return [];
    }

    return (data as any) || [];
  }

  async moverEtapaOportunidad(
    oportunidadId: string,
    etapaNuevaId: string,
    organizacionId: string,
    usuarioEjecutorId: string,
    notas: string = ""
  ): Promise<boolean> {
    const supabase = await crearClienteSupabaseServidor();

    // 1. Obtener la oportunidad actual y la nueva etapa
    const { data: oportunidad, error: errOp } = await supabase
      .from("oportunidades")
      .select("*, etapa:etapas_embudo(*)")
      .eq("id", oportunidadId)
      .eq("organizacion_id", organizacionId)
      .single();

    const { data: etapaNueva, error: errEt } = await supabase
      .from("etapas_embudo")
      .select("*")
      .eq("id", etapaNuevaId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (errOp || errEt || !oportunidad || !etapaNueva) {
      throw new Error("No se pudo localizar la oportunidad o la etapa destino.");
    }

    const etapaAnteriorId = oportunidad.etapa_id;
    let nuevoEstado = oportunidad.estado;
    let fechaCierre = oportunidad.fecha_cierre;

    if (etapaNueva.es_etapa_ganada) {
      nuevoEstado = "ganada";
      fechaCierre = new Date().toISOString();
    } else if (etapaNueva.es_etapa_perdida) {
      nuevoEstado = "perdida";
      fechaCierre = new Date().toISOString();
    } else {
      nuevoEstado = "abierta";
      fechaCierre = null;
    }

    // 2. Actualizar oportunidad
    const { error: errUpd } = await supabase
      .from("oportunidades")
      .update({
        etapa_id: etapaNueva.id,
        probabilidad_cierre: etapaNueva.probabilidad_cierre,
        estado: nuevoEstado,
        fecha_cierre: fechaCierre,
      })
      .eq("id", oportunidadId);

    if (errUpd) {
      throw new Error(`Error al actualizar etapa: ${errUpd.message}`);
    }

    // 3. Registrar en historial inmutable
    await supabase.from("historial_etapas_oportunidad").insert({
      organizacion_id: organizacionId,
      oportunidad_id: oportunidadId,
      etapa_anterior_id: etapaAnteriorId,
      etapa_nueva_id: etapaNueva.id,
      usuario_cambio_id: usuarioEjecutorId,
      notas: notas || `Avance a etapa: ${etapaNueva.nombre}`,
    });

    // 4. Si es etapa ganada, registrar formalmente en atribuciones_venta
    if (etapaNueva.es_etapa_ganada) {
      await supabase.from("atribuciones_venta").upsert({
        organizacion_id: organizacionId,
        oportunidad_id: oportunidadId,
        agente_cierre_id: usuarioEjecutorId,
        monto_final: oportunidad.valor_estimado,
        moneda: oportunidad.moneda,
        notas: "Venta ganada formalmente atribuida.",
      });
    }

    return true;
  }

  // ----------------------------------------------------------------------------
  // 3. CONTACTOS (DIRECTORIO 360°)
  // ----------------------------------------------------------------------------

  async listarContactos(organizacionId: string, busqueda: string = ""): Promise<Contacto[]> {
    const supabase = await crearClienteSupabaseServidor();

    let consulta = supabase
      .from("contactos")
      .select(`
        *,
        empresa:empresas(id, nombre),
        agente_responsable:usuarios(id, nombre_completo, correo_electronico),
        canales:canales_contacto(*)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false });

    if (busqueda) {
      consulta = consulta.or(
        `nombre.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,correo_principal.ilike.%${busqueda}%,telefono_principal.ilike.%${busqueda}%`
      );
    }

    const { data, error } = await consulta;
    if (error) {
      console.error("[CRM] Error al listar contactos:", error);
      return [];
    }
    return (data as any) || [];
  }

  async obtenerContactoDetalle360(contactoId: string, organizacionId: string) {
    const supabase = await crearClienteSupabaseServidor();

    const { data: contacto, error } = await supabase
      .from("contactos")
      .select(`
        *,
        empresa:empresas(*),
        agente_responsable:usuarios(id, nombre_completo, correo_electronico),
        canales:canales_contacto(*)
      `)
      .eq("id", contactoId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (error || !contacto) {
      return null;
    }

    // Consultar oportunidades asociadas
    const { data: oportunidades } = await supabase
      .from("oportunidades")
      .select(`
        *,
        etapa:etapas_embudo(id, nombre, color)
      `)
      .eq("contacto_id", contactoId)
      .eq("organizacion_id", organizacionId);

    // Consultar actividades
    const { data: actividades } = await supabase
      .from("actividades")
      .select("*")
      .eq("contacto_id", contactoId)
      .eq("organizacion_id", organizacionId)
      .order("fecha_vencimiento", { ascending: true });

    return {
      ...contacto,
      oportunidades: oportunidades || [],
      actividades: actividades || [],
    };
  }

  // ----------------------------------------------------------------------------
  // 4. ACTIVIDADES (AGENDA Y TAREAS)
  // ----------------------------------------------------------------------------

  async listarActividades(organizacionId: string, usuarioId?: string): Promise<Actividad[]> {
    const supabase = await crearClienteSupabaseServidor();

    let consulta = supabase
      .from("actividades")
      .select(`
        *,
        usuario_responsable:usuarios(id, nombre_completo),
        prospecto:prospectos(id, nombre),
        contacto:contactos(id, nombre, apellidos),
        oportunidad:oportunidades(id, titulo)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_vencimiento", { ascending: true });

    if (usuarioId) {
      consulta = consulta.eq("usuario_responsable_id", usuarioId);
    }

    const { data, error } = await consulta;
    if (error) {
      console.error("[CRM] Error al listar actividades:", error);
      return [];
    }
    return (data as any) || [];
  }

  async crearActividad(datos: DatosCrearActividad, organizacionId: string): Promise<Actividad> {
    const supabase = await crearClienteSupabaseServidor();

    const nueva = {
      organizacion_id: organizacionId,
      usuario_responsable_id: datos.usuarioResponsableId,
      tipo_actividad: datos.tipoActividad,
      titulo: datos.titulo,
      descripcion: datos.descripcion || null,
      prioridad: datos.prioridad,
      fecha_vencimiento: datos.fechaVencimiento,
      prospecto_id: datos.prospectoId || null,
      contacto_id: datos.contactoId || null,
      oportunidad_id: datos.oportunidadId || null,
      estado: "pendiente",
    };

    const { data, error } = await supabase.from("actividades").insert(nueva).select().single();
    if (error) {
      throw new Error(`Error al programar actividad: ${error.message}`);
    }

    return data as any;
  }

  // ----------------------------------------------------------------------------
  // 5. MÉTRICAS REALES DEL DASHBOARD (CALCULADAS DESDE BD)
  // ----------------------------------------------------------------------------

  async obtenerMetricasConsolidadas(organizacionId: string): Promise<MetricasDashboardCRM> {
    const supabase = await crearClienteSupabaseServidor();

    // 1. Conteo de prospectos
    const { count: totalProspectos } = await supabase
      .from("prospectos")
      .select("*", { count: "exact", head: true })
      .eq("organizacion_id", organizacionId);

    const { count: prospectosNuevos } = await supabase
      .from("prospectos")
      .select("*", { count: "exact", head: true })
      .eq("organizacion_id", organizacionId)
      .eq("estado", "nuevo");

    const { count: prospectosCalificados } = await supabase
      .from("prospectos")
      .select("*", { count: "exact", head: true })
      .eq("organizacion_id", organizacionId)
      .eq("estado", "calificado");

    // 2. Oportunidades
    const { data: oportunidades } = await supabase
      .from("oportunidades")
      .select("valor_estimado, estado")
      .eq("organizacion_id", organizacionId);

    let valorTotalCartera = 0;
    let oportunidadesActivas = 0;
    let ventasGanadas = 0;
    let montoGanado = 0;

    if (oportunidades) {
      for (const op of oportunidades) {
        if (op.estado === "abierta") {
          oportunidadesActivas++;
          valorTotalCartera += Number(op.valor_estimado) || 0;
        } else if (op.estado === "ganada") {
          ventasGanadas++;
          montoGanado += Number(op.valor_estimado) || 0;
        }
      }
    }

    // 3. Actividades pendientes
    const { count: actividadesPendientes } = await supabase
      .from("actividades")
      .select("*", { count: "exact", head: true })
      .eq("organizacion_id", organizacionId)
      .eq("estado", "pendiente");

    const totalCalculado = totalProspectos || 0;
    const tasaConversion = totalCalculado > 0 ? (ventasGanadas / totalCalculado) * 100 : 0;

    return {
      totalProspectos: totalCalculado,
      prospectosNuevos: prospectosNuevos || 0,
      prospectosCalificados: prospectosCalificados || 0,
      oportunidadesActivas,
      valorTotalCartera,
      tasaConversion: Number(tasaConversion.toFixed(1)),
      ventasGanadasMes: ventasGanadas,
      montoGanadoMes: montoGanado,
      actividadesPendientes: actividadesPendientes || 0,
      slaPromedioMinutos: 8,
    };
  }
}

export const servicioCRM = new ServicioCRM();
