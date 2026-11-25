# IRIS — Referencia de Integración WhatsApp Business Cloud API y MCP

> Documento de referencia técnica para evitar errores de implementación, permisos, webhooks y mensajería con **Meta WhatsApp Business Platform (Cloud API)** y **WhatsApp Business Tools MCP**.

---

## 1. Arquitectura en IRIS vs. WhatsApp Business Tools MCP

| Componente | Propósito | Cómo se usa |
| :--- | :--- | :--- |
| **Aplicación IRIS (Next.js)** | Envío y recepción productiva de mensajes en la Bandeja Omnicanal y Speeches | Llama directamente a `https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` y recibe webhooks en `/api/webhooks/whatsapp`. |
| **WhatsApp Business Tools MCP** *(Opcional en IDE/Asistente)* | Gestión y depuración administrativa desde clientes compatibles (Claude Code, Claude Desktop, ChatGPT, Codex) | Transporte `Streamable HTTP` en `https://mcp.facebook.com/whatsapp_business_tools` con autenticación OAuth de Meta Developer. |

---

## 2. Requisitos Previos en Meta Business / App

Antes de enviar o recibir mensajes reales en WhatsApp Cloud API, la cuenta debe cumplir **los tres requisitos**:
1. **Acceso de Administrador (`MANAGE`) al Business** en Meta Business Suite.
2. **App de Meta con el caso de uso / producto WhatsApp** conectada a ese Business, con acceso de administrador en la App.
3. **Términos de Servicio de WhatsApp Business Cloud API aceptados** en ese Business (sin esto, el registro de números y el envío quedan bloqueados).

### Scopes OAuth requeridos (para MCP o gestión)
- `business_management` — Listar y operar sobre los negocios administrados.
- `whatsapp_business_management` — Administrar cuentas WABA, números de teléfono, plantillas y webhooks.
- `whatsapp_business_messaging` — Enviar mensajes desde números registrados.

---

## 3. Reglas Operativas Críticas para Evitar Errores

### 3.1 Ventana de Servicio al Cliente de 24 Horas (Error `131047`)
- **Texto libre e imágenes/documentos sueltos:** Meta **solo** los entrega dentro de la **ventana de 24 horas** contada desde el último mensaje entrante del cliente.
- **Fuera de la ventana de 24 horas:** Meta rechaza el envío con código `131047`. Es obligatorio usar una **plantilla aprobada (`type: "template"`)**.
- En IRIS:
  - [src/librerias/adaptadores/whatsapp.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/librerias/adaptadores/whatsapp.ts) captura el código `131047` tanto en `enviarMensajeTexto` (`VENTANA_24H_EXPIRADA`) como en `enviarMensajeImagen`.
  - Para envíos fuera de ventana está disponible `adaptadorWhatsApp.enviarMensajePlantilla(...)`.

### 3.2 Variables de Entorno en `.env.local`

| Variable | Uso en IRIS | Notas |
| :--- | :--- | :--- |
| `WHATSAPP_ACCESS_TOKEN` | Token Bearer para enviar mensajes e imágenes en `graph.facebook.com` | **No confundir con `META_APP_SECRET`**. Para producción generar un **System User Token permanente** en Business Settings. |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número emisor en WhatsApp Cloud API | Se obtiene en Meta App Dashboard → WhatsApp → API Setup (o vía `whatsapp_biz_phone_numbers`). |
| `WHATSAPP_VERIFY_TOKEN` | Token secreto para validar la suscripción `GET /api/webhooks/whatsapp` | Debe coincidir exactamente con el configurado en Meta Webhooks. |
| `META_APP_SECRET` | Secreto de la App para validar la firma criptográfica `x-hub-signature-256` (HMAC SHA-256) | Usado exclusivamente en `verificarFirmaWebhook` dentro de [src/app/api/webhooks/whatsapp/route.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/app/api/webhooks/whatsapp/route.ts). |
| `META_GRAPH_API_VERSION` | Versión de Graph API (por defecto `v21.0`) | Opcional. |

### 3.3 Flujo de Archivos en IRIS
- **Adaptador HTTP Meta:** [src/librerias/adaptadores/whatsapp.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/librerias/adaptadores/whatsapp.ts)
- **Mensajería saliente y entrante:** [src/servicios/comunicacion.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/servicios/comunicacion.ts)
- **Secuencias de Speeches por WhatsApp:** [src/servicios/speeches.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/servicios/speeches.ts)
- **Webhook GET/POST:** [src/app/api/webhooks/whatsapp/route.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/app/api/webhooks/whatsapp/route.ts)

---

## 4. Catálogo de Herramientas de WhatsApp Business Tools MCP (`whatsapp_biz_*`)

Útil como guía si se conecta un cliente compatible con `https://mcp.facebook.com/whatsapp_business_tools`:

1. **Descubrimiento:**
   - `whatsapp_biz_businesses`: Lista los negocios administrados.
   - `whatsapp_biz_accounts`: Lista las cuentas WABA de un negocio.
   - `whatsapp_biz_phone_numbers`: Lista los números, su `phone_number_id` y estado de registro.
2. **Onboarding de Números:**
   - `whatsapp_biz_add_phone_number` → `whatsapp_biz_send_verification_code` → `whatsapp_biz_verify_phone_number` → `whatsapp_biz_register_phone_number`.
3. **Plantillas (`Templates`):**
   - `whatsapp_biz_list_templates`, `whatsapp_biz_get_template`, `whatsapp_biz_create_template`, `whatsapp_biz_update_template`, `whatsapp_biz_delete_template`.
4. **Mensajería:**
   - `whatsapp_biz_send_message`: Envía texto libre (dentro de 24h) o plantilla aprobada.
5. **Webhooks:**
   - `whatsapp_biz_configure_webhooks`: Configura `callback_url` (`https://<tu-dominio>/api/webhooks/whatsapp`) y `verify_token`.
   - `whatsapp_biz_subscribe_webhook`: Suscribe la cuenta WABA a los webhooks de la App.
6. **Cuenta y Tokens:**
   - `whatsapp_biz_configure_payments`, `whatsapp_biz_verify_business`, `whatsapp_biz_system_user_token` (enlace directo para generar el **System User Access Token permanente**).

---

## 5. Checklist Rápido de Puesta en Marcha

- [ ] Definir `WHATSAPP_PHONE_NUMBER_ID` real en `.env.local`.
- [ ] Reemplazar el token temporal de pruebas en `WHATSAPP_ACCESS_TOKEN` por un **System User Token permanente** antes de producción.
- [ ] Configurar `META_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN` en `.env.local`.
- [ ] Registrar el webhook `https://<dominio>/api/webhooks/whatsapp` en Meta y suscribir el campo `messages`.
- [ ] Verificar número y estado con `adaptadorWhatsApp.verificarEstadoNumero(phoneNumberId, accessToken)`.
