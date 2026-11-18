// ==============================================================================
// IRIS by WYLEN — SERVICIO: POOL DE LEADS (BOLSA CENTRALIZADA DE CAPTACIÓN)
// ==============================================================================

import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type {
  LeadPool,
  FiltrosPoolLeads,
  ResultadoPaginadoPoolLeads,
  MetricasPlataformaLead,
  PlataformaOrigenLead,
} from "@/tipos/leads";

export class ServicioPoolLeads {
  /**
   * Obtiene la lista paginada de leads con métricas reales por plataforma
   */
  async listarPoolLeadsPaginado(
    organizacionId: string,
    filtros: FiltrosPoolLeads = {}
  ): Promise<ResultadoPaginadoPoolLeads> {
    const supabase = crearClienteSupabaseAdministrador();

    const pagina = Math.max(1, filtros.pagina || 1);
    const porPagina = filtros.porPagina === 100 ? 100 : filtros.porPagina === 150 ? 150 : 50;
    const desde = (pagina - 1) * porPagina;
    const hasta = desde + porPagina - 1;

    // 1. Consulta de métricas por plataforma (conteos reales de la base de datos)
    const { data: todosLeadsMetricas } = await supabase
      .from("prospectos")
      .select("id, plataforma_origen, estado_comercial:estados_comerciales_lead(codigo, es_cierre)")
      .eq("organizacion_id", organizacionId);

    const metricasPlataformas: MetricasPlataformaLead[] = [
      {
        plataforma: "meta_ads",
        etiqueta: "Meta Lead Ads",
        icono: "Megaphone",
        color: "#0284c7",
        totalLeads: 0,
        leadsNuevos: 0,
        leadsEnSeguimiento: 0,
        leadsCerrados: 0,
      },
      {
        plataforma: "formulario_web",
        etiqueta: "Formularios Web",
        icono: "Globe",
        color: "#10b981",
        totalLeads: 0,
        leadsNuevos: 0,
        leadsEnSeguimiento: 0,
        leadsCerrados: 0,
      },
      {
        plataforma: "facebook",
        etiqueta: "Facebook Organico",
        icono: "Facebook",
        color: "#2563eb",
        totalLeads: 0,
        leadsNuevos: 0,
        leadsEnSeguimiento: 0,
        leadsCerrados: 0,
      },
      {
        plataforma: "instagram",
        etiqueta: "Instagram Direct",
        icono: "Instagram",
        color: "#e11d48",
        totalLeads: 0,
        leadsNuevos: 0,
        leadsEnSeguimiento: 0,
        leadsCerrados: 0,
      },
    ];

    if (todosLeadsMetricas) {
      todosLeadsMetricas.forEach((lead: any) => {
        const plat = (lead.plataforma_origen as PlataformaOrigenLead) || "formulario_web";
        const metrica = metricasPlataformas.find((m) => m.plataforma === plat);
        if (metrica) {
          metrica.totalLeads++;
          const codigoEstado = lead.estado_comercial?.codigo;
          if (codigoEstado === "no_contesto") metrica.leadsNuevos++;
          else if (lead.estado_comercial?.es_cierre) metrica.leadsCerrados++;
          else metrica.leadsEnSeguimiento++;
        }
      });
    }

    // 2. Construir consulta principal con filtros y paginación server-side
    let consulta = supabase
      .from("prospectos")
      .select(
        `
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
      `,
        { count: "exact" }
      )
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false });

    // Filtro por plataforma
    if (filtros.plataforma && filtros.plataforma !== "todas") {
      consulta = consulta.eq("plataforma_origen", filtros.plataforma);
    }

    // Filtro por categoría
    if (filtros.categoria && filtros.categoria !== "todas") {
      consulta = consulta.eq("categoria", filtros.categoria);
    }

    // Filtro por estado comercial
    if (filtros.estadoComercialId && filtros.estadoComercialId !== "todos") {
      consulta = consulta.eq("estado_comercial_id", filtros.estadoComercialId);
    }

    // Filtro por asesor asignado
    if (filtros.agenteId && filtros.agenteId !== "todos") {
      consulta = consulta.eq("agente_asignado_id", filtros.agenteId);
    }

    // Filtro por fecha desde / hasta
    if (filtros.fechaDesde) {
      consulta = consulta.gte("fecha_creacion", `${filtros.fechaDesde}T00:00:00Z`);
    }
    if (filtros.fechaHasta) {
      consulta = consulta.lte("fecha_creacion", `${filtros.fechaHasta}T23:59:59Z`);
    }

    // Buscador general
    if (filtros.busqueda) {
      const q = filtros.busqueda.trim();
      consulta = consulta.or(
        `nombre.ilike.%${q}%,correo_electronico.ilike.%${q}%,telefono.ilike.%${q}%,desarrollo_interes.ilike.%${q}%`
      );
    }

    // Paginación real desde el servidor
    consulta = consulta.range(desde, hasta);

    const { data: leads, count, error } = await consulta;

    if (error) {
      console.error("[PoolLeads] Error al listar leads:", error);
    }

    const totalRegistros = count || (leads?.length || 0);
    const totalPaginas = Math.ceil(totalRegistros / porPagina) || 1;

    return {
      leads: (leads as any) || [],
      totalRegistros,
      paginaActual: pagina,
      totalPaginas,
      cantidadPorPagina: porPagina,
      metricasPlataformas,
    };
  }

  /**
   * Obtiene categorías de prospectos registradas para filtros dinámicos
   */
  async obtenerCategoriasDisponibles(organizacionId: string): Promise<string[]> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data } = await supabase
      .from("prospectos")
      .select("categoria")
      .eq("organizacion_id", organizacionId)
      .not("categoria", "is", null);

    if (!data) return ["Campestre", "Inversión", "Residencial", "Comercial"];
    const cats = Array.from(new Set(data.map((d: any) => d.categoria).filter(Boolean)));
    return cats.length > 0 ? (cats as string[]) : ["Campestre", "Inversión", "Residencial", "Comercial"];
  }
}

export const servicioPoolLeads = new ServicioPoolLeads();
