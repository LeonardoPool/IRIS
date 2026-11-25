// ==============================================================================
// IRIS by WYLEN — SERVER ACTIONS: COTIZADOR INMOBILIARIO Y GESTIÓN DE APARTADOS
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioCotizadorYApartados } from "@/servicios/cotizador";
import {
  esquemaCrearApartadoUnidad,
  esquemaEmitirCotizacionInmobiliaria,
  esquemaLiberarOConvertirApartado,
  esquemaProrrogarApartado,
  type DatosCrearApartadoUnidad,
  type DatosEmitirCotizacionInmobiliaria,
  type DatosLiberarOConvertirApartado,
  type DatosProrrogarApartado,
} from "@/librerias/validaciones/cotizador";
import type {
  ApartadoUnidadInmobiliaria,
  ContextoInicialCotizador,
  CotizacionInmobiliaria,
} from "@/tipos/cotizador";

export interface RespuestaAccionCotizador<T = unknown> {
  exito: boolean;
  mensaje: string;
  datos?: T;
}

function resolverRolJerarquicoDesdeContexto(
  contexto: Awaited<ReturnType<typeof obtenerContextoInquilino>>
): string {
  if (!contexto) return "asesor";
  const correo = (contexto.usuario?.correo_electronico || "").toLowerCase();
  const rolCodigo = contexto.rol?.codigo || "";
  if (
    correo === "admin@iris.wylen.com" ||
    correo.startsWith("admin@") ||
    rolCodigo === "administrador_organizacion" ||
    rolCodigo === "super_admin" ||
    rolCodigo === "admin_organizacion"
  ) {
    return "superadministrador";
  }
  if (rolCodigo === "gerente_ventas") return "gerente";
  if (rolCodigo === "supervisor_atencion") return "coordinador";
  return "asesor";
}

export async function accionObtenerContextoCotizador(
  desarrolloId: string
): Promise<RespuestaAccionCotizador<ContextoInicialCotizador>> {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, mensaje: "Sesión no autenticada." };
    }
    const datos = await ServicioCotizadorYApartados.obtenerContextoCotizadorPorDesarrollo(
      contexto.organizacionId,
      desarrolloId
    );
    return {
      exito: true,
      mensaje: "Contexto del cotizador cargado.",
      datos,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "Error al cargar el contexto del cotizador.",
    };
  }
}

export async function accionEmitirCotizacionInmobiliaria(
  entrada: DatosEmitirCotizacionInmobiliaria
): Promise<RespuestaAccionCotizador<CotizacionInmobiliaria>> {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto.usuario?.id) {
      return { exito: false, mensaje: "Sesión no autenticada." };
    }
    const rolJerarquico = resolverRolJerarquicoDesdeContexto(contexto);
    const validado = esquemaEmitirCotizacionInmobiliaria.parse(entrada);
    const cotizacion = await ServicioCotizadorYApartados.emitirCotizacionInmobiliaria(
      contexto.organizacionId,
      contexto.usuario.id,
      rolJerarquico,
      validado
    );

    revalidatePath("/cotizador");
    revalidatePath("/desarrollos");

    return {
      exito: true,
      mensaje: cotizacion.requiere_autorizacion
        ? `Cotización ${cotizacion.folio} guardada como pendiente de autorización gerencial por exceder el descuento permitido.`
        : `Cotización ${cotizacion.folio} emitida correctamente.`,
      datos: cotizacion,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "No fue posible emitir la cotización.",
    };
  }
}

export async function accionCrearApartadoUnidad(
  entrada: DatosCrearApartadoUnidad
): Promise<RespuestaAccionCotizador<ApartadoUnidadInmobiliaria>> {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto.usuario?.id) {
      return { exito: false, mensaje: "Sesión no autenticada." };
    }
    const rolJerarquico = resolverRolJerarquicoDesdeContexto(contexto);
    const validado = esquemaCrearApartadoUnidad.parse(entrada);
    const apartado = await ServicioCotizadorYApartados.crearApartadoUnidad(
      contexto.organizacionId,
      contexto.usuario.id,
      rolJerarquico,
      validado
    );

    revalidatePath("/cotizador");
    revalidatePath("/desarrollos");

    return {
      exito: true,
      mensaje: `Apartado ${apartado.folio_apartado} registrado. La unidad ${apartado.unidad_clave_comercial} quedó reservada.`,
      datos: apartado,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "No fue posible registrar el apartado.",
    };
  }
}

export async function accionProrrogarApartadoUnidad(
  entrada: DatosProrrogarApartado
): Promise<RespuestaAccionCotizador<{ nuevaFechaVencimiento: string; prorrogasAplicadas: number }>> {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto.usuario?.id) {
      return { exito: false, mensaje: "Sesión no autenticada." };
    }
    const rolJerarquico = resolverRolJerarquicoDesdeContexto(contexto);
    const validado = esquemaProrrogarApartado.parse(entrada);
    const resultado = await ServicioCotizadorYApartados.prorrogarApartadoUnidad(
      contexto.organizacionId,
      contexto.usuario.id,
      rolJerarquico,
      validado
    );

    revalidatePath("/cotizador");
    revalidatePath("/desarrollos");

    return {
      exito: true,
      mensaje: `Prórroga #${resultado.prorrogasAplicadas} aplicada y registrada en bitácora.`,
      datos: resultado,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "Error al prorrogar el apartado.",
    };
  }
}

export async function accionLiberarOConvertirApartado(
  entrada: DatosLiberarOConvertirApartado
): Promise<RespuestaAccionCotizador<{ nuevoEstadoUnidad: "disponible" | "vendido"; estadoApartado: string }>> {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId || !contexto.usuario?.id) {
      return { exito: false, mensaje: "Sesión no autenticada." };
    }
    const rolJerarquico = resolverRolJerarquicoDesdeContexto(contexto);
    const validado = esquemaLiberarOConvertirApartado.parse(entrada);
    const resultado = await ServicioCotizadorYApartados.liberarOConvertirApartado(
      contexto.organizacionId,
      contexto.usuario.id,
      rolJerarquico,
      validado
    );

    revalidatePath("/cotizador");
    revalidatePath("/desarrollos");

    return {
      exito: true,
      mensaje:
        validado.accion === "liberar"
          ? "Apartado liberado. La unidad vuelve a estar DISPONIBLE en el inventario y plano SVG."
          : "Apartado formalizado a VENTA. La unidad quedó marcada como VENDIDA.",
      datos: resultado,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "Error al procesar el apartado.",
    };
  }
}
