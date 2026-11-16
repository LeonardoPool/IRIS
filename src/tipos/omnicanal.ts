// ==============================================================================
// IRIS by WYLEN — TIPOS DE COMUNICACIONES OMNICANAL Y SLA
// ==============================================================================
// Lenguaje: Español | Convención: PascalCase / camelCase
// ==============================================================================

import type { Usuario } from "./identidad";
import type { Contacto, Prospecto } from "./crm";

export type CodigoCanal = "whatsapp_cloud" | "facebook_messenger" | "instagram_direct";
export type EstadoCuentaCanal = "conectado" | "error_autenticacion" | "desconectado";
export type EstadoConversacion = "no_asignada" | "asignada" | "pendiente" | "en_espera" | "cerrada";
export type PrioridadConversacion = "baja" | "media" | "alta" | "urgente";
export type DireccionMensaje = "entrante" | "saliente" | "interna";
export type RemitenteTipo = "cliente" | "agente" | "sistema" | "bot";
export type TipoContenidoMensaje =
  | "texto"
  | "imagen"
  | "documento"
  | "audio"
  | "video"
  | "ubicacion"
  | "nota_interna";
export type EstadoEntregaMensaje = "pendiente" | "enviado" | "entregado" | "leido" | "fallido";
export type EstadoSLA = "a_tiempo" | "en_alerta" | "violado" | "pausado" | "cumplido";

export interface CanalComunicacion {
  id: string;
  codigo: CodigoCanal;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CuentaCanal {
  id: string;
  organizacion_id: string;
  canal_id: string;
  nombre_identificador: string;
  proveedor_cuenta_id: string;
  identificador_waba: string | null;
  estado: EstadoCuentaCanal;
  fecha_conexion: string;
  canal?: CanalComunicacion;
}

export interface Conversacion {
  id: string;
  organizacion_id: string;
  cuenta_canal_id: string;
  contacto_id: string | null;
  prospecto_id: string | null;
  identificador_remoto_cliente: string;
  nombre_remoto_cliente: string | null;
  agente_receptor_inicial_id: string | null;
  agente_asignado_actual_id: string | null;
  estado: EstadoConversacion;
  prioridad: PrioridadConversacion;
  ultimo_mensaje_texto: string | null;
  fecha_ultimo_mensaje: string;
  no_leidos_agente: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  cuenta_canal?: CuentaCanal;
  contacto?: Contacto | null;
  prospecto?: Prospecto | null;
  agente_asignado_actual?: Usuario | null;
  agente_receptor_inicial?: Usuario | null;
  registro_sla?: RegistroSLA | null;
}

export interface Mensaje {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  proveedor_mensaje_id: string | null;
  direccion: DireccionMensaje;
  remitente_tipo: RemitenteTipo;
  remitente_usuario_id: string | null;
  tipo_contenido: TipoContenidoMensaje;
  contenido_texto: string | null;
  metadatos_adjunto: Record<string, unknown> | null;
  estado_entrega: EstadoEntregaMensaje;
  fecha_creacion: string;
  remitente_usuario?: Usuario | null;
}

export interface AsignacionConversacion {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  agente_anterior_id: string | null;
  agente_nuevo_id: string;
  actor_reasignacion_id: string;
  motivo: string;
  fecha_asignacion: string;
  agente_anterior?: Usuario | null;
  agente_nuevo?: Usuario;
  actor_reasignacion?: Usuario;
}

export interface ParticipanteConversacion {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  usuario_id: string;
  primer_aporte: string;
  ultimo_aporte: string;
  cantidad_mensajes: number;
  usuario?: Usuario;
}

export interface EventoConversacion {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  tipo_evento:
    | "creacion"
    | "primera_respuesta_humana"
    | "asignacion"
    | "reasignacion"
    | "nota_interna"
    | "cambio_prioridad"
    | "sla_alerta"
    | "sla_violado"
    | "cierre"
    | "reapertura";
  actor_usuario_id: string | null;
  detalles: Record<string, unknown>;
  fecha_evento: string;
  actor_usuario?: Usuario | null;
}

export interface RegistroSLA {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  tiempo_objetivo_segundos: number;
  tiempo_transcurrido_segundos: number;
  estado_sla: EstadoSLA;
  fecha_inicio: string;
  fecha_primera_respuesta: string | null;
  fecha_limite: string;
  es_primera_respuesta_completada: boolean;
  alerta_emitida: boolean;
  minutos_restantes?: number;
}

export interface CierreConversacion {
  id: string;
  organizacion_id: string;
  conversacion_id: string;
  agente_cierre_id: string;
  motivo_cierre: string;
  resultado_comercial: string | null;
  notas: string | null;
  fecha_cierre: string;
  agente_cierre?: Usuario;
}
