// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR: SEGUIMIENTO COMERCIAL Y ESTADOS
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";

export async function accionListarEstadosComerciales() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const estados = await servicioSeguimientoKanban.listarEstadosComerciales(
      contexto.organizacionId
    );

    return { exito: true, estados };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al listar estados." };
  }
}

export async function accionCrearEstadoComercial(datos: {
  nombre: string;
  color?: string;
  descripcion?: string;
  es_cierre?: boolean;
}) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const res = await servicioSeguimientoKanban.crearEstadoComercial(
      contexto.organizacionId,
      datos
    );

    if (res.exito) {
      revalidatePath("/seguimiento");
      revalidatePath("/configuracion");
      revalidatePath("/pool-leads");
    }

    return res;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al crear estado." };
  }
}

export async function accionActualizarEstadoComercial(
  id: string,
  datos: {
    nombre?: string;
    color?: string;
    descripcion?: string;
    activo?: boolean;
    es_cierre?: boolean;
  }
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const res = await servicioSeguimientoKanban.actualizarEstadoComercial(
      id,
      contexto.organizacionId,
      datos
    );

    if (res.exito) {
      revalidatePath("/seguimiento");
      revalidatePath("/configuracion");
      revalidatePath("/pool-leads");
    }

    return res;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al actualizar estado." };
  }
}

export async function accionReordenarEstadosComerciales(
  estadosOrdenados: { id: string; orden: number }[]
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const res = await servicioSeguimientoKanban.reordenarEstadosComerciales(
      contexto.organizacionId,
      estadosOrdenados
    );

    if (res.exito) {
      revalidatePath("/seguimiento");
      revalidatePath("/configuracion");
    }

    return res;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al reordenar estados." };
  }
}

export async function accionEliminarEstadoComercial(
  id: string,
  migrarLeadsAEstadoId?: string
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const res = await servicioSeguimientoKanban.eliminarEstadoComercial(
      id,
      contexto.organizacionId,
      migrarLeadsAEstadoId
    );

    if (res.exito) {
      revalidatePath("/seguimiento");
      revalidatePath("/configuracion");
      revalidatePath("/pool-leads");
    }

    return res;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al eliminar estado." };
  }
}

export async function accionMoverLeadKanban(
  leadId: string,
  nuevoEstadoId: string,
  notas?: string
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto?.usuarioId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const res = await servicioSeguimientoKanban.moverLeadDeEstado(
      leadId,
      nuevoEstadoId,
      contexto.organizacionId,
      contexto.usuarioId,
      notas
    );

    if (res.exito) {
      revalidatePath("/seguimiento");
      revalidatePath("/pool-leads");
    }

    return res;
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al mover prospecto." };
  }
}
