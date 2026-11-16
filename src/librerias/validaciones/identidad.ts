// ==============================================================================
// IRIS by WYLEN — ESQUEMAS DE VALIDACIÓN ZOD (IDENTIDAD Y EQUIPOS)
// ==============================================================================

import { z } from "zod";

export const esquemaInicioSesion = z.object({
  correoElectronico: z
    .string()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Ingrese un correo electrónico válido.")
    .trim()
    .toLowerCase(),
  clave: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;

const REGEX_UUID_POSTGRES = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const esquemaCrearEquipo = z.object({
  nombre: z
    .string()
    .min(3, "El nombre del equipo debe tener al menos 3 caracteres.")
    .max(150, "El nombre no puede exceder 150 caracteres.")
    .trim(),
  descripcion: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres.")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "El color debe ser un formato hexadecimal válido (ej. #7185A5)")
    .optional()
    .default("#7185A5"),
  liderUsuarioId: z.string().regex(REGEX_UUID_POSTGRES, "Identificador de líder no válido.").optional().nullable(),
});

export type DatosCrearEquipo = z.infer<typeof esquemaCrearEquipo>;

export const esquemaInvitarMiembro = z.object({
  correoElectronico: z
    .string()
    .min(1, "El correo electrónico es obligatorio.")
    .email("Ingrese un correo electrónico válido.")
    .trim()
    .toLowerCase(),
  nombreCompleto: z
    .string()
    .min(3, "El nombre debe contener al menos 3 caracteres.")
    .trim(),
  rolId: z.string().regex(REGEX_UUID_POSTGRES, "Debe seleccionar un rol válido."),
  equipoId: z.string().regex(REGEX_UUID_POSTGRES, "Identificador de equipo inválido.").optional().nullable(),
});

export type DatosInvitarMiembro = z.infer<typeof esquemaInvitarMiembro>;

export const esquemaActualizarOrganizacion = z.object({
  nombre: z
    .string()
    .min(3, "El nombre de la organización debe tener al menos 3 caracteres.")
    .max(255)
    .trim(),
  identificadorFiscal: z.string().max(50).optional().nullable(),
  dominio: z.string().max(255).optional().nullable(),
  zonaHoraria: z.string().default("America/Mexico_City"),
  monedaPredeterminada: z.string().length(3).default("MXN"),
  slaMinutosPrimeraRespuesta: z.number().int().min(1).max(1440).default(10),
});

export type DatosActualizarOrganizacion = z.infer<typeof esquemaActualizarOrganizacion>;
