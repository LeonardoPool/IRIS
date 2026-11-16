# IRIS by WYLEN — ARQUITECTURA DE PROYECTO
**Versión del Documento:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Descubrimiento Arquitectónico y Especificación Técnica (Fase 0)  
**Clasificación:** Confidencial / Arquitectura de Software  

---

## 1. EVALUACIÓN DEL REPOSITORIO ACTUAL (ESTADO REAL VERIFICADO)

A la fecha de emisión de este documento, se ha ejecutado una inspección forense rigurosa sobre el espacio de trabajo local y el repositorio Git asociado (`https://github.com/LeonardoPool/IRIS.git`).

### 1.1 Estado del Código y Árbol de Trabajo
- **Rama activa:** `main` (alineada con `origin/main`, commit inicial `b5457ea Initial commit from Create Next App`).
- **Estado de Git:** Árbol de trabajo limpio (`working tree clean`). No existen cambios locales sin confirmar ni conflictos de fusión.
- **Entorno de ejecución base detectado en sistema operativo:**
  - Node.js: `v26.13.0`
  - npm: `11.20.0`
  - Git CLI: `2.x` en `C:\Program Files\Git\cmd\git.exe`

### 1.2 Dependencias Actuales (`package.json`)
El proyecto se encuentra en su estado de inicialización elemental con la plantilla base de Next.js:
- `next`: `16.4.6` (Next.js con App Router y Turbopack).
- `react`: `19.3.0`
- `react-dom`: `19.3.0`
- `@tailwindcss/turbopack`: `4.3.3`
- `tailwindcss`: `4.3.3`
- `typescript`: `^5`
- `eslint`: `^9` / `eslint-config-next`: `16.4.6`

### 1.3 Infraestructura y Funcionalidades Pendientes (Ausentes en Código)
Es crítico explicitar qué **no existe** en este momento para evitar suposiciones erróneas:
1. **Sin base de datos configurada:** No existe directorio `supabase/`, no hay migraciones SQL ni esquemas declarados.
2. **Sin SDK de Supabase:** `@supabase/supabase-js` y `@supabase/ssr` no han sido instalados.
3. **Sin variables de entorno:** No existen archivos `.env`, `.env.local` ni `.env.example`. No hay llaves ni secretos presentes en el repositorio.
4. **Sin librería de componentes visuales:** `shadcn/ui`, `radix-ui`, `lucide-react` no han sido incorporados aún.
5. **Sin lógica de negocio ni modelos:** No existen servicios, hooks de negocio, controladores, adaptadores de canales, clientes de IA ni conectores de firma electrónica.
6. **Contenido de interfaz:** La ruta principal `src/app/page.tsx` contiene la plantilla predeterminada de Create Next App.

---

## 2. VISIÓN Y PRINCIPIOS ARQUITECTÓNICOS DE IRIS

IRIS no es un CRM convencional ni una bandeja superficial de mensajería; es la **plataforma operativa comercial** de alto rendimiento dentro del ecosistema tecnológico **WYLEN**, diseñada bajo el lema:
> *"Every relationship, understood."*  
> *"Engineering that inspires."*

### 2.1 Principios Rectores de Ingeniería
1. **Monolito Modular por Diseño:** Se adopta un monolito modular altamente cohesivo y desacoplado, estructurado en dominios de negocio claros. Se prohíbe la fragmentación prematura en microservicios hasta que existan imperativos de escala o aislamiento operativo comprobados.
2. **Multi-Inquilino (Multi-Tenant) Mandatorio:** Aislamiento estricto de datos por organización en la capa de persistencia utilizando PostgreSQL Row Level Security (RLS) y validación server-side forzosa.
3. **Seguridad por Defecto y Cero Confianza (Zero Trust):** Denegación por defecto en RLS. Jamás confiar en identificadores de organización (`organizacion_id`) provenientes del cliente sin validación criptográfica de sesión y pertenencia. Jamás exponer `service_role` al cliente.
4. **Dominio Estricto en Español:** En cumplimiento del Addendum Lingüístico oficial de IRIS, toda la modelación de entidades, tablas, columnas, funciones SQL, procedimientos, tipos TypeScript, estados y servicios se define rigurosamente en español bajo convención `snake_case` (DB) y `camelCase`/`PascalCase` (TypeScript). Se reservan los términos en inglés únicamente para nombres de tecnologías, protocolos o contratos de APIs de proveedores externos (p. ej. Meta, DocuSign).
5. **Auditoría e Inmutabilidad de Operaciones Comerciales:** Ningún registro de asignación, evento de SLA o cambio de titularidad comercial debe sobrescribirse. Las correcciones administrativas generan nuevos eventos auditables.
6. **Sin Simulaciones de Integración:** Ninguna integración (WhatsApp, Meta, Google, DocuSign, NARA, SENA) debe fingirse operativa en la interfaz si no cuenta con contratos reales y credenciales validadas.

---

## 3. LÍMITES DE DOMINIO Y ARQUITECTURA EN CAPAS

La plataforma se organiza en cuatro capas de responsabilidad claramente delimitadas para evitar la mezcla de consultas SQL, reglas de negocio y presentación visual:

```
┌─────────────────────────────────────────────────────────────┐
│                 1. CAPA DE PRESENTACIÓN                     │
│    (Next.js App Router, Server/Client Components, UI)       │
├─────────────────────────────────────────────────────────────┤
│                 2. CAPA DE APLICACIÓN                       │
│    (Server Actions, Route Handlers, Casos de Uso, DTOs)     │
├─────────────────────────────────────────────────────────────┤
│                 3. CAPA DE DOMINIO (CORE)                   │
│    (Reglas de Negocio, Entidades, Motores de SLA, Eventos)  │
├─────────────────────────────────────────────────────────────┤
│               4. CAPA DE INFRAESTRUCTURA                    │
│    (Supabase/PostgreSQL, Storage, Adaptadores de Canales,   │
│     DocuSign Client, Conectores NARA/SENA, Outbox Pattern)  │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Estructura Propuesta de Directorios (`src/`)

```text
src/
├── app/                                 # Rutas de Next.js App Router
│   ├── (autenticacion)/                 # Flujos de acceso e identidad
│   │   ├── iniciar-sesion/
│   │   └── recuperar-clave/
│   ├── (panel)/                         # Entorno de trabajo autenticado
│   │   ├── panel-control/               # Métricas y KPIs consolidados
│   │   ├── bandeja/                     # Inbox omnicanal unificado
│   │   ├── prospectos/                  # Gestión y captura de leads
│   │   ├── contactos/                   # Perfil 360° de clientes
│   │   ├── empresas/                    # Directorio de cuentas corporativas
│   │   ├── oportunidades/               # Embudos y pipeline de ventas
│   │   ├── actividades/                 # Tareas, llamadas y calendario
│   │   ├── recursos/                    # Plantillas y biblioteca digital
│   │   ├── contratos/                   # Ciclo de vida y firma DocuSign
│   │   ├── analitica/                   # Reportes de atribución y SLA
│   │   ├── configuracion/               # Ajustes organizacionales y equipos
│   │   ├── layout.tsx                   # Shell principal del panel
│   │   └── page.tsx
│   ├── api/                             # Endpoints REST y Webhooks
│   │   ├── webhooks/
│   │   │   ├── whatsapp/                # Webhook oficial WhatsApp Cloud API
│   │   │   ├── meta-leads/              # Webhook Meta Lead Ads
│   │   │   └── docusign/                # Webhook DocuSign Connect
│   │   └── v1/                          # API REST versionada para ecosistema
│   ├── layout.tsx
│   └── globals.css
│
├── modulos/                             # Módulos de dominio de negocio
│   ├── autenticacion/                   # Sesión, contexto de membresía
│   ├── inquilinos/                      # Aislamiento multi-tenant
│   ├── prospectos/                      # Calificación, scoring y captura
│   ├── contactos/                       # Directorio y resolución de identidad
│   ├── oportunidades/                   # Etapas de embudo y valor comercial
│   ├── comunicacion/                    # Mensajería, bandeja y adaptadores
│   ├── sla/                             # Motor de cálculo y escalamiento
│   ├── equipos/                         # Roles, miembros y distribución
│   ├── actividades/                     # Agenda, tareas y seguimientos
│   ├── recursos/                        # Respuestas rápidas y archivos
│   ├── contratos/                       # Generación y orquestación eSign
│   ├── analitica/                       # Agregaciones y atribución de ventas
│   └── auditoria/                       # Registro inmutable de eventos
│
├── componentes/                         # Biblioteca de componentes reutilizables
│   ├── ui/                              # Primitivos shadcn/radix
│   ├── estructura/                      # Barras de navegación, cabeceras
│   └── compartidos/                     # Modales, tablas, filtros, estados vacíos
│
├── librerias/                           # Clientes técnicos e infraestructura
│   ├── supabase/                        # Clientes servidor/cliente y middleware
│   ├── validaciones/                    # Esquemas Zod por entidad
│   ├── seguridad/                       # Evaluador de permisos RBAC
│   ├── adaptadores/                     # Normalizadores WhatsApp, Meta, etc.
│   └── utilidades/                      # Formateadores de fecha, moneda, texto
│
├── tipos/                               # Definiciones TypeScript en español
└── configuracion/                       # Parámetros del sistema y constantes
```

---

## 4. ESTRATEGIA MULTI-INQUILINO (MULTI-TENANCY)

### 4.1 Principio de Aislamiento
Toda entidad perteneciente a la operación comercial de una empresa debe vincularse obligatoriamente a un registro en la tabla `organizaciones` mediante una columna `organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE RESTRICT`.

### 4.2 Políticas de Row Level Security (RLS) en PostgreSQL
1. **Regla de oro:** Toda tabla contiene `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;` y `ALTER TABLE <tabla> FORCE ROW LEVEL SECURITY;`.
2. **Contexto de Sesión:** Las políticas evalúan la membresía activa del usuario autenticado consultando una función de seguridad de base de datos eficiente e indexada:
   ```sql
   CREATE FUNCTION public.obtener_organizacion_activa_usuario()
   RETURNS UUID AS $$
     SELECT organizacion_id 
     FROM public.membresias 
     WHERE usuario_id = auth.uid() 
       AND estado = 'activo'
     LIMIT 1;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```
3. **Imposibilidad de suplantación desde el cliente:** El frontend jamás define el `organizacion_id` confiado por el backend. Los Server Actions y Route Handlers extraen el `organizacion_id` validado a través de la sesión Supabase y la tabla de `membresias`.
4. **Almacenamiento de Archivos:** Los buckets de Supabase Storage son estrictamente privados (`private`). Las rutas físicas se estructuran bajo el prefijo `/{organizacion_id}/{modulo}/{recurso_id}` y su acceso se gestiona exclusivamente mediante URLs firmadas con tiempo de expiración acotado.

---

## 5. ESTRATEGIA DE IDENTIDAD Y AUTENTICACIÓN (FRONTERA CON WYLEN CORE)

IRIS opera en armonía con el ecosistema global de WYLEN.

```
┌─────────────────────────────────────────────────────────────────┐
│                           WYLEN CORE                            │
│  - Autoridad de Identidad y Cuentas Globales                    │
│  - Catálogo de Suscripciones, Licencias y Módulos Habilitados   │
│  - Facturación Central y Estado del Tenant                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Token / Afiliación
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                              IRIS                               │
│  - Autenticación federada (Supabase Auth / JWT WYLEN CORE)      │
│  - Tabla local `usuarios` y `membresias`                        │
│  - Roles y Permisos granulares a nivel de organización          │
│  - Asignación de equipos, turnos y disponibilidad de agentes    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1 Roles y Permisos Granulares (RBAC)
Los roles predeterminados para una organización son:
1. `administrador_organizacion`: Acceso total a configuración, miembros, reportes y operaciones.
2. `gerente_ventas`: Supervisión de equipos, reasignación, métricas globales, diseño de embudos.
3. `supervisor_atencion`: Monitoreo de SLA, reasignación de conversaciones, auditoría de bandeja.
4. `agente_ventas`: Atención de prospectos, gestión de sus conversaciones y pipeline comercial asignado.

Los permisos se modelan de forma atómica:
`prospectos:crear`, `prospectos:leer_propios`, `prospectos:leer_todos`, `conversaciones:asignar`, `conversaciones:responder`, `contratos:generar`, etc.

---

## 6. ESTRATEGIA Y ARQUITECTURA DE BASE DE DATOS (SUPABASE / POSTGRESQL)

El motor de persistencia central es PostgreSQL provisto por Supabase. Se definen las entidades maestras en español, organizadas por dominios funcionales cohesivos:

### 6.1 Dominio: Identidad, Tenencia y Equipos
- `organizaciones`: Empresas clientes registradas en IRIS.
- `usuarios`: Identidades sincronizadas con Supabase Auth.
- `membresias`: Relación usuario-organización con estado (`activo`, `suspendido`, `invitado`).
- `roles`: Definición de perfiles organizacionales.
- `permisos`: Catálogo granular de capacidades.
- `roles_permisos`: Matriz de asociación.
- `equipos`: Células de trabajo comercial o soporte.
- `miembros_equipo`: Pertenencia de agentes a equipos.

### 6.2 Dominio: CRM y Operaciones Comerciales
- `prospectos`: Leads entrantes con metadatos de adquisición original.
- `contactos`: Personas físicas/jurídicas unificadas (resolución de identidad).
- `empresas`: Entidades comerciales B2B vinculadas a contactos.
- `canales_contacto`: Vías verificadas (teléfonos, correos, perfiles sociales).
- `origenes_prospecto`: Catálogo de fuentes (Meta Ads, Orgánico, Sitio Web, Referido).
- `etiquetas_prospecto`: Taxonomía flexible de segmentación.
- `embudos_venta`: Pipelines comerciales configurables.
- `etapas_embudo`: Fases del ciclo comercial con orden y probabilidades.
- `oportunidades`: Negociaciones comerciales en curso con valor monetario estimado.
- `historial_etapas_oportunidad`: Trazabilidad inmutable de avances o retrocesos.
- `atribuciones_venta`: Registro formal del cierre comercial y reconocimiento de agentes.

### 6.3 Dominio: Comunicaciones Omnicanal y Auditoría
- `canales_comunicacion`: Proveedores habilitados (`whatsapp_cloud`, `facebook_messenger`, `instagram_direct`).
- `cuentas_canal`: Credenciales aisladas y cifradas por organización.
- `conversaciones`: Hilos de interacción omnicanal.
- `mensajes`: Registros de mensajes entrantes/salientes con contenido y estados de entrega.
- `eventos_conversacion`: Bitácora inmutable de eventos (`creacion`, `primera_respuesta`, `cambio_prioridad`, `nota_interna`).
- `asignaciones_conversacion`: Histórico completo de transferencia de agentes.
- `participantes_conversacion`: Agentes que intervinieron en la conversación.
- `registros_sla`: Estado de cumplimiento del acuerdo de nivel de servicio.
- `cierres_conversacion`: Motivo y actor de finalización o reapertura.

### 6.4 Dominio: Recursos y Documentos
- `respuestas_rapidas`: Plantillas de respuesta para agentes con variables dinámicas (`{{nombre}}`).
- `carpetas_recursos`: Jerarquía de almacenamiento digital.
- `archivos_recursos`: Catálogos, fichas técnicas y folletos vinculados a Supabase Storage.
- `versiones_archivo`: Control de cambios de documentos comerciales.

### 6.5 Dominio: Contratos y Firma Electrónica
- `plantillas_contrato`: Formatos preaprobados con mapeo de campos dinámicos.
- `contratos`: Instancia contractual vinculada a una oportunidad y contacto.
- `firmantes_contrato`: Intervinientes con rol, orden de firma y estado.
- `sobres_firma`: Registro técnico del envelope de DocuSign con hash y evidencia de entrega.
- `eventos_contrato`: Auditoría de cambios de estado (`borrador`, `generado`, `enviado`, `completado`, etc.).

### 6.6 Dominio: Actividades, Notificaciones y Outbox
- `actividades`: Tareas, llamadas, reuniones y citas con sincronización a calendario.
- `notificaciones`: Avisos internos al usuario/agente en tiempo real o diferidos.
- `registros_auditoria`: Bitácora transaccional forense del sistema.
- `eventos_salientes` (*Outbox Pattern*): Publicación fiable de eventos para el ecosistema (SENA).

---

## 7. ARQUITECTURA DE COMUNICACIONES OMNICANAL Y AUDITORÍA

### 7.1 Diferenciación Conceptual Obligatoria
- **Canal de Adquisición de Prospectos:** Vías unidireccionales de captura estructurada de leads (ej. Meta Lead Ads, formularios web). No son bandejas de chat.
- **Canal de Mensajería Bidireccional:** Vías de interacción interactiva (WhatsApp Business Cloud API, Instagram Direct, Facebook Messenger).

### 7.2 Procesamiento Idempotente de Webhooks
Para evitar la duplicación de mensajes debido a reintentos del proveedor externo (Meta):
1. Cada webhook entrante se valida criptográficamente mediante su firma HMAC (`X-Hub-Signature-256`).
2. Se extrae el identificador único del mensaje del proveedor (`proveedor_mensaje_id`).
3. Se inserta en una tabla de control de idempotencia o se utiliza una restricción única `UNIQUE(cuenta_canal_id, proveedor_mensaje_id)`. Si ya existe, se responde `200 OK` inmediatamente sin reprocesar.

### 7.3 Separación de Roles en la Conversación y Atribución
IRIS prohíbe terminantemente asociar una venta a un agente únicamente por haber contestado el primer mensaje. Se modelan explícitamente:
- **Agente Receptor Inicial:** Quien recibió el lead o primer mensaje entrante.
- **Agente Asignado:** Quien tiene la responsabilidad activa de atender la conversación en un momento dado.
- **Agentes Participantes:** Agentes de soporte o supervisores que colaboraron con notas internas o respuestas puntuales.
- **Agente de Cierre:** El responsable comercial acreditado que concretó el cierre de la oportunidad.

---

## 8. MOTOR DE SLA (SERVICE LEVEL AGREEMENT)

### 8.1 Políticas de Respuesta
- **Objetivo Predeterminado de Primera Respuesta:** 5 a 10 minutos (configurable por organización).
- **Parámetros de Evaluación:**
  - Horario comercial hábil de la organización (días laborales, horas laborables, días festivos).
  - La respuesta de un bot o mensaje automático de bienvenida **no computa** como primera respuesta humana.
  - Los mensajes adicionales del prospecto antes de la primera respuesta no reinician el temporizador.
- **Cálculo Backend Confiable:** El cálculo y escalamiento del SLA no depende de temporizadores volátiles en el navegador del cliente; se evalúa y persiste en la base de datos y se supervisa mediante trabajos asíncronos confiables en la infraestructura de backend.

---

## 9. MÓDULOS DE RECURSOS, CONTRATOS Y ANALÍTICA

### 9.1 Recursos Digitales y Macros
- Plantillas de respuesta rápida con soporte de sustitución controlada de variables contextuales (`{{prospecto.nombre}}`, `{{oportunidad.desarrollo}}`). Si una variable no existe en el registro, el sistema no inventa información ni genera errores; solicita completarla o emite el contenido seguro.
- Archivos compartibles estructurados en carpetas con control de acceso y generación de enlaces temporales seguros.

### 9.2 Contratos y DocuSign
- Flujo estricto: Oportunidad en etapa de cierre $\rightarrow$ Generación a partir de plantilla predefinida $\rightarrow$ Población con datos auditados $\rightarrow$ Revisión previa $\rightarrow$ Emisión de Sobre a DocuSign API $\rightarrow$ Notificaciones vía DocuSign Connect Webhook $\rightarrow$ Descarga y custodia segura del documento firmado y certificado de finalización en Supabase Storage $\rightarrow$ Cierre de la oportunidad.
- **Aviso Legal:** Se deja constancia de que las firmas y contratos en México requieren validación con los asesores legales de cada organización para el cumplimiento normativo aplicable (Código de Comercio, NOM-151, etc.).

### 9.3 Inteligencia de Negocio y Métricas Reales
- Cuadros de mando alimentados directamente por consultas analíticas agregadas en PostgreSQL.
- Se prohíbe categóricamente el uso de cifras fijas o simuladas en los dashboards.

---

## 10. INTEGRACIÓN CON EL ECOSISTEMA WYLEN

### 10.1 NARA (Inteligencia Artificial)
- NARA se consume como un microservicio satélite a través de interfaces REST/gRPC bien definidas.
- IRIS consume capacidades como: calificación de prospectos, sugerencia de respuestas para agentes, resumen de conversaciones extensas y detección de intenciones de compra.
- Ninguna regla comercial crítica es delegada a la IA sin posibilidad de intervención o supervisión humana.

### 10.2 SENA (Automatización de Negocio) y Patrón Outbox
- Para garantizar que ningún evento comercial se pierda durante fallas transitorias de red, IRIS utiliza el patrón **Transaccional Outbox**:
  1. La operación de negocio (ej. `prospecto_creado`) y la inserción en la tabla `eventos_salientes` ocurren en la misma transacción atómica de PostgreSQL.
  2. Un despachador en background lee los eventos pendientes y los envía de forma idempotente a los webhooks de SENA.

---

## 11. MATRIZ DE SEGURIDAD Y RESILIENCIA

| Vector | Amenaza | Mecanismo de Defensa en IRIS |
|---|---|---|
| Inquilinos cruzados | Usuario de Org A lee datos de Org B | RLS forzoso en PostgreSQL + validación de pertenencia en Server Actions. |
| Exposición de secretos | Filtración de tokens de WhatsApp o DocuSign | Variables de entorno estrictamente privadas en el servidor; nunca en el bundle cliente. |
| Falsificación de Webhook | Inyección de mensajes falsos vía API | Validación estricta de firma criptográfica HMAC SHA-256 en cabeceras HTTP. |
| Duplicación de eventos | Reintentos de Meta generando mensajes dobles | Clave de idempotencia única basada en el identificador del mensaje del proveedor. |
| Acceso a archivos privados | Descarga pública de contratos y fichas | Buckets privados en Supabase Storage con emisión de URLs firmadas temporales. |

---

## 12. RIESGOS TÉCNICOS IDENTIFICADOS

1. **Uso de Versiones de Vanguardia (Next.js 16 + React 19):**
   - *Riesgo:* Cambios en la API de Server Components, tipado de props de diseño (`LayoutProps`, `PageProps`) y compatibilidad con librerías externas de UI.
   - *Mitigación:* Respetar las guías de `node_modules/next/dist/docs/` y tipados estrictos sin `any`.
2. **Límites de Cuota y Tiempos de Caducidad de Tokens en Meta APIs:**
   - *Riesgo:* Revocación de permisos o expiración de tokens de página de Facebook y WhatsApp Cloud API.
   - *Mitigación:* Almacenamiento seguro del estado de salud de cada conexión e instrumentación de alertas de desconexión en el panel.
3. **Complejidad de Fusión de Identidades de Contactos:**
   - *Riesgo:* Duplicación involuntaria de perfiles al ingresar por múltiples canales (WhatsApp y formulario web).
   - *Mitigación:* Política conservadora de resolución de identidades. Solo fusionar bajo concordancia estricta y verificada de número telefónico normalizado E.164 o correo electrónico validado.

---

## 13. PREGUNTAS ABIERTAS Y DECISIONES PENDIENTES DE APROBACIÓN

Antes de iniciar la Fase 1, se somete a validación del liderazgo técnico:
1. **Instancia de Supabase:** ¿Se utilizará un proyecto gestionado en Supabase Cloud o un despliegue local/self-hosted con Docker para el desarrollo de migraciones?
2. **Formato de autenticación inicial:** ¿Se iniciará con Supabase Auth directo o se requiere desde la Fase 1 un adaptador federado con el servidor de autenticación de WYLEN CORE?
3. **Criterio de Moneda y Localización:** ¿Se tomará el peso mexicano (MXN) y zona horaria `America/Mexico_City` como estándar base por defecto para el cálculo de horarios laborales de SLA y valores de oportunidades?

---

## 14. SECUENCIA DE IMPLEMENTACIÓN RECOMENDADA (HACIA FASE 1)

1. **Aprobación de la Fase 0 (Descubrimiento y Gobernanza Técnica).**
2. **Fase 1 (Cimientos):**
   - Configuración de estructura de directorios modular.
   - Creación de primera migración de base de datos en Supabase: Tablas maestras de organizaciones, usuarios, membresías, roles, permisos y políticas RLS fundamentales.
   - Integración del sistema de diseño (shadcn/ui, Tailwind CSS, paleta de colores Grafito/Marfil/Azul Apagado y tipografías Manrope/Switzer).
   - Middleware de resolución de contexto de inquilino y protección de rutas.
   - Verificación de pruebas de aislamiento multi-inquilino.

---
*Fin del documento de arquitectura. Esperando autorización explícita para iniciar la Fase 1.*
