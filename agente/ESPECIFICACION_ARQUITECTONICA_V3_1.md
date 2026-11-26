# ESPECIFICACIÓN DEFINITIVA DE CIERRE ARQUITECTÓNICO (v3.1) — IRIS INMOBILIARIO

> **Documento Canónico de Arquitectura y Reglas de Negocio**
> **Registro Maestro Vinculado:** [IRIS_MASTER_DECISION_LOG.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/IRIS_MASTER_DECISION_LOG.md)
> **Estado:** Cierre arquitectónico v3.1 (Incluye todas las decisiones válidas de v2/v3 más la resolución de los 6 puntos de cierre C-01 a C-06).

---

## 1. Resolución de los Seis Puntos de Cierre (v3 → v3.1)

### C-01. Idempotencia de Oportunidades Con y Sin Unidad (`IRIS-DEC-018`)

Para diferenciar con exactitud entre un reintento de red, una recotización de una negociación en curso y una nueva operación comercial legítima del mismo cliente, cada `Oportunidad` incorpora una identidad de operación explícita:

#### 1.1 Columnas de Identidad de Operación en `public.oportunidades`
- `organizacion_id UUID NOT NULL`
- `contacto_id UUID NOT NULL`
- `prospecto_origen_id UUID NULL`
- `desarrollo_id UUID NULL` *(Requerido en toda oportunidad inmobiliaria nueva)*
- `unidad_id UUID NULL` *(Unidad principal o única de la operación; `NULL` cuando es una oportunidad general de desarrollo aún sin lote/unidad definida)*
- `codigo_operacion UUID NOT NULL DEFAULT gen_random_uuid()` *(Identificador único de la operación comercial / expediente de negociación)*
- `estado VARCHAR(50) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'ganada', 'perdida', 'cancelada'))`
- `clave_idempotencia VARCHAR(120) NULL` *(Clave determinista o UUID de solicitud enviada por el cliente/acción)*

#### 1.2 Diferenciación de los 5 Escenarios Comerciales

| Escenario | Descripción | Regla de Resolución Transaccional en RPC | Resultado en Base de Datos |
| :--- | :--- | :--- | :--- |
| **1. Repetición de una misma solicitud (Reintento de red / doble clic)** | El cliente o servidor envía la misma `clave_idempotencia` en conversión o emisión de cotización. | Se consulta `WHERE organizacion_id = p_org_id AND clave_idempotencia = p_clave`. Al existir, se retorna el `oportunidad_id` y `cotizacion_id` ya creados sin insertar filas nuevas. | **0 filas duplicadas** (Retorno idempotente inmediato). |
| **2. Nueva cotización de una negociación existente** | El asesor emite una 2ª o 3ª cotización para la misma operación en curso (`oportunidad_id` explícito, o misma unidad/interés activo del mismo prospecto/contacto). |1) Si el asesor cotiza desde una oportunidad abierta (`p_oportunidad_id IS NOT NULL`), la nueva cotización se vincula a esa misma oportunidad.<br/>2) Si cotiza desde el prospecto sobre la misma `unidad_id` que ya tiene una oportunidad `abierta` para ese `contacto_id`, se reutiliza dicha oportunidad.<br/>3) Si el contacto tenía una oportunidad general `abierta` en ese `desarrollo_id` con `unidad_id IS NULL` y ahora cotiza una unidad concreta por primera vez, se promueve esa oportunidad general asignándole la `unidad_id`. | **Se reutiliza la oportunidad abierta existente** y se le asocia la nueva versión de cotización. |
| **3. Nueva negociación para otra unidad distinta** | El mismo cliente (`contacto_id`) que ya negocia la Unidad `L-01` decide cotizar o apartar en una operación separada la Unidad `L-02` del mismo desarrollo. | Como la oportunidad existente tiene `unidad_id = L-01` y la nueva operación es sobre `unidad_id = L-02` (con `p_forzar_nueva_operacion = true` o unidad distinta a la operación abierta), se genera un nuevo `codigo_operacion` y una nueva fila en `oportunidades`. | **Nueva oportunidad legítima** para el mismo `contacto_id` y `desarrollo_id`, vinculada a `L-02`. |
| **4. Nueva negociación para otro desarrollo** | El mismo cliente (`contacto_id`) se interesa y cotiza en un segundo desarrollo (`desarrollo_id = D2`). | Al no coincidir `desarrollo_id`, se crea una nueva oportunidad con su propio `codigo_operacion` para `D2`. | **Nueva oportunidad legítima** en el segundo desarrollo. |
| **5. Segunda operación independiente dentro del mismo desarrollo (sin unidad aún definida)** | Un inversionista desea llevar dos expedientes de negociación separados en el mismo desarrollo antes de elegir lotes. | Cuando el asesor solicita explícitamente **"Abrir nueva operación independiente"**, se genera un nuevo `codigo_operacion` distinto. | **Permitido** cuando se invoca con un nuevo `codigo_operacion` explícito; bloqueado ante simples reintentos accidentales. |

#### 1.3 Restricciones SQL e Índices Únicos Parciales en `public.oportunidades`

```sql
-- 1. Integridad por identidad de operación dentro del tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_org_codigo_operacion_unico
  ON public.oportunidades(organizacion_id, codigo_operacion);

-- 2. Idempotencia estricta ante reintentos de red de la misma petición
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_org_clave_idempotencia_unica
  ON public.oportunidades(organizacion_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

-- 3. Impedir dos oportunidades ABIERTAS simultáneas del mismo contacto sobre la MISMA unidad específica
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_abierta_contacto_unidad_unica
  ON public.oportunidades(organizacion_id, contacto_id, desarrollo_id, unidad_id)
  WHERE estado = 'abierta' AND unidad_id IS NOT NULL;

-- 4. Impedir que una conversión automática concurrente del mismo prospecto cree dos oportunidades generales (sin unidad) abiertas en el mismo desarrollo
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_abierta_prospecto_desarrollo_sin_unidad_unica
  ON public.oportunidades(organizacion_id, prospecto_origen_id, desarrollo_id)
  WHERE estado = 'abierta' AND unidad_id IS NULL AND prospecto_origen_id IS NOT NULL;
```

#### 1.4 Comportamiento Transaccional ante Concurrencia de Dos Prospectos
- Si se invoca la conversión para `prospecto_id`, la RPC ejecuta `SELECT ... FROM public.prospectos WHERE id = p_prospecto_id AND organizacion_id = p_organizacion_id FOR UPDATE`.
- Si además ya tiene un `contacto_id` vinculado, adquiere bloqueo `SELECT ... FROM public.contactos WHERE id = v_contacto_id AND organizacion_id = p_organizacion_id FOR UPDATE`, serializando cualquier creación de oportunidades concurrentes para ese contacto.

---

### C-02. Prevención de Fusiones Automáticas Incorrectas de Contactos (`IRIS-DEC-017`)

#### 2.1 Regla Estricta de No-Fusión Automática
Queda **prohibida** la reutilización o fusión automática de un `Contacto` basada únicamente en coincidencias de `telefono_e164`, `correo_electronico` o `nombre`, ya que cónyuges, socios comerciales, asistentes o familiares pueden compartir teléfono o correo sin ser la misma persona jurídica o física.

1. **Coincidencia Verificable (Único caso de reutilización automática de Contacto):**
   - Si el `prospecto` ya tiene `contacto_convertido_id IS NOT NULL`, o si existe en `public.contactos` un registro con `prospecto_origen_id = p_prospecto_id` dentro de la misma `organizacion_id`, se reutiliza ese `contacto_id`.
2. **Posible Coincidencia (Detección y Alerta sin Fusión Silenciosa):**
   - Si al registrar un prospecto o al solicitar su conversión a contacto se detecta que otro `prospecto` o `contacto` activo de la misma organización tiene el mismo `telefono_e164` (no nulo) o el mismo `LOWER(TRIM(correo))` (no vacío y no placeholder):
     - El registro **no se fusiona automáticamente**.
     - Se marca con `posible_duplicado = true` y `duplicado_referencia_id` apuntando al registro coincidente.
     - En la interfaz se presenta al usuario autorizado una alerta con la comparativa lado a lado de ambos expedientes para que elija explícitamente:
       - **Opción 1:** *"Son personas distintas (ej. familiar/socio) — Mantener como contactos separados"*.
       - **Opción 2:** *"Confirmar que es la misma persona — Ejecutar Fusión Autorizada"*.
3. **Fusión Autorizada y Auditable (`public.auditoria_fusiones_contacto`):**
   Cuando un usuario con permiso (`coordinador`, `gerente` o `superadministrador`) confirma una fusión entre `contacto_principal_id` (que prevalece) y `contacto_secundario_id` (que se absorbe):
   - Se ejecuta mediante la función transaccional `public.ejecutar_fusion_autorizada_contactos(...)`:
     1. Exige `p_motivo` obligatorio y registra al `usuario_autorizador_id`.
     2. Guarda en `public.auditoria_fusiones_contacto` una fotografía completa (`JSONB`) del estado previo de ambos contactos y la lista de todos los IDs de registros hijos reasignados.
     3. Reasigna sin pérdida de historial hacia `contacto_principal_id`:
        - `oportunidades.contacto_id`
        - `actividades.contacto_id`
        - `conversaciones.contacto_id`
        - `canales_contacto.contacto_id` (evitando duplicar canales idénticos)
        - `prospectos.contacto_convertido_id`
     4. **Resolución de conflictos de campos escalares:** Los campos no vacíos de `contacto_principal_id` prevalecen; si un campo en el contacto principal está vacío (`NULL`) y en el secundario tiene valor, se completa con el valor del secundario; los teléfonos o correos alternativos del secundario se conservan en `public.canales_contacto` y sus etiquetas/notas se concatenan con sello de fecha.
     5. El `contacto_secundario_id` **no se elimina físicamente**: pasa a `estado = 'archivado'` con metadato `fusionado_en_contacto_id = contacto_principal_id`.

---

### C-03. Relaciones de Auditoría con Usuarios y Aislamiento Multiempresa (`IRIS-DEC-007`)

#### 3.1 Verificación del Esquema Actual en el Repositorio
- En [20261115000001_cimientos_identidad_tenencia.sql](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/supabase/migrations/20261115000001_cimientos_identidad_tenencia.sql#L88-L98), `public.usuarios` es una tabla de identidad vinculada a `auth.users(id)` sin columna `organizacion_id`, mientras que `public.membresias` define la pertenencia del usuario a cada organización y **ya cuenta con la restricción `UNIQUE(organizacion_id, usuario_id)` en la línea 97**.

#### 3.2 Solución Uniforme para Todas las Columnas de Usuario en Entidades Multi-Tenant

Una llave foránea simple `REFERENCES public.usuarios(id)` verifica que el usuario exista en la plataforma, pero **no verifica que pertenezca a la `organizacion_id` de la fila**. Para garantizar que ningún registro apunte a un usuario de otro tenant:

| Categoría de Columna | Columnas Afectadas | Restricción Referencial Compuesta (DDL) | Validación Adicional en Trigger / RPC | Comportamiento ante Baja de Personal |
| :--- | :--- | :--- | :--- | :--- |
| **1. Responsable Comercial Activo (Asignado a)** | `prospectos.agente_asignado_id`<br/>`oportunidades.agente_asignado_id`<br/>`unidades_inmobiliarias.asesor_apartado_id`<br/>`cotizaciones_inmobiliarias.asesor_id`<br/>`asignaciones_asesor_desarrollo.asesor_id` | `FOREIGN KEY (organizacion_id, <col_usuario_id>) REFERENCES public.membresias(organizacion_id, usuario_id) ON UPDATE CASCADE ON DELETE RESTRICT` *(o `ON DELETE SET NULL (<col_usuario_id>)` si es nullable)* | Trigger `BEFORE INSERT OR UPDATE OF <col_usuario_id>`: Cuando el valor cambia y no es `NULL`, verifica que en `public.membresias` tenga `estado = 'activo'`. | En IRIS los usuarios dados de baja no se borran (`DELETE`), sino que pasan a `estado = 'inactivo'`, conservando su historial y permitiendo reasignar su cartera activa. |
| **2. Autorizador / Aprobador** | `cotizaciones_inmobiliarias.autorizada_por_id`<br/>`auditoria_fusiones_contacto.usuario_autorizador_id`<br/>`atribuciones_venta.agente_cierre_id` | `FOREIGN KEY (organizacion_id, <col_usuario_id>) REFERENCES public.membresias(organizacion_id, usuario_id) ON UPDATE CASCADE ON DELETE RESTRICT` | Exige además en la RPC que el miembro tenga rol `gerente` o `superadministrador` activo al momento de autorizar. | Conserva de forma inmutable quién autorizó la operación dentro de esa organización. |
| **3. Auditoría de Creación / Modificación (Creado por / Actualizado por)** | `prospectos_intereses.creado_por_id`<br/>`historial_disponibilidad_unidad.usuario_id`<br/>`planos_interactivos.creado_por_id`<br/>`desarrollos.creado_por_id`<br/>`desarrollos.actualizado_por_id` | `FOREIGN KEY (organizacion_id, <col_usuario_id>) REFERENCES public.membresias(organizacion_id, usuario_id) ON UPDATE CASCADE ON DELETE SET NULL (<col_usuario_id>)` | En PostgreSQL (`MATCH SIMPLE`), si `<col_usuario_id> IS NULL` (ej. liberación automática por `pg_cron`), la FK es válida; si no es `NULL`, exige que exista la tupla `(organizacion_id, usuario_id)` en `public.membresias`. | Si en un caso extremo se eliminara la membresía, solo `<col_usuario_id>` pasa a `NULL`, conservando `organizacion_id NOT NULL`. |

---

### C-04. Política Uniforme y Plantilla para Funciones `SECURITY DEFINER` (`IRIS-DEC-008`)

#### 4.1 Criterio de Decisión: ¿Cuándo usar `SECURITY INVOKER` vs. `SECURITY DEFINER`?
- **Por defecto (`SECURITY INVOKER`):** Toda función de consulta, cálculo o transformación que opere sobre tablas donde el usuario ya tiene políticas RLS de lectura/escritura directas debe ser `SECURITY INVOKER`.
- **Únicamente `SECURITY DEFINER` cuando:**
  1. La operación requiere una **transacción atómica multi-tabla con bloqueo de fila** (`FOR UPDATE NOWAIT` / `SKIP LOCKED`) e inserción simultánea en bitácoras de auditoría (`historial_disponibilidad_unidad`, `registros_auditoria`) donde el usuario estándar no debe tener permiso de escritura libre (`INSERT`/`UPDATE` directo) para evitar manipulación de bitácoras.
  2. La función resuelve el contexto base de RLS (`obtener_organizacion_activa_usuario()`, `usuario_tiene_permiso()`, `obtener_rol_jerarquico_actual()`).
  3. La función provee una **vista pública de solo lectura estrictamente acotada por token de alta entropía** (`obtener_cotizacion_publica_por_token(p_token TEXT)`).

#### 4.2 Plantilla Canónica Obligatoria para Funciones RPC `SECURITY DEFINER`

```sql
CREATE OR REPLACE FUNCTION public.<nombre_funcion_rpc>(
  p_organizacion_id UUID,
  -- parámetros de dominio...
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
  v_org_activa UUID;
  v_membresia_activa BOOLEAN;
  v_rol_jerarquico VARCHAR(50);
BEGIN
  -- 1. Validar autenticación real
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Sesión inválida o inexistente.'
      USING ERRCODE = '28000';
  END IF;

  -- 2. Validar organización activa y pertenencia vigente del usuario al tenant solicitado
  v_org_activa := public.obtener_organizacion_activa_usuario();
  SELECT EXISTS (
    SELECT 1
    FROM public.membresias AS m
    WHERE m.organizacion_id = p_organizacion_id
      AND m.usuario_id = v_usuario_id
      AND m.estado = 'activo'
  ) INTO v_membresia_activa;

  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id OR NOT v_membresia_activa THEN
    RAISE EXCEPTION 'ACCESO_TENANT_DENEGADO: No tiene membresía activa en la organización solicitada.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validar autorización RBAC / Jerarquía según la operación
  v_rol_jerarquico := public.obtener_rol_jerarquico_actual();
  IF v_rol_jerarquico NOT IN ('superadministrador', 'gerente', 'coordinador', 'asesor') THEN
    RAISE EXCEPTION 'PERMISO_DENEGADO: Rol no autorizado para ejecutar esta operación.'
      USING ERRCODE = '42501';
  END IF;

  -- 4. Lógica transaccional con nombres de objetos completamente calificados (public.<tabla>)
  -- ...

  RETURN jsonb_build_object('exito', true);
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'CONFLICTO_CONCURRENCIA: El registro está siendo modificado por otro usuario en este momento.'
      USING ERRCODE = '55P03';
END;
$$;

-- 5. Endurecimiento de permisos de ejecución (Principio de mínimo privilegio)
REVOKE ALL ON FUNCTION public.<nombre_funcion_rpc> FROM PUBLIC;
REVOKE ALL ON FUNCTION public.<nombre_funcion_rpc> FROM anon;
GRANT EXECUTE ON FUNCTION public.<nombre_funcion_rpc> TO authenticated;
```

---

### C-05. Matriz Completa de 14 Casos de Prueba Financieros Extremos

> **Transparencia de Estado de Validación:**
> - **Diseñado y Calculado Manualmente / Verificado Analíticamente:** Los 14 escenarios están diseñados y sus valores matemáticos exactos han sido calculados y comprobados analíticamente en este documento.
> - **Prueba Automatizada Ejecutada en el Repositorio:** **Aún NO ejecutada** (se implementará y ejecutará como suite de pruebas automatizadas en código durante la Fase 5 / Fase 7 una vez se autorice escribir código).

| # | Escenario Extremo | Datos de Entrada | Resultado Matemático Esperado | Regla Financiera Aplicada | Condición de Aceptación / Rechazo | Nivel Actual de Validación |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Tasa de interés del $0\%$ (Sin intereses)** | $P_N = \$300,000.00$<br/>$E_T = \$60,000.00$ ($20\%$)<br/>$S_F = \$240,000.00$<br/>$n = 24$, $i_{\text{anual}} = 0\%$ ($r = 0$)<br/>Sin pagos extra. | $M_1 \dots M_{24} = \$10,000.00$<br/>$\text{Interes}_t = \$0.00\;\forall t$<br/>$\text{Total Intereses} = \$0.00$<br/>$\text{Total Pagado} = \$300,000.00$<br/>$\text{Saldo}_{24} = \$0.00$. | División directa $C_{\text{base}} / n$ con ajuste de centavos en $M_n$. | **Aceptación:** $\sum_{t=1}^{24} \text{Cap}_t = \$240,000.00$, $\text{Interes}_t = 0$, $\text{Saldo}_{24} = \$0.00$. | Diseñado y calculado analíticamente |
| **02** | **Tasa Nominal Anual ($j_{12}$)** | $S_F = \$500,000.00$, $n = 24$<br/>$j_{12} = 12.00\%$ (`nominal_anual`)<br/>Sin pagos extra. | $r = 0.12 / 12 = 0.01$ ($1\%$)<br/>$M_1 \dots M_{23} = \$23,536.74$<br/>$M_{24} = \$23,536.67$ (ajuste $-\$0.07$)<br/>$\text{Total Intereses} = \$64,881.69$<br/>$\text{Total Pagado} = \$564,881.69$<br/>$\text{Saldo}_{24} = \$0.00$. | Conversión lineal $r = j_{12}/12$ y anualidad francesa con cierre exacto en $t=24$. | **Aceptación:** $r = 0.01$, $\text{Saldo}_{23} = \$23,303.63$, $\text{Interes}_{24} = \$233.04$, $M_{24} = \$23,536.67$, $\text{Saldo}_{24} = \$0.00$. | Calculado y verificado periodo a periodo (24 meses) |
| **03** | **Tasa Efectiva Anual ($i_{\text{EA}}$)** | $S_F = \$500,000.00$, $n = 24$<br/>$i_{\text{EA}} = 12.6825030132\%$ (`efectiva_anual`)<br/>Sin pagos extra. | $r = (1 + 0.126825030132)^{1/12} - 1 = 0.01$ ($1\%$)<br/>Produce **exactamente** la misma tabla que el Escenario 02 ($M = \$23,536.74$, $M_{24} = \$23,536.67$, Intereses $= \$64,881.69$). | Conversión geométrica $r = (1 + i_{\text{EA}})^{1/12} - 1$. Si $i_{\text{EA}} = 12.00\%$, entonces $r = (1.12)^{1/12}-1 = 0.0094887929$ y $M = \$23,393.88$. | **Aceptación:** Verifica que $(1+r)^{12} - 1 = i_{\text{EA}}$ con precisión $\le 10^{-9}$ y que la tabla cierre en $\$0.00$. | Calculado y verificado por equivalencia financiera |
| **04** | **Enganche del $100\%$ (Pago de Contado)** | $P_N = \$450,000.00$<br/>$e_{\%} = 100\% \implies E_T = \$450,000.00$<br/>$S_F = \$0.00$, $n = 0$. | $S_F = \$0.00$, $M = \$0.00$<br/>Tabla de amortización de crédito vacía (0 mensualidades de financiamiento; 100% cubierto en enganche/contado). | Si $E_T = P_N$, entonces $S_F = 0$ y no se ejecuta división entre $n$. | **Aceptación:** No lanza error de división por cero (`NaN` / `Infinity`), devuelve $S_F = 0$, $\text{Total Intereses} = 0$, $\text{Total Pagado} = \$450,000.00$. | Diseñado y calculado analíticamente |
| **05** | **Plazo de un solo mes ($n = 1$)** | $S_F = \$100,000.00$, $n = 1$<br/>$j_{12} = 12\%$ ($r = 1\%$). | Mes 1 ($t = n = 1$):<br/>$\text{Saldo}_0 = \$100,000.00$<br/>$\text{Interes}_1 = \$1,000.00$<br/>$\text{CapOrd}_1 = \$100,000.00$<br/>$M_1 = \$101,000.00$<br/>$\text{Saldo}_1 = \$0.00$. | En $t = n = 1$, se aplica directamente la regla de último periodo: $\text{Cap}_1 = \text{Saldo}_0$ y $M_1 = \text{Saldo}_0 + \text{Interes}_1$. | **Aceptación:** 1 sola fila en tabla, $\text{Interes}_1 = \$1,000.00$, $\text{PagoTotal}_1 = \$101,000.00$, $\text{Saldo}_1 = \$0.00$. | Diseñado y calculado analíticamente |
| **06** | **Abono extraordinario que liquida anticipadamente en el mismo mes ($B_t = \text{SaldoPostOrd}_t$)** | Modalidad B (`abono_directo_capital`)<br/>$S_F = \$100,000.00$, $n = 12$, $r = 1\%$<br/>$M = \$8,884.88$<br/>En mes $t = 6$: $\text{Saldo}_5 = \$59,853.75$, $\text{Interes}_6 = \$598.54$, $\text{CapOrd}_6 = \$8,286.34$, $\text{SaldoPostOrd}_6 = \$51,567.41$.<br/>Se programa $B_6 = \$51,567.41$. | En mes 6:<br/>$\text{PagoTotal}_6 = \$8,884.88 + \$51,567.41 = \$60,452.29$<br/>$\text{CapTotal}_6 = \$59,853.75$<br/>$\text{Saldo}_6 = \$0.00$.<br/>Meses 7 a 12: todas las columnas en $\$0.00$. | En Modalidad B, si $B_t == \text{SaldoPostOrd}_t$, el saldo queda en $\$0.00$ al cierre del mes $t$ y los meses $t+1 \dots n$ tienen cuota e interés $\$0.00$. | **Aceptación:** $\text{Saldo}_6 = \$0.00$, cero intereses cobrados en meses $7 \dots 12$. | Calculado y verificado periodo a periodo |
| **07** | **Abono extraordinario superior al saldo pendiente ($B_t > \text{SaldoPostOrd}_t$)** | Mismo caso anterior ($\text{SaldoPostOrd}_6 = \$51,567.41$), pero el usuario intenta programar $B_6 = \$60,000.00$. | El motor **rechaza la configuración** con error explícito indicando el monto máximo permitido en el mes 6 ($\$51,567.41$). | Prohibición absoluta de saldos negativos ($\text{Saldo}_t < 0$). | **Rechazo controlado:** Devuelve error de validación `PAGO_EXTRA_EXCEDE_SALDO` con `montoMaximoPermitido = 51567.41`. Nunca genera fila con saldo $-\$8,432.59$. | Diseñado y verificado analíticamente |
| **08** | **Múltiples pagos extraordinarios (Anualidades en meses 12 y 24)** | Modalidad A (`valor_presente_cuota_fija`)<br/>$S_F = \$600,000.00$, $n = 36$, $r = 1\%$<br/>$B_{12} = \$50,000.00$, $B_{24} = \$50,000.00$. | $VP_{\text{ext}} = \frac{50000}{(1.01)^{12}} + \frac{50000}{(1.01)^{24}} = \$44,372.46 + \$39,378.31 = \$83,750.77$<br/>$C_{\text{base}} = \$516,249.23$<br/>$M_1 \dots M_{35} = \$17,146.81$<br/>$M_{36} = \$17,146.84$<br/>$\text{Saldo}_{36} = \$0.00$. | Descuento compuesto de cada flujo extraordinario $B_k / (1+r)^{t_k}$ y amortización en los meses 12 y 24. | **Aceptación:** En $t=12$ se pagan $\$67,146.81$; en $t=24$ se pagan $\$67,146.81$; en $t=36$ cierra en $\text{Saldo}_{36} = \$0.00$ con $\sum \text{CapTotal}_t = \$600,000.00$. | Calculado y verificado en 36 periodos |
| **09** | **Pago extraordinario en el último periodo ($t = n$)** | Modalidad A (`valor_presente_cuota_fija`)<br/>$S_F = \$200,000.00$, $n = 12$, $r = 1\%$<br/>Pago extraordinario contra entrega en el último mes $t_{12} = 12$: $B_{12} = \$50,000.00$. | $VP_{\text{ext}} = \frac{50000}{(1.01)^{12}} = \$44,372.46$<br/>$C_{\text{base}} = \$155,627.54$<br/>$M_1 \dots M_{11} = \$13,827.31$<br/>Al final del mes 11: $\text{Saldo}_{11} = \$63,190.40$.<br/>En **mes 12**: $\text{Interes}_{12} = \$631.90$; $B_{12} = \$50,000.00$; $\text{CapOrd}_{12} = \$63,190.40 - \$50,000.00 = \$13,190.40$; $\text{CuotaOrd}_{12} = \$13,190.40 + \$631.90 = \mathbf{\$13,822.30}$; $\text{PagoTotal}_{12} = \mathbf{\$63,822.30}$; $\text{Saldo}_{12} = \mathbf{\$0.00}$. | Regla de Corrección 2 en $t = n$: $\text{CapOrd}_n = \text{Saldo}_{n-1} - B_n$ y $\text{CuotaOrd}_n = \text{Interes}_n + \text{CapOrd}_n$. No se duplica $B_{12}$. | **Aceptación:** En el mes 12 se cobran exactamente $\$13,822.30$ de cuota ordinaria más $\$50,000.00$ de pago extraordinario ($\$63,822.30$ total) y el saldo final es $\$0.00$. | Calculado y verificado en 12 periodos |
| **10** | **Pago extraordinario que coincide en el mismo mes con la mensualidad ordinaria ($t < n$)** | Ambos casos (Caso A y Caso B del Entregable 3 en el **mes 12**). | En el mes 12 se devenga 1 solo interés ($\text{Interes}_{12}$ sobre $\text{Saldo}_{11}$). La cuota ordinaria cubre ese interés y amortiza $\text{CapOrd}_{12} = M - \text{Interes}_{12}$. El pago extraordinario $B_{12}$ amortiza $100\%$ capital ($\text{CapTotal}_{12} = \text{CapOrd}_{12} + B_{12}$). | El interés del periodo se cobra una sola vez dentro de la cuota ordinaria; el pago extraordinario del mismo mes va íntegro a capital. | **Aceptación:** $\text{PagoTotal}_{12} = M + B_{12}$ y $\text{Saldo}_{12} = \text{Saldo}_{11} - (M - \text{Interes}_{12} + B_{12})$. | Calculado y verificado (Entregable 3) |
| **11** | **Mensualidad insuficiente para cubrir intereses ($M \le \text{Interes}_t$)** | Esquema de mensualidades variables personalizadas donde en el mes 1 se intenta fijar $M_1 = \$3,000.00$ sobre $S_F = \$500,000.00$ con $r = 1\%$ ($\text{Interes}_1 = \$5,000.00$). | Rechazo inmediato: $M_1 (\$3,000.00) \le \text{Interes}_1 (\$5,000.00)$ produciría amortización negativa (capitalización de deuda). | En toda modalidad con intereses, toda cuota ordinaria de un periodo activo debe cumplir $M_t > \text{Interes}_t$. | **Rechazo controlado:** Devuelve error `CUOTA_INSUFICIENTE_PARA_INTERESES` indicando que la cuota mínima en el mes 1 debe superar $\$5,000.00$. | Diseñado y verificado analíticamente |
| **12** | **Diferencias de redondeo acumuladas en divisiones periódicas ($1/3$ de centavo)** | $S_F = \$100,000.00$, $n = 36$, $r = 0\%$ (Sin intereses).<br/>$100,000 / 36 = 2,777.7777\dots$ | Meses 1 a 35: $M_t = \$2,777.78$ ($35 \times 2,777.78 = \$97,222.30$).<br/>Diferencia acumulada de redondeo: $+\$0.08$.<br/>Mes 36: $M_{36} = \$100,000.00 - \$97,222.30 = \mathbf{\$2,777.70}$. | La última cuota absorbe la diferencia acumulada $\sum_{t=1}^{n-1} (\text{round}(S_F/n, 2) - S_F/n)$ de $-\$0.08$. | **Aceptación:** $35 \times \$2,777.78 + \$2,777.70 = \$100,000.00$ exactos, $\text{Saldo}_{36} = \$0.00$. | Calculado y verificado analíticamente |
| **13** | **Saldo final residual de uno o varios centavos antes del ajuste ($\pm \$0.01$ a $\$0.11$)** | Caso A del Entregable 3 en el mes 24: Si se cobrara la cuota fija $M = \$19,359.20$ en el mes 24, con $\text{Saldo}_{23} = \$19,167.63$ e $\text{Interes}_{24} = \$191.68$, solo se amortizarían $\$19,167.52$, dejando un saldo residual insoluto de **$\$0.11$**. | El motor fija en el mes 24 $\text{CapOrd}_{24} = \text{Saldo}_{23} = \$19,167.63$ y ajusta $M_{24} = \$19,167.63 + \$191.68 = \mathbf{\$19,359.31}$ ($+\$0.11$). | Regla de cierre exacto en $t = n$: prohibido dejar saldos residuales de centavos en $\text{Saldo}_n$. | **Aceptación:** $\text{Saldo}_{24} = \$0.00$ exactos. | Calculado y verificado (Entregable 3, Caso A) |
| **14** | **Financiamiento liquidado varios meses antes del plazo contractual ($t_{\text{liq}} < n$)** | Caso B del Entregable 3 ($S_F = \$500,000$, $n = 24$, $r = 1\%$, $B_{12} = \$100,000$ en Modalidad `abono_directo_capital`). | En el **mes 19** queda $\text{Saldo}_{19} = \$7,020.34$.<br/>En el **mes 20** se devenga $\text{Interes}_{20} = \$70.20$; como $\text{Saldo}_{19} < M - \text{Interes}_{20}$, se ajusta $M_{20} = \mathbf{\$7,090.54}$ ($\text{CapOrd}_{20} = \$7,020.34$) y queda $\text{Saldo}_{20} = \mathbf{\$0.00}$.<br/>Meses **21, 22, 23 y 24**: Cuota $=\$0.00$, Interés $=\$0.00$, Saldo $=\$0.00$. | Subcaso B1 del Algoritmo Determinista (Sección 2.3): liquidación anticipada cuando $\text{CapOrd}_{\text{candidato}} \ge \text{Saldo}_{t-1}$. | **Aceptación:** Plazo efectivo $= 20\text{ meses}$, meses 21 a 24 en $\$0.00$, suma de capital $=\$500,000.00$. | Calculado y verificado (Entregable 3, Caso B) |

---

### C-06. Parámetros Comerciales Configurables y Decisiones Pendientes (`IRIS-DEC-024` a `IRIS-DEC-028`)

Ninguna de las propuestas comerciales de plazos o permisos operativos se codificará de forma rígida; todas residirán en la estructura de configuración del tenant (`organizaciones.configuracion`) y del desarrollo (`desarrollos.configuracion_comercial`):

| Clave de Configuración | Nivel de Configuración | Tipo de Dato | Valor Predeterminado Propuesto | Clasificación Actual | ID en Registro Maestro |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `horas_vigencia_apartado` | Por Desarrollo (con fallback en Organización) | `INTEGER` (1 a 720 horas) | `72` horas (3 días naturales) | **Parámetro Configurable / Valor por defecto PENDIENTE de confirmación** | `IRIS-DEC-025` |
| `dias_vigencia_cotizacion` | Por Desarrollo (con fallback en Organización) | `INTEGER` (1 a 90 días) | `7` días naturales | **Parámetro Configurable / Valor por defecto PENDIENTE de confirmación** | `IRIS-DEC-026` |
| `permitir_apartado_directo_asesor` | Por Organización (y sobrescribible por Desarrollo) | `BOOLEAN` | `true` (Asesores y coordinadores pueden apartar unidades disponibles para sus prospectos) | **Parámetro Configurable / Valor por defecto PENDIENTE de confirmación** | `IRIS-DEC-027` |
| `permitir_liberacion_propia_asesor` | Por Organización | `BOOLEAN` | `true` (El asesor puede liberar un apartado creado por él mismo; coordinadores liberan los de su equipo; gerentes todos) | **Parámetro Configurable / Valor por defecto PENDIENTE de confirmación** | `IRIS-DEC-027` |
| `roles_autorizados_cierre_venta` | Por Organización | `TEXT[]` | `['superadministrador', 'gerente']` | **Decisión APROBADA en matriz RBAC (con opción a habilitar coordinador si la organización lo activa)** | `IRIS-DEC-011`, `IRIS-DEC-027` |
| `modo_pagos_extraordinarios_default` | Por Esquema Financiero de Desarrollo | `VARCHAR` | `'valor_presente_cuota_fija'` (permitiendo seleccionar `'abono_directo_capital'`) | **Parámetro Configurable / Valor por defecto PENDIENTE de confirmación** | `IRIS-DEC-028` |

---

## 2. Matriz Integral de Preparación para Implementación por Fases (Entregable 6)

| Fase | Módulos y Rutas Involucrados | Decisiones Aprobadas Relacionadas (`IRIS_MASTER_DECISION_LOG.md`) | Dependencias Previas | Pruebas Requeridas al Cerrar la Fase | Riesgos Conocidos y Controles |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FASE 2**<br/>*Gestión de Proyectos, Estructura Jerárquica e Inventario* | • `Migración 011`<br/>• `/desarrollos`<br/>• `/api/cron/liberar-apartados`<br/>• `servicios/proyectos.ts`<br/>• `acciones/proyectos.ts` | `IRIS-DEC-001`, `IRIS-DEC-002`, `IRIS-DEC-005`, `IRIS-DEC-006`, `IRIS-DEC-007`, `IRIS-DEC-008`, `IRIS-DEC-009`, `IRIS-DEC-010`, `IRIS-DEC-011`, `IRIS-DEC-012`, `IRIS-DEC-024`, `IRIS-DEC-025`, `IRIS-DEC-027` | Especificación `v3.1` aprobada. | 1. Creación de Desarrolladora → Desarrollo → Etapa → Manzana → Unidad.<br/>2. Importación CSV con detección de duplicados sin sobrescritura.<br/>3. Concurrencia de apartado (`FOR UPDATE NOWAIT`).<br/>4. Liberación idempotente de apartado vencido (`SKIP LOCKED`).<br/>5. Rechazo de FK cross-tenant.<br/>6. `next build` con código 0. | • **Riesgo:** Bloqueo de unidades por apartados abandonados.<br/>• **Control:** `pg_cron` cada 5 min + endpoint cron + verificación Just-in-Time. |
| **FASE 3**<br/>*Planos y Mapas Interactivos SVG* | • `Migración 012`<br/>• Visor y Editor SVG en `/desarrollos`<br/>• `servicios/planos-svg.ts`<br/>• `acciones/planos-svg.ts` | `IRIS-DEC-006`, `IRIS-DEC-007`, `IRIS-DEC-008`, `IRIS-DEC-009`, `IRIS-DEC-013` | **Fase 2** completada y validada (`unidades_inmobiliarias` existente). | 1. Sanitización de SVG con etiquetas `<script>` / `onload` maliciosas.<br/>2. Auto-vinculación por `unit_id` y asociación manual por clic.<br/>3. Detección de unidades huérfanas e IDs duplicados.<br/>4. Cambio de color en tiempo real al apartar unidad.<br/>5. Selección múltiple de unidades.<br/>6. `next build` con código 0. | • **Riesgo:** Archivos SVG con estructura de capas no estándar o XSS.<br/>• **Control:** Sanitizador XML estricto e inyección determinista de `data-iris-svg-id`. |
| **FASE 4**<br/>*Evolución del CRM Inmobiliario* | • `Migración 013 (Parte CRM)`<br/>• `/prospectos`<br/>• `/seguimiento`<br/>• `/oportunidades`<br/>• `/contactos`<br/>• `servicios/crm.ts` | `IRIS-DEC-006`, `IRIS-DEC-007`, `IRIS-DEC-008`, `IRIS-DEC-014`, `IRIS-DEC-015`, `IRIS-DEC-016`, `IRIS-DEC-017`, `IRIS-DEC-018` | **Fase 2** completada (`desarrollos` y `unidades_inmobiliarias` disponibles para `prospectos_intereses`). | 1. Normalización E.164 con teléfonos nacionales e internacionales.<br/>2. Detección de posible duplicado sin fusión automática.<br/>3. Flujo de fusión manual autorizada con bitácora.<br/>4. Registro de múltiples intereses comerciales por prospecto + sincronización del principal.<br/>5. Idempotencia de conversión en los 5 escenarios de C-01.<br/>6. `next build` con código 0. | • **Riesgo:** Ruptura de vistas actuales que leen `desarrollo_interes` (texto).<br/>• **Control:** Trigger que mantiene sincronizado `desarrollo_interes` y `lote_unidad`. |
| **FASE 5**<br/>*Cotizador Inmobiliario Interno y Público* | • `Migración 013 (Parte Cotizador)`<br/>• `/cotizador`<br/>• `/cotizar/[token]`<br/>• `servicios/cotizador.ts`<br/>• `acciones/cotizador.ts` | `IRIS-DEC-006`, `IRIS-DEC-007`, `IRIS-DEC-008`, `IRIS-DEC-019`, `IRIS-DEC-020`, `IRIS-DEC-021`, `IRIS-DEC-022`, `IRIS-DEC-023`, `IRIS-DEC-024`, `IRIS-DEC-026`, `IRIS-DEC-028` | **Fase 2, 3 y 4** completadas. | 1. Ejecución automatizada de los **14 casos de prueba financieros extremos (C-05)** más los 2 oráculos de 24 periodos (Caso A y Caso B).<br/>2. Inmutabilidad del `snapshot_comercial` tras cambiar precios en inventario.<br/>3. Generación PDF fiel al motor.<br/>4. Seguridad zero-leakage y revocación en `/cotizar/[token]`.<br/>5. `next build` con código 0. | • **Riesgo:** Descuadre de centavos o alteración histórica de cotizaciones.<br/>• **Control:** Aritmética en centavos enteros, ajuste en cuota $n$ y snapshot JSONB inmutable. |
| **FASE 6**<br/>*Integración End-to-End, Cierre Transaccional y Dashboards por Rol* | • RPC `ejecutar_cierre_comercial_inmobiliario`<br/>• `/panel-control`<br/>• `/analitica` | `IRIS-DEC-002`, `IRIS-DEC-008`, `IRIS-DEC-009`, `IRIS-DEC-011`, `IRIS-DEC-014`, `IRIS-DEC-022` | **Fases 2 a 5** completadas. | 1. Flujo completo de 16 pasos (alta desarrollo → plano → lead → interés → cotización → apartado → cierre de venta → atribución).<br/>2. Verificación de métricas reales por rol (Gerencia, Coordinador, Asesor).<br/>3. `next build` con código 0. | • **Riesgo:** Una unidad vendida sea liberada por el job de apartados vencidos.<br/>• **Control:** Al venderse, `estado_disponibilidad = 'vendido'` y `apartado_vence_en = NULL`. |
| **FASE 7**<br/>*Validación Integral y Regresión* | • Suite de pruebas unitarias e integración<br/>• Compilación global | Todas las decisiones `IRIS-DEC-001` a `IRIS-DEC-028`. | **Fases 2 a 6** completadas. | Ejecución completa de suite financiera, concurrencia, permisos jerárquicos, aislamiento multi-tenant y regresión de módulos existentes (`/bandeja`, `/marketing`, `/configuracion`). | Cero regresiones en módulos preexistentes. |
