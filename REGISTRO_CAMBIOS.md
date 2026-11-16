# IRIS by WYLEN — REGISTRO DE CAMBIOS (CHANGELOG)
Todas las modificaciones notables y evoluciones arquitectónicas de este proyecto se documentarán en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico [SemVer](https://semver.org/lang/es/).

---

## [0.4.0-alfa.3] - 2026-11-15 — FASE 3: COMUNICACIONES OMNICANAL, BANDEJA Y MOTOR DE SLA

### Añadido
- **Migración SQL 003 (Omnicanal y SLA):** Creación de `supabase/migrations/20261115000003_comunicaciones_omnicanal_sla.sql` conteniendo `canales_comunicacion`, `cuentas_canal`, `conversaciones`, `mensajes`, `asignaciones_conversacion`, `participantes_conversacion`, `eventos_conversacion`, `registros_sla` y `cierres_conversacion`.
- **Idempotencia Estricta en Mensajería:** Restricción de base de datos única `uq_mensajes_idempotencia` para prevenir duplicación por reintentos de Meta Graph API.
- **Adaptador Oficial de WhatsApp Business Cloud API:** `src/librerias/adaptadores/whatsapp.ts` con verificación de firma HMAC SHA-256 en cabeceras `X-Hub-Signature-256`, normalización multicanal y envío de mensajes salientes.
- **Webhook de WhatsApp Cloud:** `src/app/api/webhooks/whatsapp/route.ts` con reto de verificación `hub.challenge` (GET) y procesamiento seguro de eventos (POST).
- **Servicio de Comunicaciones y Motor de SLA:** `src/servicios/comunicacion.ts` con:
  - Detección y reapertura automática de conversaciones.
  - Temporizador persistido de SLA (10 min en horario hábil).
  - Cálculo de primera respuesta humana excluyendo respuestas de bots o mensajes de bienvenida.
  - Auditoría de transferencias y reasignaciones con motivo obligatorio en `asignaciones_conversacion`.
  - Bitácora inmutable de eventos en `eventos_conversacion`.
  - Soporte de notas internas privadas entre agentes (`nota_interna`).
- **Workspace de la Bandeja Omnicanal (Editorial & Human):** `src/app/(panel)/bandeja/page.tsx` y `src/componentes/omnicanal/vista-bandeja.tsx` con navegación por pestañas (`todas`, `no_asignadas`, `mis_conversaciones`, `prioritarias`, `cerradas`), panel de chat con notas internas diferenciadas, temporizador reactivo de SLA y panel lateral de contexto del cliente (CRM 360°).

### Verificado
- Compilación de producción Next.js 16 (`npm run build`) exitosa para 13 rutas (`13/13`) con `exit code 0`.
- Verificación estricta de tipos TypeScript sin errores (`npx tsc --noEmit`).

---

## [0.3.0-alfa.2] - 2026-11-15 — FASE 2: CRM CORE Y GESTIÓN COMERCIAL 360°

### Añadido
- **Migración SQL 002 (CRM Core):** Creación de `supabase/migrations/20261115000002_crm_core.sql` conteniendo `origenes_prospecto`, `prospectos`, `empresas`, `contactos`, `canales_contacto`, `embudos_venta`, `etapas_embudo`, `oportunidades`, `historial_etapas_oportunidad`, `atribuciones_venta` y `actividades`.
- **Aislamiento Multi-Tenant con RLS:** Políticas de Row Level Security con `FORCE ROW LEVEL SECURITY` y denegación por defecto en todas las entidades comerciales.
- **Tipos TypeScript del Dominio Comercial:** Definición de modelos completos en español en `src/tipos/crm.ts`.
- **Servicios de Negocio:** Implementación de `ServicioCRM` en `src/servicios/crm.ts` para:
  - Registro, calificación, búsqueda y conversión atómica de prospectos.
  - Tablero Kanban con avance de etapas y registro inmutable en `historial_etapas_oportunidad`.
  - Atribución formal de ventas ganadas en `atribuciones_venta`.
  - Directorio 360° de contactos con resolución de canales.
  - Agenda y seguimiento de actividades comerciales (llamadas, reuniones, tareas).
  - Cálculo en tiempo real de métricas agregadas del CRM (sin datos simulados).
- **Server Actions con Autorización en Servidor:** `src/acciones/crm.ts` con protección `exigirPermiso()` y validación por esquemas Zod en `src/librerias/validaciones/crm.ts`.
- **Interfaces de Usuario (Editorial & Human):**
  - Módulo de Prospectos: `src/app/(panel)/prospectos/page.tsx` y `src/componentes/crm/vista-prospectos.tsx` (con filtros, búsqueda y modal de conversión a oportunidad).
  - Módulo de Pipeline Kanban: `src/app/(panel)/oportunidades/page.tsx` y `src/componentes/crm/vista-oportunidades.tsx` (con cálculo de cartera acumulada por etapa y transiciones ágiles).
  - Directorio de Contactos: `src/app/(panel)/contactos/page.tsx` y `src/componentes/crm/vista-contactos.tsx`.
  - Agenda de Actividades: `src/app/(panel)/actividades/page.tsx` y `src/componentes/crm/vista-actividades.tsx`.
  - Cuadro de Mando Actualizado: `src/app/(panel)/panel-control/page.tsx` con KPIs consolidados en vivo.

### Verificado
- Conexión real con Supabase Cloud activa y verificada.
- Compilación de producción (`npm run build`) exitosa para todas las rutas (`11/11`).
- Chequeo estricto de tipos TypeScript sin errores (`npx tsc --noEmit`).

---

## [0.2.0-alfa.1] - 2026-11-15 — FASE 1: CIMIENTOS Y SISTEMA MULTI-INQUILINO

### Añadido
- **Estructura y Dependencias Fundacionales:** Incorporación de `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`.
- **Sistema de Diseño "Editorial & Human":** Implementación de tokens de color Grafito (`#17191D`), Marfil (`#F5F5F2`), Azul Apagado (`#7185A5`) y tipografía sans en `src/app/globals.css`. Componentes primitivos: `Boton`, `CampoTexto`, `PlacaEstado`, `Tarjeta`, `Avatar`.
- **Estructura de Base de Datos y Migración SQL 001:** Creación de `supabase/migrations/20261115000001_cimientos_identidad_tenencia.sql` conteniendo `organizaciones`, `usuarios`, `roles`, `permisos`, `roles_permisos`, `membresias`, `equipos`, `miembros_equipo` y `registros_auditoria`.
- **Seguridad y RLS con Denegación por Defecto:** Funciones SQL `public.obtener_organizacion_activa_usuario()` y `public.usuario_tiene_permiso(p_permiso_codigo)` con políticas de aislamiento estricto por inquilino.
- **Datos de Prueba (Seed):** `supabase/seed.sql` con dos organizaciones para pruebas de aislamiento cruzado (`Inmobiliaria Horizonte WYLEN` y `Desarrollos Residenciales del Norte`).
- **Resolución de Inquilino y RBAC en Servidor:** Módulos `src/librerias/seguridad/contexto-inquilino.ts` y `src/librerias/seguridad/verificador-permisos.ts`.
- **Frontera de Integración con WYLEN CORE:** Cliente `src/librerias/ecosistema/wylen-core.ts` para consulta de licencias, planes y verificación de módulos habilitados.
- **Validaciones Zod:** Esquemas de inicio de sesión, creación de equipos e invitación de miembros en `src/librerias/validaciones/identidad.ts`.
- **Manejador de Proxy de Next.js 16:** Implementación de `src/proxy.ts` (sucesor de middleware en Next.js 16) con refresco de sesión Supabase y protección de rutas.
- **Interfaz Gráfica de Fase 1:**
  - Página de acceso seguro: `src/app/(autenticacion)/iniciar-sesion/page.tsx`.
  - Shell del panel: `src/componentes/estructura/barra-lateral.tsx` y `src/componentes/estructura/cabecera-superior.tsx`.
  - Panel de control de cimientos: `src/app/(panel)/panel-control/page.tsx`.
  - Gestión de equipos y roles: `src/app/(panel)/configuracion/page.tsx` y `src/componentes/configuracion/vista-equipos.tsx`.

### Verificado
- Compilación de producción Next.js 16 (`npm run build`) completada con éxito (`exit code 0`).
- Verificación estricta de tipos TypeScript sin errores (`npx tsc --noEmit`).

---

## [0.1.0-alfa.0] - 2026-11-15 — FASE 0: DESCUBRIMIENTO Y ARQUITECTURA

### Añadido
- **Inspección Forense Inicial:** Análisis del repositorio existente (`https://github.com/LeonardoPool/IRIS.git`), dependencias en `package.json`, árbol Git y configuración de compilación.
- **Documento Maestro de Arquitectura:** `ARQUITECTURA_PROYECTO.md` y `PROJECT_ARCHITECTURE.md`, estableciendo los límites de dominio, principios de ingeniería, monolito modular, aislamiento multi-tenant y estrategia de integración con el ecosistema WYLEN (WYLEN CORE, NARA, SENA).
- **Especificación de Modelo de Datos:** `MODELO_BASE_DATOS.md` y `DATABASE_SCHEMA.md`, definiendo las entidades de base de datos en PostgreSQL con nomenclatura técnica en español (`snake_case`), Row Level Security (RLS) y trazabilidad inmutable.
- **Especificación de API y Webhooks:** `ESPECIFICACION_API.md` y `API_SPECIFICATION.md`, detallando el estándar de respuestas REST v1, validación HMAC para Meta y DocuSign, y contratos con NARA y SENA.
- **Catálogo de Integraciones:** `INTEGRACIONES.md`, declarando el estado real verificado (sin simulaciones) de las conexiones con WhatsApp Business Cloud API, Meta Lead Ads, Google Ads, Google Calendar y DocuSign.
- **Arquitectura de Seguridad:** `SEGURIDAD.md` y `SECURITY.md`, con los lineamientos de Zero Trust, denegación por defecto, protección de almacenamiento y cumplimiento de la LFPDPPP en México.
- **Plan de Desarrollo y Hoja de Ruta:** `PLAN_DESARROLLO.md` y `DEVELOPMENT_ROADMAP.md`, con el cronograma detallado de las Fases 0 a 7 y criterios de aceptación específicos.
- **Guía de Configuración de Entorno:** `CONFIGURACION_ENTORNO.md` y `ENVIRONMENT_SETUP.md`, con la plantilla de variables de entorno y flujo de trabajo para Supabase CLI.
- **Gobernanza de Cambios:** Este archivo `REGISTRO_CAMBIOS.md` y `CHANGELOG.md`.

### Seguridad
- Se verifica que no existen secretos ni claves privadas expuestas en el repositorio.
- Se establece la prohibición de exponer `service_role` al frontend y se define el uso de URLs firmadas temporales para archivos privados.

### Reglas de Ingeniería Observadas
- **Cero modificaciones no autorizadas:** No se modificaron configuraciones de producción, migraciones de base de datos, dependencias del proyecto (`package.json`) ni código de aplicación durante esta fase.
- **Detención controlada:** La ejecución se detiene rigurosamente al concluir la Fase 0 a la espera de autorización explícita para la Fase 1.
