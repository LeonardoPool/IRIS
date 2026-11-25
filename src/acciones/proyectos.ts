// ==============================================================================
// IRIS by WYLEN — SERVER ACTIONS: PROYECTOS, INVENTARIO Y PLANOS INTERACTIVOS SVG
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  esquemaCrearDesarrolladora,
  esquemaGuardarDesarrollo,
  esquemaCrearEtapaDesarrollo,
  esquemaCrearManzanaDesarrollo,
  esquemaGuardarUnidadInmobiliaria,
  esquemaGuardarPlanoInteractivo,
  type DatosCrearDesarrolladora,
  type DatosGuardarDesarrollo,
  type DatosCrearEtapaDesarrollo,
  type DatosCrearManzanaDesarrollo,
  type DatosGuardarUnidadInmobiliaria,
  type DatosGuardarPlanoInteractivo,
} from "@/librerias/validaciones/proyectos";
import { servicioProyectosInmobiliarios } from "@/servicios/proyectos";
import { sanitizarYAnalizarPlanoSVG } from "@/librerias/utilidades/sanitizador-svg";
import type { FilaImportacionUnidadCruda } from "@/tipos/proyectos";

function verificarAutorizacionAdministrativaProyectos(contexto: Awaited<ReturnType<typeof obtenerContextoInquilino>>): boolean {
  if (!contexto) return false;
  const correo = (contexto.usuario?.correo_electronico || "").toLowerCase();
  const rolCodigo = contexto.rol?.codigo || "";
  return (
    correo === "admin@iris.wylen.com" ||
    correo.startsWith("admin@") ||
    rolCodigo === "administrador_organizacion" ||
    rolCodigo === "super_admin" ||
    rolCodigo === "admin_organizacion" ||
    rolCodigo === "gerente_ventas" ||
    contexto.permisos.includes("organizacion:administrar") ||
    contexto.permisos.includes("equipos:gestionar")
  );
}

export async function accionObtenerCatalogoProyectos() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "Sesión no autenticada." };
    }

    const [desarrolladoras, desarrollos] = await Promise.all([
      servicioProyectosInmobiliarios.listarDesarrolladoras(contexto.organizacionId),
      servicioProyectosInmobiliarios.listarDesarrollosConResumen(contexto.organizacionId),
    ]);

    return {
      exito: true,
      desarrolladoras,
      desarrollos,
      puedeAdministrar: verificarAutorizacionAdministrativaProyectos(contexto),
    };
  } catch (error: any) {
    return {
      exito: false,
      error: error.message || "Error al consultar proyectos inmobiliarios.",
    };
  }
}

export async function accionObtenerEstructuraDesarrollo(desarrolloId: string) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "Sesión no autenticada." };
    }

    const datos = await servicioProyectosInmobiliarios.obtenerEstructuraJerarquicaDesarrollo(
      contexto.organizacionId,
      desarrolloId
    );

    return {
      exito: true,
      ...datos,
      puedeAdministrar: verificarAutorizacionAdministrativaProyectos(contexto),
    };
  } catch (error: any) {
    return {
      exito: false,
      error: error.message || "Error al obtener la estructura del desarrollo.",
    };
  }
}

export async function accionCrearDesarrolladora(datos: DatosCrearDesarrolladora) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para registrar desarrolladoras." };
    }

    const validado = esquemaCrearDesarrolladora.parse(datos);
    const desarrolladora = await servicioProyectosInmobiliarios.crearDesarrolladora(
      contexto.organizacionId,
      contexto.usuarioId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, desarrolladora };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al crear desarrolladora." };
  }
}

export async function accionGuardarDesarrollo(datos: DatosGuardarDesarrollo) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para crear o editar desarrollos." };
    }

    const validado = esquemaGuardarDesarrollo.parse(datos);
    const desarrollo = await servicioProyectosInmobiliarios.guardarDesarrollo(
      contexto.organizacionId,
      contexto.usuarioId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, desarrollo };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al guardar el desarrollo." };
  }
}

export async function accionCrearEtapaDesarrollo(datos: DatosCrearEtapaDesarrollo) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para configurar etapas." };
    }

    const validado = esquemaCrearEtapaDesarrollo.parse(datos);
    const etapa = await servicioProyectosInmobiliarios.crearEtapaDesarrollo(
      contexto.organizacionId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, etapa };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al crear etapa." };
  }
}

export async function accionCrearManzanaDesarrollo(datos: DatosCrearManzanaDesarrollo) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para configurar manzanas." };
    }

    const validado = esquemaCrearManzanaDesarrollo.parse(datos);
    const manzana = await servicioProyectosInmobiliarios.crearManzanaDesarrollo(
      contexto.organizacionId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, manzana };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al crear manzana." };
  }
}

export async function accionGuardarUnidadInmobiliaria(datos: DatosGuardarUnidadInmobiliaria) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para administrar unidades." };
    }

    const validado = esquemaGuardarUnidadInmobiliaria.parse(datos);
    const unidad = await servicioProyectosInmobiliarios.guardarUnidadInmobiliaria(
      contexto.organizacionId,
      contexto.usuarioId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, unidad };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al guardar la unidad inmobiliaria." };
  }
}

export async function accionObtenerHistorialUnidad(unidadId: string) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "Sesión no autenticada." };
    }

    const historial = await servicioProyectosInmobiliarios.listarHistorialUnidad(
      contexto.organizacionId,
      unidadId
    );
    return { exito: true, historial };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al consultar historial de la unidad." };
  }
}

export async function accionPrevalidarImportacionInventario(
  desarrolloId: string,
  filas: FilaImportacionUnidadCruda[]
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para importar inventario." };
    }

    const resultado = await servicioProyectosInmobiliarios.prevalidarImportacionMasiva(
      contexto.organizacionId,
      desarrolloId,
      filas
    );

    return { exito: true, resultado };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al prevalidar archivo de inventario." };
  }
}

export async function accionConfirmarImportacionInventario(
  desarrolloId: string,
  filas: FilaImportacionUnidadCruda[]
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para importar inventario." };
    }

    const reporte = await servicioProyectosInmobiliarios.confirmarImportacionMasiva(
      contexto.organizacionId,
      contexto.usuarioId,
      desarrolloId,
      filas
    );

    revalidatePath("/desarrollos");
    return { exito: true, reporte };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al importar inventario." };
  }
}

export async function accionAnalizarArchivoSVG(contenidoSvg: string) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "Sesión no autenticada." };
    }

    const diagnostico = sanitizarYAnalizarPlanoSVG(contenidoSvg);
    return { exito: true, diagnostico };
  } catch (error: any) {
    return { exito: false, error: error.message || "El archivo SVG no pudo analizarse." };
  }
}

export async function accionGuardarPlanoInteractivo(datos: DatosGuardarPlanoInteractivo) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para publicar planos interactivos." };
    }

    const validado = esquemaGuardarPlanoInteractivo.parse(datos);
    const resultado = await servicioProyectosInmobiliarios.guardarPlanoInteractivoSVG(
      contexto.organizacionId,
      contexto.usuarioId,
      validado
    );

    revalidatePath("/desarrollos");
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al guardar el plano interactivo SVG." };
  }
}

export async function accionGuardarVinculosPlano(
  desarrolloId: string,
  planoId: string,
  vinculos: Array<{ svgElementId: string; unidadId: string }>
) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !verificarAutorizacionAdministrativaProyectos(contexto)) {
      return { exito: false, error: "No cuenta con permisos para modificar asociaciones del plano." };
    }

    const guardados = await servicioProyectosInmobiliarios.guardarVinculosPlanoUnidad(
      contexto.organizacionId,
      desarrolloId,
      planoId,
      vinculos
    );

    revalidatePath("/desarrollos");
    return { exito: true, vinculos: guardados };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al guardar asociaciones del plano." };
  }
}
