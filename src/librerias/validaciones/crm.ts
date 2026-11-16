// ==============================================================================
// IRIS by WYLEN — ESQUEMAS DE VALIDACIÓN ZOD (CRM CORE)
// ==============================================================================

import { z } from "zod";

export const esquemaCrearProspecto = z.object({
  nombre: z.string().min(2, "El nombre del prospecto debe contener al menos 2 caracteres.").trim(),
  correoElectronico: z.string().email("Correo electrónico no válido.").optional().or(z.literal("")),
  telefono: z.string().min(8, "El teléfono debe contener al menos 8 dígitos.").optional().or(z.literal("")),
  empresaNombre: z.string().optional().or(z.literal("")),
  desarrolloInteres: z.string().optional().or(z.literal("")),
  origenId: z.string().uuid("Debe seleccionar un canal de origen válido."),
  agenteAsignadoId: z.string().uuid().optional().nullable(),
  puntuacion: z.number().int().min(0).max(100).default(0),
  notas: z.string().optional().or(z.literal("")),
});

export type DatosCrearProspecto = z.infer<typeof esquemaCrearProspecto>;

export const esquemaConvertirProspecto = z.object({
  prospectoId: z.string().uuid(),
  crearEmpresa: z.boolean().default(false),
  empresaNombre: z.string().optional(),
  crearOportunidad: z.boolean().default(true),
  tituloOportunidad: z.string().min(3, "El título de la oportunidad es obligatorio."),
  valorEstimado: z.number().positive("El valor estimado debe ser un número positivo."),
  moneda: z.string().length(3).default("MXN"),
  embudoId: z.string().uuid("Debe seleccionar un embudo comercial válido."),
  etapaId: z.string().uuid("Debe seleccionar la etapa inicial."),
  agenteAsignadoId: z.string().uuid("Debe asignar un agente responsable."),
  fechaCierreEsperada: z.string().optional().nullable(),
});

export type DatosConvertirProspecto = z.infer<typeof esquemaConvertirProspecto>;

export const esquemaCrearContacto = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio.").trim(),
  apellidos: z.string().optional().or(z.literal("")),
  correoPrincipal: z.string().email("Correo electrónico inválido.").optional().or(z.literal("")),
  telefonoPrincipal: z.string().min(8, "Teléfono inválido.").optional().or(z.literal("")),
  empresaId: z.string().uuid().optional().nullable(),
  cargo: z.string().optional().or(z.literal("")),
  etiquetas: z.array(z.string()).default([]),
  notas: z.string().optional().or(z.literal("")),
});

export type DatosCrearContacto = z.infer<typeof esquemaCrearContacto>;

export const esquemaCrearEmpresa = z.object({
  nombre: z.string().min(2, "El nombre de la empresa es obligatorio.").trim(),
  identificadorFiscal: z.string().optional().or(z.literal("")),
  sector: z.string().optional().or(z.literal("")),
  sitioWeb: z.string().url("Sitio web inválido.").optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
});

export type DatosCrearEmpresa = z.infer<typeof esquemaCrearEmpresa>;

export const esquemaCrearOportunidad = z.object({
  titulo: z.string().min(3, "El título de la negociación es obligatorio.").trim(),
  contactoId: z.string().uuid("Debe vincular un contacto válido."),
  empresaId: z.string().uuid().optional().nullable(),
  embudoId: z.string().uuid("Debe seleccionar un embudo comercial."),
  etapaId: z.string().uuid("Debe seleccionar una etapa del embudo."),
  agenteAsignadoId: z.string().uuid("Debe asignar un agente responsable."),
  valorEstimado: z.number().min(0, "El valor estimado debe ser mayor o igual a 0."),
  moneda: z.string().length(3).default("MXN"),
  desarrolloPropiedad: z.string().optional().or(z.literal("")),
  loteUnidad: z.string().optional().or(z.literal("")),
  fechaCierreEsperada: z.string().optional().nullable(),
});

export type DatosCrearOportunidad = z.infer<typeof esquemaCrearOportunidad>;

export const esquemaMoverEtapaOportunidad = z.object({
  oportunidadId: z.string().uuid(),
  etapaNuevaId: z.string().uuid(),
  notas: z.string().optional().or(z.literal("")),
});

export type DatosMoverEtapaOportunidad = z.infer<typeof esquemaMoverEtapaOportunidad>;

export const esquemaCrearActividad = z.object({
  tipoActividad: z.enum(["llamada", "reunion", "tarea", "correo", "visita", "whatsapp"]),
  titulo: z.string().min(3, "El título de la actividad es obligatorio.").trim(),
  descripcion: z.string().optional().or(z.literal("")),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
  fechaVencimiento: z.string().min(1, "La fecha y hora de vencimiento es obligatoria."),
  prospectoId: z.string().uuid().optional().nullable(),
  contactoId: z.string().uuid().optional().nullable(),
  oportunidadId: z.string().uuid().optional().nullable(),
  usuarioResponsableId: z.string().uuid("Debe asignar un agente responsable."),
});

export type DatosCrearActividad = z.infer<typeof esquemaCrearActividad>;
