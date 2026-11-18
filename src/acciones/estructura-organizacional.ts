// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR: ESTRUCTURA ORGANIZACIONAL Y TRASPASOS
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioEstructuraOrganizacional } from "@/servicios/estructura-organizacional";
import type { DatosTraspasoPersonal } from "@/tipos/estructura-organizacional";

export async function accionObtenerOrganigrama() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const organigrama = await servicioEstructuraOrganizacional.obtenerOrganigrama(
      contexto.organizacionId
    );

    return { exito: true, organigrama };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al obtener organigrama." };
  }
}

export async function accionEjecutarTraspaso(datos: DatosTraspasoPersonal) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto?.usuarioId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const resultado = await servicioEstructuraOrganizacional.ejecutarTraspasoPersonal(
      datos,
      contexto.organizacionId,
      contexto.usuarioId
    );

    if (resultado.exito) {
      revalidatePath("/configuracion");
      revalidatePath("/pool-leads");
      revalidatePath("/seguimiento");
    }

    return resultado;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al ejecutar traspaso." };
  }
}

export async function accionListarAuditoriaTraspasos() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const registros = await servicioEstructuraOrganizacional.listarAuditoriaTraspasos(
      contexto.organizacionId
    );

    return { exito: true, registros };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al listar auditoría." };
  }
}
