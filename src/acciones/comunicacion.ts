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

export async function listarConversacionesAccion(
  clasificacion: "todas" | "no_asignadas" | "mis_conversaciones" | "prioritarias" | "cerradas" = "todas"
) {
  const contexto = await exigirPermiso("conversaciones:leer");

  try {
    const conversaciones = await servicioComunicacion.listarConversaciones(
      contexto.organizacionId,
      clasificacion,
      contexto.usuarioId
    );
    return { exito: true, conversaciones };
  } catch (error: any) {
    return { exito: false, error: error.message, conversaciones: [] };
  }
}

export async function iniciarConversacionPlantillaAccion(datos: {
  telefonoDestino: string;
  nombreContacto?: string;
  nombrePlantilla: string;
  codigoIdioma: string;
  parametrosCuerpo?: string[];
}) {
  const contexto = await exigirPermiso("conversaciones:responder");

  if (!datos.telefonoDestino?.trim() || !datos.nombrePlantilla?.trim()) {
    return { exito: false, error: "Teléfono destino y nombre de plantilla son obligatorios." };
  }

  try {
    const resultado = await servicioComunicacion.iniciarConversacionConPlantilla(
      contexto.organizacionId,
      contexto.usuarioId,
      datos
    );
    revalidatePath("/bandeja");
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function enviarPlantillaConversacionAccion(
  conversacionId: string,
  datos: { nombrePlantilla: string; codigoIdioma: string; parametrosCuerpo?: string[] }
) {
  const contexto = await exigirPermiso("conversaciones:responder");

  if (!datos.nombrePlantilla?.trim()) {
    return { exito: false, error: "El nombre de la plantilla es obligatorio." };
  }

  try {
    const mensaje = await servicioComunicacion.enviarPlantillaEnConversacion(
      conversacionId,
      contexto.usuarioId,
      contexto.organizacionId,
      datos
    );
    revalidatePath("/bandeja");
    return { exito: true, mensaje };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function obtenerCuentaWhatsAppAccion() {
  const contexto = await exigirPermiso("conversaciones:leer");

  try {
    const cuenta = await servicioComunicacion.obtenerCuentaWhatsAppOrganizacion(contexto.organizacionId);
    return { exito: true, cuenta };
  } catch (error: any) {
    return { exito: false, error: error.message, cuenta: null };
  }
}

export async function guardarCuentaWhatsAppAccion(datos: {
  nombreIdentificador: string;
  proveedorCuentaId: string;
  identificadorWaba?: string;
  accessToken?: string;
}) {
  const contexto = await exigirPermiso("configuracion:administrar");

  try {
    const resultado = await servicioComunicacion.configurarCuentaWhatsAppOrganizacion(
      contexto.organizacionId,
      datos
    );
    revalidatePath("/bandeja");
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}
