// ==============================================================================
// IRIS by WYLEN — SERVER ACTIONS DE COMUNICACIÓN OMNICANAL
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { exigirPermiso } from "@/librerias/seguridad/verificador-permisos";
import { servicioComunicacion } from "@/servicios/comunicacion";

export async function enviarMensajeSalienteAccion(conversacionId: string, texto: string) {
  const contexto = await exigirPermiso("conversaciones:responder");

  if (!texto || !texto.trim()) {
    return { exito: false, error: "El contenido del mensaje no puede estar vacío." };
  }

  try {
    const mensaje = await servicioComunicacion.enviarMensajeSaliente(
      conversacionId,
      texto.trim(),
      contexto.usuarioId,
      contexto.organizacionId
    );

    revalidatePath("/bandeja");
    return { exito: true, mensaje };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function agregarNotaInternaAccion(conversacionId: string, textoNota: string) {
  const contexto = await exigirPermiso("conversaciones:responder");

  if (!textoNota || !textoNota.trim()) {
    return { exito: false, error: "La nota interna no puede estar vacía." };
  }

  try {
    const nota = await servicioComunicacion.agregarNotaInterna(
      conversacionId,
      textoNota.trim(),
      contexto.usuarioId,
      contexto.organizacionId
    );

    revalidatePath("/bandeja");
    return { exito: true, nota };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function asignarConversacionAccion(
  conversacionId: string,
  nuevoAgenteId: string,
  motivo: string
) {
  const contexto = await exigirPermiso("conversaciones:asignar");

  if (!motivo || !motivo.trim()) {
    return { exito: false, error: "Debe ingresar el motivo de la asignación o transferencia." };
  }

  try {
    await servicioComunicacion.asignarConversacion(
      conversacionId,
      nuevoAgenteId,
      contexto.usuarioId,
      motivo.trim(),
      contexto.organizacionId
    );

    revalidatePath("/bandeja");
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function obtenerMensajesConversacionAccion(conversacionId: string) {
  const contexto = await exigirPermiso("conversaciones:leer");

  try {
    const mensajes = await servicioComunicacion.obtenerMensajesConversacion(
      conversacionId,
      contexto.organizacionId
    );
    return { exito: true, mensajes };
  } catch (error: any) {
    return { exito: false, error: error.message, mensajes: [] };
  }
}
