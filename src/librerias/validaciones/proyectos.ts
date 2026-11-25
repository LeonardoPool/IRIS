// ==============================================================================
// IRIS by WYLEN — VALIDACIONES ZOD: BASE INMOBILIARIA, INVENTARIO Y PLANOS SVG
// ==============================================================================

import { z } from "zod";

export const esquemaCrearDesarrolladora = z.object({
  nombre: z.string().trim().min(2, "El nombre de la desarrolladora debe tener al menos 2 caracteres.").max(180),
  razonSocial: z.string().trim().max(255).optional().nullable(),
  identificadorFiscal: z.string().trim().max(50).optional().nullable(),
  colorMarca: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido.").default("#111827"),
  sitioWeb: z.string().trim().max(255).optional().nullable(),
  descripcion: z.string().trim().max(1000).optional().nullable(),
});

export const esquemaGuardarDesarrollo = z.object({
  id: z.string().uuid().optional().nullable(),
  desarrolladoraId: z.string().uuid("Debe seleccionar una desarrolladora válida."),
  nombre: z.string().trim().min(2, "El nombre comercial del desarrollo es obligatorio.").max(200),
  tipoDesarrollo: z.enum([
    "lotes_campestres",
    "lotes_residenciales",
    "vertical_departamentos",
    "horizontal_casas",
    "uso_mixto",
    "comercial_industrial",
  ]).default("lotes_campestres"),
  descripcion: z.string().trim().max(3000).optional().nullable(),
  ubicacionTexto: z.string().trim().max(255).optional().nullable(),
  estadoProvincia: z.string().trim().max(120).optional().nullable(),
  municipioCiudad: z.string().trim().max(120).optional().nullable(),
  direccion: z.string().trim().max(500).optional().nullable(),
  latitud: z.number().min(-90).max(90).optional().nullable(),
  longitud: z.number().min(-180).max(180).optional().nullable(),
  moneda: z.enum(["MXN", "USD"]).default("MXN"),
  precioDesde: z.number().min(0, "El precio base no puede ser negativo.").optional().nullable(),
  superficieTotalHectareas: z.number().min(0).optional().nullable(),
  amenidades: z.array(z.string().trim()).default([]),
  estadoPublicacion: z.enum(["borrador", "activo", "pausado", "agotado"]).default("borrador"),
});

export const esquemaCrearEtapaDesarrollo = z.object({
  desarrolloId: z.string().uuid("Identificador de desarrollo inválido."),
  nombre: z.string().trim().min(2, "El nombre de la etapa es obligatorio.").max(150),
  codigo: z.string().trim().min(1, "El código de la etapa es obligatorio.").max(60),
  orden: z.number().int().min(1).default(1),
  fechaEntregaEstimada: z.string().optional().nullable(),
  precioM2Base: z.number().min(0).optional().nullable(),
  estado: z.enum(["planeacion", "preventa", "activa", "entregada", "cerrada"]).default("activa"),
});

export const esquemaCrearManzanaDesarrollo = z.object({
  desarrolloId: z.string().uuid("Identificador de desarrollo inválido."),
  etapaId: z.string().uuid("Debe seleccionar la etapa a la que pertenece la manzana."),
  nombre: z.string().trim().min(1, "El nombre de la manzana es obligatorio.").max(150),
  codigo: z.string().trim().min(1, "El código de la manzana es obligatorio.").max(60),
  orden: z.number().int().min(1).default(1),
});

export const esquemaGuardarUnidadInmobiliaria = z.object({
  id: z.string().uuid().optional().nullable(),
  desarrolloId: z.string().uuid("Identificador de desarrollo inválido."),
  etapaId: z.string().uuid().optional().nullable(),
  manzanaId: z.string().uuid().optional().nullable(),
  claveComercial: z.string().trim().min(1, "La clave comercial es obligatoria.").max(100),
  numeroLoteUnidad: z.string().trim().max(60).optional().nullable(),
  identificadorPlanoSvg: z.string().trim().max(120).optional().nullable(),
  tipoUnidad: z.enum(["lote", "departamento", "casa", "local_comercial", "bodega", "oficina"]).default("lote"),
  superficieM2: z.number().positive("La superficie en m² debe ser mayor a 0."),
  frenteM: z.number().positive().optional().nullable(),
  fondoM: z.number().positive().optional().nullable(),
  orientacion: z.string().trim().max(60).optional().nullable(),
  precioLista: z.number().min(0, "El precio de lista no puede ser negativo."),
  precioPromocional: z.number().min(0).optional().nullable(),
  moneda: z.enum(["MXN", "USD"]).default("MXN"),
  estadoDisponibilidad: z.enum(["disponible", "apartado", "vendido", "bloqueado"]).default("disponible"),
  notasInventario: z.string().trim().max(1000).optional().nullable(),
  motivoCambioEstado: z.string().trim().max(500).optional().nullable(),
});

export const esquemaGuardarPlanoInteractivo = z.object({
  desarrolloId: z.string().uuid("Identificador de desarrollo inválido."),
  etapaId: z.string().uuid().optional().nullable(),
  manzanaId: z.string().uuid().optional().nullable(),
  nombre: z.string().trim().min(2, "El nombre del plano es obligatorio.").max(180),
  contenidoSvg: z.string().min(20, "El contenido SVG es inválido o está vacío."),
  configuracionColores: z.object({
    disponible: z.string().default("#10b981"),
    apartado: z.string().default("#f59e0b"),
    vendido: z.string().default("#ef4444"),
    bloqueado: z.string().default("#64748b"),
    sin_vincular: z.string().default("#d1d5db"),
  }).optional(),
});

export type DatosCrearDesarrolladora = z.infer<typeof esquemaCrearDesarrolladora>;
export type DatosGuardarDesarrollo = z.infer<typeof esquemaGuardarDesarrollo>;
export type DatosCrearEtapaDesarrollo = z.infer<typeof esquemaCrearEtapaDesarrollo>;
export type DatosCrearManzanaDesarrollo = z.infer<typeof esquemaCrearManzanaDesarrollo>;
export type DatosGuardarUnidadInmobiliaria = z.infer<typeof esquemaGuardarUnidadInmobiliaria>;
export type DatosGuardarPlanoInteractivo = z.infer<typeof esquemaGuardarPlanoInteractivo>;
