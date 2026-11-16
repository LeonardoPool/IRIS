// ==============================================================================
// IRIS by WYLEN — GESTIÓN DE SESIÓN EN MIDDLEWARE
// ==============================================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function actualizarSesionSupabase(request: NextRequest) {
  let respuesta = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tu-proyecto.supabase.co";
  const llaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "tu-llave-anonima";

  const supabase = createServerClient(urlSupabase, llaveAnonima, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGuardar) {
        cookiesParaGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({
          request,
        });
        cookiesParaGuardar.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresca la sesión si ha expirado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas públicas que no requieren autenticación
  const rutaActual = request.nextUrl.pathname;
  const esRutaPublica =
    rutaActual.startsWith("/iniciar-sesion") ||
    rutaActual.startsWith("/recuperar-clave") ||
    rutaActual.startsWith("/api/medios") ||
    rutaActual.startsWith("/api/webhooks") ||
    rutaActual.startsWith("/api/formularios") ||
    rutaActual === "/";

  if (!user && !esRutaPublica) {
    // Redirige al inicio de sesión si intenta acceder a rutas protegidas
    const urlRedireccion = request.nextUrl.clone();
    urlRedireccion.pathname = "/iniciar-sesion";
    return NextResponse.redirect(urlRedireccion);
  }

  if (user && (rutaActual === "/iniciar-sesion" || rutaActual === "/")) {
    // Redirige al panel si ya está autenticado
    const urlRedireccion = request.nextUrl.clone();
    urlRedireccion.pathname = "/panel-control";
    return NextResponse.redirect(urlRedireccion);
  }

  return respuesta;
}
