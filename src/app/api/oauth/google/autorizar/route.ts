// ==============================================================================
// IRIS by WYLEN — RUTA DE AUTORIZACIÓN OAUTH 2.0 (GOOGLE CALENDAR)
// ==============================================================================

import { NextResponse } from "next/server";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { AdaptadorGoogleCalendar } from "@/librerias/adaptadores/google-calendar";

export async function GET() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) {
    return NextResponse.redirect(new URL("/iniciar-sesion", "http://localhost:3000"));
  }

  // Empaquetar estado criptográfico con identificadores de inquilino y usuario
  const estadoSeguridad = Buffer.from(
    JSON.stringify({
      usuarioId: contexto.usuarioId,
      organizacionId: contexto.organizacionId,
      creadoEn: Date.now(),
    })
  ).toString("base64url");

  const urlAutorizacion = AdaptadorGoogleCalendar.generarUrlAutorizacion(estadoSeguridad);

  return NextResponse.redirect(urlAutorizacion);
}
