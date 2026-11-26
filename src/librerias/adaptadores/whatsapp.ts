// ==============================================================================
// IRIS by WYLEN — ADAPTADOR WHATSAPP BUSINESS CLOUD API
// ==============================================================================
// Normalización de eventos, verificación HMAC SHA-256 e idempotencia
// ==============================================================================

import crypto from "crypto";

export interface PayloadMensajeNormalizado {
  proveedorMensajeId: string;
  proveedorCuentaId: string;
  remitenteTelefono: string; // Formato E.164
  remitenteNombre: string;
  tipoContenido: "texto" | "imagen" | "documento" | "audio" | "video" | "ubicacion";
  contenidoTexto?: string;
  adjuntoUrl?: string;
  marcaTiempoProveedor: string;
}

export interface PayloadEstadoMensaje {
  proveedorMensajeId: string;
  proveedorCuentaId: string;
  estado: "sent" | "delivered" | "read" | "failed";
  marcaTiempoProveedor: string;
  codigoError?: number;
  mensajeError?: string;
}

export class AdaptadorWhatsAppCloud {
  private readonly versionGraph: string;

  constructor() {
    this.versionGraph = process.env.META_GRAPH_API_VERSION || "v21.0";
  }

  /**
   * Valida criptográficamente la firma del webhook de Meta (HMAC-SHA256).
   * Previene ataques de falsificación y timing attacks.
   */
  verificarFirmaWebhook(cuerpoCrudo: string, firmaCabecera: string | null): boolean {
    const secretoApp = process.env.META_APP_SECRET;
    if (!secretoApp || !firmaCabecera) {
      // En desarrollo sin secreto configurado se permite registrar la advertencia
      if (process.env.NODE_ENV === "development" && !secretoApp) {
        console.warn("[WhatsApp Webhook] META_APP_SECRET no configurada. Omitiendo validación HMAC en desarrollo.");
        return true;
      }
      return false;
    }

    try {
      const firmaPartes = firmaCabecera.split("sha256=");
      if (firmaPartes.length !== 2) return false;
      const firmaEsperada = firmaPartes[1];

      const hmac = crypto.createHmac("sha256", secretoApp);
      const firmaCalculada = hmac.update(cuerpoCrudo).digest("hex");

      const bufferEsperado = Buffer.from(firmaEsperada, "hex");
      const bufferCalculado = Buffer.from(firmaCalculada, "hex");

      if (bufferEsperado.length !== bufferCalculado.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufferEsperado, bufferCalculado);
    } catch (error) {
      console.error("[WhatsApp Webhook] Error al verificar firma:", error);
      return false;
    }
  }

  /**
   * Extrae y normaliza los mensajes entrantes desde el payload de Meta Graph API.
   */
  normalizarMensajesEntrantes(payload: any): PayloadMensajeNormalizado[] {
    const mensajesNormalizados: PayloadMensajeNormalizado[] = [];

    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return mensajesNormalizados;
    }

    for (const entrada of payload.entry) {
      if (!entrada.changes || !Array.isArray(entrada.changes)) continue;

      for (const cambio of entrada.changes) {
        const valor = cambio.value;
        if (!valor || !valor.messages || !Array.isArray(valor.messages)) continue;

        const metadata = valor.metadata;
        const proveedorCuentaId = metadata?.phone_number_id || "";
        const contactoInfo = valor.contacts?.[0];
        const remitenteNombre = contactoInfo?.profile?.name || "Cliente WhatsApp";

        for (const mensaje of valor.messages) {
          const idMensaje = mensaje.id;
          const remitenteTelefono = mensaje.from;
          const marcaTiempo = new Date(Number(mensaje.timestamp) * 1000).toISOString();
          const tipo = mensaje.type;

          let tipoContenido: PayloadMensajeNormalizado["tipoContenido"] = "texto";
          let contenidoTexto: string | undefined = undefined;
          let adjuntoUrl: string | undefined = undefined;

          if (tipo === "text") {
            tipoContenido = "texto";
            contenidoTexto = mensaje.text?.body;
          } else if (tipo === "image") {
            tipoContenido = "imagen";
            adjuntoUrl = mensaje.image?.id;
            contenidoTexto = mensaje.image?.caption;
          } else if (tipo === "document") {
            tipoContenido = "documento";
            adjuntoUrl = mensaje.document?.id;
            contenidoTexto = mensaje.document?.filename;
          } else if (tipo === "audio") {
            tipoContenido = "audio";
            adjuntoUrl = mensaje.audio?.id;
          } else if (tipo === "video") {
            tipoContenido = "video";
            adjuntoUrl = mensaje.video?.id;
          } else if (tipo === "location") {
            tipoContenido = "ubicacion";
            contenidoTexto = `Ubicación: ${mensaje.location?.latitude}, ${mensaje.location?.longitude}`;
          }

          mensajesNormalizados.push({
            proveedorMensajeId: idMensaje,
            proveedorCuentaId,
            remitenteTelefono,
            remitenteNombre,
            tipoContenido,
            contenidoTexto,
            adjuntoUrl,
            marcaTiempoProveedor: marcaTiempo,
          });
        }
      }
    }

    return mensajesNormalizados;
  }

  /**
   * Extrae y normaliza las actualizaciones de estado de mensajes (sent, delivered, read, failed)
   * enviadas por Meta Graph API en los webhooks.
   */
  normalizarEstadosMensajes(payload: any): PayloadEstadoMensaje[] {
    const estadosNormalizados: PayloadEstadoMensaje[] = [];

    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return estadosNormalizados;
    }

    const estadosValidos = new Set(["sent", "delivered", "read", "failed"]);

    for (const entrada of payload.entry) {
      if (!entrada.changes || !Array.isArray(entrada.changes)) continue;

      for (const cambio of entrada.changes) {
        const valor = cambio.value;
        if (!valor || !valor.statuses || !Array.isArray(valor.statuses)) continue;

        const proveedorCuentaId = valor.metadata?.phone_number_id || "";

        for (const st of valor.statuses) {
          if (!st?.id || !estadosValidos.has(st.status)) continue;

          const primerError = Array.isArray(st.errors) ? st.errors[0] : undefined;
          estadosNormalizados.push({
            proveedorMensajeId: st.id,
            proveedorCuentaId,
            estado: st.status,
            marcaTiempoProveedor: st.timestamp
              ? new Date(Number(st.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            codigoError: primerError?.code,
            mensajeError: primerError?.title || primerError?.message,
          });
        }
      }
    }

    return estadosNormalizados;
  }

  private esCredencialDemo(proveedorCuentaId: string, tokenAcceso: string): boolean {
    return (
      !tokenAcceso ||
      tokenAcceso.includes("TOKEN_DEMO") ||
      !proveedorCuentaId ||
      proveedorCuentaId.startsWith("PHONE_NUM_DEMO") ||
      proveedorCuentaId.includes("tu_phone_number_id")
    );
  }

  private formatearErrorMeta(errorData: any, contexto: string): Error {
    const err = errorData?.error;
    const codigoMeta = err?.code;
    const detalle = err?.error_data?.details || err?.message || "Error desconocido de Meta Graph API.";

    if (codigoMeta === 131047) {
      return new Error(
        "VENTANA_24H_EXPIRADA: Han pasado más de 24 horas desde el último mensaje del cliente. Debes enviar una plantilla aprobada por Meta."
      );
    }
    if (codigoMeta === 131030) {
      return new Error(
        "DESTINATARIO_NO_PERMITIDO: El número destinatario no está en la lista de números permitidos de la app de prueba en Meta."
      );
    }
    if (codigoMeta === 190) {
      return new Error(
        "TOKEN_META_INVALIDO: El token de acceso de WhatsApp expiró o es inválido. Actualiza las credenciales de la cuenta."
      );
    }
    return new Error(`Error Meta (${contexto}${codigoMeta ? ` #${codigoMeta}` : ""}): ${detalle}`);
  }

  /**
   * Envía un mensaje de texto saliente utilizando la WhatsApp Business Cloud API.
   */
  async enviarMensajeTexto(
    proveedorCuentaId: string,
    tokenAcceso: string,
    destinatarioTelefono: string,
    texto: string
  ): Promise<{ idMensajeProveedor: string }> {
    // Si no hay token de acceso configurado o es entorno de demostración en desarrollo
    if (this.esCredencialDemo(proveedorCuentaId, tokenAcceso)) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Cuenta de WhatsApp sin credenciales productivas configuradas en esta organización."
        );
      }
      console.log(`[WhatsApp Demo] Enviando texto a ${destinatarioTelefono}: "${texto}"`);
      return { idMensajeProveedor: `wamid.DEMO_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/${this.versionGraph}/${proveedorCuentaId}/messages`;
    const cuerpoPeticion = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destinatarioTelefono,
      type: "text",
      text: { preview_url: false, body: texto },
    };

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAcceso}`,
      },
      body: JSON.stringify(cuerpoPeticion),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => ({}));
      throw this.formatearErrorMeta(errorData, "texto");
    }

    const data = await respuesta.json();
    const idMensajeProveedor = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    return { idMensajeProveedor };
  }

  /**
   * Envía una plantilla aprobada por Meta (requerida fuera de la ventana de atención de 24h).
   */
  async enviarMensajePlantilla(
    proveedorCuentaId: string,
    tokenAcceso: string,
    destinatarioTelefono: string,
    nombrePlantilla: string,
    codigoIdioma: string = "es_MX",
    parametrosCuerpo: string[] = []
  ): Promise<{ idMensajeProveedor: string }> {
    if (this.esCredencialDemo(proveedorCuentaId, tokenAcceso)) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Cuenta de WhatsApp sin credenciales productivas configuradas en esta organización."
        );
      }
      console.log(
        `[WhatsApp Demo] Enviando plantilla '${nombrePlantilla}' (${codigoIdioma}) a ${destinatarioTelefono}`
      );
      return { idMensajeProveedor: `wamid.DEMO_TPL_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/${this.versionGraph}/${proveedorCuentaId}/messages`;
    const componentes =
      parametrosCuerpo.length > 0
        ? [
            {
              type: "body",
              parameters: parametrosCuerpo.map((texto) => ({ type: "text", text: texto })),
            },
          ]
        : undefined;

    const cuerpoPeticion: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destinatarioTelefono,
      type: "template",
      template: {
        name: nombrePlantilla,
        language: { code: codigoIdioma },
        ...(componentes ? { components: componentes } : {}),
      },
    };

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAcceso}`,
      },
      body: JSON.stringify(cuerpoPeticion),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => ({}));
      throw this.formatearErrorMeta(errorData, "plantilla");
    }

    const data = await respuesta.json();
    const idMensajeProveedor = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    return { idMensajeProveedor };
  }

  /**
   * Verifica el estado del número telefónico configurado en Meta Graph API.
   */
  async verificarEstadoNumero(
    proveedorCuentaId: string,
    tokenAcceso: string
  ): Promise<{ conectado: boolean; nombreVerificado?: string; numero?: string; detalle?: string }> {
    if (!tokenAcceso || tokenAcceso.includes("TOKEN_DEMO") || !proveedorCuentaId || proveedorCuentaId.includes("tu_phone_number_id")) {
      return {
        conectado: false,
        detalle: "Falta configurar WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN.",
      };
    }

    try {
      const url = `https://graph.facebook.com/${this.versionGraph}/${proveedorCuentaId}?fields=display_phone_number,verified_name,quality_rating`;
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenAcceso}` },
      });
      const data = await respuesta.json();
      if (!respuesta.ok) {
        return { conectado: false, detalle: data?.error?.message || "Error al consultar Meta Graph API." };
      }
      return {
        conectado: true,
        nombreVerificado: data.verified_name,
        numero: data.display_phone_number,
      };
    } catch (error) {
      return {
        conectado: false,
        detalle: error instanceof Error ? error.message : "Error de red al consultar Meta.",
      };
    }
  }

  /**
   * Envía un mensaje multimedia de imagen con caption opcional a través de Meta WhatsApp Cloud API.
   * Respeta la ventana de atención de 24 horas y valida errores devueltos por Meta.
   */
  async enviarMensajeImagen(
    proveedorCuentaId: string,
    tokenAcceso: string,
    destinatarioTelefono: string,
    urlImagen: string,
    caption?: string
  ): Promise<{ idMensajeProveedor: string }> {
    // Si no hay token de acceso configurado o es entorno de demostración en desarrollo
    if (this.esCredencialDemo(proveedorCuentaId, tokenAcceso)) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Cuenta de WhatsApp sin credenciales productivas configuradas en esta organización."
        );
      }
      console.log(
        `[WhatsApp Demo] Enviando imagen a ${destinatarioTelefono}: "${urlImagen}" ${
          caption ? `con pie: "${caption}"` : ""
        }`
      );
      return { idMensajeProveedor: `wamid.DEMO_IMG_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/${this.versionGraph}/${proveedorCuentaId}/messages`;
    const cuerpoPeticion: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destinatarioTelefono,
      type: "image",
      image: {
        link: urlImagen,
      },
    };

    if (caption && caption.trim()) {
      cuerpoPeticion.image.caption = caption.trim();
    }

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAcceso}`,
      },
      body: JSON.stringify(cuerpoPeticion),
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => ({}));
      throw this.formatearErrorMeta(errorData, "imagen");
    }

    const data = await respuesta.json();
    const idMensajeProveedor = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    return { idMensajeProveedor };
  }
}

export const adaptadorWhatsApp = new AdaptadorWhatsAppCloud();
