// ==============================================================================
// IRIS by WYLEN — SERVER ACTIONS: FICHA UNIFICADA DEL CLIENTE 360°
// ==============================================================================

"use server";

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  obtenerFichaUnificadaCliente,
  type DatosFichaUnificadaCliente,
} from "@/servicios/ficha-cliente";

export async function accionObtenerFichaUnificadaCliente(params: {
  prospectoId?: string | null;
  contactoId?: string | null;
  oportunidadId?: string | null;
  conversacionId?: string | null;
  correo?: string | null;
  telefono?: string | null;
}): Promise<{
  exito: boolean;
  mensaje?: string;
  ficha?: DatosFichaUnificadaCliente | null;
}> {
  try {
    const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
    const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

    const ficha = await obtenerFichaUnificadaCliente({
      organizacionId,
      ...params,
    });

    return {
      exito: true,
      ficha,
    };
  } catch (error) {
    return {
      exito: false,
      mensaje: error instanceof Error ? error.message : "No fue posible consultar el expediente 360°.",
    };
  }
}
