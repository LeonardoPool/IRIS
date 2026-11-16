// ==============================================================================
// IRIS by WYLEN — PROXY PRINCIPAL DE NEXT.JS 16
// ==============================================================================
// En Next.js 16, la convención `middleware` fue sucedida por `proxy`
// ==============================================================================

import { type NextRequest } from "next/server";
import { actualizarSesionSupabase } from "@/librerias/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await actualizarSesionSupabase(request);
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de solicitud excepto las que comienzan con:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono de favoritos)
     * - archivos con extensiones (.svg, .png, .jpg, .jpeg, .gif, .webp, .mp4, .webm)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
