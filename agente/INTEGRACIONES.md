# IRIS by WYLEN — CATÁLOGO Y ARQUITECTURA DE INTEGRACIONES
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Definición de Contratos y Estado de Conectividad (Fase 0)  

---

## 1. ESTADO DE CONECTIVIDAD REAL VERIFICADO
En estricto cumplimiento de las reglas de ingeniería de IRIS:
> **"No se admiten integraciones simuladas presentadas como funcionales. Si no se cuenta con credenciales o infraestructura activa, se debe especificar el contrato y declarar la integración en estado PENDIENTE."**

A la fecha de este reporte:
- **WhatsApp Cloud API:** PENDIENTE DE CONFIGURACIÓN (Sin credenciales Meta for Developers).
- **Facebook / Instagram Messaging:** PENDIENTE DE CONFIGURACIÓN (Sin Page Access Tokens).
- **Meta Lead Ads:** PENDIENTE DE CONFIGURACIÓN (Sin Webhook suscrito a App ID).
- **Google Ads / Form Extensions:** PENDIENTE DE CONFIGURACIÓN (Sin Developer Token ni Webhook URL).
- **Google Calendar / Meet:** PENDIENTE DE CONFIGURACIÓN (Sin credenciales de cliente OAuth 2.0).
- **DocuSign eSignature API:** PENDIENTE DE CONFIGURACIÓN (Sin Integration Key ni RSA Private Key para JWT Grant).
- **NARA (WYLEN AI):** PENDIENTE DE CONFIGURACIÓN (Sin Endpoint URL de API NARA ni API Key de servicio).
- **SENA (WYLEN Automation):** PENDIENTE DE CONFIGURACIÓN (Sin Webhook de ingesta SENA ni Secreto de Firma).
- **WYLEN CORE:** PENDIENTE DE CONFIGURACIÓN (Sin URI del Servidor de Identidad y Licenciamiento).

Ninguna pantalla ni servicio simulará estar conectado sin credenciales verificadas.

---

## 2. MATRIZ DE INTEGRACIONES EXTERNAS

| Integración | Propósito | Tipo de Flujo | Mecanismo de Autenticación | Estado Actual |
|---|---|---|---|---|
| **WhatsApp Business Cloud API** | Mensajería bidireccional con clientes | Webhook entrante + API REST saliente | Bearer System User Token + Webhook Secret HMAC SHA-256 | Pendiente de credenciales |
| **Facebook Messenger** | Atención de mensajes de páginas de Facebook | Webhook de página + Send API Graph v21+ | Page Access Token + App Secret | Pendiente de credenciales |
| **Instagram Direct** | Mensajería directa en perfiles de Instagram | Webhook de Instagram + Send API Graph | Instagram User Token vinculado a Facebook Page | Pendiente de credenciales |
| **Meta Lead Ads** | Captura automática de prospectos de anuncios | Webhook Leadgen + Graph API Form Retrieval | Page Access Token para consulta de datos | Pendiente de credenciales |
| **Google Ads** | Captura de leads de extensiones de formulario | Webhook entrante de Google Lead Form | Google Webhook Key / Passkey | Pendiente de credenciales |
| **Google Calendar & Meet** | Agendamiento de reuniones comerciales y llamadas | Flujo OAuth 2.0 autorizado por agente | OAuth 2.0 con Refresh Token y rotación | Pendiente de credenciales |
| **DocuSign eSign REST API** | Generación y firma electrónica de contratos | REST API v2.1 + DocuSign Connect Webhook | JWT User Impersonation Grant + HMAC Secret | Pendiente de credenciales |
| **NARA (WYLEN)** | Servicios de IA: calificación, resumen, respuestas | REST API síncrona / SSE streaming | Bearer Token de Servicio WYLEN | Pendiente de endpoint |
| **SENA (WYLEN)** | Orquestación de workflows y automatizaciones | Outbox Pattern + Webhook asíncrono | Firma criptográfica compartida HMAC SHA-256 | Pendiente de endpoint |
| **WYLEN CORE** | Autoridad de licencias, tenants e identidad | Sincronización JWT / Webhook de suscripción | Asymmetric RSA / EdDSA Public Key | Pendiente de endpoint |

---

## 3. ESPECIFICACIÓN POR ADAPTADOR

### 3.1 Adaptador: WhatsApp Business Cloud API
- **Arquitectura de Aislamiento:** Las credenciales (`phone_number_id`, `waba_id`, `access_token`) se almacenan cifradas en la tabla `cuentas_canal` asociadas al `organizacion_id`.
- **Validación de Webhook:** Toda petición entrante en `/api/webhooks/whatsapp` se somete al cálculo de firma:
  $$\text{HMAC-SHA256}(\text{Cuerpo HTTP}, \text{Meta App Secret})$$
  Si no coincide exactamente con la cabecera `X-Hub-Signature-256`, se aborta la ejecución inmediatamente con código `401`.
- **Idempotencia:** Se verifica que el identificador `messages[].id` no haya sido registrado en la base de datos para prevenir duplicación por reintentos de Meta.
- **Ventana de Mensajería:** Se respeta la política estricta de Meta de 24 horas para mensajes de atención al cliente. Para mensajes salientes posteriores a las 24 horas, el sistema únicamente permite el envío de plantillas preaprobadas (*HSM - Highly Structured Messages*).

### 3.2 Adaptador: DocuSign eSignature API
- **Ambientes:** Separación rigurosa entre entorno de pruebas (*Developer Demo Sandbox*) y entorno de producción (*Production Base URI*).
- **Método de Autenticación:** DocuSign JWT Grant (Impersonation). Se requiere:
  - `DOCUSIGN_INTEGRATION_KEY`
  - `DOCUSIGN_USER_ID`
  - `DOCUSIGN_AUTH_SERVER` (`account-d.docusign.com` para demo, `account.docusign.com` para prod).
  - Clave privada RSA PEM (`DOCUSIGN_PRIVATE_KEY`).
- **Gestión de Sobres:**
  1. La generación de documentos produce un PDF unificado con los metadatos de la oportunidad y contacto.
  2. Se envía el sobre con los firmantes configurados y etiquetas de firma (*SignHereTabs*).
  3. DocuSign Connect envía eventos a `/api/webhooks/docusign` protegido por HMAC.
  4. Al recibir el evento `completed`, el adaptador descarga el PDF firmado final y el Certificado de Resumen de Firma (*Summary Certificate*), almacenándolos en el bucket privado de Supabase Storage.

### 3.3 Adaptador: Google Calendar y Meet
- **Autenticación:** Cada agente comercial que desee vincular su calendario realiza un flujo OAuth 2.0 individual bajo el consentimiento explícito de scopes mínimos requeridos (`https://www.googleapis.com/auth/calendar.events`).
- **Sincronización:** Se sincronizan únicamente los eventos comerciales gestionados a través de IRIS. Jamás se importan o leen eventos personales que no correspondan a las actividades comerciales registradas en la plataforma.

### 3.4 Conector: NARA (Servicios de Inteligencia Artificial)
- NARA proporciona capacidades cognitivas desacopladas de cualquier proveedor específico (OpenAI, Anthropic, Google Gemini).
- IRIS consume NARA a través de un contrato agnóstico:
  - Entrada: Historial de mensajes normalizados + contexto de negocio.
  - Salida: Clasificación, resumen, extracción de entidades o texto sugerido.
- Se implementan circuit breakers y timeouts estrictos (máximo 4 segundos). Si NARA no responde o se agota su cuota, la interfaz de IRIS continúa operando con normalidad sin bloquear al agente humano.

### 3.5 Conector: SENA (Automatización de Negocio)
- IRIS no ejecuta directamente motores de BPMN complejos dentro de su servidor web para no degradar el rendimiento transaccional.
- IRIS inserta eventos en la tabla `eventos_salientes`. Un despachador recurrente procesa los eventos pendientes y los envía a SENA.
- SENA es el responsable de ejecutar acciones automatizadas externas (ej. enviar alertas a Slack de gerencia, disparar campañas de correo masivo en ASTRA o actualizar sistemas ERP externos).

---

## 4. GESTIÓN DE SECRETOS Y ROTACIÓN
- Las credenciales maestras del sistema residen exclusivamente en variables de entorno del servidor.
- Las credenciales por inquilino (cuentas de WhatsApp u OAuth de usuarios) se almacenan en PostgreSQL cifradas en reposo utilizando `pgcrypto` o mediante el servicio de cifrado de nivel de aplicación con clave simétrica AES-256-GCM.
- Jamás se registran secretos en archivos de bitácora (`console.log`, Sentry, Datadog).

---
*Fin del catálogo de integraciones.*
