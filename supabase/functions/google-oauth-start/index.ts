// ==============================================================================
// IRIS by WYLEN — SUPABASE EDGE FUNCTION: google-oauth-start
// ==============================================================================
// Inicia el flujo OAuth 2.0 con Google para la Cuenta Maestra de INDOMO
// Scopes: https://www.googleapis.com/auth/calendar.events, userinfo.email
// Access Type: offline, Prompt: consent (Garantiza recepción de refresh_token)
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const organizacionId = url.searchParams.get("organizacion_id") || "11111111-1111-1111-1111-111111111111";
    const retornoUrl = url.searchParams.get("retorno_url") || "https://iris-l62paycrn-leonardopools-projects.vercel.app/configuracion";

    // 1. Obtener variables secretas de Supabase
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || "https://qbircakpagygbdjkmsvp.supabase.co/functions/v1/google-oauth-callback";

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Falta GOOGLE_CLIENT_ID en Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Generar state protegido contra CSRF
    const payloadState = {
      orgId: organizacionId,
      retorno: retornoUrl,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };

    const stateBase64 = btoa(JSON.stringify(payloadState))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 3. Parámetros estrictos OAuth 2.0
    const parametrosAuth = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent", // Obligatorio para obtener refresh_token
      state: stateBase64,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${parametrosAuth.toString()}`;

    // Si la solicitud requiere JSON (por ejemplo invocación desde cliente JS)
    if (url.searchParams.get("formato") === "json") {
      return new Response(
        JSON.stringify({ exito: true, urlAutorizacion: googleAuthUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Por defecto: Redirección 302 directa a Google Accounts
    return Response.redirect(googleAuthUrl, 302);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error al iniciar flujo OAuth" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
