// ==============================================================================
// IRIS by WYLEN — SUPABASE EDGE FUNCTION: google-oauth-callback
// ==============================================================================
// URI Registrada en Google Cloud:
// https://qbircakpagygbdjkmsvp.supabase.co/functions/v1/google-oauth-callback
// ==============================================================================
// Intercambia el código temporal por tokens OAuth (access_token + refresh_token).
// Almacena de forma segura la cuenta maestra de Google Calendar de INDOMO.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateBase64 = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // URL base de retorno por defecto
  let retornoUrl = "https://iris-l62paycrn-leonardopools-projects.vercel.app/configuracion";
  let organizacionId = "11111111-1111-1111-1111-111111111111";

  // 1. Decodificar state
  if (stateBase64) {
    try {
      // Normalizar base64url
      let base64 = stateBase64.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const parsed = JSON.parse(atob(base64));
      if (parsed.orgId) organizacionId = parsed.orgId;
      if (parsed.retorno) retornoUrl = parsed.retorno;
    } catch (e) {
      console.warn("[OAuth Callback] Error al parsear state:", e);
    }
  }

  // Si Google devolvió un error (ej. el usuario canceló el consentimiento)
  if (errorParam || !code) {
    console.error("[OAuth Callback] Error recibido de Google:", errorParam);
    const redirectError = new URL(retornoUrl);
    redirectError.searchParams.set("error", errorParam || "codigo_no_suministrado");
    return Response.redirect(redirectError.toString(), 302);
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || "https://qbircakpagygbdjkmsvp.supabase.co/functions/v1/google-oauth-callback";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://qbircakpagygbdjkmsvp.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret || !serviceRoleKey) {
      throw new Error("Variables secretas incompletas en Supabase (CLIENT_ID, CLIENT_SECRET o SERVICE_ROLE_KEY)");
    }

    // 2. Intercambio de código por tokens ante Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorDetalle = await tokenResponse.text();
      console.error("[OAuth Callback] Error de intercambio:", errorDetalle);
      throw new Error(`Google rechazó el intercambio de código (${tokenResponse.status}): ${errorDetalle}`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token; // Retornado gracias a access_type=offline y prompt=consent
    const expiresIn = tokens.expires_in || 3600;
    const expiraEn = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Obtener perfil de la cuenta de Google para validar email de INDOMO
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let emailCuenta = "indomodesarrollos@gmail.com";
    if (userinfoResponse.ok) {
      const userInfo = await userinfoResponse.json();
      if (userInfo.email) {
        emailCuenta = userInfo.email;
      }
    }

    // 4. Conectar con Supabase mediante Service Role para persistir la conexión maestra
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Buscar si ya existe la conexión maestra de esta organización
    const { data: existente } = await supabase
      .from("conexiones_calendario")
      .select("id, refresh_token")
      .eq("organizacion_id", organizacionId)
      .eq("es_cuenta_maestra", true)
      .eq("proveedor", "google_calendar")
      .maybeSingle();

    // Si Google no devolvió un nuevo refresh_token (porque ya se había autorizado antes),
    // preservamos el refresh_token previo existente
    const tokenActualizacionAGuardar = refreshToken || existente?.refresh_token;

    const datosConexion = {
      organizacion_id: organizacionId,
      usuario_id: null, // Cuenta maestra de la organización (no ligada a un solo asesor)
      es_cuenta_maestra: true,
      proveedor: "google_calendar",
      email_calendario: emailCuenta,
      nombre_cuenta: "Cuenta Maestra INDOMO",
      id_calendario_principal: "primary",
      access_token: accessToken,
      refresh_token: tokenActualizacionAGuardar,
      expira_en: expiraEn,
      alcances: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email"],
      estado: "activo",
      sincronizacion_automatica: true,
    };

    let errorDb;
    if (existente?.id) {
      const { error } = await supabase
        .from("conexiones_calendario")
        .update(datosConexion)
        .eq("id", existente.id);
      errorDb = error;
    } else {
      const { error } = await supabase
        .from("conexiones_calendario")
        .insert(datosConexion);
      errorDb = error;
    }

    if (errorDb) {
      console.error("[OAuth Callback] Error al persistir en base de datos:", errorDb);
      throw new Error(`Error en base de datos: ${errorDb.message}`);
    }

    // 5. Redirección de éxito al panel de IRIS
    const redirectOk = new URL(retornoUrl);
    redirectOk.searchParams.set("google_calendar", "conectado");
    redirectOk.searchParams.set("cuenta_maestra", emailCuenta);

    return Response.redirect(redirectOk.toString(), 302);
  } catch (err: any) {
    console.error("[OAuth Callback] Excepción capturada:", err);
    const redirectFallo = new URL(retornoUrl);
    redirectFallo.searchParams.set("error", "fallo_autenticacion_google");
    redirectFallo.searchParams.set("mensaje", encodeURIComponent(err.message || "Error desconocido"));
    return Response.redirect(redirectFallo.toString(), 302);
  }
});
