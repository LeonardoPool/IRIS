// ==============================================================================
// IRIS by WYLEN — ADAPTADOR PARA META LEAD ADS
// ==============================================================================
// Ingesta segura de prospectos desde campañas de Meta (Facebook & Instagram Ads)
// Con validación HMAC-SHA256, extracción de campos y atribución de campaña
// ==============================================================================

import crypto from "crypto";

export interface CampoLeadMeta {
  name: string;
  values: string[];
}

export interface RespuestaGraphLeadMeta {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data: CampoLeadMeta[];
}

export interface LeadNormalizadoMeta {
  metaLeadId: string;
  nombre: string;
  correoElectronico: string | null;
  telefono: string | null;
  ciudad: string | null;
  mensaje: string | null;
  camposPersonalizados: Record<string, string>;
  campana: {
    adId: string | null;
    adName: string | null;
    adsetId: string | null;
    adsetName: string | null;
    campaignId: string | null;
    campaignName: string | null;
    formId: string | null;
  };
}

export class AdaptadorMetaLeadAds {
  /**
   * Valida la firma HMAC-SHA256 enviada por los servidores de Meta en el header X-Hub-Signature-256
   */
  static verificarFirma(cuerpoCrudo: string, firmaHeader: string | null, secretoApp: string): boolean {
    if (!firmaHeader || !secretoApp) return false;

    const [algoritmo, firmaRecibida] = firmaHeader.split("=");
    if (algoritmo !== "sha256" || !firmaRecibida) return false;

    const firmaEsperada = crypto
      .createHmac("sha256", secretoApp)
      .update(cuerpoCrudo)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(Buffer.from(firmaRecibida), Buffer.from(firmaEsperada));
    } catch {
      return false;
    }
  }

  /**
   * Obtiene los datos detallados del prospecto desde la Graph API de Meta
   */
  static async obtenerLeadGraphApi(leadgenId: string, pageAccessToken: string): Promise<RespuestaGraphLeadMeta | null> {
    try {
      const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${encodeURIComponent(pageAccessToken)}`;
      const respuesta = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!respuesta.ok) {
        const errorDetalle = await respuesta.text();
        console.error(`[Meta Lead Ads] Error en Graph API (${respuesta.status}):`, errorDetalle);
        return null;
      }

      return (await respuesta.json()) as RespuestaGraphLeadMeta;
    } catch (error) {
      console.error("[Meta Lead Ads] Error al conectar con Graph API:", error);
      return null;
    }
  }

  /**
   * Transforma y normaliza los datos heterogéneos de Meta hacia el modelo de dominio de IRIS
   */
  static normalizarLead(datosGraph: RespuestaGraphLeadMeta): LeadNormalizadoMeta {
    let nombre = "";
    let correoElectronico: string | null = null;
    let telefono: string | null = null;
    let ciudad: string | null = null;
    let mensaje: string | null = null;
    const camposPersonalizados: Record<string, string> = {};

    for (const campo of datosGraph.field_data || []) {
      const valor = campo.values?.[0] || "";
      const clave = campo.name.toLowerCase();

      if (clave === "full_name" || clave === "nombre_completo" || clave === "name") {
        nombre = valor;
      } else if (clave === "first_name" || clave === "nombre") {
        nombre = nombre ? `${valor} ${nombre}` : valor;
      } else if (clave === "last_name" || clave === "apellido") {
        nombre = nombre ? `${nombre} ${valor}` : valor;
      } else if (clave === "email" || clave === "correo" || clave === "correo_electronico") {
        correoElectronico = valor.toLowerCase().trim();
      } else if (clave === "phone_number" || clave === "telefono" || clave === "celular") {
        telefono = valor.trim();
      } else if (clave === "city" || clave === "ciudad") {
        ciudad = valor;
      } else if (clave === "question" || clave === "comentarios" || clave === "mensaje") {
        mensaje = valor;
      } else {
        camposPersonalizados[campo.name] = valor;
      }
    }

    if (!nombre) {
      nombre = correoElectronico ? correoElectronico.split("@")[0] : `Lead Meta #${datosGraph.id.slice(-6)}`;
    }

    return {
      metaLeadId: datosGraph.id,
      nombre,
      correoElectronico,
      telefono,
      ciudad,
      mensaje,
      camposPersonalizados,
      campana: {
        adId: datosGraph.ad_id || null,
        adName: datosGraph.ad_name || null,
        adsetId: datosGraph.adset_id || null,
        adsetName: datosGraph.adset_name || null,
        campaignId: datosGraph.campaign_id || null,
        campaignName: datosGraph.campaign_name || null,
        formId: datosGraph.form_id || null,
      },
    };
  }
}
