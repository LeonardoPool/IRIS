# IRIS — DECISIONES TÉCNICAS DE INGENIERÍA (`IRIS_TECHNICAL_DECISIONS.md`)

> **Propósito:** Resolución técnica definitiva de los seis problemas críticos de arquitectura (Problemas A–F), basada en la inspección directa de las 10 migraciones existentes (`20261115000001` a `20261117000010`) y de los servicios del repositorio de IRIS.

---

## PROBLEMA A: Identidad de Operaciones Comerciales e Idempotencia

### 1. Investigación del Esquema Real en el Repositorio
La inspección directa de [20261115000002_crm_core.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/supabase/migrations/20261115000002_crm_core.sql) y [src/servicios/crm.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/servicios/crm.ts) demuestra que:
- **`public.prospectos` (líneas 26–45):** Tiene `id`, `organizacion_id`, `origen_id`, `nombre`, `correo_electronico`, `telefono`, `empresa_nombre`, `desarrollo_interes` (`VARCHAR(255)`), `estado` (`'nuevo'`, `'contactado'`, `'calificado'`, `'descalificado'`, `'convertido'`), `agente_asignado_id`, `contacto_convertido_id`, `oportunidad_convertida_id` y en `000010` se agregaron `estado_comercial_id`, `plataforma_origen`, `categoria`. **No posee índice único por teléfono ni correo, ni posee `UNIQUE(id, organizacion_id)`**.
- **`public.contactos` (líneas 78–94):** Tiene `id`, `organizacion_id`, `empresa_id`, `prospecto_origen_id`, `nombre`, `apellidos`, `correo_principal`, `telefono_principal`, `agente_responsable_id`, `estado` (`'activo'`, `'inactivo'`, `'archivado'`). **No tiene restricción `UNIQUE` sobre `prospecto_origen_id`**.
- **`public.oportunidades` (líneas 160–180):** Tiene `id`, `organizacion_id`, `embudo_id`, `etapa_id`, `contacto_id`, `empresa_id`, `agente_asignado_id`, `titulo`, `valor_estimado`, `moneda`, `probabilidad_cierre`, `fecha_cierre_esperada`, `desarrollo_propiedad` (`VARCHAR`), `lote_unidad` (`VARCHAR`), `estado` (`'abierta'`, `'ganada'`, `'perdida'`, `'cancelada'`).
- **Tablas dependientes de `oportunidades.id`:** `public.historial_etapas_oportunidad` (`oportunidad_id`), `public.atribuciones_venta` (`UNIQUE(oportunidad_id)`), `public.actividades` (`oportunidad_id`) y `public.prospectos` (`oportunidad_convertida_id`).
- **`ServicioCRM.convertirProspecto` ([src/servicios/crm.ts](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/src/servicios/crm.ts#L105-L227)):** Actualmente ejecuta 5 `INSERT` secuenciales desde Next.js sin transacción de base de datos, sin bloqueo `FOR UPDATE` y sin clave de idempotencia. Si el usuario hace doble clic, crea 2 contactos, 2 empresas y 2 oportunidades idénticas.

### 2. Diagnóstico Técnico de la Causa Raíz
En las iteraciones anteriores se mezclaron dos problemas de naturaleza distinta:
1. **Idempotencia de transporte/comando** (evitar que un doble clic, un reintento HTTP o dos peticiones simultáneas del mismo comando creen registros duplicados).
2. **Exclusividad física de inventario vs. Negociación comercial:** En el negocio inmobiliario, **abrir una oportunidad o emitir una cotización NO bloquea ni reserva una unidad** (eso solo ocurre cuando la unidad pasa a `apartado` o `vendido` en `unidades_inmobiliarias`). Imponer una restricción `UNIQUE (organizacion_id, contacto_id, desarrollo_id, unidad_id) WHERE estado = 'abierta'` en `oportunidades` es un error de modelado porque:
   - Impide cotizar/negociar paquetes de **múltiples unidades** en una sola operación (relación 1:N o N:M).
   - Impide que un mismo cliente abra una segunda negociación legítima sobre la misma unidad (por ejemplo, tras cambiar de esquema de compra individual a copropiedad o empresa) mientras la primera sigue abierta.

### 3. Evaluación de Alternativas

| Criterio | Alternativa A: `oportunidades` como entidad central de la operación + tabla puente `oportunidad_unidades` + tabla transaccional `solicitudes_idempotencia` | Alternativa B: Crear una nueva entidad superior `operaciones_comerciales` encima de `oportunidades` | Alternativa C: Mantener `oportunidades` con una sola columna `unidad_id` e índices únicos por `(contacto_id, desarrollo_id, unidad_id)` |
| :--- | :--- | :--- | :--- |
| **Compatibilidad con CRM existente** | **Alta:** Conserva todas las FKs existentes (`historial_etapas_oportunidad`, `atribuciones_venta`, `actividades`, `prospectos`). | **Baja:** Duplica el concepto de `oportunidades` y obliga a migrar `atribuciones_venta` y `/oportunidades`. | **Media:** Rompe cuando una operación incluye 2 o más lotes/unidades. |
| **Soporte multi-unidad (1 a $N$ lotes por operación)** | **Nativo:** `oportunidad_unidades` permite 0, 1 o $N$ unidades por oportunidad. | **Nativo:** Requiere tabla puente adicional. | **Inviable:** Obliga a clonar oportunidades para una sola cotización multi-unidad. |
| **Idempotencia y Concurrencia** | **Exacta:** `solicitudes_idempotencia` (`UNIQUE(organizacion_id, clave_idempotencia)`) + bloqueo `FOR UPDATE` sobre la entidad origen (`prospecto` o `contacto`). | **Compleja:** Añade un nivel más de bloqueo sin beneficio real. | **Defectuosa:** Bloquea operaciones legítimas del negocio al usar datos de dominio como llave de idempotencia. |

### 4. Decisión Recomendada y Reglas Inequívocas de Identidad Comercial (Hallazgo 1 Corregido)
**Se selecciona la Alternativa A evolucionada con separación explícita de las 4 acciones de dominio:**

1. **`public.oportunidades` es la entidad canónica de cada Operación Comercial (Negociación)**, acompañada de la tabla puente N:M `public.oportunidad_unidades` (que almacena las $1 \dots N$ unidades negociadas en esa oportunidad) y de la tabla de transporte `public.solicitudes_idempotencia` (`UNIQUE (organizacion_id, operacion, clave_idempotencia)`).
2. **Eliminación de la contradicción entre Paquetes Multi-Unidad y Negociaciones Separadas:**
   La decisión de si una nueva unidad se suma al paquete de una oportunidad existente o si abre una negociación independiente **no se adivina implícitamente por coincidencia de unidad**, sino que se gobierna mediante el parámetro explícito `p_accion_operacion` y la referencia `p_oportunidad_id`:

| Acción de Dominio (`p_accion_operacion`) | Condición de Invocación | Comportamiento Transaccional Exacto |
| :--- | :--- | :--- |
| **1. `REUTILIZAR_OPORTUNIDAD`**<br/>*(Reutilizar una negociación abierta)* | • Se envía `p_oportunidad_id IS NOT NULL` de una oportunidad `'abierta'`.<br/>• O se convierte un prospecto (`CONVERTIR_PROSPECTO`) cuyo `oportunidad_convertida_id` ya apunta a una oportunidad `'abierta'`.<br/>• O el contacto tiene una oportunidad general `'abierta'` en el mismo `desarrollo_id` sin unidades aún asignadas (`0` filas activas en `oportunidad_unidades`) y se le asigna su primera unidad. | Reutiliza el `oportunidad_id` existente sin crear una fila nueva en `public.oportunidades`. Si la oportunidad era general (sin unidades) y la solicitud incluye unidades, las vincula en `oportunidad_unidades` y actualiza `unidad_principal_id`. |
| **2. `AGREGAR_UNIDADES_A_OPORTUNIDAD`**<br/>*(Ampliar un paquete multi-unidad en la misma negociación)* | El asesor está dentro de una oportunidad `'abierta'` (`p_oportunidad_id` obligatorio) y selecciona una o más unidades adicionales del mismo desarrollo para cotizarlas/negociarlas como un solo paquete comercial. | Verifica con `FOR UPDATE` que la oportunidad esté `'abierta'` y pertenezca al mismo `desarrollo_id`, inserta las unidades nuevas en `public.oportunidad_unidades` (`ON CONFLICT (oportunidad_id, unidad_id) DO UPDATE SET estado_en_operacion = 'en_negociacion'`) y recalcula `oportunidades.valor_estimado` como la suma de precios de las unidades activas del paquete. |
| **3. `CREAR_NUEVA_NEGOCIACION`**<br/>*(Abrir un expediente de negociación independiente)* | • El cliente inicia negociación en otro desarrollo (`D2 <> D1`).<br/>• La oportunidad previa del cliente ya está cerrada (`'ganada'`, `'perdida'` o `'cancelada'`).<br/>• El asesor solicita explícitamente abrir una segunda negociación independiente en el mismo desarrollo (para otra unidad `U2`, o incluso una nueva estructura de compra sobre la misma unidad `U1`). | Genera un nuevo `codigo_operacion` único, inserta una nueva fila en `public.oportunidades` (`estado = 'abierta'`) e inserta sus unidades en `public.oportunidad_unidades`. |
| **4. `EMITIR_COTIZACION_EN_NEGOCIACION`**<br/>*(Crear una nueva cotización dentro de una negociación)* | El asesor emite una propuesta financiera (`public.emitir_cotizacion_inmobiliaria`) vinculada a una oportunidad `'abierta'` (`p_oportunidad_id`). | **Jamás crea una nueva oportunidad.** Sincroniza las unidades cotizadas en `oportunidad_unidades`, inserta la nueva versión en `public.cotizaciones_inmobiliarias` (`oportunidad_id = p_oportunidad_id`) con su `snapshot_comercial` inmutable y actualiza `oportunidades.cotizacion_vigente_id`. |

3. **Alcance de la Clave Idempotente, Hash Determinista y Reutilización con Datos Diferentes:**
   - **Alcance:** `UNIQUE (organizacion_id, operacion, clave_idempotencia)` en `public.solicitudes_idempotencia`.
   - **Cálculo determinista del Hash (`hash_parametros`):** Se ordena ascendentemente el arreglo `p_unidades_ids`, se concatena canónicamente `concat_ws('|', p_prospecto_id, COALESCE(p_oportunidad_id::text,'NULL'), p_desarrollo_id, v_unidades_ordenadas_txt, p_accion_operacion)` y se calcula su SHA-256 con la función nativa del núcleo PostgreSQL `pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_payload, 'UTF8')), 'hex')`.
   - **Reutilización de clave con parámetros diferentes:** Si existe `(organizacion_id, operacion, clave_idempotencia)` y `v_idemp.hash_parametros <> v_hash_actual`, la RPC aborta inmediatamente con `RAISE EXCEPTION 'IDEMPOTENCIA_PAYLOAD_DIFERENTE' USING ERRCODE = '23505'` sin tocar ninguna tabla de negocio.
   - **Reintento tras fallo o en progreso:** Si `v_idemp.hash_parametros = v_hash_actual`, dado que la fila en `solicitudes_idempotencia` se bloquea con `FOR UPDATE` dentro de la misma transacción ACID que muta el negocio, cualquier fallo hace rollback de toda la transacción; si la primera transacción tuvo éxito, `estado = 'completada'` y el reintento devuelve `v_idemp.respuesta_json`.

### 5. Demostración: Matriz de Resolución de los 12 Casos de Concurrencia y Negocio

| Caso | Estado Inicial | Solicitud Recibida | Bloqueos Adquiridos (`FOR UPDATE`) | Validaciones Ejecutadas | Registros Creados o Reutilizados | Resultado Final y Garantía contra Duplicidad |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Doble clic en convertir prospecto** | Prospecto `P1` (`estado='calificado'`, `oportunidad_convertida_id=NULL`). | Dos peticiones simultáneas con `(operacion='gestionar_operacion', clave_idempotencia='conv:P1:v1')`. | Lock `FOR UPDATE` en `solicitudes_idempotencia` sobre `(Org1, 'gestionar_operacion', 'conv:P1:v1')`. | Tx1 crea `C1` y `O1` y sella `respuesta_json`. Tx2 desbloquea la fila idempotente, verifica `hash_parametros` idéntico y `estado='completada'`. | **1 Contacto (`C1`), 1 Oportunidad (`O1`).** | Ambas peticiones reciben `{contacto_id: C1, oportunidad_id: O1}`. **0 duplicados.** |
| **2. Reintento por error de red** | Tx1 confirmó `O1` en BD, pero se perdió la respuesta HTTP. | Reintento con la misma `clave_idempotencia='conv:P1:v1'` e idénticos parámetros. | Lectura de `solicitudes_idempotencia`. | `estado='completada'` y `hash_parametros` coincide. | **Reutiliza `C1` y `O1`** desde `respuesta_json`. | Retorno idempotente inmediato. Si el cliente reintentara la misma clave con otro `desarrollo_id`, recibe error `23505 IDEMPOTENCIA_PAYLOAD_DIFERENTE`. |
| **3. Dos solicitudes simultáneas del mismo prospecto (con distinta clave)** | `P1` (`oportunidad_convertida_id=NULL`). Dos pestañas envían `p_accion_operacion='CONVERTIR_PROSPECTO'` con claves `k1` y `k2`. | Tx1 (`k1`) y Tx2 (`k2`) simultáneas. | `SELECT * FROM public.prospectos WHERE id = P1 AND organizacion_id = Org1 FOR UPDATE`. | Tx1 bloquea `P1`, ve `oportunidad_convertida_id IS NULL`, crea `C1` y `O1` y actualiza `P1.oportunidad_convertida_id = O1`. Tx2 adquiere el lock de `P1` después del commit de Tx1 y ve `P1.oportunidad_convertida_id = O1`. | Tx1 crea `C1` y `O1`. Tx2 **reutiliza `C1` y `O1`**. | **1 solo Contacto y 1 sola Oportunidad.** Serializado por el lock de fila en `prospectos`. |
| **4. Dos prospectos diferentes asociados al mismo contacto** | `P1` y `P2` apuntan a `contacto_convertido_id = C1` (tras fusión autorizada). `C1` tiene oportunidad abierta `O1` en `D1`. | Se solicita `REUTILIZAR_OPORTUNIDAD` desde `P2` en `D1` (`p_oportunidad_id = O1` o búsqueda sobre `C1`). | Lock `FOR UPDATE` sobre `P2` y luego sobre `C1` (`public.contactos`). | Verifica que `O1` pertenece a `C1` en `D1` y está `'abierta'`. | **Reutiliza `C1` y `O1`**, actualizando `P2.oportunidad_convertida_id = O1`. | El lock sobre `C1` serializa las operaciones de ambos prospectos. |
| **5. Mismo contacto, mismo desarrollo y misma unidad, pero nueva negociación legítima** | `C1` tiene `O1` abierta sobre `(D1, U1)`, pero requiere abrir un segundo expediente independiente sobre `(D1, U1)`. | `p_accion_operacion = 'CREAR_NUEVA_NEGOCIACION'`, `p_unidades_ids = [U1]`. | Lock `FOR UPDATE` sobre `C1`. | Al ser `CREAR_NUEVA_NEGOCIACION`, genera nuevo `codigo_operacion`. | **Reutiliza `C1`, crea nueva Oportunidad `O2`** y vincula `U1` en `oportunidad_unidades`. | Ambas oportunidades (`O1` y `O2`) coexisten sin bloqueo artificial; la exclusividad física solo se aplica al apartar `U1` en `unidades_inmobiliarias`. |
| **6. Mismo contacto y desarrollo, pero dos unidades distintas (Paquete Multi-Unidad vs. Operación Separada)** | `C1` tiene `O1` abierta con la unidad `U1` en `D1`. Ahora se selecciona `U2` en `D1`. | • **Subcaso 6A (Paquete):** `p_accion_operacion = 'AGREGAR_UNIDADES_A_OPORTUNIDAD'`, `p_oportunidad_id = O1`, `p_unidades_ids = [U2]`.<br/>• **Subcaso 6B (Operación separada):** `p_accion_operacion = 'CREAR_NUEVA_NEGOCIACION'`, `p_unidades_ids = [U2]`. | Lock `FOR UPDATE` sobre `C1` y `O1`. | En **6A** valida que `O1` esté `'abierta'` en `D1` y agrega `U2` a `O1`. En **6B** abre un expediente nuevo `O2` para `U2`. | • **6A:** Reutiliza `O1` (ahora con `U1` y `U2` en `oportunidad_unidades`).<br/>• **6B:** Crea `O2` (con `U2`). | Resuelve sin ambigüedad cuándo `U2` se agrega al paquete existente (`6A`) y cuándo abre una segunda negociación (`6B`). |
| **7. Mismo contacto y dos desarrollos distintos** | `C1` tiene `O1` abierta en `D1`. Ahora inicia operación en `D2`. | `p_accion_operacion = 'CREAR_NUEVA_NEGOCIACION'`, `p_desarrollo_id = D2`. | Lock `FOR UPDATE` sobre `C1`. | `D2 <> D1`. | **Crea nueva Oportunidad `O2`** en `D2`. | Expedientes separados por desarrollo. |
| **8. Oportunidad general (sin unidad) que posteriormente recibe una unidad** | `C1` tiene `O1` abierta en `D1` con `0` unidades en `oportunidad_unidades`. | `p_accion_operacion = 'AGREGAR_UNIDADES_A_OPORTUNIDAD'` (o `REUTILIZAR_OPORTUNIDAD`), `p_oportunidad_id = O1`, `p_unidades_ids = [U5]`. | Lock `FOR UPDATE` sobre `C1` y `O1`. | Verifica `O1` abierta en `D1`. | **Reutiliza `O1`**, inserta `U5` en `oportunidad_unidades` y fija `O1.unidad_principal_id = U5`. | La oportunidad general recibe la unidad sin crear otra oportunidad. |
| **9. Oportunidad cerrada que inicia una negociación nueva** | `C1` tiene `O1` en estado `'perdida'` o `'ganada'`. | `p_accion_operacion = 'CREAR_NUEVA_NEGOCIACION'` (o `CONVERTIR_PROSPECTO`). | Lock `FOR UPDATE` sobre `C1`. | `O1.estado <> 'abierta'`, por lo que `O1` es inmutable. | **Conserva `O1` cerrada intacta y crea nueva Oportunidad `O2` (`'abierta'`)**. | Trazabilidad histórica preservada. |
| **10. Nueva cotización dentro de una negociación existente** | `O1` está `'abierta'` con cotización `COT-001`. | Invocación a `emitir_cotizacion_inmobiliaria` con `p_oportunidad_id = O1`. | Lock `FOR UPDATE` sobre `O1`. | Verifica `O1.estado = 'abierta'`. | **Reutiliza `O1`**, crea `COT-002` vinculada a `O1` y actualiza `O1.cotizacion_vigente_id = COT-002`. | Ninguna oportunidad adicional creada. |
| **11. Dos asesores trabajando simultáneamente con el mismo contacto** | Asesor A y Asesor B envían operaciones concurrentes sobre `C1`. | TxA y TxB concurrentes. | `SELECT 1 FROM public.contactos WHERE id = C1 AND organizacion_id = Org1 FOR UPDATE`. | Serialización estricta sobre `C1`. | Ejecución secuencial determinista. | Cero condiciones de carrera sobre la cartera del contacto. |
| **12. Solicitudes repetidas después de una operación exitosa** | Operación ejecutada con `(operacion, clave_idempotencia)`. | Nueva llamada con la misma clave. | Lectura de `solicitudes_idempotencia`. | Compara `hash_parametros`: si es igual, retorna `respuesta_json`; si difiere, arroja `23505`. | **0 escrituras.** | Idempotencia garantizada durante toda la ventana de retención. |

---

## PROBLEMA B: Fusión e Identidad de Contactos

### 1. Investigación de Relaciones Reales de `public.contactos` en el Repositorio
Inspeccionando las 10 migraciones existentes y las 3 nuevas propuestas, las tablas que referencian a `public.contactos(id)` son exactamente **7 entidades**:
1. `public.prospectos.contacto_convertido_id` (`000002`, `ON DELETE SET NULL`)
2. `public.canales_contacto.contacto_id` (`000002`, `ON DELETE CASCADE`)
3. `public.oportunidades.contacto_id` (`000002`, `ON DELETE RESTRICT`)
4. `public.actividades.contacto_id` (`000002`, `ON DELETE CASCADE`)
5. `public.conversaciones.contacto_id` (`000003`, `ON DELETE SET NULL`)
6. `public.reuniones_google_meet.contacto_id` (`000008`, `ON DELETE SET NULL`)
7. `public.cotizaciones_inmobiliarias.contacto_id` (`Propuesta en 013`, `ON DELETE RESTRICT`)

### 2. Diagnóstico Técnico
- En `000002`, `canales_contacto` no tiene restricción `UNIQUE(contacto_id, tipo_canal, valor)`. Si se reasignan los canales del contacto secundario al principal sin deduplicar, se insertarían canales repetidos.
- En `000002`, `oportunidades.contacto_id` tiene `ON DELETE RESTRICT`, por lo que eliminar físicamente un contacto secundario fallaría si no se reasignan antes sus oportunidades.
- Si un contacto se fusiona por error humano, sin un registro exacto de los IDs de las filas hijas transferidas (`prospectos`, `oportunidades`, `actividades`, `conversaciones`, `reuniones_google_meet`, `cotizaciones_inmobiliarias`, `canales_contacto`), sería imposible revertir la fusión porque no se sabría cuáles oportunidades pertenecían originalmente al contacto principal y cuáles vinieron del contacto secundario.

### 3. Solución Recomendada y Diseño de Reversión Exacta
1. **Detección y Priorización de Posibles Duplicados (`public.coincidencias_duplicados_crm`):**
   - Al crear/actualizar un prospecto o contacto, se evalúan 3 niveles de coincidencia dentro de la misma `organizacion_id`:
     - **Prioridad 1 — Alta (` puntaje = 95`):** Coincidencia exacta de `telefono_e164` ($\ge 10$ dígitos válidos) **Y** coincidencia exacta de `LOWER(TRIM(correo))`.
     - **Prioridad 2 — Media-Alta (`puntaje = 80`):** Coincidencia exacta de `telefono_e164` válido, o coincidencia exacta de `LOWER(TRIM(correo))` no genérico.
     - **Prioridad 3 — Baja (`puntaje = 50`):** Teléfono y correo distintos, pero coincidencia fonética/normalizada exacta de `nombre_completo` en el mismo desarrollo de interés.
   - Se registra una fila en `public.coincidencias_duplicados_crm` con `estado = 'pendiente_revision'` sin fusionar nada automáticamente.
2. **Ejecución Transaccional de Fusión Manual (`public.ejecutar_fusion_autorizada_contactos`):**
   - Adquiere bloqueo en orden determinista de UUID (`ORDER BY id ASC FOR UPDATE NOWAIT`) sobre `contacto_principal_id` y `contacto_secundario_id` para evitar deadlocks si dos supervisores intentan fusionar A→B y B→A al mismo tiempo.
   - Captura en variables locales los arreglos exactos de IDs (`UUID[]`) de cada una de las 7 tablas hijas que actualmente apuntan a `contacto_secundario_id`.
   - Reasigna las 7 tablas hijas hacia `contacto_principal_id` en orden estricto:
     1. `prospectos` (`contacto_convertido_id`)
     2. `canales_contacto` (insertando solo aquellos `(tipo_canal, valor)` que el principal no posea y archivando los restantes)
     3. `oportunidades` (`contacto_id`)
     4. `cotizaciones_inmobiliarias` (`contacto_id`)
     5. `actividades` (`contacto_id`)
     6. `conversaciones` (`contacto_id`)
     7. `reuniones_google_meet` (`contacto_id`)
   - Consolida los campos escalares según `p_estrategia_campos` (`'prevalece_principal'` por defecto, rellenando solo los `NULL` del principal con los valores del secundario, y uniendo `etiquetas` con `ARRAY(SELECT DISTINCT unnest(c1.etiquetas || c2.etiquetas))`).
   - Marca `contacto_secundario_id` con `estado = 'archivado'` y `fusionado_en_contacto_id = p_contacto_principal_id`.
   - Persiste el registro inmutable en `public.auditoria_fusiones_contacto` con `snapshot_principal_antes`, `snapshot_secundario_antes` y el JSONB `mapa_ids_reasignados` que contiene los 7 arreglos de UUIDs transferidos.
3. **Procedimiento Transaccional de Reversión No Destructiva (`public.revertir_fusion_contacto` — Hallazgo 2 Corregido):**
   Una reversión posterior a una fusión **nunca debe sobrescribir ciegamente** el contacto principal con `snapshot_principal_antes`, ya que después de la fusión el contacto principal pudo recibir nuevas oportunidades, cambios de teléfono/correo o cierres de venta.
   - **Conservación de canales duplicados archivados:** Durante la fusión, los canales de `canales_contacto` del secundario que no existían en el principal pasan a `contacto_id = p_contacto_principal_id` conservando `contacto_origen_fusion_id = p_contacto_secundario_id`, mientras que los canales que ya existían en el principal **no se eliminan ni se pierden**: permanecen vinculados a `p_contacto_secundario_id` marcados con `archivado_por_fusion_id = v_fusion_id`. Al revertir, los primeros regresan a `p_contacto_secundario_id` y los segundos simplemente limpian `archivado_por_fusion_id = NULL`.
   - **Restauración selectiva no destructiva de campos escalares en `contacto_principal_id`:** Solo se revierten a su valor previo aquellos campos escalares del contacto principal que (a) estaban `NULL` antes de la fusión, (b) fueron rellenados con el dato del secundario durante la fusión (`campos_rellenados_desde_secundario` en `auditoria_fusiones_contacto`) y (c) **no fueron editados manualmente después de la fusión** (`valor_actual IS NOT DISTINCT FROM valor_secundario_en_fusion`). Cualquier dato editado en el contacto principal después de la fusión se preserva intacto.
   - **Clasificación de operaciones durante la reversión (Automáticas vs. En Conflicto):**

| Tipo de Relación / Cambio Post-Fusión | Regla de Evaluación en `revertir_fusion_contacto` | Acción Ejecutada |
| :--- | :--- | :--- |
| **1. Relaciones transferidas sin bloqueo comercial posterior** (`prospectos`, `actividades`, `conversaciones`, `reuniones_google_meet`, `canales_contacto` con `contacto_origen_fusion_id`, y `oportunidades`/`cotizaciones` que siguen abiertas y apuntando a `contacto_principal_id`) | Verificación `contacto_id = v_fusion.contacto_principal_id` y `estado NOT IN ('ganada', 'aceptada')`. | **Reversión Automática Segura:** Se reasignan de vuelta a `contacto_secundario_id`. |
| **2. Relaciones creadas en `contacto_principal_id` DESPUÉS de la fusión** | Sus IDs **no están** en `mapa_ids_reasignados`. | **Intactas en `contacto_principal_id`:** Jamás se mueven al secundario. |
| **3. Relación transferida que fue reasignada manualmente a un 3er contacto (`C3`) después de la fusión** | Su `contacto_id` actual es `C3 <> contacto_principal_id`. | **Conflicto Detectado (`REASIGNADA_A_TERCERO`):** No se toca `C3`. Se reporta en `conflictos_detectados`. |
| **4. Oportunidad o Cotización transferida que se cerró como `ganada` / `aceptada` después de la fusión** | `oportunidades.estado = 'ganada'` o `cotizaciones.estado = 'aceptada'` con cierre posterior a `fecha_fusion`. | **Conflicto Comercial Crítico (`OPERACION_CERRADA_POST_FUSION`):** No se revierte automáticamente. Si `p_permitir_reversion_parcial = false` (default), aborta y exige resolución manual; si `p_permitir_reversion_parcial = true`, mantiene la venta en el principal, revierte el resto de relaciones seguras y deja constancia en `reporte_reversion`. |
| **5. `contacto_principal_id` fue fusionado posteriormente en un 3er contacto (`C3`)** | `contacto_principal.estado = 'archivado' AND fusionado_en_contacto_id IS NOT NULL`. | **Bloqueo Estricto (Orden LIFO):** Rechaza la reversión exigiendo revertir primero la fusión más reciente hacia `C3`. |

---

## PROBLEMA C: Aislamiento Multiempresa y Auditoría de Usuarios

### 1. Inventario Real de Columnas de Usuario y Organización en el Repositorio (Verificado en `000001`–`000010`)

| Migración | Tabla Existente | Columna Tenant | Columnas de Usuario Existentes | FK Actual en Repositorio | Hallazgo de Auditoría |
| :---: | :--- | :--- | :--- | :--- | :--- |
| `000001` | `equipos` | `organizacion_id` | `lider_usuario_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple a `usuarios(id)`. |
| `000001` | `miembros_equipo` | `organizacion_id` | `usuario_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE CASCADE` | FK simple a `usuarios(id)`. |
| `000001` | `registros_auditoria` | `organizacion_id` | `usuario_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | Permite `NULL` para eventos de sistema. |
| `000002` | `prospectos` | `organizacion_id` | `agente_asignado_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple; no impide en DDL asignar un usuario de otro tenant. |
| `000002` | `empresas` | `organizacion_id` | `agente_responsable_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple a `usuarios(id)`. |
| `000002` | `contactos` | `organizacion_id` | `agente_responsable_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple a `usuarios(id)`. |
| `000002` | `oportunidades` | `organizacion_id` | `agente_asignado_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |
| `000002` | `historial_etapas_oportunidad` | `organizacion_id` | `usuario_cambio_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |
| `000002` | `atribuciones_venta` | `organizacion_id` | `agente_cierre_id` (`NOT NULL`), `agente_receptor_inicial_id` (`NULL`) | `REFERENCES usuarios(id)` | FK simple a `usuarios(id)`. |
| `000002` | `actividades` | `organizacion_id` | `usuario_responsable_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |
| `000003` | `conversaciones` | `organizacion_id` | `agente_receptor_inicial_id` (`NULL`), `agente_asignado_actual_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | Nota: En `servicios/asesores.ts` línea 494 se llamaba erróneamente `agente_asignado_id` en vez de `agente_asignado_actual_id`. |
| `000003` | `mensajes` | `organizacion_id` | `remitente_usuario_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | `NULL` cuando `remitente_tipo IN ('cliente','sistema','bot')`. |
| `000003` | `asignaciones_conversacion` | `organizacion_id` | `agente_anterior_id`, `agente_nuevo_id`, `actor_reasignacion_id` | `REFERENCES usuarios(id)` | FK simple a `usuarios(id)`. |
| `000003` | `eventos_conversacion` | `organizacion_id` | `actor_usuario_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | `NULL` en eventos automáticos de SLA. |
| `000003` | `cierres_conversacion` | `organizacion_id` | `agente_cierre_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |
| `000005` | `formularios_web` | `organizacion_id` | `agente_predeterminado_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple a `usuarios(id)`. |
| `000006` | `permisos_personalizados_asesor` | `organizacion_id` | `usuario_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE CASCADE` | `UNIQUE(organizacion_id, usuario_id)`. |
| `000008` | `reuniones_google_meet` | `organizacion_id` | `asesor_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE CASCADE` | FK simple a `usuarios(id)`. |
| `000009` | `speeches_comerciales` | `organizacion_id` | `creado_por_id` (`NULL`) | `REFERENCES usuarios(id) ON DELETE SET NULL` | FK simple a `usuarios(id)`. |
| `000009` | `ejecuciones_speech` | `organizacion_id` | `usuario_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |
| `000010` | `auditoria_traspasos_personal` | `organizacion_id` | `usuario_responsable_movimiento_id`, `usuario_transferido_id`, `responsable_anterior_id`, `responsable_nuevo_id` | `REFERENCES usuarios(id)` | FK simple a `usuarios(id)`. |
| `000010` | `historial_estados_lead` | `organizacion_id` | `usuario_id` (`NOT NULL`) | `REFERENCES usuarios(id) ON DELETE RESTRICT` | FK simple a `usuarios(id)`. |

### 2. Diagnóstico Técnico y Decisión de Arquitectura
1. **`public.membresias` ya posee `UNIQUE (organizacion_id, usuario_id)`** ([000001 línea 97](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/supabase/migrations/20261115000001_cimientos_identidad_tenencia.sql#L97)).
2. **Por qué una FK compuesta a `public.membresias(organizacion_id, usuario_id)` resuelve las garantías 1, 2, 4 y 5 de forma declarativa:**
   - En PostgreSQL, toda llave foránea compuesta `(organizacion_id, <columna_usuario_id>) REFERENCES public.membresias(organizacion_id, usuario_id)` opera en modo `MATCH SIMPLE`:
     - Si `<columna_usuario_id> IS NOT NULL`, PostgreSQL exige que exista esa combinación exacta `(organizacion_id, usuario_id)` en `public.membresias`. Es **imposible** insertar o actualizar un usuario que no sea miembro de esa organización.
     - Si `<columna_usuario_id> IS NULL` (por ejemplo, un prospecto aún sin asesor en el Pool de Leads, o un evento automático ejecutado por `pg_cron` donde no hay usuario humano), `MATCH SIMPLE` permite el registro sin violar `organizacion_id NOT NULL`.
3. **Regla de Baja de Membresía (Garantía 4 y 5 — Prohibición de `DELETE` físico en `membresias`):**
   - Cuando un colaborador deja la inmobiliaria, su fila en `public.membresias` **nunca se elimina con `DELETE`**; cambia su columna `estado` a `'suspendido'` (y `usuarios.estado = 'inactivo'`).
   - Para impedir incluso un `DELETE` accidental en `public.membresias` cuando existen registros históricos, las columnas históricas (`usuario_id`, `creado_por_id`, `agente_cierre_id`) usan `ON DELETE RESTRICT` (o `ON DELETE SET NULL (<columna_usuario_id>)` en asignaciones operativas abiertas).
4. **Garantía 3 (Impedir que usuarios inactivos o con membresía suspendida reciban NUEVAS asignaciones operativas, sin invalidar registros históricos):**
   - Una restricción `FOREIGN KEY` en SQL no puede evaluar `WHERE membresias.estado = 'activo'` solo para nuevas asignaciones sin invalidar las filas históricas cuando el usuario se da de baja meses después.
   - Por tanto, la pertenencia a la organización se garantiza declarativamente con la **FK compuesta a `public.membresias(organizacion_id, usuario_id)`**, y la condición temporal *"el usuario debe estar activo al momento de recibir una nueva asignación operativa"* se valida mediante una única función de trigger reutilizable `public.validar_asignacion_miembro_activo()` que **solo se dispara cuando el valor de la columna de responsable cambia** (`NEW.<col> IS DISTINCT FROM OLD.<col> AND NEW.<col> IS NOT NULL`). Si el registro histórico se actualiza en otros campos (ej. notas) años después de que el asesor fue dado de baja, el trigger no bloquea la lectura ni la edición porque el asesor histórico no está siendo recién asignado.
5. **Garantía 6 (Operaciones Automáticas sin Fingir un Usuario Humano):**
   - En las tablas de bitácora (`historial_disponibilidad_unidad`, `registros_auditoria`, `historial_estados_lead`), `usuario_id` es `NULLABLE` y se acompaña de:
     ```sql
     actor_tipo VARCHAR(30) NOT NULL DEFAULT 'usuario'
       CHECK (actor_tipo IN ('usuario', 'sistema_cron', 'webhook_externo', 'migracion_sistema')),
     actor_sistema_identificador VARCHAR(100) NULL,
     CONSTRAINT chk_actor_humano_o_sistema CHECK (
       (actor_tipo = 'usuario' AND usuario_id IS NOT NULL)
       OR (actor_tipo <> 'usuario' AND usuario_id IS NULL AND actor_sistema_identificador IS NOT NULL)
     )
     ```
   - Cuando `liberar_apartados_vencidos()` libera un lote por vencimiento de las 72 horas, inserta `actor_tipo = 'sistema_cron'`, `usuario_id = NULL`, `actor_sistema_identificador = 'pg_cron:liberar_apartados_vencidos'`.
6. **Relaciones de Tablas Existentes (`000001`–`000010`) que No Pueden Migrarse Automáticamente en un Solo Paso y Estrategia de Transición (Hallazgo 3 Corregido):**
   - En las 22 tablas existentes de las migraciones `000001` a `000010`, las columnas de usuario tienen FK simple a `public.usuarios(id)`.
   - **Por qué no pueden convertirse con un `ALTER TABLE ... ADD CONSTRAINT` directo sin transición:** En la migración `000009_speeches_comerciales_multimedia.sql` (líneas 164–165), la semilla seleccionó `SELECT id INTO v_org_id FROM public.organizaciones LIMIT 1; SELECT id INTO v_user_id FROM public.usuarios LIMIT 1;` sin comprobar que `v_user_id` tuviera fila en `public.membresias` para `v_org_id`. Además, en `auditoria_traspasos_personal` o `historial_estados_lead` pueden existir registros de usuarios creados antes de sincronizar `membresias`.
   - **Estrategia de Transición en 3 Fases sin Pérdida de Datos:**
     1. **Saneamiento previo (`Backfill de membresías faltantes` o nulificación en columnas opcionales):** Insertar en `public.membresias` (con `estado = 'inactivo'` o `'activo'` según `usuarios.estado`) cualquier par `(organizacion_id, usuario_id)` referenciado en tablas históricas (`oportunidades`, `actividades`, `historial_etapas_oportunidad`, `speeches_comerciales`, `ejecuciones_speech`, `auditoria_traspasos_personal`, `historial_estados_lead`) que exista en `public.usuarios` pero carezca de fila en `public.membresias`.
     2. **Aplicación con `NOT VALID`:** Ejecutar `ALTER TABLE public.<tabla_existente> ADD CONSTRAINT fk_<tabla>_miembro_org FOREIGN KEY (organizacion_id, <col_usuario>) REFERENCES public.membresias(organizacion_id, usuario_id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;`. Esto activa la validación de inmediato para todas las escrituras nuevas sin bloquear la tabla.
     3. **Validación en línea (`VALIDATE CONSTRAINT`):** Ejecutar `ALTER TABLE public.<tabla_existente> VALIDATE CONSTRAINT fk_<tabla>_miembro_org;`.

---

## PROBLEMA D: Seguridad Real de Funciones `SECURITY DEFINER` (Hallazgo 4 Corregido)

### 1. Verificación del Esquema Real de Extensiones en el Repositorio
- En [20261115000001_cimientos_identidad_tenencia.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/supabase/migrations/20261115000001_cimientos_identidad_tenencia.sql#L9-L10) se ejecutó:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```
  **sin cláusula `WITH SCHEMA extensions`**. Dependiendo de si la instancia de PostgreSQL preinstaló `pgcrypto` en `extensions` o si la migración `000001` la creó en `public`, invocar `extensions.digest` o `extensions.gen_random_bytes` fallará si la extensión reside en `public` (y viceversa).
- **Decisión de Ingeniería (`100% pg_catalog Nativo`, Cero Dependencia de `pgcrypto`):**
  En PostgreSQL 13+ (motor de Supabase), el catálogo interno **`pg_catalog`** incluye de forma nativa:
  - `pg_catalog.gen_random_uuid()` (CSPRNG criptográfico de 122 bits por UUID, nativo en `pg_catalog` desde PostgreSQL 13).
  - `pg_catalog.sha256(bytea)` (función criptográfica SHA-256 nativa en `pg_catalog` desde PostgreSQL 11).
  - `pg_catalog.encode(bytea, text)` y `pg_catalog.convert_to(text, name)` (nativas en `pg_catalog`).
  Por lo tanto, todas nuestras funciones `SECURITY DEFINER` utilizan **exclusivamente `pg_catalog.sha256(...)` y `pg_catalog.gen_random_uuid()`**, eliminando cualquier suposición sobre si `pgcrypto` está instalada en `public` o en `extensions` y permitiendo usar `SET search_path = pg_catalog, pg_temp` sin fallos de resolución.

### 2. Clasificación Completa de Funciones, Propietarios, Permisos y Contexto `pg_cron`

| Función SQL | Clasificación | Contexto `auth.uid()` | `GRANT EXECUTE` Mínimo | Justificación y Separación `pg_cron` vs. Usuario |
| :--- | :--- | :--- | :--- | :--- |
| `public.actualizar_fecha_modificacion()` *(Existente `000001`)* | **`SECURITY INVOKER`** | No aplica (Trigger) | `authenticated`, `service_role` | Trigger de timestamp; no requiere privilegios de propietario. |
| `public.normalizar_telefono_e164(TEXT, TEXT)` *(Nueva)* | **`SECURITY INVOKER` (`IMMUTABLE`)** | No requiere | `authenticated`, `service_role` | Función pura de texto usando solo `pg_catalog`. |
| `public.obtener_organizacion_activa_usuario()` *(Existente `000004`)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Resuelve el tenant activo en políticas RLS sin recursión. |
| `public.usuario_tiene_permiso(TEXT)` *(Existente `000001`)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Evalúa permisos RBAC del usuario autenticado. |
| `public.obtener_rol_jerarquico_actual(UUID)` *(Nueva)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Homologa `usuarios.rol_jerarquico` y `roles.codigo` con `search_path = pg_catalog, pg_temp`. |
| `public.obtener_politica_comercial_efectiva(UUID, UUID)` *(Nueva)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` y mismo tenant | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Resuelve precedencia campo por campo (`Desarrollo → Organización → Sistema`). |
| `public.cambiar_estado_unidad_inventario(...)` *(Nueva)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` y membresía activa | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Bloquea fila con `FOR UPDATE NOWAIT` e inserta en bitácora protegida. |
| `public.liberar_apartados_vencidos(UUID)` *(Nueva — Exclusiva Cron/Backend)* | **`SECURITY DEFINER`** | `auth.uid()` es `NULL` en `pg_cron` | **Solo `postgres` y `service_role`** (`REVOKE FROM PUBLIC, anon, authenticated`) | **Separación crítica:** Al no otorgarse a `authenticated`, ningún cliente puede disparar barridos globales. Registra `actor_tipo = 'sistema_cron'`. |
| `public.sincronizar_apartados_vencidos_organizacion(UUID, UUID)` *(Nueva — Just-in-Time Autenticada)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` y `p_org_id = obtener_organizacion_activa_usuario()` | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Permite que al abrir un plano SVG se liberen apartados vencidos **únicamente** de la organización activa del usuario autenticado. |
| `public.asegurar_conversion_prospecto_oportunidad(...)` *(Nueva)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` y membresía activa | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Transacción ACID de idempotencia y conversión. |
| `public.ejecutar_fusion_autorizada_contactos(...)` y `public.revertir_fusion_contacto(...)` *(Nuevas)* | **`SECURITY DEFINER`** | Exige `auth.uid() IS NOT NULL` y rol `coordinador`/`gerente`/`superadministrador` | `authenticated` (`REVOKE FROM PUBLIC, anon`) | Reasignación atómica y reversión no destructiva en las 7 tablas de contactos. |
| `public.obtener_cotizacion_publica_por_token(TEXT)` *(Nueva — Pública)* | **`SECURITY DEFINER`** | `auth.uid()` puede ser `NULL` (`anon`) | `anon`, `authenticated` (`REVOKE FROM PUBLIC`) | Busca por `pg_catalog.sha256` del token de 64 chars hex, valida vigencia/revocación y proyecta solo datos públicos. |

---

## PROBLEMA E: Motor Financiero y Aritmética Decimal Exacta (Hallazgo 5 Corregido)

### 1. Eliminación de `Math.round` + `Number.EPSILON` y Diseño con Aritmética Entera Escalada (`BigInt` $10^{12}$)
- **Defecto técnico de `Number.EPSILON`:** En IEEE 754 `float64`, `Number.EPSILON` ($2^{-52} \approx 2.22 \times 10^{-16}$) es el espaciado de bits en torno a `1.0`. Para montos inmobiliarios de $\$500,000.00$ ($> 2^{18}$), el ULP del flotante es $\approx 1.16 \times 10^{-10}$, por lo que sumar `Number.EPSILON` se trunca a cero en la mantisa binaria y no corrige imprecisiones de punto flotante.
- **Solución Determinista en TypeScript (`BigInt` con Escala Decimal Fija $S = 10^{12}$):**
  1. Todos los importes monetarios se almacenan y operan como **`BigInt` en centavos enteros** (ej. $\$500,000.00 = 50000000n\text{ centavos}$).
  2. Toda tasa mensual $r$ y factor de descuento o anualidad se convierte a un entero escalado `BigInt` con factor $S = 10^{12}$ (`1_000_000_000_000n`) a partir de su representación decimal exacta.
  3. El redondeo comercial **`ROUND_HALF_UP`** a centavos enteros se ejecuta con división entera exacta en `BigInt`:
     ```ts
     const ESCALA_DECIMAL = 1_000_000_000_000n; // 10^12
     const MITAD_ESCALA   =   500_000_000_000n; // 0.5 * 10^12

     export function redondearHalfUpCentavos(numeradorEscalado: bigint, divisor: bigint = ESCALA_DECIMAL): bigint {
       const mitad = divisor / 2n;
       if (numeradorEscalado >= 0n) {
         return (numeradorEscalado + mitad) / divisor;
       }
       return -((-numeradorEscalado + mitad) / divisor);
     }
     ```
  4. **Ajuste exacto de la última cuota ($t = n$):** En el último periodo activo, el capital ordinario no se calcula por fórmula de anualidad sino por diferencia exacta de enteros en centavos: `capOrdCentavos = saldoInsolutoCentavos - pagoExtraCentavos`, y `cuotaOrdCentavos = interesCentavos + capOrdCentavos`, garantizando algebraicamente que `saldoFinalCentavos === 0n`.

---

## PROBLEMA F: Políticas Comerciales, Precedencia por Campo y No-Retroactividad (Hallazgo 6 Corregido)

1. **Unicidad mediante Índices Únicos Parciales:**
   - Una sola política global por organización:
     `CREATE UNIQUE INDEX idx_politicas_global_org_unica ON public.politicas_comerciales(organizacion_id) WHERE desarrollo_id IS NULL;`
   - Máximo una política específica por desarrollo:
     `CREATE UNIQUE INDEX idx_politicas_desarrollo_unica ON public.politicas_comerciales(organizacion_id, desarrollo_id) WHERE desarrollo_id IS NOT NULL;`
2. **Precedencia Granular Campo por Campo (`Desarrollo → Organización → Sistema`):**
   - En `public.politicas_comerciales`, las columnas de parámetros permiten `NULL` cuando `desarrollo_id IS NOT NULL` (para que un desarrollo pueda sobrescribir solo `horas_vigencia_apartado = 48` y heredar el resto de los campos de la organización), mientras que un `CHECK` exige que en la fila global de la organización (`desarrollo_id IS NULL`) ningún parámetro sea `NULL`.
   - La función `public.obtener_politica_comercial_efectiva(p_organizacion_id, p_desarrollo_id)` evalúa campo por campo:
     `COALESCE(p_desarrollo.<campo>, p_organizacion.<campo>, <valor_sistema_default>)`.
3. **Demostración de No-Retroactividad sobre Apartados y Cotizaciones Existentes:**
   - Cuando se aparta una unidad en $t_0$ con `horas_vigencia_apartado = 72`, se estampa en la fila de `unidades_inmobiliarias` el timestamp absoluto `apartado_vence_en = t_0 + 72 hours` y en `historial_disponibilidad_unidad.metadatos` la `version_politica`.
   - Si en $t_1$ el Gerente actualiza `politicas_comerciales.horas_vigencia_apartado = 24`, ningún trigger ni proceso modifica `unidades_inmobiliarias.apartado_vence_en` de las unidades ya apartadas; `liberar_apartados_vencidos()` compara únicamente `apartado_vence_en <= clock_timestamp()`.
   - De igual forma, toda cotización emitida guarda su `fecha_vigencia` absoluta y su `snapshot_comercial` inmutable en `cotizaciones_inmobiliarias`.
