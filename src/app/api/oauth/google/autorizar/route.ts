// ==============================================================================
// IRIS by WYLEN — RUTA DE AUTORIZACIÓN OAUTH 2.0 (GOOGLE CALENDAR)
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioGoogleCalendarMaestro } from "@/servicios/google-calendar-maestro";

export async function GET(peticion: NextRequest) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) {
    return NextResponse.redirect(new URL("/iniciar-sesion", peticion.url));
  }

  const urlRetorno = `${peticion.nextUrl.origin}/configuracion`;
  const urlAutorizacion = ServicioGoogleCalendarMaestro.generarUrlAutorizacion(
    contexto.organizacionId,
    urlRetorno
  );

  return NextResponse.redirect(urlAutorizacion);
}
