# IRIS by WYLEN — ESPECIFICACIÓN DE API
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Propuesta de Arquitectura de Interfaces y Contratos de Integración (Fase 0)  

---

## 1. DISTINCIÓN METODOLÓGICA OBLIGATORIA
- **Funcionalidad Existente Verificada:** En el estado actual del repositorio no existe ningún Route Handler implementado en `src/app/api/`.
- **Arquitectura Propuesta:** Estándar de APIs REST, Webhooks e Interfaces con el ecosistema WYLEN que regirán a partir de la Fase 1.
- **Supuestos:** Se utilizarán Route Handlers de Next.js App Router (`route.ts`) con tipado estricto TypeScript y validación por esquemas Zod.
- **Dependencias Externas:** APIs de Meta Graph, WhatsApp Cloud API, DocuSign eSign API REST v2.1, NARA AI Services, SENA Automation.
- **Decisiones Pendientes:** Mecanismo de autenticación para llamadas internas máquina a máquina (mTLS vs. JWT con clave asimétrica RSA).

---

## 2. ESTÁNDARES GENERALES DE DISEÑO DE API

### 2.1 Formato Canónico de Respuestas JSON
Todas las respuestas de la API de IRIS siguen un formato envoltorio predecible en español:

**Respuesta Exitosa:**
```json
{
  "exito": true,
  "datos": {},
  "metadatos": {
    "marca_tiempo": "2026-11-15T17:00:00.000Z",
    "version_api": "v1"
  },
  "paginacion": {
    "pagina_actual": 1,
    "elementos_por_pagina": 25,
    "total_elementos": 120,
    "total_paginas": 5
  }
}
```

**Respuesta de Error:**
```json
{
  "exito": false,
  "error": {
    "codigo": "RECURSO_NO_ENCONTRADO",
    "mensaje": "El prospecto solicitado no existe o no pertenece a la organización activa.",
    "detalles": [
      {
        "campo": "prospecto_id",
        "regla": "uuid_valido",
        "mensaje": "Identificador no localizado."
      }
    ]
  },
  "metadatos": {
    "marca_tiempo": "2026-11-15T17:00:00.000Z",
    "version_api": "v1"
  }
}
```

### 2.2 Códigos de Estado y Errores Estándar
- `200 OK`: Operación exitosa con contenido.
- `201 Created`: Recurso creado exitosamente.
- `202 Accepted`: Petición aceptada para procesamiento asíncrono.
- `400 Bad Request`: Error de validación en los parámetros de entrada (`DATOS_INVALIDOS`).
- `401 Unauthorized`: Token de sesión ausente o caducado (`NO_AUTENTICADO`).
- `403 Forbidden`: Permiso insuficiente en el rol o intento de acceso a otra organización (`ACCESO_DENEGADO`).
- `404 Not Found`: Recurso no encontrado (`RECURSO_NO_ENCONTRADO`).
- `409 Conflict`: Conflicto de estado o colisión de idempotencia (`CONFLICTO_ESTADO`).
- `422 Unprocessable Entity`: Violación de regla de negocio (`REGLA_NEGOCIO_VIOLADA`).
- `429 Too Many Requests`: Límite de tasa excedido (`TASA_EXCEDIDA`).
- `500 Internal Server Error`: Falla interna no controlada (`ERROR_INTERNO_SERVIDOR`).

---

## 3. CONTRATOS DE WEBHOOKS ENTRANTES

### 3.1 WhatsApp Business Cloud API (`/api/webhooks/whatsapp`)
- **Método GET (Verificación de Webhook):**
  - Parámetros: `hub.mode`, `hub.challenge`, `hub.verify_token`.
  - Comportamiento: Valida el `verify_token` configurado para la cuenta del canal. Si coincide, devuelve `hub.challenge` con status `200`. Si falla, `403 Forbidden`.
- **Método POST (Recepción de Mensajes y Estados):**
  - Cabecera: `X-Hub-Signature-256`.
  - Validación: Criptográfica obligatoria contra el `App Secret` de Meta. Si la firma es inválida, se rechaza inmediatamente con `401 Unauthorized`.
  - Normalización: Los mensajes entrantes se transforman al formato interno de IRIS:
    ```typescript
    interface MensajeNormalizadoEntrante {
      proveedorMensajeId: string;
      cuentaCanalId: string;
      remitenteTelefono: string; // Formato E.164
      remitenteNombre: string;
      tipoContenido: "texto" | "imagen" | "documento" | "audio" | "ubicacion";
      texto?: string;
      adjuntoUrl?: string;
      marcaTiempoProveedor: string;
    }
    ```
  - Idempotencia: Verificación previa en base de datos. Si el `proveedorMensajeId` ya existe, responde `200 OK` sin duplicar la creación de mensajes ni activar nuevos eventos de SLA.

### 3.2 Meta Lead Ads (`/api/webhooks/meta-leads`)
- Procesa notificaciones de captura de prospectos desde campañas en Facebook e Instagram.
- Consulta inmediatamente la API de Meta Graph para descargar los valores seguros del formulario de captación utilizando el token cifrado de la cuenta de integración.
- Registra el prospecto preservando la atribución original (`campaña_id`, `anuncio_id`, `formulario_id`).

### 3.3 DocuSign Connect (`/api/webhooks/docusign`)
- Valida la autenticidad mediante la firma HMAC de DocuSign en la cabecera `X-DocuSign-Signature-1`.
- Procesa eventos del ciclo de vida del sobre: `envelope-sent`, `envelope-delivered`, `envelope-completed`, `envelope-declined`, `envelope-voided`.
- Al completarse, programa la descarga del documento PDF firmado y el certificado de finalización hacia Supabase Storage.

---

## 4. ENDPOINTS INTERNOS DE NEGOCIO (VERSIONADO REST `/api/v1/`)

### 4.1 Prospectos (`/api/v1/prospectos`)
- `GET /api/v1/prospectos`: Listado filtrado por estado, agente, origen y rango de fechas.
- `POST /api/v1/prospectos`: Creación manual de prospectos con validación de duplicados por teléfono/correo.
- `GET /api/v1/prospectos/:id`: Detalle 360° del prospecto con historial de interacciones.
- `PATCH /api/v1/prospectos/:id/calificar`: Actualización de puntuación y estado de calificación.
- `POST /api/v1/prospectos/:id/convertir`: Conversión de prospecto en contacto y oportunidad de venta.

### 4.2 Bandeja y Conversaciones (`/api/v1/conversaciones`)
- `GET /api/v1/conversaciones`: Listado clasificado (`todas`, `no_asignadas`, `mis_conversaciones`, `prioritarias`, `cerradas`).
- `GET /api/v1/conversaciones/:id/mensajes`: Historial cronológico paginado de mensajes y notas internas.
- `POST /api/v1/conversaciones/:id/mensajes`: Envío de mensaje saliente al cliente o registro de nota interna de equipo.
- `POST /api/v1/conversaciones/:id/asignar`: Asignación o transferencia de la conversación a otro agente, requiriendo motivo de reasignación y registrando evento de auditoría.
- `POST /api/v1/conversaciones/:id/cerrar`: Cierre formal con registro del motivo comercial y agente responsable.

### 4.3 Oportunidades (`/api/v1/oportunidades`)
- `GET /api/v1/oportunidades`: Vista de embudo (*Kanban*) y listado tabular.
- `POST /api/v1/oportunidades`: Apertura de nueva oportunidad vinculada a contacto.
- `PATCH /api/v1/oportunidades/:id/etapa`: Transición de etapa en el embudo con cálculo automático de probabilidad y registro en `historial_etapas_oportunidad`.
- `POST /api/v1/oportunidades/:id/ganada`: Declaración de venta ganada con registro obligatorio del agente de cierre en `atribuciones_venta`.

### 4.4 Contratos y Firma (`/api/v1/contratos`)
- `GET /api/v1/contratos`: Listado de contratos por oportunidad, estado y fechas.
- `POST /api/v1/contratos/generar`: Ensamblado de contrato a partir de plantilla y datos validados de la oportunidad.
- `POST /api/v1/contratos/:id/emitir-sobre`: Envío formal del sobre a DocuSign API.
- `GET /api/v1/contratos/:id/descargar-firmado`: Obtención de URL firmada temporal para lectura del documento con validez legal.

---

## 5. INTERFACES CON EL ECOSISTEMA WYLEN

### 5.1 NARA (Servicio de Inteligencia Artificial)
IRIS invoca a NARA mediante un cliente HTTP desacoplado:
```typescript
interface SolicitudClasificacionNARA {
  organizacionId: string;
  conversacionId: string;
  ultimosMensajes: Array<{ rol: "cliente" | "agente"; texto: string }>;
  contextoProspecto?: { nombre?: string; desarrolloInteres?: string };
}

interface RespuestaClasificacionNARA {
  intencionDetectada: string;
  temperaturaProspecto: "frio" | "tibio" | "caliente";
  sugerenciaRespuesta?: string;
  nivelConfianza: number; // 0.0 - 1.0
}
```

### 5.2 SENA (Motor de Automatización de Procesos)
IRIS no delega su integridad a SENA; publica eventos de negocio en formato estándar mediante la tabla de Outbox:
```typescript
interface EventoNegocioSENA {
  eventoId: string;
  organizacionId: string;
  tipoEvento: "prospecto.creado" | "conversacion.sla_alerta" | "oportunidad.ganada" | "contrato.completado";
  marcaTiempo: string;
  datos: Record<string, unknown>;
}
```
El despachador en segundo plano entrega estos eventos al webhook registrado de SENA con cabecera de firma de secreto compartido.

---
*Fin de especificación de API.*
