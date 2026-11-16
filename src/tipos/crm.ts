// ==============================================================================
// IRIS by WYLEN — TIPOS DE CRM CORE Y GESTIÓN COMERCIAL
// ==============================================================================
// Lenguaje: Español | Convención: PascalCase / camelCase
// ==============================================================================

import type { Usuario } from "./identidad";

export type EstadoProspecto = "nuevo" | "contactado" | "calificado" | "descalificado" | "convertido";
export type EstadoContacto = "activo" | "inactivo" | "archivado";
export type EstadoOportunidad = "abierta" | "ganada" | "perdida" | "cancelada";
export type TipoActividad = "llamada" | "reunion" | "tarea" | "correo" | "visita" | "whatsapp";
export type PrioridadActividad = "baja" | "media" | "alta" | "urgente";
export type EstadoActividad = "pendiente" | "en_progreso" | "completada" | "cancelada";

export interface OrigenProspecto {
  id: string;
  organizacion_id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface MetadatosAdquisicion {
  campana?: string;
  conjunto_anuncios?: string;
  anuncio_id?: string;
  formulario_id?: string;
  plataforma?: "facebook" | "instagram" | "google" | "web" | "whatsapp";
  pagina_origen?: string;
  ip_registro?: string;
  [clave: string]: unknown;
}

export interface Prospecto {
  id: string;
  organizacion_id: string;
  origen_id: string;
  nombre: string;
  correo_electronico: string | null;
  telefono: string | null;
  empresa_nombre: string | null;
  desarrollo_interes: string | null;
  notas: string | null;
  estado: EstadoProspecto;
  puntuacion: number;
  agente_asignado_id: string | null;
  metadatos_adquisicion: MetadatosAdquisicion;
  contacto_convertido_id: string | null;
  oportunidad_convertida_id: string | null;
  fecha_asignacion: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  origen?: OrigenProspecto;
  agente_asignado?: Usuario | null;
}

export interface Empresa {
  id: string;
  organizacion_id: string;
  nombre: string;
  identificador_fiscal: string | null;
  sector: string | null;
  sitio_web: string | null;
  telefono: string | null;
  direccion: string | null;
  agente_responsable_id: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  agente_responsable?: Usuario | null;
  total_contactos?: number;
  total_oportunidades?: number;
}

export interface Contacto {
  id: string;
  organizacion_id: string;
  empresa_id: string | null;
  prospecto_origen_id: string | null;
  nombre: string;
  apellidos: string | null;
  correo_principal: string | null;
  telefono_principal: string | null;
  cargo: string | null;
  etiquetas: string[];
  notas: string | null;
  agente_responsable_id: string | null;
  estado: EstadoContacto;
  fecha_creacion: string;
  fecha_actualizacion: string;
  empresa?: Empresa | null;
  agente_responsable?: Usuario | null;
  canales?: CanalContacto[];
}

export interface CanalContacto {
  id: string;
  organizacion_id: string;
  contacto_id: string;
  tipo_canal: "telefono" | "correo" | "whatsapp" | "instagram" | "facebook";
  valor: string;
  es_principal: boolean;
  verificado: boolean;
  fecha_creacion: string;
}

export interface EmbudoVenta {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  es_predeterminado: boolean;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  etapas?: EtapaEmbudo[];
}

export interface EtapaEmbudo {
  id: string;
  organizacion_id: string;
  embudo_id: string;
  nombre: string;
  orden: number;
  probabilidad_cierre: number;
  color: string | null;
  es_etapa_ganada: boolean;
  es_etapa_perdida: boolean;
  fecha_creacion: string;
  total_oportunidades?: number;
  valor_acumulado?: number;
}

export interface Oportunidad {
  id: string;
  organizacion_id: string;
  embudo_id: string;
  etapa_id: string;
  contacto_id: string;
  empresa_id: string | null;
  agente_asignado_id: string;
  titulo: string;
  valor_estimado: number;
  moneda: string;
  probabilidad_cierre: number;
  fecha_cierre_esperada: string | null;
  desarrollo_propiedad: string | null;
  lote_unidad: string | null;
  estado: EstadoOportunidad;
  motivo_perdida: string | null;
  fecha_cierre: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  etapa?: EtapaEmbudo;
  contacto?: Contacto;
  empresa?: Empresa | null;
  agente_asignado?: Usuario;
}

export interface HistorialEtapasOportunidad {
  id: string;
  organizacion_id: string;
  oportunidad_id: string;
  etapa_anterior_id: string | null;
  etapa_nueva_id: string;
  usuario_cambio_id: string;
  tiempo_en_etapa_segundos: number | null;
  notas: string | null;
  fecha_cambio: string;
  etapa_anterior?: EtapaEmbudo | null;
  etapa_nueva?: EtapaEmbudo;
  usuario_cambio?: Usuario;
}

export interface AtribucionVenta {
  id: string;
  organizacion_id: string;
  oportunidad_id: string;
  agente_cierre_id: string;
  agente_receptor_inicial_id: string | null;
  monto_final: number;
  moneda: string;
  fecha_cierre: string;
  notas: string | null;
  fecha_creacion: string;
  agente_cierre?: Usuario;
  agente_receptor_inicial?: Usuario | null;
}

export interface Actividad {
  id: string;
  organizacion_id: string;
  usuario_responsable_id: string;
  prospecto_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
  tipo_actividad: TipoActividad;
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadActividad;
  estado: EstadoActividad;
  fecha_vencimiento: string;
  fecha_completada: string | null;
  resultado_notas: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  usuario_responsable?: Usuario;
  prospecto?: Prospecto | null;
  contacto?: Contacto | null;
  oportunidad?: Oportunidad | null;
}

export interface MetricasDashboardCRM {
  totalProspectos: number;
  prospectosNuevos: number;
  prospectosCalificados: number;
  oportunidadesActivas: number;
  valorTotalCartera: number;
  tasaConversion: number;
  ventasGanadasMes: number;
  montoGanadoMes: number;
  actividadesPendientes: number;
  slaPromedioMinutos: number;
}
