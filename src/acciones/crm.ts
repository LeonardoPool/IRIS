// ==============================================================================
// IRIS by WYLEN — SERVER ACTIONS DE CRM CORE
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { exigirPermiso } from "@/librerias/seguridad/verificador-permisos";
import { servicioCRM } from "@/servicios/crm";
import {
  esquemaCrearProspecto,
  esquemaConvertirProspecto,
  esquemaCrearContacto,
  esquemaCrearOportunidad,
  esquemaMoverEtapaOportunidad,
  esquemaCrearActividad,
} from "@/librerias/validaciones/crm";

export async function crearProspectoAccion(formData: unknown) {
  const contexto = await exigirPermiso("prospectos:crear");
  const validacion = esquemaCrearProspecto.safeParse(formData);

  if (!validacion.success) {
    return {
      exito: false,
      error: validacion.error.issues?.[0]?.message || "Datos del prospecto inválidos.",
    };
  }

  try {
    const prospecto = await servicioCRM.crearProspecto(validacion.data, contexto.organizacionId);
    revalidatePath("/prospectos");
    revalidatePath("/panel-control");
    return { exito: true, prospecto };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function convertirProspectoAccion(formData: unknown) {
  const contexto = await exigirPermiso("prospectos:editar");
  const validacion = esquemaConvertirProspecto.safeParse(formData);

  if (!validacion.success) {
    return {
      exito: false,
      error: validacion.error.issues?.[0]?.message || "Datos de conversión inválidos.",
    };
  }

  try {
    const resultado = await servicioCRM.convertirProspecto(
      validacion.data,
      contexto.organizacionId,
      contexto.usuarioId
    );
    revalidatePath("/prospectos");
    revalidatePath("/contactos");
    revalidatePath("/oportunidades");
    revalidatePath("/panel-control");
    return { exito: true, resultado };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function moverEtapaOportunidadAccion(formData: unknown) {
  const contexto = await exigirPermiso("oportunidades:gestionar");
  const validacion = esquemaMoverEtapaOportunidad.safeParse(formData);

  if (!validacion.success) {
    return {
      exito: false,
      error: validacion.error.issues?.[0]?.message || "Datos de etapa inválidos.",
    };
  }

  try {
    await servicioCRM.moverEtapaOportunidad(
      validacion.data.oportunidadId,
      validacion.data.etapaNuevaId,
      contexto.organizacionId,
      contexto.usuarioId,
      validacion.data.notas
    );
    revalidatePath("/oportunidades");
    revalidatePath("/panel-control");
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function crearContactoAccion(formData: unknown) {
  const contexto = await exigirPermiso("prospectos:crear");
  const validacion = esquemaCrearContacto.safeParse(formData);

  if (!validacion.success) {
    return {
      exito: false,
      error: validacion.error.issues?.[0]?.message || "Datos del contacto inválidos.",
    };
  }

  try {
    const supabase = (await import("@/librerias/supabase/servidor")).crearClienteSupabaseServidor;
    const client = await supabase();
    const { data, error } = await client
      .from("contactos")
      .insert({
        organizacion_id: contexto.organizacionId,
        nombre: validacion.data.nombre,
        apellidos: validacion.data.apellidos || null,
        correo_principal: validacion.data.correoPrincipal || null,
        telefono_principal: validacion.data.telefonoPrincipal || null,
        cargo: validacion.data.cargo || null,
        empresa_id: validacion.data.empresaId || null,
        notas: validacion.data.notas || null,
        agente_responsable_id: contexto.usuarioId,
        estado: "activo",
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/contactos");
    return { exito: true, contacto: data };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}

export async function crearActividadAccion(formData: unknown) {
  const contexto = await exigirPermiso("prospectos:editar");
  const validacion = esquemaCrearActividad.safeParse(formData);

  if (!validacion.success) {
    return {
      exito: false,
      error: validacion.error.issues?.[0]?.message || "Datos de actividad inválidos.",
    };
  }

  try {
    const actividad = await servicioCRM.crearActividad(validacion.data, contexto.organizacionId);
    revalidatePath("/actividades");
    revalidatePath("/panel-control");
    return { exito: true, actividad };
  } catch (error: any) {
    return { exito: false, error: error.message };
  }
}
