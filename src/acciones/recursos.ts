// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR PARA RECURSOS Y RESPUESTAS RÁPIDAS
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioRecursos } from "@/servicios/recursos";

const servicioRecursos = new ServicioRecursos();

export async function accionCrearRespuestaRapida(datos: {
  titulo: string;
  atajo: string;
  categoria: any;
  contenido: string;
}) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const creada = await servicioRecursos.crearRespuestaRapida(contexto.organizacionId, datos);
  revalidatePath("/recursos");
  return { exito: true, respuesta: creada };
}

export async function accionEliminarRespuestaRapida(id: string) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  await servicioRecursos.eliminarRespuestaRapida(contexto.organizacionId, id);
  revalidatePath("/recursos");
  return { exito: true };
}
