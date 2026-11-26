# IRIS — Índice de Documentación y Contexto para Agentes de IA

Toda la documentación técnica, arquitectónica, de base de datos, seguridad e integraciones de **IRIS** se encuentra centralizada en esta carpeta (`agente/`) para facilitar la lectura e interpretación por agentes de IA.

## 1. Reglas Maestras y Visión General
- [AGENTS.md](./AGENTS.md) *(también en la raíz del repositorio y en `.agent/rules.md`)* — Instrucciones obligatorias de ingeniería, diseño de producto, UX/UI y flujo de trabajo.
- [README.md](./README.md) *(también en la raíz del repositorio)* — Descripción general del proyecto y arranque rápido.

## 2. Arquitectura y Decisiones Técnicas
- [ARQUITECTURA_PROYECTO.md](./ARQUITECTURA_PROYECTO.md) / [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) — Arquitectura general del sistema.
- [ESPECIFICACION_ARQUITECTONICA_V3_1.md](./ESPECIFICACION_ARQUITECTONICA_V3_1.md) — Especificación arquitectónica v3.1.
- [IRIS_ARCHITECTURE_STATUS.md](./IRIS_ARCHITECTURE_STATUS.md) — Estado actual de la arquitectura e implementación.
- [IRIS_IMPLEMENTATION_BLUEPRINT.md](./IRIS_IMPLEMENTATION_BLUEPRINT.md) — Blueprint de implementación por módulos.
- [IRIS_MASTER_DECISION_LOG.md](./IRIS_MASTER_DECISION_LOG.md) — Bitácora maestra de decisiones de producto y arquitectura.
- [IRIS_TECHNICAL_DECISIONS.md](./IRIS_TECHNICAL_DECISIONS.md) — Decisiones técnicas (ADRs).

## 3. Base de Datos, API y Seguridad
- [MODELO_BASE_DATOS.md](./MODELO_BASE_DATOS.md) / [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Esquema relacional, tablas multiempresa y políticas RLS.
- [ESPECIFICACION_API.md](./ESPECIFICACION_API.md) / [API_SPECIFICATION.md](./API_SPECIFICATION.md) — Contratos de endpoints, webhooks y Server Actions.
- [SEGURIDAD.md](./SEGURIDAD.md) / [SECURITY.md](./SECURITY.md) — Modelo RBAC, aislamiento multi-inquilino y controles de seguridad.

## 4. Integraciones y Entorno
- [INTEGRACIONES.md](./INTEGRACIONES.md) — Integraciones externas del ecosistema IRIS.
- [WHATSAPP_CLOUD_API_Y_MCP_REFERENCIA.md](./WHATSAPP_CLOUD_API_Y_MCP_REFERENCIA.md) — Guía técnica de Meta WhatsApp Business Cloud API, webhooks, plantillas y MCP.
- [CONFIGURACION_ENTORNO.md](./CONFIGURACION_ENTORNO.md) / [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) — Variables de entorno y configuración local/producción.

## 5. Planificación, Pruebas y Cambios
- [PLAN_DESARROLLO.md](./PLAN_DESARROLLO.md) / [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — Hoja de ruta y fases de desarrollo.
- [IRIS_TEST_STRATEGY.md](./IRIS_TEST_STRATEGY.md) — Estrategia de validación y pruebas.
- [REGISTRO_CAMBIOS.md](./REGISTRO_CAMBIOS.md) / [CHANGELOG.md](./CHANGELOG.md) — Historial de versiones y cambios.
