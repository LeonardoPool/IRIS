// ==============================================================================
// IRIS by WYLEN — WEBHOOK DE META LEAD ADS (FACEBOOK & INSTAGRAM ADS)
// ==============================================================================
// Recepción y verificación criptográfica de prospectos capturados en anuncios
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { AdaptadorMetaLeadAds } from "@/librerias/adaptadores/meta-lead-ads";
import { ServicioMarketing } from "@/servicios/marketing";
import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";

const servicioMarketing = new ServicioMarketing();

/**
 * Handshake de suscripción requerido por Meta for Developers
 */
export async function GET(peticion: NextRequest) {
  const { searchParams } = new URL(peticion.url);

  const modo = searchParams.get("hub.mode");
  const tokenVerificacion = searchParams.get("hub.verify_token");
  const desafio = searchParams.get("hub.challenge");

  const tokenEsperado =
    process.env.META_LEAD_ADS_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || "iris_meta_verify_token_2026";

  if (modo === "subscribe" && tokenVerificacion === tokenEsperado) {
    console.log("[Meta Lead Ads] Webhook verificado exitosamente por Meta");
    return new NextResponse(desafio, { status: 200 });
  }

  console.warn("[Meta Lead Ads] Intento de verificación de webhook no autorizado");
  return new NextResponse("Token de verificación inválido", { status: 403 });
}

/**
 * Recepción asíncrona de eventos de nuevos prospectos (leadgen)
 */
export async function POST(peticion: NextRequest) {
  const cuerpoTexto = await peticion.text();
  const firmaHeader = peticion.headers.get("x-hub-signature-256");
  const secretoApp = process.env.META_APP_SECRET || "";

  // Si hay secreto de aplicación configurado, validar HMAC-SHA256
  if (secretoApp) {
    const firmaValida = AdaptadorMetaLeadAds.verificarFirma(cuerpoTexto, firmaHeader, secretoApp);
    if (!firmaValida) {
      console.warn("[Meta Lead Ads] Firma HMAC X-Hub-Signature-256 inválida");
      return new NextResponse("Firma no autorizada", { status: 401 });
    }
  }

  let evento: any;
  try {
    evento = JSON.parse(cuerpoTexto);
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  // Responder 200 OK de inmediato a Meta para cumplir el SLA de recepción (< 3 segundos)
  if (evento.object === "page") {
    const admin = crearClienteSupabaseAdministrador();

    for (const entrada of evento.entry || []) {
      for (const cambio of entrada.changes || []) {
        if (cambio.field === "leadgen") {
          const valor = cambio.value;
          const leadgenId = valor.leadgen_id;
          const pageId = valor.page_id;

          if (!leadgenId) continue;

          // Buscar la organización vinculada a la página de Facebook
          const { data: integracion } = await admin
            .from("integraciones_marketing")
            .select("id, organizacion_id, credenciales")
            .eq("proveedor", "meta_lead_ads")
            .filter("credenciales->>page_id", "eq", pageId)
            .maybeSingle();

          const tokenPagina =
            integracion?.credenciales?.page_access_token ||
            process.env.META_PAGE_ACCESS_TOKEN ||
            "";

          if (integracion && tokenPagina) {
            // Consultar datos de Graph API y normalizar
            const datosGraph = await AdaptadorMetaLeadAds.obtenerLeadGraphApi(leadgenId, tokenPagina);
            if (datosGraph) {
              const leadNormalizado = AdaptadorMetaLeadAds.normalizarLead(datosGraph);
              await servicioMarketing.procesarLeadMetaAds(
                integracion.organizacion_id,
                leadNormalizado,
                integracion.id
              );
            }
          }
        }
      }
    }
  }

  return new NextResponse("EVENTO_RECIBIDO", { status: 200 });
}
