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
   * Envía un mensaje de texto saliente utilizando la WhatsApp Business Cloud API.
   */
  async enviarMensajeTexto(
    proveedorCuentaId: string,
    tokenAcceso: string,
    destinatarioTelefono: string,
    texto: string
  ): Promise<{ idMensajeProveedor: string }> {
    // Si no hay token de acceso configurado (ej. desarrollo o pruebas sin credenciales)
    if (!tokenAcceso || tokenAcceso.includes("TOKEN_DEMO")) {
      console.log(`[WhatsApp Demo] Enviando a ${destinatarioTelefono}: "${texto}"`);
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
      const errorData = await respuesta.json();
      throw new Error(`Error en WhatsApp Cloud API: ${JSON.stringify(errorData)}`);
    }

    const data = await respuesta.json();
    const idMensajeProveedor = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    return { idMensajeProveedor };
  }
}

export const adaptadorWhatsApp = new AdaptadorWhatsAppCloud();
