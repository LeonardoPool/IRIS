// ==============================================================================
// IRIS by WYLEN — WEBHOOK DE WHATSAPP BUSINESS CLOUD API
// ==============================================================================
// Manejador de verificación (GET) y recepción de eventos y mensajes (POST)
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { adaptadorWhatsApp } from "@/librerias/adaptadores/whatsapp";
import { servicioComunicacion } from "@/servicios/comunicacion";

/**
 * Endpoint de verificación de Webhook por Meta (GET)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("hub.mode");
  const tokenVerificacion = searchParams.get("hub.verify_token");
  const reto = searchParams.get("hub.challenge");

  const tokenEsperado =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    "iris_token_secreto_2026";

  if (modo === "subscribe" && tokenVerificacion === tokenEsperado) {
    console.log("[WhatsApp Webhook] Verificación de suscripción exitosa.");
    return new NextResponse(reto, { status: 200 });
  }

  return NextResponse.json({ error: "Verificación de webhook denegada." }, { status: 403 });
}

/**
 * Recepción de Mensajes y Cambios de Estado de Meta (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const cuerpoTexto = await request.text();
    const firmaCabecera = request.headers.get("x-hub-signature-256");

    // 1. Verificación Criptográfica de la Firma HMAC SHA-256
    const esFirmaValida = adaptadorWhatsApp.verificarFirmaWebhook(cuerpoTexto, firmaCabecera);
    if (!esFirmaValida) {
      console.warn("[WhatsApp Webhook] Firma HMAC inválida detectada en el webhook.");
      return NextResponse.json({ error: "Firma HMAC inválida." }, { status: 401 });
    }

    // 2. Parseo del payload JSON
    const payload = JSON.parse(cuerpoTexto);

    // 3. Normalización de mensajes entrantes
    const mensajesNormalizados = adaptadorWhatsApp.normalizarMensajesEntrantes(payload);

    // 4. Procesamiento idempotente de cada mensaje
    for (const mensaje of mensajesNormalizados) {
      await servicioComunicacion.procesarMensajeEntrante(mensaje);
    }

    // Siempre retornar 200 OK a Meta para confirmar recepción y evitar reintentos innecesarios
    return NextResponse.json({ exito: true, procesados: mensajesNormalizados.length }, { status: 200 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error interno en procesamiento:", error);
    // Retornamos 200 OK con bandera de error para registrar en servidor sin generar ciclos de reintentos infinitos
    return NextResponse.json({ exito: false, error: error.message }, { status: 200 });
  }
}
