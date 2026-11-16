// ==============================================================================
// IRIS by WYLEN — CALLBACK OAUTH 2.0 (GOOGLE CALENDAR Y MEET)
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { AdaptadorGoogleCalendar } from "@/librerias/adaptadores/google-calendar";
import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";

export async function GET(peticion: NextRequest) {
  const { searchParams } = new URL(peticion.url);

  const codigo = searchParams.get("code");
  const estadoBase64 = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = peticion.nextUrl.origin;

  if (errorParam || !codigo || !estadoBase64) {
    console.error("[OAuth Google] Error recibido de Google:", errorParam);
    return NextResponse.redirect(`${baseUrl}/marketing?error=autorizacion_cancelada`);
  }

  let estado: { usuarioId: string; organizacionId: string };
  try {
    estado = JSON.parse(Buffer.from(estadoBase64, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(`${baseUrl}/marketing?error=estado_invalido`);
  }

  try {
    // 1. Intercambiar código por tokens
    const tokens = await AdaptadorGoogleCalendar.intercambiarCodigoPorTokens(codigo);

    // 2. Obtener el perfil y correo asociado a la cuenta de Google
    const perfil = await AdaptadorGoogleCalendar.obtenerPerfilUsuario(tokens.access_token);

    // 3. Persistir en la tabla conexiones_calendario
    const admin = crearClienteSupabaseAdministrador();
    const fechaExpiracion = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: errUpsert } = await admin.from("conexiones_calendario").upsert(
      {
        organizacion_id: estado.organizacionId,
        usuario_id: estado.usuarioId,
        proveedor: "google_calendar",
        email_calendario: perfil.email,
        id_calendario_principal: "primary",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expira_en: fechaExpiracion,
        estado: "activo",
        sincronizacion_automatica: true,
      },
      { onConflict: "usuario_id, proveedor" }
    );

    if (errUpsert) {
      console.error("[OAuth Google] Error al guardar conexión en base de datos:", errUpsert);
      return NextResponse.redirect(`${baseUrl}/marketing?error=db_error`);
    }

    return NextResponse.redirect(`${baseUrl}/configuracion?google_calendar=conectado&cuenta=${encodeURIComponent(perfil.email)}`);
  } catch (error: any) {
    console.error("[OAuth Google] Error en flujo de callback:", error);
    return NextResponse.redirect(`${baseUrl}/configuracion?error=${encodeURIComponent(error.message)}`);
  }
}
