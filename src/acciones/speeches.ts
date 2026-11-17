// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR PARA SPEECHES COMERCIALES MULTIMEDIA
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioSpeeches } from "@/servicios/speeches";
import type {
  DatosCrearSpeech,
  DatosActualizarSpeech,
  ResultadoPasoSpeech,
} from "@/tipos/speeches";

const servicioSpeeches = new ServicioSpeeches();

export async function accionListarSpeeches() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("Sesión no autenticada.");

  const speeches = await servicioSpeeches.listarSpeeches(contexto.organizacionId);
  return { exito: true, speeches };
}

export async function accionCrearSpeech(datos: DatosCrearSpeech) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("Sesión no autenticada.");

  if (!datos.nombre?.trim()) {
    throw new Error("El nombre del speech es obligatorio.");
  }
  if (!datos.desarrollo_inmueble?.trim()) {
    throw new Error("Debes vincular el speech a un desarrollo o producto comercial.");
  }
  if (!datos.elementos || datos.elementos.length === 0) {
    throw new Error("El speech debe contener al menos un bloque de mensaje o imagen.");
  }

  const creado = await servicioSpeeches.crearSpeech(
    contexto.organizacionId,
    contexto.usuarioId,
    datos
  );

  revalidatePath("/recursos");
  revalidatePath("/bandeja");
  return { exito: true, speech: creado };
}

export async function accionActualizarSpeech(id: string, datos: DatosActualizarSpeech) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("Sesión no autenticada.");

  const actualizado = await servicioSpeeches.actualizarSpeech(
    contexto.organizacionId,
    id,
    datos
  );

  revalidatePath("/recursos");
  revalidatePath("/bandeja");
  return { exito: true, speech: actualizado };
}

export async function accionEliminarSpeech(id: string) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("Sesión no autenticada.");

  await servicioSpeeches.eliminarSpeech(contexto.organizacionId, id);
  revalidatePath("/recursos");
  revalidatePath("/bandeja");
  return { exito: true };
}

export async function accionDuplicarSpeech(id: string) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("Sesión no autenticada.");

  const duplicado = await servicioSpeeches.duplicarSpeech(
    contexto.organizacionId,
    contexto.usuarioId,
    id
  );

  revalidatePath("/recursos");
  revalidatePath("/bandeja");
  return { exito: true, speech: duplicado };
}

export async function accionEjecutarPasoSpeech({
  conversacionId,
  speechId,
  pasoOrden,
  ejecucionId,
}: {
  conversacionId: string;
  speechId: string;
  pasoOrden: number;
  ejecucionId?: string;
}): Promise<ResultadoPasoSpeech> {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) {
    return {
      paso: pasoOrden,
      total: 0,
      elementoId: "",
      tipo: "texto",
      exito: false,
      error: "Sesión no autenticada en el CRM.",
    };
  }

  return servicioSpeeches.ejecutarPasoDeSpeech({
    conversacionId,
    speechId,
    pasoOrden,
    ejecucionId,
    usuarioId: contexto.usuarioId,
    organizacionId: contexto.organizacionId,
  });
}
