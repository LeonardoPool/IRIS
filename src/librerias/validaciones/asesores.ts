// ==============================================================================
// IRIS by WYLEN — VALIDACIONES ZOD: EXPEDIENTE DE ASESORES Y REASIGNACIONES
// ==============================================================================

import { z } from "zod";

// Regex oficial SAT / RENAPO para México
const REGEX_CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
const REGEX_RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;
const REGEX_PIN_4_DIGITOS = /^\d{4}$/;
// Regex flexible para UUID de Postgres (soporta tanto RFC 4122 como IDs semilla o personalizados)
const REGEX_UUID_POSTGRES = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const validadorUuidOpcional = z
  .union([
    z.string().regex(REGEX_UUID_POSTGRES, "ID inválido"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((val) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null));

export const esquemaCrearAsesor = z.object({
  nombres: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  apellidos: z
    .string()
    .trim()
    .min(2, "Los apellidos deben tener al menos 2 caracteres")
    .max(100, "Los apellidos no pueden exceder 100 caracteres"),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingrese un correo electrónico válido"),
  pin: z
    .string()
    .trim()
    .regex(REGEX_PIN_4_DIGITOS, "El PIN debe tener exactamente 4 dígitos numéricos (ej. 1234)"),
  curp: z
    .string()
    .trim()
    .toUpperCase()
    .regex(REGEX_CURP, "La CURP debe cumplir con el formato oficial mexicano de 18 caracteres"),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(REGEX_RFC, "El RFC debe cumplir con el formato oficial SAT (12 o 13 caracteres)"),
  fecha_ingreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de ingreso debe tener formato AAAA-MM-DD"),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento debe tener formato AAAA-MM-DD"),
  supervisor_id: validadorUuidOpcional,
  equipo_id: validadorUuidOpcional,
  rol_codigo: z
    .enum(["agente_ventas", "supervisor_atencion"])
    .default("agente_ventas"),
  permisos: z
    .object({
      puede_ver_todos_los_prospectos: z.boolean().default(false),
      puede_reasignar_casos: z.boolean().default(false),
      puede_exportar_datos: z.boolean().default(false),
      puede_ver_analitica_global: z.boolean().default(false),
      puede_crear_oportunidades: z.boolean().default(true),
      puede_editar_contactos_ajenos: z.boolean().default(false),
    })
    .default({
      puede_ver_todos_los_prospectos: false,
      puede_reasignar_casos: false,
      puede_exportar_datos: false,
      puede_ver_analitica_global: false,
      puede_crear_oportunidades: true,
      puede_editar_contactos_ajenos: false,
    }),
});

export const esquemaReasignarCaso = z.object({
  tipo_caso: z.enum(["prospecto", "conversacion", "oportunidad"]),
  caso_id: z.string().regex(REGEX_UUID_POSTGRES, "ID de caso no válido"),
  nuevo_asesor_id: z.string().regex(REGEX_UUID_POSTGRES, "ID del nuevo asesor no válido"),
  motivo: z.string().trim().max(500, "El motivo no puede exceder 500 caracteres").optional(),
});

export type EsquemaCrearAsesor = z.infer<typeof esquemaCrearAsesor>;
export type EsquemaReasignarCaso = z.infer<typeof esquemaReasignarCaso>;
