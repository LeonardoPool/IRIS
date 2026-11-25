// ==============================================================================
// IRIS by WYLEN — TIPOS DE DOMINIO: BASE INMOBILIARIA, INVENTARIO Y PLANOS SVG
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-005, IRIS-DEC-009, IRIS-DEC-010, IRIS-DEC-013
// ==============================================================================

export type EstadoDesarrolladora = "activo" | "inactivo";

export type TipoDesarrolloInmobiliario =
  | "lotes_campestres"
  | "lotes_residenciales"
  | "vertical_departamentos"
  | "horizontal_casas"
  | "uso_mixto"
  | "comercial_industrial";

export type EstadoPublicacionDesarrollo = "borrador" | "activo" | "pausado" | "agotado";

export type EstadoEtapaDesarrollo = "planeacion" | "preventa" | "activa" | "entregada" | "cerrada";

export type TipoUnidadInmobiliaria =
  | "lote"
  | "departamento"
  | "casa"
  | "local_comercial"
  | "bodega"
  | "oficina";

export type EstadoDisponibilidadUnidad = "disponible" | "apartado" | "vendido" | "bloqueado";

export type MonedaInmobiliaria = "MXN" | "USD";

export interface Desarrolladora {
  id: string;
  organizacion_id: string;
  nombre: string;
  razon_social: string | null;
  identificador_fiscal: string | null;
  logo_url: string | null;
  color_marca: string;
  sitio_web: string | null;
  descripcion: string | null;
  estado: EstadoDesarrolladora;
  creado_por_id: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ResumenInventarioDesarrollo {
  total_unidades: number;
  disponibles: number;
  apartadas: number;
  vendidas: number;
  bloqueadas: number;
  valor_total_inventario: number;
  valor_disponible: number;
  superficie_promedio_m2: number;
}

export interface DesarrolloInmobiliario {
  id: string;
  organizacion_id: string;
  desarrolladora_id: string;
  nombre: string;
  slug: string;
  tipo_desarrollo: TipoDesarrolloInmobiliario;
  descripcion: string | null;
  ubicacion_texto: string | null;
  estado_provincia: string | null;
  municipio_ciudad: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  moneda: MonedaInmobiliaria;
  precio_desde: number | null;
  superficie_total_hectareas: number | null;
  amenidades: string[];
  portada_url: string | null;
  galeria_urls: string[];
  configuracion_comercial: Record<string, unknown>;
  estado_publicacion: EstadoPublicacionDesarrollo;
  creado_por_id: string | null;
  actualizado_por_id: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  desarrolladora?: Desarrolladora;
  resumen_inventario?: ResumenInventarioDesarrollo;
}

export interface EtapaDesarrollo {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  nombre: string;
  codigo: string;
  orden: number;
  fecha_entrega_estimada: string | null;
  precio_m2_base: number | null;
  estado: EstadoEtapaDesarrollo;
  fecha_creacion: string;
  fecha_actualizacion: string;
  manzanas?: ManzanaDesarrollo[];
}

export interface ManzanaDesarrollo {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  etapa_id: string;
  nombre: string;
  codigo: string;
  orden: number;
  fecha_creacion: string;
}

export interface UnidadInmobiliaria {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  etapa_id: string | null;
  manzana_id: string | null;
  clave_comercial: string;
  numero_lote_unidad: string | null;
  identificador_plano_svg: string | null;
  tipo_unidad: TipoUnidadInmobiliaria;
  superficie_m2: number;
  frente_m: number | null;
  fondo_m: number | null;
  orientacion: string | null;
  precio_m2: number | null;
  precio_lista: number;
  precio_promocional: number | null;
  moneda: MonedaInmobiliaria;
  estado_disponibilidad: EstadoDisponibilidadUnidad;
  asesor_apartado_id: string | null;
  prospecto_actual_id: string | null;
  oportunidad_actual_id: string | null;
  apartado_en: string | null;
  apartado_vence_en: string | null;
  vendido_en: string | null;
  caracteristicas: Record<string, unknown>;
  documentos_urls: string[];
  notas_inventario: string | null;
  version_registro: number;
  creado_por_id: string | null;
  actualizado_por_id: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  etapa?: { id: string; nombre: string; codigo: string } | null;
  manzana?: { id: string; nombre: string; codigo: string } | null;
}

export interface HistorialDisponibilidadUnidad {
  id: string;
  organizacion_id: string;
  unidad_id: string;
  estado_anterior: EstadoDisponibilidadUnidad | null;
  estado_nuevo: EstadoDisponibilidadUnidad;
  actor_tipo: "usuario" | "sistema_cron" | "webhook_externo" | "migracion_sistema";
  usuario_id: string | null;
  actor_sistema_identificador: string | null;
  prospecto_id: string | null;
  oportunidad_id: string | null;
  motivo: string;
  metadatos: Record<string, unknown>;
  fecha_cambio: string;
  usuario?: { id: string; nombre_completo: string; correo_electronico: string } | null;
}

export interface DocumentoDesarrollo {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  titulo: string;
  categoria: "brochure" | "ficha_tecnica" | "reglamento" | "master_plan" | "certeza_juridica" | "lista_precios";
  url_archivo: string;
  modalidad_acceso: "descarga_directa" | "solicitud_asesor" | "uso_interno";
  activo: boolean;
  creado_por_id: string | null;
  fecha_creacion: string;
}

export interface ConfiguracionColoresPlano {
  disponible: string;
  apartado: string;
  vendido: string;
  bloqueado: string;
  sin_vincular: string;
}

export interface PlanoInteractivo {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  etapa_id: string | null;
  manzana_id: string | null;
  nombre: string;
  version: number;
  contenido_svg: string;
  viewbox: string | null;
  configuracion_colores: ConfiguracionColoresPlano;
  es_activo: boolean;
  creado_por_id: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface VinculoPlanoUnidad {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  plano_id: string;
  svg_element_id: string;
  unidad_id: string;
  metadatos_trazo: Record<string, unknown>;
  fecha_creacion: string;
}

export interface FilaImportacionUnidadCruda {
  clave_comercial: string;
  numero_lote_unidad?: string;
  etapa_codigo?: string;
  manzana_codigo?: string;
  tipo_unidad?: TipoUnidadInmobiliaria;
  superficie_m2: number;
  frente_m?: number | null;
  fondo_m?: number | null;
  orientacion?: string | null;
  precio_lista: number;
  precio_promocional?: number | null;
  moneda?: MonedaInmobiliaria;
  identificador_plano_svg?: string | null;
  estado_disponibilidad?: EstadoDisponibilidadUnidad;
}

export interface FilaPrevalidadaImportacion extends FilaImportacionUnidadCruda {
  indiceFila: number;
  clasificacion: "nueva_valida" | "duplicada_en_archivo" | "existente_en_bd" | "error_validacion";
  mensajeValidacion: string;
}

export interface ResultadoPrevalidacionImportacion {
  totalFilasLeidas: number;
  nuevasValidas: number;
  duplicadasEnArchivo: number;
  existentesEnBaseDatos: number;
  conErrores: number;
  filas: FilaPrevalidadaImportacion[];
}

export interface FiguraDetectadaSVG {
  svgElementId: string;
  etiquetaTag: string;
  geometriaResumen: string;
  esIdInyectado: boolean;
  duplicadoEnArchivo: boolean;
  AtributosVisuales: {
    x?: string;
    y?: string;
    width?: string;
    height?: string;
    d?: string;
    points?: string;
    rx?: string;
  };
}

export interface DiagnosticoIntegridadPlanoSVG {
  viewBox: string;
  svgSanitizado: string;
  figurasDetectadas: FiguraDetectadaSVG[];
  idsDuplicadosEnSvg: string[];
  elementosAmenazasEliminados: string[];
}

export function calcularResumenInventario(unidades: UnidadInmobiliaria[]): ResumenInventarioDesarrollo {
  const resumen: ResumenInventarioDesarrollo = {
    total_unidades: unidades.length,
    disponibles: 0,
    apartadas: 0,
    vendidas: 0,
    bloqueadas: 0,
    valor_total_inventario: 0,
    valor_disponible: 0,
    superficie_promedio_m2: 0,
  };

  let sumaSuperficie = 0;
  for (const u of unidades) {
    const precioEfectivo = Number(u.precio_promocional ?? u.precio_lista ?? 0);
    resumen.valor_total_inventario += precioEfectivo;
    sumaSuperficie += Number(u.superficie_m2 || 0);

    if (u.estado_disponibilidad === "disponible") {
      resumen.disponibles++;
      resumen.valor_disponible += precioEfectivo;
    } else if (u.estado_disponibilidad === "apartado") {
      resumen.apartadas++;
    } else if (u.estado_disponibilidad === "vendido") {
      resumen.vendidas++;
    } else if (u.estado_disponibilidad === "bloqueado") {
      resumen.bloqueadas++;
    }
  }

  resumen.superficie_promedio_m2 =
    unidades.length > 0 ? Math.round((sumaSuperficie / unidades.length) * 100) / 100 : 0;

  return resumen;
}

