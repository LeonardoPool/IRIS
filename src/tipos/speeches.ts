// ==============================================================================
// IRIS by WYLEN — TIPOS DE SPEECHES COMERCIALES MULTIMEDIA
// ==============================================================================

export type TipoElementoSpeech = "texto" | "imagen" | "imagen_con_texto";

export interface ElementoSpeech {
  id: string;
  speech_id: string;
  orden: number;
  tipo: TipoElementoSpeech;
  contenido_texto?: string | null;
  url_imagen?: string | null;
  nombre_archivo?: string | null;
  fecha_creacion?: string;
}

export interface SpeechComercial {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion?: string | null;
  desarrollo_inmueble: string;
  activo: boolean;
  contador_envios: number;
  creado_por_id?: string | null;
  elementos?: ElementoSpeech[];
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export type EstadoEjecucionSpeech = "en_progreso" | "completado" | "fallido" | "pausado";

export interface EjecucionSpeech {
  id: string;
  speech_id: string;
  conversacion_id: string;
  prospecto_id?: string | null;
  usuario_id: string;
  organizacion_id: string;
  total_elementos: number;
  elementos_enviados: number;
  estado: EstadoEjecucionSpeech;
  ultimo_error?: string | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  speech?: {
    nombre: string;
    desarrollo_inmueble: string;
  };
}

export interface DatosCrearSpeech {
  nombre: string;
  descripcion?: string;
  desarrollo_inmueble: string;
  activo?: boolean;
  elementos: Array<{
    tipo: TipoElementoSpeech;
    contenido_texto?: string;
    url_imagen?: string;
    nombre_archivo?: string;
  }>;
}

export interface DatosActualizarSpeech {
  nombre?: string;
  descripcion?: string;
  desarrollo_inmueble?: string;
  activo?: boolean;
  elementos?: Array<{
    id?: string;
    tipo: TipoElementoSpeech;
    contenido_texto?: string;
    url_imagen?: string;
    nombre_archivo?: string;
  }>;
}

export interface ResultadoPasoSpeech {
  paso: number;
  total: number;
  elementoId: string;
  tipo: TipoElementoSpeech;
  idMensajeProveedor?: string;
  mensajeLocalId?: string;
  textoEnviado?: string;
  urlImagenEnviada?: string;
  exito: boolean;
  error?: string;
}
