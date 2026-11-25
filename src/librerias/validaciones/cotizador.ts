// ==============================================================================
// IRIS by WYLEN — ESQUEMAS ZOD DE VALIDACIÓN: COTIZADOR, APARTADOS E INTERESES
// ==============================================================================

import { z } from "zod";

export const esquemaPagoExtraordinario = z.object({
  mes: z.number().int().min(1, "El mes debe ser mayor o igual a 1").max(360),
  monto: z.number().positive("El monto extraordinario debe ser mayor a 0"),
  etiqueta: z.string().max(120).optional(),
});

export const esquemaEmitirCotizacionInmobiliaria = z.object({
  desarrollo_id: z.string().uuid("Selecciona un desarrollo válido"),
  unidades_ids: z
    .array(z.string().uuid("Identificador de unidad inválido"))
    .min(1, "Selecciona al menos una unidad para cotizar")
    .max(25, "Puedes cotizar hasta 25 unidades en un mismo paquete"),
  esquema_financiamiento_id: z.string().uuid().nullable().optional(),
  prospecto_id: z.string().uuid().nullable().optional(),
  contacto_id: z.string().uuid().nullable().optional(),
  oportunidad_id: z.string().uuid().nullable().optional(),
  cliente_nombre_libre: z.string().trim().min(2, "Indica el nombre del cliente o prospecto").max(200),
  cliente_telefono_libre: z.string().trim().max(40).nullable().optional(),
  cliente_correo_libre: z.string().trim().max(255).nullable().optional(),
  descuento_porcentaje: z.number().min(0).max(100).default(0),
  modalidad_enganche: z.enum(["porcentaje", "monto_fijo"]).default("porcentaje"),
  enganche_porcentaje: z.number().min(0).max(100).default(20),
  enganche_monto_fijo: z.number().min(0).default(0),
  meses_enganche_diferido: z.number().int().min(1).max(60).default(1),
  plazo_meses: z.number().int().min(0).max(360).default(36),
  tipo_tasa_interes: z.enum(["sin_intereses", "nominal_anual", "efectiva_anual"]).default("sin_intereses"),
  tasa_interes_anual: z.number().min(0).max(100).default(0),
  modo_pagos_extraordinarios: z
    .enum(["valor_presente_cuota_fija", "abono_directo_capital"])
    .default("valor_presente_cuota_fija"),
  pagos_extraordinarios: z.array(esquemaPagoExtraordinario).default([]),
  notas_comerciales: z.string().max(1500).nullable().optional(),
});

export const esquemaCrearApartadoUnidad = z.object({
  desarrollo_id: z.string().uuid("Desarrollo inválido"),
  unidad_id: z.string().uuid("Unidad inválida"),
  cotizacion_id: z.string().uuid().nullable().optional(),
  prospecto_id: z.string().uuid().nullable().optional(),
  cliente_nombre: z.string().trim().min(2, "El nombre del cliente es obligatorio").max(200),
  cliente_telefono: z.string().trim().max(50).nullable().optional(),
  cliente_correo: z.string().trim().max(255).nullable().optional(),
  monto_apartado: z.number().min(0, "El monto de apartado no puede ser negativo").default(10000),
  horas_vigencia: z.number().int().min(1).max(720).optional(),
  notas: z.string().max(1000).nullable().optional(),
});

export const esquemaProrrogarApartado = z.object({
  apartado_id: z.string().uuid("Identificador de apartado inválido"),
  horas_adicionales: z.number().int().min(1, "Mínimo 1 hora").max(720, "Máximo 720 horas"),
  justificacion: z
    .string()
    .trim()
    .min(8, "La justificación de prórroga es obligatoria (mínimo 8 caracteres)")
    .max(500),
});

export const esquemaLiberarOConvertirApartado = z.object({
  apartado_id: z.string().uuid("Identificador de apartado inválido"),
  accion: z.enum(["liberar", "convertir_venta"]),
  motivo: z.string().trim().min(4, "Indica el motivo o referencia de la operación").max(500),
});

export type DatosEmitirCotizacionInmobiliaria = z.infer<typeof esquemaEmitirCotizacionInmobiliaria>;
export type DatosCrearApartadoUnidad = z.infer<typeof esquemaCrearApartadoUnidad>;
export type DatosProrrogarApartado = z.infer<typeof esquemaProrrogarApartado>;
export type DatosLiberarOConvertirApartado = z.infer<typeof esquemaLiberarOConvertirApartado>;
