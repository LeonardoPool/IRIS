// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR PARA MARKETING Y PRODUCTIVIDAD
// ==============================================================================
// Server Actions para Next.js con validación de contexto de inquilino y permisos
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioMarketing } from "@/servicios/marketing";
import {
  esquemaFormularioWeb,
  esquemaAgendarReunion,
  type DatosFormularioWeb,
  type DatosAgendarReunion,
} from "@/librerias/validaciones/marketing";
import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";

const servicioMarketing = new ServicioMarketing();

export async function accionCrearFormularioWeb(datos: DatosFormularioWeb) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const validado = esquemaFormularioWeb.parse(datos);
  const formulario = await servicioMarketing.crearFormularioWeb(contexto.organizacionId, validado);

  revalidatePath("/marketing");
  return { exito: true, formulario };
}

export async function accionActualizarFormularioWeb(
  formularioId: string,
  datos: Partial<DatosFormularioWeb>
) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const formulario = await servicioMarketing.actualizarFormularioWeb(
    contexto.organizacionId,
    formularioId,
    datos
  );

  revalidatePath("/marketing");
  return { exito: true, formulario };
}

export async function accionEliminarFormularioWeb(formularioId: string) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  await servicioMarketing.eliminarFormularioWeb(contexto.organizacionId, formularioId);

  revalidatePath("/marketing");
  return { exito: true };
}

export async function accionAgendarReunionMeet(datos: DatosAgendarReunion) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const validado = esquemaAgendarReunion.parse(datos);
  const resultado = await servicioMarketing.agendarReunionConMeet(
    contexto.usuarioId,
    contexto.organizacionId,
    validado
  );

  revalidatePath(`/prospectos/${datos.prospectoId}`);
  revalidatePath("/actividades");
  return resultado;
}

export async function accionDesconectarCalendario() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const admin = crearClienteSupabaseAdministrador();
  await admin
    .from("conexiones_calendario")
    .delete()
    .eq("usuario_id", contexto.usuarioId)
    .eq("organizacion_id", contexto.organizacionId)
    .eq("proveedor", "google_calendar");

  revalidatePath("/marketing");
  revalidatePath("/configuracion");
  return { exito: true };
}
