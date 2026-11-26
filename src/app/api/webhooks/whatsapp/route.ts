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
    (process.env.NODE_ENV === "development" ? "iris_token_secreto_2026" : "");

  if (!tokenEsperado) {
    console.error("[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN no está configurado.");
    return NextResponse.json({ error: "Configuración de verificación incompleta." }, { status: 500 });
  }

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

    // 2. Parseo y validación básica del evento de Meta
    const payload = JSON.parse(cuerpoTexto);
    if (payload?.object !== "whatsapp_business_account") {
      return NextResponse.json(
        { exito: false, error: "Evento ignorado: objeto distinto a whatsapp_business_account." },
        { status: 200 }
      );
    }

    // 3. Normalización de mensajes entrantes y estados de entrega
    const mensajesNormalizados = adaptadorWhatsApp.normalizarMensajesEntrantes(payload);
    const estadosNormalizados = adaptadorWhatsApp.normalizarEstadosMensajes(payload);

    // 4. Procesamiento idempotente de mensajes entrantes
    let mensajesProcesados = 0;
    for (const mensaje of mensajesNormalizados) {
      const res = await servicioComunicacion.procesarMensajeEntrante(mensaje);
      if (res.procesado) mensajesProcesados += 1;
    }

    // 5. Procesamiento de actualizaciones de estado (sent, delivered, read, failed)
    let estadosProcesados = 0;
    for (const estado of estadosNormalizados) {
      const res = await servicioComunicacion.procesarActualizacionEstado(estado);
      if (res.actualizado) estadosProcesados += 1;
    }

    // Siempre retornar 200 OK a Meta para confirmar recepción y evitar reintentos innecesarios
    return NextResponse.json(
      { exito: true, procesados: mensajesProcesados, estadosProcesados },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error interno en procesamiento:", error?.message || "Error desconocido");
    // Retornamos 200 OK con bandera de error para registrar en servidor sin generar ciclos de reintentos infinitos
    return NextResponse.json({ exito: false, error: "Error procesando webhook." }, { status: 200 });
  }
}
