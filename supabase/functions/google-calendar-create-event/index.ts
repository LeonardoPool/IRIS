// ==============================================================================
// IRIS by WYLEN — SUPABASE EDGE FUNCTION: google-calendar-create-event
// ==============================================================================
// Permite que CUALQUIER asesor de INDOMO agende una reunión con Google Meet
// utilizando la cuenta centralizada maestra: indomodesarrollos@gmail.com
// Parámetros: conferenceDataVersion=1 y conferenceData.createRequest
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://qbircakpagygbdjkmsvp.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!serviceRoleKey || !clientId || !clientSecret) {
      throw new Error("Variables secretas de servidor incompletas en Supabase");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Validar identidad del asesor mediante el JWT de sesión
    const authHeader = req.headers.get("Authorization");
    let asesorId: string | null = null;
    let asesorEmail = "asesor@indomodesarrollos.com";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: usuarioData, error: errAuth } = await admin.auth.getUser(token);
      if (!errAuth && usuarioData?.user) {
        asesorId = usuarioData.user.id;
        asesorEmail = usuarioData.user.email || asesorEmail;
      }
    }

    // 2. Parsear cuerpo de la petición
    const body = await req.json();
    const {
      organizacion_id = "11111111-1111-1111-1111-111111111111",
      prospecto_id = null,
      contacto_id = null,
      titulo,
      descripcion = "",
      fecha_inicio,
      fecha_fin,
      zona_horaria = "America/Mexico_City",
      asistentes = [],
      generar_meet = true,
    } = body;

    if (!titulo || !fecha_inicio || !fecha_fin) {
      return new Response(
        JSON.stringify({ exito: false, error: "Título, fecha de inicio y fecha de fin son requeridos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si no se proporcionó asesorId desde el token, intentar resolver de la tabla usuarios
    if (!asesorId) {
      const { data: usuarioOrg } = await admin
        .from("usuarios")
        .select("id")
        .limit(1)
        .maybeSingle();
      asesorId = usuarioOrg?.id || "987e225a-0764-4e20-b151-67f9f549dc72";
    }

    // 3. Obtener la cuenta maestra de Google Calendar de INDOMO
    const { data: conexionMaestra, error: errConexion } = await admin
      .from("conexiones_calendario")
      .select("*")
      .eq("organizacion_id", organizacion_id)
      .eq("es_cuenta_maestra", true)
      .eq("proveedor", "google_calendar")
      .eq("estado", "activo")
      .maybeSingle();

    if (errConexion || !conexionMaestra) {
      return new Response(
        JSON.stringify({
          exito: false,
          error: "No existe una cuenta maestra de Google Calendar conectada para esta organización. Un administrador debe autorizar indomodesarrollos@gmail.com en Configuración.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = conexionMaestra.access_token;
    const ahoraMs = Date.now();
    const expiraMs = new Date(conexionMaestra.expira_en).getTime();

    // 4. Renovación automática del token si está expirado o próximo a expirar (< 5 minutos)
    if (ahoraMs >= expiraMs - 5 * 60 * 1000 && conexionMaestra.refresh_token) {
      console.log("[Calendar Event] Access token expirado. Renovando con refresh_token...");
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: conexionMaestra.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const errorRefresh = await refreshResponse.text();
        console.error("[Calendar Event] Error al renovar token:", errorRefresh);
        await admin
          .from("conexiones_calendario")
          .update({ estado: "error_token" })
          .eq("id", conexionMaestra.id);

        return new Response(
          JSON.stringify({
            exito: false,
            error: "La autorización de Google ha expirado o fue revocada. Es necesario que el administrador vuelva a conectar la cuenta.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nuevosTokens = await refreshResponse.json();
      accessToken = nuevosTokens.access_token;
      const nuevaExpiraEn = new Date(Date.now() + (nuevosTokens.expires_in || 3600) * 1000).toISOString();

      // Guardar el nuevo access_token en la base de datos
      await admin
        .from("conexiones_calendario")
        .update({
          access_token: accessToken,
          expira_en: nuevaExpiraEn,
          estado: "activo",
        })
        .eq("id", conexionMaestra.id);
    }

    // 5. Preparar petición de creación a la API de Google Calendar v3
    // conferenceDataVersion=1 es obligatorio para generar enlaces de Google Meet
    const urlGoogleCalendar = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1";

    // Normalizar lista de asistentes (emails)
    const listaAsistentes = Array.isArray(asistentes)
      ? asistentes.map((item: any) => (typeof item === "string" ? { email: item.trim() } : { email: item.email }))
      : [];

    const payloadEvento: Record<string, any> = {
      summary: titulo,
      description: `${descripcion}\n\nReunión agendada desde IRIS CRM para INDOMO por: ${asesorEmail}`,
      start: {
        dateTime: fecha_inicio,
        timeZone: zona_horaria,
      },
      end: {
        dateTime: fecha_fin,
        timeZone: zona_horaria,
      },
      attendees: listaAsistentes,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    // Solicitar enlace de Google Meet
    if (generar_meet) {
      payloadEvento.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const respuestaGoogle = await fetch(urlGoogleCalendar, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadEvento),
    });

    if (!respuestaGoogle.ok) {
      const errorTexto = await respuestaGoogle.text();
      console.error("[Google Calendar API] Error al crear evento:", errorTexto);
      return new Response(
        JSON.stringify({ exito: false, error: `Error de Google Calendar (${respuestaGoogle.status}): ${errorTexto}` }),
        { status: respuestaGoogle.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventoCreado = await respuestaGoogle.json();

    // Extraer enlace oficial de Google Meet
    const meetLink =
      eventoCreado.hangoutLink ||
      eventoCreado.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
      null;

    const htmlLink = eventoCreado.htmlLink || "";
    const eventId = eventoCreado.id;

    // 6. Guardar en tabla reuniones_google_meet
    let reunionRegistrada = null;
    try {
      const { data: reunionData } = await admin
        .from("reuniones_google_meet")
        .insert({
          organizacion_id,
          asesor_id: asesorId,
          prospecto_id,
          contacto_id,
          titulo,
          descripcion,
          fecha_inicio,
          fecha_fin,
          zona_horaria,
          google_event_id: eventId,
          google_calendar_id: "primary",
          google_meet_link: meetLink,
          google_html_link: htmlLink,
          email_cuenta_maestra: conexionMaestra.email_calendario || "indomodesarrollos@gmail.com",
          asistentes: listaAsistentes,
          estado: "programada",
        })
        .select()
        .single();
      reunionRegistrada = reunionData;
    } catch (e) {
      console.warn("[Calendar Event] Advertencia al insertar en reuniones_google_meet:", e);
    }

    // 7. Guardar en actividades del CRM
    try {
      await admin.from("actividades").insert({
        organizacion_id,
        usuario_responsable_id: asesorId,
        prospecto_id,
        contacto_id,
        tipo_actividad: "reunion",
        titulo,
        descripcion: `${descripcion}\nEnlace Google Meet: ${meetLink || "No generado"}`,
        prioridad: "alta",
        estado: "pendiente",
        fecha_vencimiento: fecha_inicio,
        resultado_notas: `Google Calendar ID: ${eventId}`,
      });
    } catch (e) {
      console.warn("[Calendar Event] Advertencia al insertar en actividades:", e);
    }

    return new Response(
      JSON.stringify({
        exito: true,
        eventoId: eventId,
        google_meet_link: meetLink,
        google_html_link: htmlLink,
        titulo: eventoCreado.summary,
        cuenta_maestra: conexionMaestra.email_calendario,
        reunion: reunionRegistrada,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Calendar Event] Error interno:", err);
    return new Response(
      JSON.stringify({ exito: false, error: err.message || "Error al procesar la reunión" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
