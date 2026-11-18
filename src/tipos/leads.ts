// ==============================================================================
// IRIS by WYLEN — TIPOS: POOL DE LEADS Y SEGUIMIENTO COMERCIAL
// ==============================================================================

export type PlataformaOrigenLead =
  | "meta_ads"
  | "formulario_web"
  | "facebook"
  | "instagram"
  | "google_ads"
  | "manual"
  | "whatsapp";

export interface EstadoComercialLead {
  id: string;
  organizacion_id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  color: string;
  orden: number;
  activo: boolean;
  es_predeterminado: boolean;
  es_cierre: boolean;
  total_leads?: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface LeadPool {
  id: string;
  organizacion_id: string;
  nombre: string;
  correo_electronico: string | null;
  telefono: string | null;
  empresa_nombre: string | null;
  desarrollo_interes: string | null;
  notas: string | null;
  puntuacion: number;
  plataforma_origen: PlataformaOrigenLead;
  categoria: string | null;
  estado_comercial_id: string | null;
  estado_comercial?: EstadoComercialLead | null;
  agente_asignado_id: string | null;
  agente_asignado?: {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    avatar_url: string | null;
    rol_jerarquico?: string;
  } | null;
  metadatos_adquisicion: Record<string, any>;
  fecha_asignacion: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface MetricasPlataformaLead {
  plataforma: PlataformaOrigenLead;
  etiqueta: string;
  icono: string;
  color: string;
  totalLeads: number;
  leadsNuevos: number;
  leadsEnSeguimiento: number;
  leadsCerrados: number;
}

export interface FiltrosPoolLeads {
  plataforma?: PlataformaOrigenLead | "todas";
  categoria?: string | "todas";
  estadoComercialId?: string | "todos";
  agenteId?: string | "todos";
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: 50 | 100 | 150;
}

export interface ResultadoPaginadoPoolLeads {
  leads: LeadPool[];
  totalRegistros: number;
  paginaActual: number;
  totalPaginas: number;
  cantidadPorPagina: 50 | 100 | 150;
  metricasPlataformas: MetricasPlataformaLead[];
}

export interface HistorialEstadoLead {
  id: string;
  prospecto_id: string;
  estado_anterior_id: string | null;
  estado_anterior_nombre?: string;
  estado_nuevo_id: string;
  estado_nuevo_nombre?: string;
  usuario_id: string;
  usuario_nombre?: string;
  notas: string | null;
  fecha_cambio: string;
}

export interface DatosActualizarEstadoKanban {
  leadId: string;
  nuevoEstadoId: string;
  notas?: string;
}
