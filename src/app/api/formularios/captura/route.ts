// ==============================================================================
// IRIS by WYLEN — ENDPOINT PÚBLICO DE CAPTURA DE FORMULARIOS WEB
// ==============================================================================
// Recibe prospectos desde sitios web institucionales con validación Zod,
// protección honeypot anti-spam, cabeceras CORS y registro de auditoría
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { esquemaCapturaFormularioPublico } from "@/librerias/validaciones/marketing";
import { ServicioMarketing } from "@/servicios/marketing";

const servicioMarketing = new ServicioMarketing();

// Manejador CORS preflight OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(peticion: NextRequest) {
  const cabecerasCors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  };

  try {
    const cuerpo = await peticion.json();

    // 1. Validación de esquema con Zod
    const resultadoValidacion = esquemaCapturaFormularioPublico.safeParse(cuerpo);
    if (!resultadoValidacion.success) {
      return NextResponse.json(
        {
          exito: false,
          error: "Datos de formulario inválidos",
          detalles: resultadoValidacion.error.format(),
        },
        { status: 400, headers: cabecerasCors }
      );
    }

    // 2. Metadatos de red para auditoría forense
    const ip =
      peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      peticion.headers.get("x-real-ip") ||
      null;
    const userAgent = peticion.headers.get("user-agent") || null;
    const origenUrl = peticion.headers.get("origin") || peticion.headers.get("referer") || null;

    // 3. Procesamiento en servicio de dominio
    const resultado = await servicioMarketing.procesarCapturaFormularioPublico(
      resultadoValidacion.data,
      { ip, userAgent, origenUrl }
    );

    return NextResponse.json(resultado, { status: 200, headers: cabecerasCors });
  } catch (error: any) {
    console.error("[Captura Formulario] Error al procesar lead entrante:", error);

    return NextResponse.json(
      {
        exito: false,
        error: error.message || "Ocurrió un error al procesar el formulario.",
      },
      { status: 500, headers: cabecerasCors }
    );
  }
}
