// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR: GOOGLE CALENDAR MAESTRO (INDOMO)
// ==============================================================================

"use server";

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioGoogleCalendarMaestro } from "@/servicios/google-calendar-maestro";
import { revalidatePath } from "next/cache";

/**
 * Obtiene el estado actual de la cuenta maestra de Google Calendar de INDOMO
 */
export async function accionObtenerEstadoGoogleCalendar() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { conectado: false, emailCuenta: null };
    }

    return await ServicioGoogleCalendarMaestro.obtenerEstadoConexion(contexto.organizacionId);
  } catch (err: any) {
    console.error("Error en accionObtenerEstadoGoogleCalendar:", err);
    return { conectado: false, emailCuenta: null };
  }
}

/**
 * Genera la URL para que el Administrador vincule la cuenta indomodesarrollos@gmail.com
 */
export async function accionGenerarUrlConectarGoogle() {
  try {
    const contexto = await obtenerContextoInquilino();
    const orgId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

    const url = ServicioGoogleCalendarMaestro.generarUrlAutorizacion(orgId);
    return { exito: true, url };
  } catch (err: any) {
    return { exito: false, error: err.message };
  }
}

/**
 * Permite que cualquier asesor de INDOMO cree una reunión con Google Meet
 */
export async function accionCrearReunionGoogleMeet(params: {
  prospectoId?: string | null;
  contactoId?: string | null;
  titulo: string;
  descripcion?: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  zonaHoraria?: string;
  asistentes?: string[];
  generarMeet?: boolean;
}) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return {
        exito: false,
        error: "Sesión no válida o expirada. Por favor inicie sesión nuevamente.",
      };
    }

    const resultado = await ServicioGoogleCalendarMaestro.crearReunionConMeet({
      asesorId: contexto.usuarioId,
      organizacionId: contexto.organizacionId,
      prospectoId: params.prospectoId,
      contactoId: params.contactoId,
      titulo: params.titulo,
      descripcion: params.descripcion,
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      zonaHoraria: params.zonaHoraria || "America/Mexico_City",
      asistentes: params.asistentes,
      generarMeet: params.generarMeet !== false,
    });

    if (resultado.exito) {
      revalidatePath("/bandeja");
      revalidatePath("/actividades");
      revalidatePath("/prospectos");
    }

    return resultado;
  } catch (err: any) {
    console.error("Error en accionCrearReunionGoogleMeet:", err);
    return {
      exito: false,
      error: err.message || "Error al procesar la reunión en el servidor.",
    };
  }
}
