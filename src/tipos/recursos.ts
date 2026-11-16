// ==============================================================================
// IRIS by WYLEN — TIPOS DEL MÓDULO DE RECURSOS
// ==============================================================================

export type CategoriaRespuestaRapida = "saludo" | "seguimiento" | "propiedad" | "cierre" | "soporte";

export interface RespuestaRapida {
  id: string;
  organizacion_id: string;
  titulo: string;
  atajo: string; // ej: "/saludo", "/precios"
  categoria: CategoriaRespuestaRapida;
  contenido: string; // Texto con variables como {{nombre_contacto}}, {{agente}}
  contador_uso: number;
  creado_por_id?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export type TipoArchivoDigital = "pdf" | "imagen" | "documento" | "hoja_calculo";

export interface ArchivoDigital {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  tipo_archivo: TipoArchivoDigital;
  tamano_bytes: number;
  url_descarga: string;
  es_publico: boolean;
  contador_descargas: number;
  fecha_creacion: string;
}
