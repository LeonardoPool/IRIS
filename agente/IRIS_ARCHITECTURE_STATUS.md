# IRIS — ESTADO DE ARQUITECTURA Y TABLERO DE PREPARACIÓN (`IRIS_ARCHITECTURE_STATUS.md`)

> **Propósito:** Tablero ejecutivo de control que sintetiza el estado de cada problema técnico, las soluciones de ingeniería cerradas, las decisiones comerciales pendientes del propietario del producto y la lista de verificación previa al inicio de la Fase 2.

---

## 1. Tablero de Estado de Problemas Arquitectónicos (Problemas A – F)

| Código | Problema Técnico | Estado de Ingeniería | Solución Definitiva Seleccionada | Artefacto de Evidencia | ¿Requiere Decisión del Propietario? |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **PROBLEMA A** | Identidad de Operaciones Comerciales, Multi-Unidad e Idempotencia | **RESUELTO Y CORREGIDO (Hallazgo 1)** | 4 acciones explícitas (`CONVERTIR_PROSPECTO`, `REUTILIZAR_OPORTUNIDAD`, `AGREGAR_UNIDADES_A_OPORTUNIDAD`, `CREAR_NUEVA_NEGOCIACION`) + `oportunidad_unidades` (N:M) + `solicitudes_idempotencia` con `UNIQUE(organizacion_id, operacion, clave_idempotencia)`, hash SHA-256 canónico sobre arreglo ordenado de unidades y rechazo `23505` ante reutilización de clave con payload distinto. | • [IRIS_TECHNICAL_DECISIONS.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TECHNICAL_DECISIONS.md)<br/>• [IRIS_SQL_DESIGN_PROPOSAL.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_SQL_DESIGN_PROPOSAL.sql) | **No** (Solución técnica cerrada). |
| **PROBLEMA B** | Fusión e Identidad de Contactos sin Pérdida ni Reversión Destructiva | **RESUELTO Y CORREGIDO (Hallazgo 2)** | Fusión manual autorizada con archivado no destructivo de canales duplicados (`archivado_por_fusion_id`, `contacto_origen_fusion_id`) + reversión no destructiva (`revertir_fusion_contacto`) que preserva cambios posteriores del contacto principal, valida orden LIFO, detecta operaciones cerradas (`ganada`/`aceptada`) o reasignadas a terceros y soporta reversión parcial segura bajo confirmación. | • [IRIS_TECHNICAL_DECISIONS.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TECHNICAL_DECISIONS.md)<br/>• [IRIS_SQL_DESIGN_PROPOSAL.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_SQL_DESIGN_PROPOSAL.sql) | **No** (Solución técnica cerrada). |
| **PROBLEMA C** | Aislamiento Multiempresa, Completitud de Tablas y Transición de FKs | **RESUELTO Y CORREGIDO (Hallazgo 3)** | Completadas las 18 tablas nuevas en SQL (incluyendo `documentos_desarrollo`, `solicitudes_documento` y `asignaciones_asesor_desarrollo`) con FKs compuestas a `public.membresias(organizacion_id, usuario_id)` + transición en 3 pasos (`Backfill/Saneamiento` → `ADD CONSTRAINT ... NOT VALID` → `VALIDATE CONSTRAINT`) para las tablas existentes. | • [IRIS_TECHNICAL_DECISIONS.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TECHNICAL_DECISIONS.md)<br/>• [IRIS_SQL_DESIGN_PROPOSAL.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_SQL_DESIGN_PROPOSAL.sql) | **No** (Solución técnica cerrada). |
| **PROBLEMA D** | Seguridad Real de `SECURITY DEFINER`, Catálogo Nativo y `pg_cron` | **RESUELTO Y CORREGIDO (Hallazgo 4)** | Eliminada toda dependencia de `extensions.digest` / `pgcrypto`: uso 100% de funciones nativas de `pg_catalog` (`pg_catalog.gen_random_uuid()` y `pg_catalog.sha256()`) con `SET search_path = pg_catalog, pg_temp`. Separación de `liberar_apartados_vencidos` (exclusiva `postgres`/`service_role`) y `sincronizar_apartados_vencidos_organizacion` (`authenticated`). | • [IRIS_TECHNICAL_DECISIONS.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TECHNICAL_DECISIONS.md)<br/>• [IRIS_SQL_DESIGN_PROPOSAL.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_SQL_DESIGN_PROPOSAL.sql) | **No** (Política de seguridad verificada). |
| **PROBLEMA E** | Motor Financiero con Aritmética Entera `BigInt` ($10^{12}$) y 14 Escenarios | **RESUELTO Y CORREGIDO (Hallazgo 5)** | Eliminado `Math.round` + `Number.EPSILON`. Motor reproducible en `BigInt` con escala fija $10^{12}$ (`ROUND_HALF_UP` entero) y corrección verificada de los Escenarios 02 ($M_{24} = \$23,536.66$, Intereses $= \$64,881.68$), 03B ($M = \$23,393.75$, $M_{24} = \$23,393.84$, Intereses $= \$61,450.09$), 08 ($M_{36} = \$17,146.92$, Intereses $= \$117,287.02$) y 09 ($M = \$13,827.32$, $M_{12} = \$13,827.29$). | • [IRIS_TEST_STRATEGY.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TEST_STRATEGY.md) | **Parcial** (`IRIS-DEC-028`: modalidad inicial preseleccionada en UI). |
| **PROBLEMA F** | Políticas Comerciales con Herencia Granular por Campo | **RESUELTO Y CORREGIDO (Hallazgo 6)** | Índices únicos parciales (`WHERE desarrollo_id IS NULL` y `WHERE desarrollo_id IS NOT NULL`), columnas anulables en filas de desarrollo y función `obtener_politica_comercial_efectiva` que resuelve campo por campo `COALESCE(p_des.<campo>, p_org.<campo>, <default>)` sin retroactividad sobre apartados o cotizaciones existentes. | • [IRIS_TECHNICAL_DECISIONS.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_TECHNICAL_DECISIONS.md)<br/>• [IRIS_SQL_DESIGN_PROPOSAL.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_SQL_DESIGN_PROPOSAL.sql) | **Sí** (`IRIS-DEC-025` a `027`: valores iniciales por defecto). |

---

## 2. Problemas que Requieren Verificación Técnica Durante la Implementación (Hallazgos del Repositorio)

Al auditar el código actual frente a las migraciones `000001`–`000010`, se detectaron dos desajustes menores preexistentes en [src/servicios/asesores.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/servicios/asesores.ts) que están documentados para corregirse al iniciar la implementación:
1. En `src/servicios/asesores.ts` (línea 494), al reasignar una conversación se actualiza la columna `agente_asignado_id`, pero en `20261115000003_comunicaciones_omnicanal_sla.sql` (línea 52) la columna real de `public.conversaciones` se llama **`agente_asignado_actual_id`**.
2. En `src/servicios/asesores.ts` (línea 507), al reasignar una oportunidad se actualiza la columna `propietario_id`, pero en `20261115000002_crm_core.sql` (línea 167) la columna real de `public.oportunidades` se llama **`agente_asignado_id`**.

---

## 3. Decisiones Pendientes del Propietario del Producto

Solo restan por confirmar los **4 valores predeterminados iniciales de negocio** (`IRIS-DEC-025` a `IRIS-DEC-028` en [IRIS_MASTER_DECISION_LOG.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_MASTER_DECISION_LOG.md)), sabiendo que todos ellos son parametrizables en `public.politicas_comerciales`:
1. **`IRIS-DEC-025`:** ¿Confirmas `72` horas como valor inicial por defecto para `horas_vigencia_apartado`?
2. **`IRIS-DEC-026`:** ¿Confirmas `7` días naturales como valor inicial por defecto para `dias_vigencia_cotizacion`?
3. **`IRIS-DEC-027`:** ¿Confirmas `permitir_apartado_directo_asesor = true` y `permitir_liberacion_propia_asesor = true` como configuración inicial por defecto?
4. **`IRIS-DEC-028`:** ¿Confirmas `'valor_presente_cuota_fija'` como modalidad preseleccionada por defecto al crear un nuevo esquema financiero?

---

## 4. Dependencias para Iniciar la Implementación de la FASE 2

- [x] Arquitectura multiempresa y FKs compuestas diseñadas sobre el esquema real (`IRIS_SQL_DESIGN_PROPOSAL.sql`).
- [x] Identidad de operaciones e idempotencia resuelta para los 12 escenarios (`IRIS_TECHNICAL_DECISIONS.md`).
- [x] Proceso de fusión de contactos y reversión transaccional diseñado para las 7 tablas reales (`IRIS_SQL_DESIGN_PROPOSAL.sql`).
- [x] Funciones `SECURITY DEFINER` endurecidas con `SET search_path = pg_catalog, pg_temp` (`IRIS_SQL_DESIGN_PROPOSAL.sql`).
- [x] Motor financiero verificado en los 14 escenarios extremos (`IRIS_TEST_STRATEGY.md`).
- [ ] **Autorización explícita del propietario del producto para iniciar la FASE 2.**
