# IRIS by WYLEN — PLAN DE DESARROLLO Y HOJA DE RUTA
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Planificación Estratégica y Fases de Ingeniería (Fase 0)  

---

## 1. DISTINCIÓN METODOLÓGICA OBLIGATORIA
- **Funcionalidad Existente Verificada:** Se ha completado la Fase 0 (inspección técnica forense del repositorio y formulación de la arquitectura de referencia sin alteración de dependencias ni esquemas).
- **Arquitectura Propuesta:** Planificación estructurada en 8 fases progresivas con criterios de aceptación explícitos e independientes.
- **Supuestos:** Cada fase requiere verificación y autorización explícita antes de iniciar la siguiente.
- **Dependencias Externas:** Disponibilidad de instancias Supabase, credenciales de desarrollo para Meta Graph API, DocuSign Demo y servicios WYLEN.
- **Decisiones Pendientes de Aprobación:** Fechas límite de entrega por sprint comercial y asignación de entornos de integración continua (CI/CD).

---

## 2. HOJA DE RUTA GENERAL DE DESARROLLO

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 0: Descubrimiento y Arquitectura [COMPLETADA]          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: Cimientos y Sistema Multi-Inquilino [COMPLETADA]    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: CRM Core y Gestión Comercial 360° [COMPLETADA]      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: Comunicaciones Omnicanal, Bandeja y Motor de SLA    │
│ [COMPLETADA]                                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Listo para iniciar)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 4: Integraciones de Marketing y Productividad          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 5: Ecosistema WYLEN: NARA (IA) y SENA (Automatización) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 6: Recursos, Contratos DocuSign y Analítica            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 7: Preparación para Producción y Endurecimiento        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DESGLOSE DETALLADO POR FASE

### FASE 0 — DESCUBRIMIENTO Y ARQUITECTURA (ESTADO ACTUAL)
- **Objetivo:** Inspeccionar el repositorio, analizar convenciones, verificar estado de Git y emitir el paquete canónico de arquitectura en español sin alterar el código base.
- **Entregables:**
  - `ARQUITECTURA_PROYECTO.md` / `PROJECT_ARCHITECTURE.md`
  - `MODELO_BASE_DATOS.md` / `DATABASE_SCHEMA.md`
  - `ESPECIFICACION_API.md` / `API_SPECIFICATION.md`
  - `INTEGRACIONES.md`
  - `SEGURIDAD.md` / `SECURITY.md`
  - `PLAN_DESARROLLO.md` / `DEVELOPMENT_ROADMAP.md`
  - `CONFIGURACION_ENTORNO.md` / `ENVIRONMENT_SETUP.md`
  - `REGISTRO_CAMBIOS.md` / `CHANGELOG.md`
- **Criterio de Cierre:** Documentación exhaustiva completada, repositorio limpio y detención obligatoria a la espera de autorización.

---

### FASE 1 — CIMIENTOS Y SISTEMA MULTI-INQUILINO
- **Objetivo:** Establecer la base tecnológica, diseño visual y núcleo de seguridad multi-inquilino.
- **Alcance Técnico:**
  - Estructuración de directorios modulares según convención en español.
  - Instalación de dependencias mínimas requeridas: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, utilidades de `shadcn/ui`.
  - Configuración del sistema de diseño (tokens Grafito `#17191D`, Marfil `#F5F5F2`, Azul Apagado `#7185A5`, tipografías Manrope y Switzer).
  - Migración SQL 001: Tablas maestras de organizaciones, usuarios, membresías, roles y permisos en Supabase.
  - Políticas iniciales de Row Level Security (RLS) y función `obtener_organizacion_activa_usuario()`.
  - Flujo de autenticación y resolución de sesión en Server Components y Middleware de Next.js.
- **Criterios de Aceptación:**
  - Un usuario puede registrarse e iniciar sesión de manera segura.
  - El contexto del inquilino se resuelve en el servidor de forma infalsificable.
  - La prueba de acceso cruzado entre dos organizaciones deniega la lectura de registros estrictamente.
  - La interfaz gráfica base refleja la estética sobria, editorial y profesional aprobada.

---

### FASE 2 — CRM CORE Y GESTIÓN COMERCIAL 360°
- **Objetivo:** Implementar la operativa comercial central de captación, seguimiento y avance de oportunidades.
- **Alcance Técnico:**
  - Migración SQL 002: Tablas de prospectos, contactos, empresas, embudos de venta, etapas de embudo y oportunidades.
  - Módulo de Prospectos: Creación manual, importación, validación de datos (Zod), asignación inicial y scoring.
  - Módulo de Contactos y Empresas: Directorio unificado, resolución conservadora de identidad y perfiles de relación.
  - Módulo de Oportunidades: Vista de embudo Kanban, cálculo de valor de cartera, probabilidades por etapa y transiciones registradas en `historial_etapas_oportunidad`.
  - Cuadro de Mando Inicial: Indicadores reales agregados (leads nuevos, valor de cartera, conversión por etapa). Cero datos simulados.
- **Criterios de Aceptación:**
  - Un prospecto puede transitar desde su registro hasta convertirse en contacto y oportunidad.
  - El historial de cambios de etapa es completamente auditable.
  - Ninguna métrica del panel muestra números estáticos o simulados.

---

### FASE 3 — COMUNICACIONES OMNICANAL, BANDEJA Y MOTOR DE SLA
- **Objetivo:** Desarrollar la bandeja unificada de atención y el motor de cumplimiento de SLA con auditoría inmutable.
- **Alcance Técnico:**
  - Migración SQL 003: Canales, cuentas de canal, conversaciones, mensajes, eventos, asignaciones y registros SLA.
  - Adaptador de WhatsApp Business Cloud API: Manejo seguro de Webhooks con firma HMAC, idempotencia y envío de mensajes salientes.
  - Interfaz de la Bandeja de Entrada: Panel de navegación por estados (`todas`, `no_asignadas`, `mis_conversaciones`), visor de conversación y panel lateral de contexto del cliente.
  - Motor de SLA de Backend: Temporizadores persistidos en PostgreSQL, cálculo en horario hábil y detección de alertas/violaciones.
  - Registro Inmutable de Asignaciones: Trazabilidad total de quién recibió, quién atendió y quién transfirió la conversación.
- **Criterios de Aceptación:**
  - Mensajes entrantes de WhatsApp se reciben, verifican y persisten sin duplicidad.
  - La reasignación de una conversación exige actor y motivo, preservando el histórico.
  - Las alertas de SLA se activan oportunamente según las horas laborales configuradas.

---

### FASE 4 — INTEGRACIONES DE MARKETING Y PRODUCTIVIDAD
- **Objetivo:** Conectar las fuentes de atracción y herramientas de agenda de los agentes.
- **Alcance Técnico:**
  - Integración Meta Lead Ads: Captura automática de prospectos con metadatos de campaña.
  - Formularios web para sitios institucionales mediante endpoints seguros con protección anti-abuso.
  - Integración Google Calendar / Google Meet vía OAuth 2.0 para agendamiento de reuniones.
- **Criterios de Aceptación:**
  - Los prospectos captados desde campañas en Meta ingresan a IRIS preservando la atribución de origen.
  - Las reuniones agendadas desde la ficha del prospecto se sincronizan de forma verídica con Google Calendar.

---

### FASE 5 — ECOSISTEMA WYLEN: NARA (IA) Y SENA (AUTOMATIZACIÓN)
- **Objetivo:** Integrar la capa de inteligencia artificial y la orquestación asíncrona de flujos comerciales.
- **Alcance Técnico:**
  - Cliente desacoplado NARA: Inferencia asistida para clasificación de intención, resúmenes y sugerencias de respuesta al agente.
  - Patrón Transaccional Outbox para SENA: Registro de eventos de negocio en `eventos_salientes` y despachador confiable hacia webhooks de SENA.
- **Criterios de Aceptación:**
  - La IA opera como asistencia humana sin autonomía descontrolada sobre decisiones críticas.
  - Los eventos de negocio se entregan de forma atómica y fiable a SENA ante desconexiones de red.

---

### FASE 6 — RECURSOS, CONTRATOS DOCUSIGN Y ANALÍTICA
- **Objetivo:** Proveer herramientas de aceleración comercial, formalización contractual y reportes ejecutivos.
- **Alcance Técnico:**
  - Módulo de Respuestas Rápidas con interpolación segura de variables (`{{nombre}}`).
  - Biblioteca de Archivos Digitales en Supabase Storage con emisión de URLs firmadas temporales.
  - Módulo de Contratos con DocuSign eSign API: Generación desde plantilla, emisión de sobre y captura de eventos Connect.
  - Modelo de Atribución Comercial: Distinción entre agente receptor y agente de cierre formal.
  - Cuadros de mando analíticos avanzados con filtros multidimensionales.
- **Criterios de Aceptación:**
  - Los contratos firmados en DocuSign se custodian con su certificado de finalización en almacenamiento privado.
  - La atribución comercial reconoce exactamente al agente que cerró la venta.

---

### FASE 7 — PREPARACIÓN PARA PRODUCCIÓN Y ENDURECIMIENTO
- **Objetivo:** Blindar la plataforma para despliegue de grado empresarial.
- **Alcance Técnico:**
  - Pruebas automatizadas de aislamiento multi-inquilino y RLS.
  - Pruebas E2E de flujos críticos comerciales con Playwright.
  - Auditoría forense de dependencias y tiempos de respuesta.
  - Configuración de monitoreo, alertas y planes de recuperación ante desastres.
- **Criterios de Aceptación:**
  - Cero vulnerabilidades críticas de acceso cruzado entre organizaciones.
  - Documentación de puesta en producción y manuales de operaciones completados.

---
*Fin del plan de desarrollo.*
