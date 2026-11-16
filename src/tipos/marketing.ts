// ==============================================================================
// IRIS by WYLEN — TIPOS DE MARKETING Y PRODUCTIVIDAD (FASE 4)
// ==============================================================================
// Idioma Oficial: Español | Tipado estricto
// ==============================================================================

export type ProveedorMarketing = "meta_lead_ads" | "google_ads" | "formulario_externo";
export type EstadoIntegracionMarketing = "pendiente" | "activo" | "inactivo" | "error";
export type EstadoFormularioWeb = "activo" | "inactivo";
export type EstadoCapturaLead = "exitoso" | "duplicado" | "error" | "descartado_spam";
export type ProveedorCalendario = "google_calendar" | "outlook";
export type EstadoConexionCalendario = "activo" | "desconectado" | "error_token";

export interface IntegracionMarketing {
  id: string;
  organizacion_id: string;
  proveedor: ProveedorMarketing;
  nombre: string;
  identificador_cuenta: string | null;
  credenciales: Record<string, any>;
  configuracion: {
    mapeo_campos?: Record<string, string>;
    origen_predeterminado_id?: string | null;
    agente_predeterminado_id?: string | null;
    equipo_predeterminado_id?: string | null;
    notificar_al_asignado?: boolean;
  };
  estado: EstadoIntegracionMarketing;
  ultimo_error: string | null;
  ultima_sincronizacion: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface FormularioWeb {
  id: string;
  organizacion_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  clave_api_publica: string;
  origen_prospecto_id: string | null;
  agente_predeterminado_id: string | null;
  equipo_predeterminado_id: string | null;
  etapa_predeterminada_id: string | null;
  campos_habilitados: string[];
  permitir_dominios: string[];
  mensaje_exito: string;
  url_redireccion: string | null;
  estado: EstadoFormularioWeb;
  contador_envios: number;
  ultimo_envio: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  // Relaciones
  origen?: {
    id: string;
    nombre: string;
  };
  agente_predeterminado?: {
    id: string;
    nombre_completo: string;
  };
}

export interface RegistroCapturaLead {
  id: string;
  organizacion_id: string;
  formulario_web_id: string | null;
  integracion_marketing_id: string | null;
  proveedor: string;
  prospecto_id: string | null;
  datos_crudos: Record<string, any>;
  metadatos_campana: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    ad_id?: string | null;
    adset_id?: string | null;
    campaign_id?: string | null;
    form_id?: string | null;
  };
  ip_origen: string | null;
  agente_usuario: string | null;
  estado_procesamiento: EstadoCapturaLead;
  mensaje_error: string | null;
  fecha_creacion: string;
  // Relación
  prospecto?: {
    id: string;
    nombre: string;
    correo_electronico: string | null;
    telefono: string | null;
  };
}

export interface ConexionCalendario {
  id: string;
  organizacion_id: string;
  usuario_id: string;
  proveedor: ProveedorCalendario;
  email_calendario: string;
  id_calendario_principal: string;
  access_token: string;
  refresh_token: string | null;
  expira_en: string;
  alcances: string[];
  estado: EstadoConexionCalendario;
  sincronizacion_automatica: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface SolicitudReunionCalendario {
  prospectoId: string;
  titulo: string;
  descripcion?: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  zonaHoraria?: string;
  asistentes?: string[]; // Correos electrónicos
  generarGoogleMeet?: boolean;
}

export interface ResultadoCreacionReunion {
  exito: boolean;
  eventoId?: string;
  urlReunionMeet?: string;
  urlEventoGoogle?: string;
  error?: string;
}
