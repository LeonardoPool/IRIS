# IRIS by WYLEN — ESPECIFICACIÓN Y ARQUITECTURA DE SEGURIDAD
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Modelo de Seguridad y Control de Acceso (Fase 0)  

---

## 1. DISTINCIÓN METODOLÓGICA OBLIGATORIA
- **Funcionalidad Existente Verificada:** El repositorio se encuentra en su plantilla base inicial. No hay políticas de seguridad ni controles de acceso implementados en código en este momento.
- **Arquitectura Propuesta:** Principios de seguridad por defecto, Zero Trust, aislamiento criptográfico y segregación estricta de inquilinos.
- **Supuestos:** Se utilizará PostgreSQL RLS habilitado en el 100% de las tablas transaccionales y validación server-side forzosa.
- **Dependencias Externas:** Supabase Auth, Web Crypto API / Node.js Crypto module.
- **Decisiones Pendientes de Aprobación:** Frecuencia de rotación de claves criptográficas y estrategia de retención de registros de auditoría forense.

---

## 2. PILARES FUNDAMENTALES DE SEGURIDAD EN IRIS

```
┌─────────────────────────────────────────────────────────────┐
│                   1. ZERO TRUST ARQUITECTÓNICO              │
│    Nunca confiar en el cliente. Validar todo en servidor.   │
├─────────────────────────────────────────────────────────────┤
│               2. AISLAMIENTO MULTI-TENANT FORZOSO           │
│    PostgreSQL Row Level Security (RLS) + Deny by Default.   │
├─────────────────────────────────────────────────────────────┤
│               3. GOBERNANZA DE SECRETOS Y LLAVES            │
│    Sin exposición de `service_role` ni tokens en frontend.  │
├─────────────────────────────────────────────────────────────┤
│               4. INTEGRIDAD Y AUDITORÍA INMUTABLE           │
│    Trazabilidad de asignaciones, contratos y operaciones.   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. AISLAMIENTO MULTI-TENANT Y ROW LEVEL SECURITY (RLS)

### 3.1 Principio de Denegación por Defecto (*Default Deny*)
En cada migración de base de datos se aplicará invariablemente:
```sql
ALTER TABLE public.<nombre_tabla> ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.<nombre_tabla> FORCE ROW LEVEL SECURITY;
```
Esto garantiza que ni siquiera las consultas ejecutadas por propietarios de tablas o roles heredados puedan evadir las políticas RLS a menos que se invoque explícitamente el rol de superusuario de mantenimiento.

### 3.2 Resolución Confiable del Inquilino
El frontend nunca envía `organizacion_id` como parámetro de confianza para lectura o escritura:
1. El usuario se autentica a través de Supabase Auth (JWT emitido con `sub = usuario_id`).
2. El servidor valida la membresía activa del usuario en `public.membresias`.
3. La política RLS utiliza la función de seguridad:
   ```sql
   CREATE POLICY "aislamiento_organizacion_select" 
   ON public.prospectos 
   FOR SELECT 
   USING (
     organizacion_id IN (
       SELECT m.organizacion_id 
       FROM public.membresias m 
       WHERE m.usuario_id = auth.uid() 
         AND m.estado = 'activo'
     )
   );
   ```
4. Para mutaciones (`INSERT`, `UPDATE`), el `organizacion_id` se vincula estrictamente a la organización activa resuelta en el servidor.

---

## 4. CONTROL DE ACCESO BASADO EN ROLES Y PERMISOS (RBAC)

### 4.1 Principio de Menor Privilegio
El acceso a recursos y funcionalidades no se basa únicamente en la ocultación de componentes visuales en React (lo cual es meramente cosmético). Toda acción crítica es verificada en:
1. **Middleware de Rutas:** Impide el renderizado de páginas administrativas si el usuario carece del rol necesario.
2. **Server Actions y Route Handlers:** Validan explícitamente el permiso específico antes de invocar la capa de dominio:
   ```typescript
   export async function reasignarConversacionAccion(
     conversacionId: string, 
     nuevoAgenteId: string, 
     motivo: string
   ) {
     const sesion = await obtenerSesionServidor();
     await verificarPermiso(sesion, "conversaciones:asignar");
     
     // Ejecución de la lógica de dominio
     return await servicioConversaciones.reasignar({ ... });
   }
   ```

---

## 5. PROTECCIÓN DE WEBHOOKS Y PROCESAMIENTO CRIPTOGRÁFICO

### 5.1 Firmas HMAC en Webhooks de Proveedores
Para prevenir ataques de inyección de mensajes o suplantación de identidad:
- **Meta (WhatsApp / Facebook / Instagram):**
  - Cabecera: `X-Hub-Signature-256`.
  - Algoritmo: HMAC con SHA-256 utilizando el `APP_SECRET` de la aplicación de Meta.
  - Validación en tiempo constante (`crypto.timingSafeEqual`) para prevenir ataques de temporización (*timing attacks*).
- **DocuSign:**
  - Cabecera: `X-DocuSign-Signature-1`.
  - Algoritmo: HMAC con SHA-256 contra el secreto configurado en el webhook de DocuSign Connect.

### 5.2 Idempotencia Obligatoria
Todo webhook entrante contiene un identificador único provisto por la plataforma externa. Se persiste y verifica contra restricciones únicas de base de datos antes de disparar cualquier efecto colateral (creación de contactos, notificaciones o eventos de SLA).

---

## 6. SEGURIDAD DE ALMACENAMIENTO DE ARCHIVOS (STORAGE)

- Los buckets de Supabase Storage para contratos, identificaciones oficiales de clientes y fichas comerciales son estrictamente **privados** (`public = false`).
- Los nombres de archivo se sanitizan y se almacenan bajo prefijos con UUIDs aleatorios para evitar colisiones y escaneo de directorios (*directory traversal*).
- La descarga y visualización de documentos se realiza únicamente mediante la generación de URLs firmadas con tiempo de vida limitado (máximo 15 minutos).

---

## 7. AUDITORÍA INMUTABLE Y NO REPUDIO

- Los cambios en la titularidad de prospectos, reasignaciones de conversaciones, cambios en etapas de embudos y eventos de firma de contratos se graban como eventos históricos independientes.
- Ningún usuario, independientemente de su rol, tiene permisos de actualización (`UPDATE`) o eliminación (`DELETE`) sobre las tablas de auditoría: `registros_auditoria`, `eventos_conversacion`, `asignaciones_conversacion` y `historial_etapas_oportunidad`.
- Solo se permite la inserción (`INSERT`) y lectura autorizada (`SELECT`).

---

## 8. CUMPLIMIENTO LEGAL Y PROTECCIÓN DE DATOS (MÉXICO)

- En observancia de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) en México:
  - Los datos personales sensibles (teléfonos, correos, identificaciones) deben contar con consentimiento de tratamiento en los formularios de captura.
  - Se debe garantizar la capacidad técnica de ejercer derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), permitiendo la anonimización de prospectos cuando lo solicite el titular y no contravenga obligaciones legales o mercantiles vigentes.

---
*Fin de especificación de seguridad.*
