// ==============================================================================
// IRIS by WYLEN — ADAPTADOR PARA GOOGLE CALENDAR Y GOOGLE MEET
// ==============================================================================
// Autenticación OAuth 2.0, sincronización de agenda y generación de enlaces Meet
// ==============================================================================

import crypto from "crypto";

export interface TokensGoogleOAuth {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface InformacionUsuarioGoogle {
  email: string;
  verified_email: boolean;
  name?: string;
}

export interface ParametrosCrearEventoGoogle {
  titulo: string;
  descripcion?: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  zonaHoraria?: string;
  asistentes?: string[];
  generarMeet?: boolean;
}

export interface EventoGoogleCreado {
  id: string;
  htmlLink: string;
  hangoutLink?: string; // Enlace oficial a la videollamada de Google Meet
  status: string;
  summary: string;
}

export class AdaptadorGoogleCalendar {
  private static readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
  private static readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
  private static readonly REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth/google/callback";

  /**
   * Genera la URL de autorización OAuth 2.0 para que el usuario conceda acceso
   */
  static generarUrlAutorizacion(estadoSeguridad: string): string {
    const parametros = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: estadoSeguridad,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`;
  }

  /**
   * Intercambia el código de autorización temporal por tokens de acceso y actualización
   */
  static async intercambiarCodigoPorTokens(codigo: string): Promise<TokensGoogleOAuth> {
    const respuesta = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: codigo,
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        redirect_uri: this.REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      throw new Error(`Error en intercambio de tokens Google (${respuesta.status}): ${errorTexto}`);
    }

    return (await respuesta.json()) as TokensGoogleOAuth;
  }

  /**
   * Refresca un token de acceso caducado utilizando el refresh_token
   */
  static async refrescarTokenAcceso(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const respuesta = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      throw new Error(`Error al refrescar token de Google: ${errorTexto}`);
    }

    return (await respuesta.json()) as { access_token: string; expires_in: number };
  }

  /**
   * Obtiene el perfil básico y correo del usuario autenticado
   */
  static async obtenerPerfilUsuario(accessToken: string): Promise<InformacionUsuarioGoogle> {
    const respuesta = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!respuesta.ok) {
      throw new Error("No se pudo obtener el perfil de usuario de Google");
    }

    return (await respuesta.json()) as InformacionUsuarioGoogle;
  }

  /**
   * Crea un evento en el calendario del usuario e incluye opcionalmente videollamada de Google Meet
   */
  static async crearEvento(
    accessToken: string,
    idCalendario: string = "primary",
    parametros: ParametrosCrearEventoGoogle
  ): Promise<EventoGoogleCreado> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      idCalendario
    )}/events?conferenceDataVersion=1`;

    const cuerpo: Record<string, any> = {
      summary: parametros.titulo,
      description: parametros.descripcion || "",
      start: {
        dateTime: parametros.fechaInicio,
        timeZone: parametros.zonaHoraria || "America/Mexico_City",
      },
      end: {
        dateTime: parametros.fechaFin,
        timeZone: parametros.zonaHoraria || "America/Mexico_City",
      },
      attendees: parametros.asistentes?.map((email) => ({ email })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    if (parametros.generarMeet) {
      cuerpo.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const errorTexto = await respuesta.text();
      throw new Error(`Error al crear evento en Google Calendar (${respuesta.status}): ${errorTexto}`);
    }

    const datos = await respuesta.json();
    return {
      id: datos.id,
      htmlLink: datos.htmlLink,
      hangoutLink: datos.hangoutLink,
      status: datos.status,
      summary: datos.summary,
    };
  }
}
