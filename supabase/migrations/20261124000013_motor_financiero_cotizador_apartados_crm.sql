-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 013: MOTOR FINANCIERO, COTIZADOR, APARTADOS Y CRM INMOBILIARIO
-- ==============================================================================
-- Decisiones implementadas:
-- • IRIS-DEC-002 / 032: Resolución de política comercial con precedencia por campo
-- • IRIS-DEC-011 / 012: Ciclo de vida de unidades, apartados con vigencia configurable,
--                       concurrencia optimista/pesimista y liberación automática idempotente
-- • IRIS-DEC-014 / 015 / 016 / 017 / 018: Esquemas financieros, cotizaciones multiunidad
--                       e inmutabilidad de corrida financiera
-- • IRIS-DEC-019 / 020 / 025 / 026 / 030: Intereses múltiples por prospecto, operación
--                       multiunidad en oportunidades, normalización E.164 y fusión
--                       reversible no destructiva de contactos
-- ==============================================================================

-- 1. Columnas aditivas en tablas CRM existentes (prospectos, contactos, canales_contacto, oportunidades)
ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS telefono_e164 VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS desarrollo_id UUID NULL,
  ADD COLUMN IF NOT EXISTS unidad_id UUID NULL,
  ADD COLUMN IF NOT EXISTS campana_origen VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS fecha_ultima_interaccion TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS fecha_proxima_actividad TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS posible_duplicado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS telefono_e164 VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS fusionado_en_contacto_id UUID NULL,
  ADD COLUMN IF NOT EXISTS fecha_fusion TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_prospecto_origen_unico
  ON public.contactos(organizacion_id, prospecto_origen_id)
  WHERE prospecto_origen_id IS NOT NULL AND estado <> 'archivado';

ALTER TABLE public.canales_contacto
  ADD COLUMN IF NOT EXISTS contacto_origen_fusion_id UUID NULL,
  ADD COLUMN IF NOT EXISTS archivado_por_fusion_id UUID NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_canales_contacto_unico_activo
  ON public.canales_contacto(organizacion_id, contacto_id, tipo_canal, pg_catalog.lower(pg_catalog.btrim(valor)))
  WHERE archivado_por_fusion_id IS NULL;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS codigo_operacion VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS prospecto_origen_id UUID NULL,
  ADD COLUMN IF NOT EXISTS desarrollo_id UUID NULL,
  ADD COLUMN IF NOT EXISTS unidad_principal_id UUID NULL,
  ADD COLUMN IF NOT EXISTS cotizacion_vigente_id UUID NULL;

-- 2. Función normalizadora de teléfonos E.164 (100% pg_catalog nativo)
CREATE OR REPLACE FUNCTION public.normalizar_telefono_e164(
  p_telefono TEXT,
  p_codigo_pais_default TEXT DEFAULT '+52'
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_limpio TEXT;
  v_digitos TEXT;
  v_prefijo TEXT;
BEGIN
  IF p_telefono IS NULL OR pg_catalog.btrim(p_telefono) = '' THEN
    RETURN NULL;
  END IF;

  v_limpio := pg_catalog.regexp_replace(pg_catalog.btrim(p_telefono), '[^0-9+]', '', 'g');

  IF v_limpio LIKE '00%' THEN
    v_limpio := '+' || pg_catalog.substr(v_limpio, 3);
  END IF;

  v_digitos := pg_catalog.regexp_replace(v_limpio, '[^0-9]', '', 'g');

  IF pg_catalog.length(v_digitos) < 8 OR pg_catalog.length(v_digitos) > 15 OR v_digitos ~ '^([0-9])\1+$' THEN
    RETURN NULL;
  END IF;

  IF v_limpio LIKE '+%' THEN
    IF v_digitos LIKE '521%' AND pg_catalog.length(v_digitos) = 13 THEN
      RETURN '+52' || pg_catalog.substr(v_digitos, 4);
    END IF;
    RETURN '+' || v_digitos;
  END IF;

  IF pg_catalog.length(v_digitos) = 10 THEN
    v_prefijo := COALESCE(NULLIF(pg_catalog.regexp_replace(p_codigo_pais_default, '[^0-9]', '', 'g'), ''), '52');
    RETURN '+' || v_prefijo || v_digitos;
  END IF;

  IF v_digitos LIKE '521%' AND pg_catalog.length(v_digitos) = 13 THEN
    RETURN '+52' || pg_catalog.substr(v_digitos, 4);
  END IF;

  RETURN '+' || v_digitos;
END;
$$;

-- 3. Función de resolución de política comercial con precedencia campo por campo: Desarrollo -> Organización -> Sistema
CREATE OR REPLACE FUNCTION public.obtener_politica_comercial_efectiva(
  p_organizacion_id UUID,
  p_desarrollo_id UUID DEFAULT NULL
)
RETURNS TABLE (
  horas_vigencia_apartado INTEGER,
  dias_vigencia_cotizacion INTEGER,
  permitir_apartado_directo_asesor BOOLEAN,
  permitir_liberacion_propia_asesor BOOLEAN,
  requiere_autorizacion_gerente_cierre BOOLEAN,
  descuento_maximo_sin_autorizacion_pct NUMERIC(5, 2),
  modo_pagos_extraordinarios_default VARCHAR(40),
  version_politica_org INTEGER,
  version_politica_desarrollo INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p_des.horas_vigencia_apartado, p_org.horas_vigencia_apartado, 72) AS horas_vigencia_apartado,
    COALESCE(p_des.dias_vigencia_cotizacion, p_org.dias_vigencia_cotizacion, 7) AS dias_vigencia_cotizacion,
    COALESCE(p_des.permitir_apartado_directo_asesor, p_org.permitir_apartado_directo_asesor, true) AS permitir_apartado_directo_asesor,
    COALESCE(p_des.permitir_liberacion_propia_asesor, p_org.permitir_liberacion_propia_asesor, true) AS permitir_liberacion_propia_asesor,
    COALESCE(p_des.requiere_autorizacion_gerente_cierre, p_org.requiere_autorizacion_gerente_cierre, true) AS requiere_autorizacion_gerente_cierre,
    COALESCE(p_des.descuento_maximo_sin_autorizacion_pct, p_org.descuento_maximo_sin_autorizacion_pct, 5.00) AS descuento_maximo_sin_autorizacion_pct,
    COALESCE(p_des.modo_pagos_extraordinarios_default, p_org.modo_pagos_extraordinarios_default, 'valor_presente_cuota_fija'::VARCHAR(40)) AS modo_pagos_extraordinarios_default,
    COALESCE(p_org.version_politica, 1) AS version_politica_org,
    COALESCE(p_des.version_politica, 0) AS version_politica_desarrollo
  FROM (SELECT 1) AS base
  LEFT JOIN public.politicas_comerciales AS p_org
    ON p_org.organizacion_id = p_organizacion_id AND p_org.desarrollo_id IS NULL
  LEFT JOIN public.politicas_comerciales AS p_des
    ON p_des.organizacion_id = p_organizacion_id AND p_desarrollo_id IS NOT NULL AND p_des.desarrollo_id = p_desarrollo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_politica_comercial_efectiva(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_politica_comercial_efectiva(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.obtener_politica_comercial_efectiva(UUID, UUID) TO authenticated;

-- 4. Tablas CRM Inmobiliario: prospectos_intereses, oportunidad_unidades, coincidencias_duplicados_crm, auditoria_fusiones_contacto
CREATE TABLE IF NOT EXISTS public.prospectos_intereses (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  prospecto_id UUID NOT NULL,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NULL,
  unidad_id UUID NULL,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  estado_interes VARCHAR(40) NOT NULL DEFAULT 'activo'
    CHECK (estado_interes IN ('activo', 'cotizado', 'apartado', 'convertido', 'descartado')),
  presupuesto_estimado NUMERIC(14, 2) NULL CHECK (presupuesto_estimado IS NULL OR presupuesto_estimado >= 0),
  notas TEXT NULL,
  creado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  CONSTRAINT fk_pi_prospecto_tenant
    FOREIGN KEY (prospecto_id, organizacion_id)
    REFERENCES public.prospectos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_pi_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_pi_etapa_desarrollo_tenant
    FOREIGN KEY (etapa_id, desarrollo_id, organizacion_id)
    REFERENCES public.etapas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (etapa_id),
  CONSTRAINT fk_pi_unidad_desarrollo_tenant
    FOREIGN KEY (unidad_id, desarrollo_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (unidad_id),
  CONSTRAINT fk_pi_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pi_interes_principal_unico
  ON public.prospectos_intereses(organizacion_id, prospecto_id)
  WHERE es_principal = true AND estado_interes <> 'descartado';

CREATE TABLE IF NOT EXISTS public.oportunidad_unidades (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  oportunidad_id UUID NOT NULL,
  desarrollo_id UUID NOT NULL,
  unidad_id UUID NOT NULL,
  precio_referencia NUMERIC(14, 2) NOT NULL CHECK (precio_referencia >= 0),
  estado_en_operacion VARCHAR(30) NOT NULL DEFAULT 'en_negociacion'
    CHECK (estado_en_operacion IN ('en_negociacion', 'apartada_en_operacion', 'vendida_en_operacion', 'descartada')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (oportunidad_id, unidad_id),
  CONSTRAINT fk_ou_oportunidad_tenant
    FOREIGN KEY (oportunidad_id, organizacion_id)
    REFERENCES public.oportunidades(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_ou_unidad_desarrollo_tenant
    FOREIGN KEY (unidad_id, desarrollo_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.coincidencias_duplicados_crm (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  tipo_entidad VARCHAR(30) NOT NULL CHECK (tipo_entidad IN ('prospecto', 'contacto')),
  registro_nuevo_id UUID NOT NULL,
  registro_existente_id UUID NOT NULL,
  criterio_coincidencia VARCHAR(50) NOT NULL
    CHECK (criterio_coincidencia IN ('telefono_y_correo', 'telefono_e164', 'correo_electronico', 'nombre_desarrollo')),
  puntaje_confianza INTEGER NOT NULL CHECK (puntaje_confianza BETWEEN 1 AND 100),
  estado_revision VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision'
    CHECK (estado_revision IN ('pendiente_revision', 'confirmado_fusionado', 'descartado_personas_distintas')),
  revisado_por_id UUID NULL,
  motivo_resolucion TEXT NULL,
  fecha_deteccion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_resolucion TIMESTAMPTZ NULL,
  UNIQUE (organizacion_id, tipo_entidad, registro_nuevo_id, registro_existente_id),
  CONSTRAINT fk_duplicados_revisor_miembro
    FOREIGN KEY (organizacion_id, revisado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (revisado_por_id)
);

CREATE TABLE IF NOT EXISTS public.auditoria_fusiones_contacto (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  contacto_principal_id UUID NOT NULL,
  contacto_secundario_id UUID NOT NULL,
  usuario_autorizador_id UUID NOT NULL,
  motivo TEXT NOT NULL,
  estrategia_resolucion VARCHAR(40) NOT NULL DEFAULT 'prevalece_principal',
  snapshot_principal_antes JSONB NOT NULL,
  snapshot_secundario_antes JSONB NOT NULL,
  campos_rellenados_desde_secundario JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapa_ids_reasignados JSONB NOT NULL,
  revertida BOOLEAN NOT NULL DEFAULT false,
  reversion_parcial BOOLEAN NOT NULL DEFAULT false,
  revertida_por_id UUID NULL,
  motivo_reversion TEXT NULL,
  reporte_reversion JSONB NULL,
  fecha_fusion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_reversion TIMESTAMPTZ NULL,
  CONSTRAINT chk_fusion_contactos_distintos CHECK (contacto_principal_id <> contacto_secundario_id),
  CONSTRAINT fk_fusion_principal_tenant
    FOREIGN KEY (contacto_principal_id, organizacion_id)
    REFERENCES public.contactos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_fusion_secundario_tenant
    FOREIGN KEY (contacto_secundario_id, organizacion_id)
    REFERENCES public.contactos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_fusion_autorizador_miembro
    FOREIGN KEY (organizacion_id, usuario_autorizador_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_fusion_reversor_miembro
    FOREIGN KEY (organizacion_id, revertida_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (revertida_por_id)
);

-- 5. Tablas de Motor Financiero y Cotizador: esquemas_financiamiento, cotizaciones_inmobiliarias, cotizacion_unidades
CREATE TABLE IF NOT EXISTS public.esquemas_financiamiento (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT NULL,
  tipo_tasa_interes VARCHAR(30) NOT NULL DEFAULT 'sin_intereses'
    CHECK (tipo_tasa_interes IN ('sin_intereses', 'nominal_anual', 'efectiva_anual')),
  tasa_interes_anual NUMERIC(8, 4) NOT NULL DEFAULT 0.0000
    CHECK (tasa_interes_anual >= 0.0000 AND tasa_interes_anual <= 100.0000),
  modo_pagos_extraordinarios VARCHAR(40) NOT NULL DEFAULT 'valor_presente_cuota_fija'
    CHECK (modo_pagos_extraordinarios IN ('valor_presente_cuota_fija', 'abono_directo_capital')),
  porcentaje_enganche_min NUMERIC(5, 2) NOT NULL DEFAULT 10.00
    CHECK (porcentaje_enganche_min BETWEEN 0.00 AND 100.00),
  max_meses_enganche_diferido INTEGER NOT NULL DEFAULT 6
    CHECK (max_meses_enganche_diferido BETWEEN 1 AND 36),
  plazos_meses_permitidos INTEGER[] NOT NULL DEFAULT '{12,24,36,48,60}',
  descuento_maximo_pct NUMERIC(5, 2) NOT NULL DEFAULT 5.00
    CHECK (descuento_maximo_pct BETWEEN 0.00 AND 100.00),
  permite_pagos_extraordinarios BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  CONSTRAINT fk_esquemas_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.cotizaciones_inmobiliarias (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  folio VARCHAR(50) NOT NULL,
  token_publico_hash CHAR(64) NOT NULL UNIQUE,
  token_publico_ultimos4 CHAR(4) NOT NULL,
  acceso_publico_activo BOOLEAN NOT NULL DEFAULT true,
  revocada_en TIMESTAMPTZ NULL,
  desarrollo_id UUID NOT NULL,
  esquema_financiamiento_id UUID NULL,
  prospecto_id UUID NULL,
  contacto_id UUID NULL,
  oportunidad_id UUID NULL,
  cliente_nombre_libre VARCHAR(200) NULL,
  cliente_telefono_libre VARCHAR(40) NULL,
  cliente_correo_libre VARCHAR(255) NULL,
  asesor_id UUID NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'emitida'
    CHECK (estado IN ('borrador', 'pendiente_autorizacion', 'emitida', 'enviada', 'aceptada', 'expirada', 'cancelada')),
  requiere_autorizacion BOOLEAN NOT NULL DEFAULT false,
  autorizada_por_id UUID NULL,
  fecha_autorizacion TIMESTAMPTZ NULL,
  fecha_vigencia DATE NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  subtotal_lista NUMERIC(14, 2) NOT NULL CHECK (subtotal_lista >= 0),
  descuento_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (descuento_pct BETWEEN 0 AND 100),
  descuento_monto NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (descuento_monto >= 0),
  precio_neto_final NUMERIC(14, 2) NOT NULL CHECK (precio_neto_final >= 0),
  enganche_total NUMERIC(14, 2) NOT NULL CHECK (enganche_total >= 0),
  meses_enganche_diferido INTEGER NOT NULL DEFAULT 1 CHECK (meses_enganche_diferido BETWEEN 1 AND 60),
  saldo_financiado NUMERIC(14, 2) NOT NULL CHECK (saldo_financiado >= 0),
  plazo_meses INTEGER NOT NULL CHECK (plazo_meses >= 0),
  tipo_tasa_interes VARCHAR(30) NOT NULL,
  tasa_interes_anual NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
  tasa_mensual_efectiva NUMERIC(12, 8) NOT NULL DEFAULT 0.00000000,
  modo_pagos_extraordinarios VARCHAR(40) NOT NULL,
  mensualidad_ordinaria_base NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_pagos_extraordinarios NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_intereses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_a_pagar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notas_comerciales TEXT NULL,
  snapshot_comercial JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  UNIQUE (id, organizacion_id),
  UNIQUE (organizacion_id, folio),

  CONSTRAINT fk_cot_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cot_esquema_desarrollo_tenant
    FOREIGN KEY (esquema_financiamiento_id, desarrollo_id, organizacion_id)
    REFERENCES public.esquemas_financiamiento(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (esquema_financiamiento_id),

  CONSTRAINT fk_cot_prospecto_tenant
    FOREIGN KEY (prospecto_id, organizacion_id)
    REFERENCES public.prospectos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (prospecto_id),

  CONSTRAINT fk_cot_contacto_tenant
    FOREIGN KEY (contacto_id, organizacion_id)
    REFERENCES public.contactos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (contacto_id),

  CONSTRAINT fk_cot_oportunidad_tenant
    FOREIGN KEY (oportunidad_id, organizacion_id)
    REFERENCES public.oportunidades(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (oportunidad_id),

  CONSTRAINT fk_cot_asesor_miembro
    FOREIGN KEY (organizacion_id, asesor_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_cot_autorizador_miembro
    FOREIGN KEY (organizacion_id, autorizada_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (autorizada_por_id)
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_org_desarrollo_fecha
  ON public.cotizaciones_inmobiliarias(organizacion_id, desarrollo_id, fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS public.cotizacion_unidades (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  cotizacion_id UUID NOT NULL,
  desarrollo_id UUID NOT NULL,
  unidad_id UUID NOT NULL,
  clave_comercial_congelada VARCHAR(100) NOT NULL,
  superficie_m2_congelada NUMERIC(12, 2) NOT NULL,
  precio_lista_congelado NUMERIC(14, 2) NOT NULL,
  precio_base_aplicado NUMERIC(14, 2) NOT NULL,
  UNIQUE (cotizacion_id, unidad_id),
  CONSTRAINT fk_cu_cotizacion_tenant
    FOREIGN KEY (cotizacion_id, organizacion_id)
    REFERENCES public.cotizaciones_inmobiliarias(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_cu_unidad_desarrollo_tenant
    FOREIGN KEY (unidad_id, desarrollo_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- 6. Tabla de Apartados formales con soporte de prórrogas auditadas y conversión a venta
CREATE TABLE IF NOT EXISTS public.apartados_unidades (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  folio_apartado VARCHAR(50) NOT NULL,
  desarrollo_id UUID NOT NULL,
  unidad_id UUID NOT NULL,
  cotizacion_id UUID NULL,
  prospecto_id UUID NULL,
  contacto_id UUID NULL,
  oportunidad_id UUID NULL,
  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_telefono VARCHAR(50) NULL,
  cliente_correo VARCHAR(255) NULL,
  asesor_id UUID NOT NULL,
  monto_apartado NUMERIC(14, 2) NOT NULL DEFAULT 10000.00 CHECK (monto_apartado >= 0),
  precio_congelado_unidad NUMERIC(14, 2) NOT NULL CHECK (precio_congelado_unidad >= 0),
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  estado_apartado VARCHAR(30) NOT NULL DEFAULT 'activo'
    CHECK (estado_apartado IN ('activo', 'convertido_venta', 'vencido_liberado', 'cancelado_manual')),
  fecha_apartado TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_vencimiento TIMESTAMPTZ NOT NULL,
  prorrogas_aplicadas INTEGER NOT NULL DEFAULT 0 CHECK (prorrogas_aplicadas >= 0),
  justificacion_ultima_prorroga TEXT NULL,
  prorrogado_por_id UUID NULL,
  liberado_en TIMESTAMPTZ NULL,
  liberado_por_id UUID NULL,
  motivo_liberacion TEXT NULL,
  convertido_venta_en TIMESTAMPTZ NULL,
  notas TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  UNIQUE (id, organizacion_id),
  UNIQUE (organizacion_id, folio_apartado),

  CONSTRAINT fk_apartado_unidad_desarrollo_tenant
    FOREIGN KEY (unidad_id, desarrollo_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_apartado_cotizacion_tenant
    FOREIGN KEY (cotizacion_id, organizacion_id)
    REFERENCES public.cotizaciones_inmobiliarias(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (cotizacion_id),

  CONSTRAINT fk_apartado_asesor_miembro
    FOREIGN KEY (organizacion_id, asesor_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- Índice único parcial: a lo sumo 1 apartado activo por unidad en todo momento
CREATE UNIQUE INDEX IF NOT EXISTS idx_apartados_unidad_activo_unico
  ON public.apartados_unidades(organizacion_id, unidad_id)
  WHERE estado_apartado = 'activo';

CREATE INDEX IF NOT EXISTS idx_apartados_org_estado_vencimiento
  ON public.apartados_unidades(organizacion_id, estado_apartado, fecha_vencimiento);

-- 7. Habilitar RLS en todas las tablas nuevas
ALTER TABLE public.prospectos_intereses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidad_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coincidencias_duplicados_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_fusiones_contacto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esquemas_financiamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_inmobiliarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartados_unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospectos_intereses_tenant" ON public.prospectos_intereses;
CREATE POLICY "prospectos_intereses_tenant" ON public.prospectos_intereses
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "oportunidad_unidades_tenant" ON public.oportunidad_unidades;
CREATE POLICY "oportunidad_unidades_tenant" ON public.oportunidad_unidades
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "coincidencias_duplicados_tenant" ON public.coincidencias_duplicados_crm;
CREATE POLICY "coincidencias_duplicados_tenant" ON public.coincidencias_duplicados_crm
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "auditoria_fusiones_tenant" ON public.auditoria_fusiones_contacto;
CREATE POLICY "auditoria_fusiones_tenant" ON public.auditoria_fusiones_contacto
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "esquemas_financiamiento_select" ON public.esquemas_financiamiento;
CREATE POLICY "esquemas_financiamiento_select" ON public.esquemas_financiamiento
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "esquemas_financiamiento_mutacion" ON public.esquemas_financiamiento;
CREATE POLICY "esquemas_financiamiento_mutacion" ON public.esquemas_financiamiento
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "cotizaciones_inmobiliarias_tenant" ON public.cotizaciones_inmobiliarias;
CREATE POLICY "cotizaciones_inmobiliarias_tenant" ON public.cotizaciones_inmobiliarias
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "cotizacion_unidades_tenant" ON public.cotizacion_unidades;
CREATE POLICY "cotizacion_unidades_tenant" ON public.cotizacion_unidades
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "apartados_unidades_tenant" ON public.apartados_unidades;
CREATE POLICY "apartados_unidades_tenant" ON public.apartados_unidades
  FOR ALL USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

-- 8. Función de liberación programada e idempotente de apartados vencidos
CREATE OR REPLACE FUNCTION public.liberar_apartados_vencidos(
  p_desarrollo_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  r_unidad RECORD;
  v_liberadas INTEGER := 0;
BEGIN
  FOR r_unidad IN
    SELECT id, organizacion_id, desarrollo_id, clave_comercial,
           asesor_apartado_id, prospecto_actual_id, oportunidad_actual_id,
           apartado_vence_en, version_registro
    FROM public.unidades_inmobiliarias
    WHERE estado_disponibilidad = 'apartado'
      AND apartado_vence_en IS NOT NULL
      AND apartado_vence_en <= pg_catalog.clock_timestamp()
      AND (p_desarrollo_id IS NULL OR desarrollo_id = p_desarrollo_id)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE public.unidades_inmobiliarias
      SET estado_disponibilidad = 'disponible',
          asesor_apartado_id = NULL,
          prospecto_actual_id = NULL,
          oportunidad_actual_id = NULL,
          apartado_en = NULL,
          apartado_vence_en = NULL,
          version_registro = version_registro + 1,
          fecha_actualizacion = pg_catalog.clock_timestamp()
      WHERE id = r_unidad.id AND organizacion_id = r_unidad.organizacion_id;

      UPDATE public.apartados_unidades
      SET estado_apartado = 'vencido_liberado',
          liberado_en = pg_catalog.clock_timestamp(),
          motivo_liberacion = 'Expiración automática de vigencia de apartado',
          fecha_actualizacion = pg_catalog.clock_timestamp()
      WHERE unidad_id = r_unidad.id
        AND organizacion_id = r_unidad.organizacion_id
        AND estado_apartado = 'activo';

      INSERT INTO public.historial_disponibilidad_unidad (
        organizacion_id, unidad_id, estado_anterior, estado_nuevo,
        actor_tipo, usuario_id, actor_sistema_identificador,
        prospecto_id, oportunidad_id, motivo, metadatos
      ) VALUES (
        r_unidad.organizacion_id, r_unidad.id, 'apartado', 'disponible',
        'sistema_cron', NULL, 'pg_cron:liberar_apartados_vencidos',
        r_unidad.prospecto_actual_id, r_unidad.oportunidad_actual_id,
        'Expiración automática de vigencia de apartado',
        pg_catalog.jsonb_build_object(
          'apartado_vence_en', r_unidad.apartado_vence_en,
          'asesor_anterior_id', r_unidad.asesor_apartado_id
        )
      );

      v_liberadas := v_liberadas + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al liberar apartado vencido %: %', r_unidad.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_liberadas;
END;
$$;

REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_apartados_vencidos(UUID) TO postgres, service_role;

-- 9. Semilla idempotente de Esquemas de Financiamiento para SOLHÁ - Lotes Campestres
DO $$
DECLARE
  v_org_id UUID;
  v_desarrollo_id UUID;
BEGIN
  SELECT organizacion_id, id
    INTO v_org_id, v_desarrollo_id
  FROM public.desarrollos
  WHERE slug = 'solha-lotes-campestres'
  ORDER BY fecha_creacion ASC
  LIMIT 1;

  IF v_org_id IS NOT NULL AND v_desarrollo_id IS NOT NULL THEN
    INSERT INTO public.esquemas_financiamiento (
      id, organizacion_id, desarrollo_id, nombre, descripcion,
      tipo_tasa_interes, tasa_interes_anual, modo_pagos_extraordinarios,
      porcentaje_enganche_min, max_meses_enganche_diferido, plazos_meses_permitidos,
      descuento_maximo_pct, permite_pagos_extraordinarios, activo
    ) VALUES
      (
        'f1000000-0000-4000-8000-000000000001',
        v_org_id,
        v_desarrollo_id,
        'Contado Comercial (Hasta 8% Dto.)',
        'Liquidación de contado con enganche inmediato y hasta 8% de descuento autorizado.',
        'sin_intereses',
        0.0000,
        'valor_presente_cuota_fija',
        30.00,
        3,
        '{1,3,6}',
        8.00,
        false,
        true
      ),
      (
        'f1000000-0000-4000-8000-000000000002',
        v_org_id,
        v_desarrollo_id,
        '36 Meses Sin Intereses (MSI Directo)',
        'Financiamiento directo con la desarrolladora hasta 36 meses sin intereses con 15% de enganche.',
        'sin_intereses',
        0.0000,
        'valor_presente_cuota_fija',
        15.00,
        6,
        '{12,18,24,36}',
        5.00,
        true,
        true
      ),
      (
        'f1000000-0000-4000-8000-000000000003',
        v_org_id,
        v_desarrollo_id,
        'Crédito Directo 60 a 120 Meses (Tasa Nominal 12% Anual)',
        'Amortización francesa con tasa nominal anual del 12% y anualidades programables en diciembre.',
        'nominal_anual',
        12.0000,
        'valor_presente_cuota_fija',
        10.00,
        12,
        '{48,60,72,84,96,120}',
        3.00,
        true,
        true
      )
    ON CONFLICT (id, organizacion_id) DO NOTHING;
  END IF;
END $$;
