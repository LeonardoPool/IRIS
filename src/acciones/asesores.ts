// ==============================================================================
// IRIS by WYLEN — ACCIONES DEL SERVIDOR: EXPEDIENTE DE ASESORES Y REASIGNACIÓN
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  crearAsesorConExpediente,
  reasignarCasoAsesor,
  actualizarPermisosAsesor,
  guardarConfiguracionGeocercaYSLA,
  actualizarExencionGeocercaAsesor,
} from "@/servicios/asesores";
import type {
  DatosCrearAsesor,
  DatosReasignarCaso,
  PermisosPersonalizadosAsesor,
  ConfiguracionGeocercaYSLA,
} from "@/tipos/asesores";

/**
 * Acción: Crea el acceso de un nuevo asesor con su expediente completo y PIN
 */
export async function accionCrearAsesor(datos: DatosCrearAsesor) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return {
        exito: false,
        error: "Sesión no válida o no autenticada. Inicie sesión nuevamente.",
      };
    }

    // Administradores y gerentes autorizados para dar de alta personal
    const rolCodigo = contexto.rol?.codigo || "";
    const esAdmin =
      rolCodigo === "administrador_organizacion" ||
      rolCodigo === "admin_organizacion" ||
      rolCodigo === "super_admin" ||
      rolCodigo === "gerente_ventas" ||
      contexto.permisos.includes("usuarios:crear") ||
      contexto.permisos.includes("organizacion:administrar") ||
      contexto.permisos.includes("miembros:gestionar");

    if (!esAdmin) {
      return {
        exito: false,
        error: `Acceso denegado: su rol actual (${contexto.rol?.nombre || rolCodigo}) no cuenta con permisos para crear cuentas de asesores.`,
      };
    }

    const datosSaneados: DatosCrearAsesor = {
      ...datos,
      equipo_id: datos.equipo_id && datos.equipo_id.trim() !== "" ? datos.equipo_id.trim() : null,
      supervisor_id: datos.supervisor_id && datos.supervisor_id.trim() !== "" ? datos.supervisor_id.trim() : null,
    };

    const resultado = await crearAsesorConExpediente({
      organizacionId: contexto.organizacionId,
      adminUserId: contexto.usuarioId,
      datos: datosSaneados,
    });

    revalidatePath("/configuracion");
    revalidatePath("/prospectos");
    revalidatePath("/bandeja");

    return {
      exito: true,
      datos: resultado,
      mensaje: `Asesor ${resultado.nombre} creado exitosamente. Clave temporal asignada: ${resultado.claveTemporal}`,
    };
  } catch (error: any) {
    console.error("Error en accionCrearAsesor:", error);
    return {
      exito: false,
      error: error.message || "Error al registrar el expediente del asesor.",
    };
  }
}

/**
 * Acción: Reasigna un caso (lead, conversación u oportunidad) a otro asesor
 * Autorizado para Administradores y Supervisores de Equipo
 */
export async function accionReasignarCaso(datos: DatosReasignarCaso) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return {
        exito: false,
        error: "Sesión no válida o no autenticada.",
      };
    }

    const rolCodigo = contexto.rol?.codigo || "";
    const esSupervisorOAdmin =
      rolCodigo === "administrador_organizacion" ||
      rolCodigo === "admin_organizacion" ||
      rolCodigo === "supervisor_atencion" ||
      rolCodigo === "gerente_ventas" ||
      rolCodigo === "super_admin" ||
      contexto.permisos.includes("prospectos:todos:actualizar") ||
      contexto.permisos.includes("organizacion:administrar");

    if (!esSupervisorOAdmin) {
      return {
        exito: false,
        error: "Acceso denegado: solo supervisores y administradores pueden reasignar casos.",
      };
    }

    const resultado = await reasignarCasoAsesor({
      organizacionId: contexto.organizacionId,
      solicitanteUserId: contexto.usuarioId,
      datos,
    });

    revalidatePath("/prospectos");
    revalidatePath("/bandeja");
    revalidatePath("/oportunidades");
    revalidatePath("/panel-control");

    return {
      exito: true,
      mensaje: resultado.mensaje,
    };
  } catch (error: any) {
    console.error("Error en accionReasignarCaso:", error);
    return {
      exito: false,
      error: error.message || "Error al procesar la reasignación del caso.",
    };
  }
}

/**
 * Acción: Ajusta los permisos específicos de un asesor
 */
export async function accionActualizarPermisosAsesor(
  asesorId: string,
  permisos: Partial<PermisosPersonalizadosAsesor>
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return {
        exito: false,
        error: "Sesión no válida o no autenticada.",
      };
    }

    const rolCodigo = contexto.rol?.codigo || "";
    const esAdmin =
      rolCodigo === "administrador_organizacion" ||
      rolCodigo === "admin_organizacion" ||
      rolCodigo === "super_admin" ||
      rolCodigo === "gerente_ventas" ||
      contexto.permisos.includes("organizacion:administrar");

    if (!esAdmin) {
      return {
        exito: false,
        error: "Solo el Administrador general puede modificar permisos de asesores.",
      };
    }

    await actualizarPermisosAsesor({
      organizacionId: contexto.organizacionId,
      asesorId,
      permisos,
    });

    revalidatePath("/configuracion");
    return {
      exito: true,
      mensaje: "Permisos del asesor actualizados correctamente.",
    };
  } catch (error: any) {
    console.error("Error en accionActualizarPermisosAsesor:", error);
    return {
      exito: false,
      error: error.message || "Error al actualizar los permisos del asesor.",
    };
  }
}

/**
 * Acción: Guarda la configuración de Geocerca (Google Maps) y SLA de la organización
 */
export async function accionGuardarGeocercaYSLA(datos: ConfiguracionGeocercaYSLA) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return { exito: false, error: "Sesión no válida o no autenticada." };
    }

    const rolCodigo = contexto.rol?.codigo || "";
    const esAdmin =
      rolCodigo === "administrador_organizacion" ||
      rolCodigo === "admin_organizacion" ||
      rolCodigo === "super_admin" ||
      rolCodigo === "gerente_ventas" ||
      contexto.permisos.includes("organizacion:administrar");

    if (!esAdmin) {
      return {
        exito: false,
        error: "Acceso denegado: solo administradores pueden modificar Geocerca y SLA.",
      };
    }

    await guardarConfiguracionGeocercaYSLA({
      organizacionId: contexto.organizacionId,
      datos,
    });

    revalidatePath("/configuracion");
    revalidatePath("/bandeja");
    revalidatePath("/panel-control");

    return {
      exito: true,
      mensaje: "Configuración de Geocerca laboral y SLA actualizada correctamente.",
    };
  } catch (error: any) {
    console.error("Error en accionGuardarGeocercaYSLA:", error);
    return {
      exito: false,
      error: error.message || "Error al guardar la configuración de Geocerca y SLA.",
    };
  }
}

/**
 * Acción: Concede o revoca la exención de Geocerca a un asesor específico (Acceso Remoto)
 */
export async function accionAlternarExencionGeocerca(asesorId: string, exento: boolean) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto) {
      return { exito: false, error: "Sesión no válida o no autenticada." };
    }

    const rolCodigo = contexto.rol?.codigo || "";
    const esAdmin =
      rolCodigo === "administrador_organizacion" ||
      rolCodigo === "admin_organizacion" ||
      rolCodigo === "super_admin" ||
      contexto.permisos.includes("organizacion:administrar");

    if (!esAdmin) {
      return {
        exito: false,
        error: "Solo administradores pueden autorizar exenciones de Geocerca.",
      };
    }

    await actualizarExencionGeocercaAsesor({
      organizacionId: contexto.organizacionId,
      asesorId,
      exento,
    });

    revalidatePath("/configuracion");
    return {
      exito: true,
      mensaje: exento
        ? "Exención concedida: el asesor ahora puede acceder desde cualquier ubicación remota."
        : "Restricción aplicada: el asesor debe estar dentro del perímetro de la sede.",
    };
  } catch (error: any) {
    console.error("Error en accionAlternarExencionGeocerca:", error);
    return {
      exito: false,
      error: error.message || "Error al actualizar exención de Geocerca.",
    };
  }
}
