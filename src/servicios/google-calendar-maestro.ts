// ==============================================================================
// IRIS by WYLEN — SERVICIO: GOOGLE CALENDAR MAESTRO PARA INDOMO
// ==============================================================================
// Centralización de Google Calendar & Meet para INDOMO (indomodesarrollos@gmail.com)
// Permite que cualquier asesor agende citas con Google Meet sin conectar cuenta personal.
// ==============================================================================

import crypto from "crypto";
import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";

export interface EstadoConexionGoogleMaestra {
  conectado: boolean;
  emailCuenta: string | null;
  idConexion?: string;
  expiraEn?: string;
  requiereReconexion?: boolean;
}

export interface ParametrosCrearReunionMeet {
  asesorId: string;
  organizacionId: string;
  prospectoId?: string | null;
  contactoId?: string | null;
  titulo: string;
  descripcion?: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  zonaHoraria?: string;
  asistentes?: string[];
  generarMeet?: boolean;
}

export interface ResultadoReunionMeet {
  exito: boolean;
  eventoId?: string;
  googleMeetLink?: string;
  googleHtmlLink?: string;
  titulo?: string;
  cuentaMaestra?: string;
  error?: string;
}

export class ServicioGoogleCalendarMaestro {
  private static readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
  private static readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
  private static readonly REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://qbircakpagygbdjkmsvp.supabase.co/functions/v1/google-oauth-callback";

  /**
   * Consulta el estado de conexión de la cuenta maestra de Google Calendar de la organización
   */
  static async obtenerEstadoConexion(organizacionId: string): Promise<EstadoConexionGoogleMaestra> {
    const admin = crearClienteSupabaseAdministrador();

    // 1. Buscar conexión marcada como cuenta maestra o conexión activa de la organización
    const { data: conexion } = await admin
      .from("conexiones_calendario")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("proveedor", "google_calendar")
      .order("fecha_actualizacion", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conexion || conexion.estado === "desconectado") {
      return {
        conectado: false,
        emailCuenta: null,
      };
    }

    const expiraMs = new Date(conexion.expira_en).getTime();
    const ahoraMs = Date.now();
    const requiereReconexion =
      conexion.estado === "error_token" || (!conexion.refresh_token && ahoraMs >= expiraMs);

    return {
      conectado: conexion.estado === "activo",
      emailCuenta: conexion.email_calendario || "indomodesarrollos@gmail.com",
      idConexion: conexion.id,
      expiraEn: conexion.expira_en,
      requiereReconexion,
    };
  }

  /**
   * Genera la URL oficial de Google OAuth para que el Administrador vincule indomodesarrollos@gmail.com
   */
  static generarUrlAutorizacion(
    organizacionId: string,
    retornoUrl: string = "https://iris-l62paycrn-leonardopools-projects.vercel.app/configuracion"
  ): string {
    const statePayload = {
      orgId: organizacionId,
      retorno: retornoUrl,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };

    const stateBase64 = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Si existen secrets en frontend los usa, si no, usa el redirect de la Edge Function
    const clientId =
      this.CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.REDIRECT_URI,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: stateBase64,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Crea una reunión en Google Calendar con enlace automático a Google Meet
   * usando la cuenta maestra centralizada de INDOMO.
   */
  static async crearReunionConMeet(
    params: ParametrosCrearReunionMeet
  ): Promise<ResultadoReunionMeet> {
    const admin = crearClienteSupabaseAdministrador();

    // 1. Obtener la conexión maestra de la organización
    const { data: conexion, error: errConexion } = await admin
      .from("conexiones_calendario")
      .select("*")
      .eq("organizacion_id", params.organizacionId)
      .eq("proveedor", "google_calendar")
      .eq("estado", "activo")
      .order("fecha_actualizacion", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errConexion || !conexion) {
      return {
        exito: false,
        error:
          "No hay una cuenta maestra de Google Calendar conectada para INDOMO. El administrador debe vincular indomodesarrollos@gmail.com en el panel de Configuración.",
      };
    }

    let accessToken = conexion.access_token;
    const ahoraMs = Date.now();
    const expiraMs = new Date(conexion.expira_en).getTime();

    // 2. Renovar token si caducó
    if (ahoraMs >= expiraMs - 5 * 60 * 1000 && conexion.refresh_token) {
      const clientId = this.CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      const clientSecret = this.CLIENT_SECRET;

      if (clientId && clientSecret) {
        try {
          const resRefresh = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: conexion.refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (resRefresh.ok) {
            const dataRefresh = await resRefresh.json();
            accessToken = dataRefresh.access_token;
            const nuevaExpira = new Date(
              Date.now() + (dataRefresh.expires_in || 3600) * 1000
            ).toISOString();

            await admin
              .from("conexiones_calendario")
              .update({ access_token: accessToken, expira_en: nuevaExpira })
              .eq("id", conexion.id);
          }
        } catch (e) {
          console.warn("[Google Calendar] Error al renovar token:", e);
        }
      }
    }

    // 3. Crear el evento en Google Calendar API v3
    // conferenceDataVersion=1 habilita la creación de enlaces de Google Meet
    const urlApi = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`;

    const asistentesObj = (params.asistentes || []).map((email) => ({
      email: email.trim(),
    }));

    const payloadEvento: Record<string, any> = {
      summary: params.titulo,
      description: `${params.descripcion || ""}\n\nReunión agendada vía IRIS CRM para INDOMO.`,
      start: {
        dateTime: params.fechaInicio,
        timeZone: params.zonaHoraria || "America/Mexico_City",
      },
      end: {
        dateTime: params.fechaFin,
        timeZone: params.zonaHoraria || "America/Mexico_City",
      },
      attendees: asistentesObj,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    if (params.generarMeet !== false) {
      payloadEvento.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    try {
      const resGoogle = await fetch(urlApi, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadEvento),
      });

      if (!resGoogle.ok) {
        const errText = await resGoogle.text();
        console.error("[Google Calendar API] Error al crear evento:", errText);
        return {
          exito: false,
          error: `Error de Google Calendar (${resGoogle.status}): ${errText}`,
        };
      }

      const eventoGoogle = await resGoogle.json();

      const meetLink =
        eventoGoogle.hangoutLink ||
        eventoGoogle.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
        null;

      const htmlLink = eventoGoogle.htmlLink || "";
      const eventId = eventoGoogle.id;

      // 4. Guardar en tabla actividades de IRIS CRM
      try {
        await admin.from("actividades").insert({
          organizacion_id: params.organizacionId,
          usuario_responsable_id: params.asesorId,
          prospecto_id: params.prospectoId || null,
          contacto_id: params.contactoId || null,
          tipo_actividad: "reunion",
          titulo: params.titulo,
          descripcion: `${params.descripcion || "Reunión agendada vía Google Calendar con videollamada Meet"}\nEnlace Google Meet: ${meetLink || "No generado"}`,
          prioridad: "alta",
          estado: "pendiente",
          fecha_vencimiento: params.fechaInicio,
          resultado_notas: `Google Event ID: ${eventId}`,
        });
      } catch (e) {
        console.warn("[Google Calendar] Advertencia al registrar actividad:", e);
      }

      // 5. Intentar guardar en tabla reuniones_google_meet si ya se aplicó la migración
      try {
        await admin.from("reuniones_google_meet").insert({
          organizacion_id: params.organizacionId,
          asesor_id: params.asesorId,
          prospecto_id: params.prospectoId || null,
          contacto_id: params.contactoId || null,
          titulo: params.titulo,
          descripcion: params.descripcion,
          fecha_inicio: params.fechaInicio,
          fecha_fin: params.fechaFin,
          zona_horaria: params.zonaHoraria || "America/Mexico_City",
          google_event_id: eventId,
          google_calendar_id: "primary",
          google_meet_link: meetLink,
          google_html_link: htmlLink,
          email_cuenta_maestra: conexion.email_calendario || "indomodesarrollos@gmail.com",
          asistentes: asistentesObj,
          estado: "programada",
        });
      } catch {
        // Silencioso si la tabla no está creada aún en Postgres
      }

      return {
        exito: true,
        eventoId: eventId,
        googleMeetLink: meetLink,
        googleHtmlLink: htmlLink,
        titulo: eventoGoogle.summary,
        cuentaMaestra: conexion.email_calendario || "indomodesarrollos@gmail.com",
      };
    } catch (err: any) {
      console.error("[Google Calendar] Excepción al procesar evento:", err);
      return {
        exito: false,
        error: err.message || "Error al conectar con la API de Google Calendar.",
      };
    }
  }
}
