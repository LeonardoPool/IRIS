// ==============================================================================
// IRIS by WYLEN — VALIDACIONES DE MARKETING Y PRODUCTIVIDAD
// ==============================================================================
// Esquemas Zod con validación estricta y mensajes en Español
// ==============================================================================

import { z } from "zod";

export const esquemaFormularioWeb = z.object({
  nombre: z.string().min(3, "El nombre del formulario debe tener al menos 3 caracteres"),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  descripcion: z.string().optional().nullable(),
  origen_prospecto_id: z.string().uuid("Identificador de origen no válido").optional().nullable(),
  agente_predeterminado_id: z.string().uuid("Identificador de agente no válido").optional().nullable(),
  equipo_predeterminado_id: z.string().uuid("Identificador de equipo no válido").optional().nullable(),
  etapa_predeterminada_id: z.string().uuid("Identificador de etapa no válido").optional().nullable(),
  campos_habilitados: z.array(z.string()).min(1, "Debe habilitar al menos un campo"),
  permitir_dominios: z.array(z.string()).default(["*"]),
  mensaje_exito: z.string().min(5, "El mensaje de éxito es obligatorio"),
  url_redireccion: z.string().url("Debe ser una URL válida").optional().nullable().or(z.literal("")),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
});

export const esquemaCapturaFormularioPublico = z.object({
  claveApi: z.string().min(1, "La clave pública del formulario es requerida"),
  nombre: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
  correoElectronico: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  telefono: z.string().min(7, "El teléfono debe contener al menos 7 dígitos").optional().nullable().or(z.literal("")),
  mensaje: z.string().optional().nullable(),
  presupuesto: z.number().positive("El presupuesto debe ser mayor a cero").optional().nullable(),
  // Trampa Honeypot contra bots de spam (debe llegar vacía)
  _trampa_honeypot: z.string().max(0, "Acceso denegado").optional(),
  // Metadatos UTM de campaña
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
});

export const esquemaAgendarReunion = z.object({
  prospectoId: z.string().uuid("Identificador de prospecto no válido"),
  titulo: z.string().min(3, "El título de la reunión es obligatorio"),
  descripcion: z.string().optional(),
  fechaInicio: z.string().datetime("Formato de fecha de inicio inválido (ISO 8601)"),
  fechaFin: z.string().datetime("Formato de fecha de fin inválido (ISO 8601)"),
  zonaHoraria: z.string().default("America/Mexico_City"),
  asistentes: z.array(z.string().email("Correo de asistente no válido")).optional(),
  generarGoogleMeet: z.boolean().default(true),
});

export type DatosFormularioWeb = z.infer<typeof esquemaFormularioWeb>;
export type DatosCapturaFormularioPublico = z.infer<typeof esquemaCapturaFormularioPublico>;
export type DatosAgendarReunion = z.infer<typeof esquemaAgendarReunion>;
