-- ==============================================================================
-- IRIS by WYLEN — PROPUESTA DE DISEÑO SQL DEFINITIVA (IRIS_SQL_DESIGN_PROPOSAL.sql)
-- ==============================================================================
-- NOTA: Artefacto de ingeniería y diseño técnico (NO ejecutar sin autorización).
-- Incorpora la corrección dirigida de los 6 hallazgos de ingeniería:
--   1. Identidad comercial con las 4 acciones explícitas, paquete multi-unidad e idempotencia por (organizacion_id, operacion, clave_idempotencia).
--   2. Fusión y reversión NO destructiva de contactos (canales archivados, cambios post-fusión, detección de conflictos y reversión parcial segura).
--   3. Aislamiento multiempresa con las 18 tablas nuevas completas (incluyendo documentos_desarrollo, solicitudes_documento y asignaciones_asesor_desarrollo) + transición en 3 pasos (Backfill -> NOT VALID -> VALIDATE) para tablas existentes.
--   4. Funciones SECURITY DEFINER con SET search_path = pg_catalog, pg_temp usando 100% funciones nativas de pg_catalog (pg_catalog.gen_random_uuid() y pg_catalog.sha256()), sin asumir esquemas de pgcrypto, y separación estricta entre cron (postgres/service_role) y sesión autenticada.
--   5. Políticas comerciales con índices únicos parciales y precedencia campo por campo (Desarrollo -> Organización -> Sistema) sin retroactividad.
-- ==============================================================================

-- Endurecimiento del esquema public: impedir creación de objetos por roles de cliente
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM anon;
REVOKE CREATE ON SCHEMA public FROM authenticated;

-- ==============================================================================
-- MÓDULO 0: PREPARACIÓN DE TABLAS EXISTENTES Y TRANSICIÓN DE FKs COMPUESTAS
-- ==============================================================================

-- 0.1 Asegurar restricciones UNIQUE (id, organizacion_id) en tablas padre existentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'uq_prospectos_id_org') THEN
    ALTER TABLE public.prospectos ADD CONSTRAINT uq_prospectos_id_org UNIQUE (id, organizacion_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'uq_contactos_id_org') THEN
    ALTER TABLE public.contactos ADD CONSTRAINT uq_contactos_id_org UNIQUE (id, organizacion_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'uq_oportunidades_id_org') THEN
    ALTER TABLE public.oportunidades ADD CONSTRAINT uq_oportunidades_id_org UNIQUE (id, organizacion_id);
  END IF;
END $$;

-- 0.2 Columnas aditivas en tablas CRM existentes para E.164, operación multi-unidad y fusión no destructiva
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

-- 0.3 Estrategia de Transición en 3 Pasos para FKs de Usuario en Tablas Existentes (Hallazgo 3)
-- Paso 1: Saneamiento de referencias históricas (ej. semilla 000009 speeches_comerciales)
UPDATE public.speeches_comerciales AS sc
SET creado_por_id = NULL
WHERE sc.creado_por_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.membresias AS m
    WHERE m.organizacion_id = sc.organizacion_id AND m.usuario_id = sc.creado_por_id
  );

-- Paso 2 y 3: Agregar FK compuesta hacia public.membresias(organizacion_id, usuario_id) con NOT VALID y luego VALIDATE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'fk_prospectos_agente_miembro') THEN
    ALTER TABLE public.prospectos
      ADD CONSTRAINT fk_prospectos_agente_miembro
      FOREIGN KEY (organizacion_id, agente_asignado_id)
      REFERENCES public.membresias(organizacion_id, usuario_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL (agente_asignado_id)
      NOT VALID;
    ALTER TABLE public.prospectos VALIDATE CONSTRAINT fk_prospectos_agente_miembro;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'fk_contactos_agente_miembro') THEN
    ALTER TABLE public.contactos
      ADD CONSTRAINT fk_contactos_agente_miembro
      FOREIGN KEY (organizacion_id, agente_responsable_id)
      REFERENCES public.membresias(organizacion_id, usuario_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL (agente_responsable_id)
      NOT VALID;
    ALTER TABLE public.contactos VALIDATE CONSTRAINT fk_contactos_agente_miembro;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'fk_oportunidades_agente_miembro') THEN
    ALTER TABLE public.oportunidades
      ADD CONSTRAINT fk_oportunidades_agente_miembro
      FOREIGN KEY (organizacion_id, agente_asignado_id)
      REFERENCES public.membresias(organizacion_id, usuario_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

-- 0.4 Función normalizadora de teléfonos E.164 (100% pg_catalog nativo, IMMUTABLE, SECURITY INVOKER)
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

-- 0.5 Función canónica de rol jerárquico (SECURITY DEFINER con search_path = pg_catalog, pg_temp)
CREATE OR REPLACE FUNCTION public.obtener_rol_jerarquico_actual(
  p_organizacion_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_org_id UUID;
  v_rol_usuario VARCHAR(50);
  v_rol_codigo VARCHAR(100);
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_org_id := COALESCE(p_organizacion_id, public.obtener_organizacion_activa_usuario());
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.rol_jerarquico, r.codigo
    INTO v_rol_usuario, v_rol_codigo
  FROM public.membresias AS m
  JOIN public.usuarios AS u ON u.id = m.usuario_id
  JOIN public.roles AS r ON r.id = m.rol_id
  WHERE m.organizacion_id = v_org_id
    AND m.usuario_id = v_uid
    AND m.estado = 'activo'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_rol_usuario = 'superadministrador' OR v_rol_codigo IN ('administrador_organizacion', 'super_admin', 'admin_organizacion') THEN
    RETURN 'superadministrador';
  ELSIF v_rol_usuario = 'gerente' OR v_rol_codigo = 'gerente_ventas' THEN
    RETURN 'gerente';
  ELSIF v_rol_usuario = 'coordinador' OR v_rol_codigo = 'supervisor_atencion' THEN
    RETURN 'coordinador';
  ELSIF v_rol_usuario = 'atencion_cliente' THEN
    RETURN 'atencion_cliente';
  ELSE
    RETURN 'asesor';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_rol_jerarquico_actual(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_rol_jerarquico_actual(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.obtener_rol_jerarquico_actual(UUID) TO authenticated;

-- 0.6 Trigger para validar que las NUEVAS asignaciones operativas recaigan en miembros activos
CREATE OR REPLACE FUNCTION public.validar_asignacion_miembro_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_col_nombre TEXT := TG_ARGV[0];
  v_nuevo_usuario_id UUID;
  v_viejo_usuario_id UUID;
  v_es_activo BOOLEAN;
BEGIN
  EXECUTE pg_catalog.format('SELECT ($1).%I', v_col_nombre) INTO v_nuevo_usuario_id USING NEW;

  IF TG_OP = 'UPDATE' THEN
    EXECUTE pg_catalog.format('SELECT ($1).%I', v_col_nombre) INTO v_viejo_usuario_id USING OLD;
    IF v_nuevo_usuario_id IS NOT DISTINCT FROM v_viejo_usuario_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_nuevo_usuario_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.membresias AS m
      JOIN public.usuarios AS u ON u.id = m.usuario_id
      WHERE m.organizacion_id = NEW.organizacion_id
        AND m.usuario_id = v_nuevo_usuario_id
        AND m.estado = 'activo'
        AND u.estado = 'activo'
    ) INTO v_es_activo;

    IF NOT v_es_activo THEN
      RAISE EXCEPTION 'USUARIO_INACTIVO_O_AJENO: El usuario (%) no cuenta con membresía y cuenta activa en la organización (%).',
        v_nuevo_usuario_id, NEW.organizacion_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_asignacion_miembro_activo() FROM PUBLIC;

-- ==============================================================================
-- MÓDULO 1: IDEMPOTENCIA POR COMANDO Y POLÍTICAS COMERCIALES CON HERENCIA (HALLAZGOS 1 Y 6)
-- ==============================================================================

-- 1.1 Tabla: solicitudes_idempotencia (Alcance por organizacion_id + operacion + clave_idempotencia)
CREATE TABLE IF NOT EXISTS public.solicitudes_idempotencia (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  operacion VARCHAR(80) NOT NULL,
  clave_idempotencia VARCHAR(120) NOT NULL,
  usuario_id UUID NOT NULL,
  hash_parametros CHAR(64) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'en_proceso'
    CHECK (estado IN ('en_proceso', 'completada', 'fallida')),
  entidad_tipo VARCHAR(60) NULL,
  entidad_id UUID NULL,
  respuesta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  expira_en TIMESTAMPTZ NOT NULL DEFAULT (pg_catalog.clock_timestamp() + INTERVAL '48 hours'),
  UNIQUE (organizacion_id, operacion, clave_idempotencia),
  CONSTRAINT fk_idemp_miembro_org
    FOREIGN KEY (organizacion_id, usuario_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_idemp_expiracion
  ON public.solicitudes_idempotencia(expira_en);

ALTER TABLE public.solicitudes_idempotencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solicitudes_idemp_select" ON public.solicitudes_idempotencia
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

-- 1.2 Tabla: politicas_comerciales (Herencia granular Desarrollo -> Organización -> Sistema)
-- En la fila global (desarrollo_id IS NULL) los campos son obligatorios; en la fila de desarrollo (desarrollo_id IS NOT NULL)
-- un campo en NULL significa "heredar el valor de la organización".
CREATE TABLE IF NOT EXISTS public.politicas_comerciales (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NULL,
  horas_vigencia_apartado INTEGER NULL
    CHECK (horas_vigencia_apartado IS NULL OR (horas_vigencia_apartado BETWEEN 1 AND 720)),
  dias_vigencia_cotizacion INTEGER NULL
    CHECK (dias_vigencia_cotizacion IS NULL OR (dias_vigencia_cotizacion BETWEEN 1 AND 90)),
  permitir_apartado_directo_asesor BOOLEAN NULL,
  permitir_liberacion_propia_asesor BOOLEAN NULL,
  requiere_autorizacion_gerente_cierre BOOLEAN NULL,
  descuento_maximo_sin_autorizacion_pct NUMERIC(5, 2) NULL
    CHECK (descuento_maximo_sin_autorizacion_pct IS NULL OR (descuento_maximo_sin_autorizacion_pct BETWEEN 0.00 AND 100.00)),
  modo_pagos_extraordinarios_default VARCHAR(40) NULL
    CHECK (modo_pagos_extraordinarios_default IS NULL OR modo_pagos_extraordinarios_default IN ('valor_presente_cuota_fija', 'abono_directo_capital')),
  version_politica INTEGER NOT NULL DEFAULT 1,
  actualizado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),

  -- Si es la política global de la organización (desarrollo_id IS NULL), todos los campos deben estar definidos
  CONSTRAINT chk_politica_global_campos_no_nulos CHECK (
    desarrollo_id IS NOT NULL OR (
      horas_vigencia_apartado IS NOT NULL
      AND dias_vigencia_cotizacion IS NOT NULL
      AND permitir_apartado_directo_asesor IS NOT NULL
      AND permitir_liberacion_propia_asesor IS NOT NULL
      AND requiere_autorizacion_gerente_cierre IS NOT NULL
      AND descuento_maximo_sin_autorizacion_pct IS NOT NULL
      AND modo_pagos_extraordinarios_default IS NOT NULL
    )
  ),

  CONSTRAINT fk_politicas_miembro_actualizador
    FOREIGN KEY (organizacion_id, actualizado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (actualizado_por_id)
);

-- Índices únicos parciales para garantizar 1 política global por organización y máximo 1 por desarrollo
CREATE UNIQUE INDEX IF NOT EXISTS idx_politicas_global_org_unica
  ON public.politicas_comerciales(organizacion_id)
  WHERE desarrollo_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_politicas_desarrollo_unica
  ON public.politicas_comerciales(organizacion_id, desarrollo_id)
  WHERE desarrollo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.historial_politicas_comerciales (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  politica_id UUID NOT NULL,
  version_anterior INTEGER NOT NULL,
  version_nueva INTEGER NOT NULL,
  valores_anteriores JSONB NOT NULL,
  valores_nuevos JSONB NOT NULL,
  usuario_id UUID NULL,
  motivo TEXT NULL,
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT fk_hist_politica_org
    FOREIGN KEY (politica_id, organizacion_id)
    REFERENCES public.politicas_comerciales(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_hist_politica_miembro
    FOREIGN KEY (organizacion_id, usuario_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (usuario_id)
);

ALTER TABLE public.politicas_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_politicas_comerciales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "politicas_comerciales_select" ON public.politicas_comerciales
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "politicas_comerciales_mutacion_gerencia" ON public.politicas_comerciales
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

-- ==============================================================================
-- MÓDULO 2: PROYECTOS E INVENTARIO INMOBILIARIO COMPLETO (9 TABLAS — HALLAZGO 3)
-- ==============================================================================

-- 2.1 Tabla: desarrolladoras
CREATE TABLE IF NOT EXISTS public.desarrolladoras (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  razon_social VARCHAR(255) NULL,
  identificador_fiscal VARCHAR(50) NULL,
  logo_url TEXT NULL,
  color_marca VARCHAR(30) NOT NULL DEFAULT '#111827',
  sitio_web VARCHAR(255) NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (organizacion_id, nombre),
  CONSTRAINT fk_desarrolladoras_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id)
);

-- 2.2 Tabla: desarrollos
CREATE TABLE IF NOT EXISTS public.desarrollos (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrolladora_id UUID NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  ubicacion_texto VARCHAR(255) NULL,
  direccion TEXT NULL,
  latitud NUMERIC(10, 7) NULL,
  longitud NUMERIC(10, 7) NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  precio_desde NUMERIC(14, 2) NULL CHECK (precio_desde IS NULL OR precio_desde >= 0),
  portada_url TEXT NULL,
  galeria_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuracion_comercial JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado_publicacion VARCHAR(30) NOT NULL DEFAULT 'borrador'
    CHECK (estado_publicacion IN ('borrador', 'activo', 'pausado', 'agotado')),
  creado_por_id UUID NULL,
  actualizado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (organizacion_id, slug),
  CONSTRAINT fk_desarrollos_desarrolladora_tenant
    FOREIGN KEY (desarrolladora_id, organizacion_id)
    REFERENCES public.desarrolladoras(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_desarrollos_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id),
  CONSTRAINT fk_desarrollos_actualizador_miembro
    FOREIGN KEY (organizacion_id, actualizado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (actualizado_por_id)
);

ALTER TABLE public.politicas_comerciales
  ADD CONSTRAINT fk_politicas_desarrollo_tenant
  FOREIGN KEY (desarrollo_id, organizacion_id)
  REFERENCES public.desarrollos(id, organizacion_id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- Función de resolución de política comercial con precedencia campo por campo: Desarrollo -> Organización -> Sistema (Hallazgo 6)
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
DECLARE
  v_org_activa UUID;
BEGIN
  v_org_activa := public.obtener_organizacion_activa_usuario();
  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id THEN
    RAISE EXCEPTION 'ACCESO_TENANT_DENEGADO: Organización no autorizada.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p_des.horas_vigencia_apartado, p_org.horas_vigencia_apartado, 72) AS horas_vigencia_apartado,
    COALESCE(p_des.dias_vigencia_cotizacion, p_org.dias_vigencia_cotizacion, 7) AS dias_vigencia_cotizacion,
    COALESCE(p_des.permitir_apartado_directo_asesor, p_org.permitir_apartado_directo_asesor, true) AS permitir_apartado_directo_asesor,
    COALESCE(p_des.permitir_liberacion_propia_asesor, p_org.permitir_liberacion_propia_asesor, true) AS permitir_liberacion_propia_asesor,
    COALESCE(p_des.requiere_autorizacion_gerente_cierre, p_org.requiere_autorizacion_gerente_cierre, true) AS requiere_autorizacion_gerente_cierre,
    COALESCE(p_des.descuento_maximo_sin_autorizacion_pct, p_org.descuento_maximo_sin_autorizacion_pct, 0.00) AS descuento_maximo_sin_autorizacion_pct,
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

-- 2.3 Tabla: etapas_desarrollo
CREATE TABLE IF NOT EXISTS public.etapas_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(60) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  fecha_entrega_estimada DATE NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('planeacion', 'preventa', 'activa', 'entregada', 'cerrada')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  UNIQUE (desarrollo_id, codigo),
  CONSTRAINT fk_etapas_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- 2.4 Tabla: manzanas_desarrollo
CREATE TABLE IF NOT EXISTS public.manzanas_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(60) NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  UNIQUE (etapa_id, codigo),
  CONSTRAINT fk_manzanas_etapa_desarrollo_tenant
    FOREIGN KEY (etapa_id, desarrollo_id, organizacion_id)
    REFERENCES public.etapas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- 2.5 Tabla: unidades_inmobiliarias
CREATE TABLE IF NOT EXISTS public.unidades_inmobiliarias (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NULL,
  manzana_id UUID NULL,
  clave_comercial VARCHAR(100) NOT NULL,
  identificador_plano_svg VARCHAR(120) NULL,
  tipo_unidad VARCHAR(50) NOT NULL DEFAULT 'lote'
    CHECK (tipo_unidad IN ('lote', 'departamento', 'casa', 'local_comercial', 'bodega', 'oficina')),
  superficie_m2 NUMERIC(12, 2) NOT NULL CHECK (superficie_m2 > 0),
  frente_m NUMERIC(10, 2) NULL CHECK (frente_m IS NULL OR frente_m > 0),
  fondo_m NUMERIC(10, 2) NULL CHECK (fondo_m IS NULL OR fondo_m > 0),
  precio_lista NUMERIC(14, 2) NOT NULL CHECK (precio_lista >= 0),
  precio_promocional NUMERIC(14, 2) NULL CHECK (precio_promocional IS NULL OR (precio_promocional >= 0 AND precio_promocional <= precio_lista)),
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  estado_disponibilidad VARCHAR(30) NOT NULL DEFAULT 'disponible'
    CHECK (estado_disponibilidad IN ('disponible', 'apartado', 'vendido', 'bloqueado')),
  asesor_apartado_id UUID NULL,
  prospecto_actual_id UUID NULL,
  oportunidad_actual_id UUID NULL,
  apartado_en TIMESTAMPTZ NULL,
  apartado_vence_en TIMESTAMPTZ NULL,
  vendido_en TIMESTAMPTZ NULL,
  caracteristicas JSONB NOT NULL DEFAULT '{}'::jsonb,
  documentos_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_registro INTEGER NOT NULL DEFAULT 1,
  creado_por_id UUID NULL,
  actualizado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  UNIQUE (desarrollo_id, clave_comercial),

  CONSTRAINT chk_unidad_estado_apartado_coherente CHECK (
    (estado_disponibilidad = 'apartado' AND apartado_vence_en IS NOT NULL)
    OR (estado_disponibilidad <> 'apartado' AND apartado_vence_en IS NULL)
  ),

  CONSTRAINT fk_unidades_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_unidades_etapa_desarrollo_tenant
    FOREIGN KEY (etapa_id, desarrollo_id, organizacion_id)
    REFERENCES public.etapas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (etapa_id),

  CONSTRAINT fk_unidades_manzana_desarrollo_tenant
    FOREIGN KEY (manzana_id, desarrollo_id, organizacion_id)
    REFERENCES public.manzanas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (manzana_id),

  CONSTRAINT fk_unidades_asesor_apartado_miembro
    FOREIGN KEY (organizacion_id, asesor_apartado_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (asesor_apartado_id),

  CONSTRAINT fk_unidades_prospecto_tenant
    FOREIGN KEY (prospecto_actual_id, organizacion_id)
    REFERENCES public.prospectos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (prospecto_actual_id),

  CONSTRAINT fk_unidades_oportunidad_tenant
    FOREIGN KEY (oportunidad_actual_id, organizacion_id)
    REFERENCES public.oportunidades(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (oportunidad_actual_id),

  CONSTRAINT fk_unidades_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id),

  CONSTRAINT fk_unidades_actualizador_miembro
    FOREIGN KEY (organizacion_id, actualizado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (actualizado_por_id)
);

CREATE INDEX IF NOT EXISTS idx_unidades_org_desarrollo_estado
  ON public.unidades_inmobiliarias(organizacion_id, desarrollo_id, estado_disponibilidad);

CREATE INDEX IF NOT EXISTS idx_unidades_apartados_por_vencer
  ON public.unidades_inmobiliarias(apartado_vence_en)
  WHERE estado_disponibilidad = 'apartado' AND apartado_vence_en IS NOT NULL;

CREATE TRIGGER trg_unidades_validar_asesor_apartado_activo
BEFORE INSERT OR UPDATE OF asesor_apartado_id ON public.unidades_inmobiliarias
FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion_miembro_activo('asesor_apartado_id');

-- 2.6 Tabla: historial_disponibilidad_unidad
CREATE TABLE IF NOT EXISTS public.historial_disponibilidad_unidad (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo VARCHAR(30) NOT NULL,
  actor_tipo VARCHAR(30) NOT NULL DEFAULT 'usuario'
    CHECK (actor_tipo IN ('usuario', 'sistema_cron', 'webhook_externo', 'migracion_sistema')),
  usuario_id UUID NULL,
  actor_sistema_identificador VARCHAR(100) NULL,
  prospecto_id UUID NULL,
  oportunidad_id UUID NULL,
  cotizacion_id UUID NULL,
  motivo TEXT NOT NULL,
  metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  CONSTRAINT chk_historial_unidad_actor_coherente CHECK (
    (actor_tipo = 'usuario' AND usuario_id IS NOT NULL)
    OR (actor_tipo <> 'usuario' AND usuario_id IS NULL AND actor_sistema_identificador IS NOT NULL)
  ),

  CONSTRAINT fk_hist_unidad_tenant
    FOREIGN KEY (unidad_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_hist_unidad_miembro
    FOREIGN KEY (organizacion_id, usuario_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_hist_unidad_prospecto_tenant
    FOREIGN KEY (prospecto_id, organizacion_id)
    REFERENCES public.prospectos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (prospecto_id),

  CONSTRAINT fk_hist_unidad_oportunidad_tenant
    FOREIGN KEY (oportunidad_id, organizacion_id)
    REFERENCES public.oportunidades(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (oportunidad_id)
);

CREATE INDEX IF NOT EXISTS idx_hist_unidad_org_fecha
  ON public.historial_disponibilidad_unidad(organizacion_id, unidad_id, fecha_cambio DESC);

-- 2.7 Tabla: documentos_desarrollo (Hallazgo 3: Completitud del DDL de Módulo 2)
CREATE TABLE IF NOT EXISTS public.documentos_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  categoria VARCHAR(60) NOT NULL DEFAULT 'brochure'
    CHECK (categoria IN ('brochure', 'ficha_tecnica', 'reglamento', 'master_plan', 'certeza_juridica', 'lista_precios')),
  url_archivo TEXT NOT NULL,
  modalidad_acceso VARCHAR(40) NOT NULL DEFAULT 'descarga_directa'
    CHECK (modalidad_acceso IN ('descarga_directa', 'solicitud_asesor', 'uso_interno')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  CONSTRAINT fk_doc_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_doc_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id)
);

-- 2.8 Tabla: solicitudes_documento
CREATE TABLE IF NOT EXISTS public.solicitudes_documento (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  documento_id UUID NOT NULL,
  prospecto_id UUID NULL,
  cotizacion_id UUID NULL,
  asesor_asignado_id UUID NULL,
  nombre_solicitante VARCHAR(200) NOT NULL,
  telefono_solicitante VARCHAR(50) NULL,
  correo_solicitante VARCHAR(255) NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'enviado', 'descartado')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT fk_soldoc_documento_desarrollo_tenant
    FOREIGN KEY (documento_id, desarrollo_id, organizacion_id)
    REFERENCES public.documentos_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_soldoc_prospecto_tenant
    FOREIGN KEY (prospecto_id, organizacion_id)
    REFERENCES public.prospectos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (prospecto_id),
  CONSTRAINT fk_soldoc_asesor_miembro
    FOREIGN KEY (organizacion_id, asesor_asignado_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (asesor_asignado_id)
);

-- 2.9 Tabla: asignaciones_asesor_desarrollo
CREATE TABLE IF NOT EXISTS public.asignaciones_asesor_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  asesor_id UUID NOT NULL,
  puede_cotizar BOOLEAN NOT NULL DEFAULT true,
  puede_apartar BOOLEAN NOT NULL DEFAULT true,
  asignado_por_id UUID NULL,
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (organizacion_id, desarrollo_id, asesor_id),
  CONSTRAINT fk_asig_des_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_asig_des_asesor_miembro
    FOREIGN KEY (organizacion_id, asesor_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_asig_des_autor_miembro
    FOREIGN KEY (organizacion_id, asignado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (asignado_por_id)
);

CREATE TRIGGER trg_asig_desarrollo_validar_asesor_activo
BEFORE INSERT OR UPDATE OF asesor_id ON public.asignaciones_asesor_desarrollo
FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion_miembro_activo('asesor_id');

-- ==============================================================================
-- MÓDULO 3: PLANOS INTERACTIVOS SVG
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.planos_interactivos (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NULL,
  manzana_id UUID NULL,
  nombre VARCHAR(180) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  contenido_svg TEXT NOT NULL,
  viewbox VARCHAR(120) NULL,
  configuracion_colores JSONB NOT NULL DEFAULT '{
    "disponible": "#10b981",
    "apartado": "#f59e0b",
    "vendido": "#ef4444",
    "bloqueado": "#64748b",
    "sin_vincular": "#d1d5db"
  }'::jsonb,
  es_activo BOOLEAN NOT NULL DEFAULT true,
  creado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  CONSTRAINT fk_planos_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_planos_etapa_desarrollo_tenant
    FOREIGN KEY (etapa_id, desarrollo_id, organizacion_id)
    REFERENCES public.etapas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (etapa_id),
  CONSTRAINT fk_planos_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id)
);

CREATE TABLE IF NOT EXISTS public.vinculos_plano_unidad (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  plano_id UUID NOT NULL,
  svg_element_id VARCHAR(150) NOT NULL,
  unidad_id UUID NOT NULL,
  metadatos_trazo JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (plano_id, svg_element_id),
  UNIQUE (plano_id, unidad_id),
  CONSTRAINT fk_vinculos_plano_desarrollo_tenant
    FOREIGN KEY (plano_id, desarrollo_id, organizacion_id)
    REFERENCES public.planos_interactivos(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_vinculos_unidad_desarrollo_tenant
    FOREIGN KEY (unidad_id, desarrollo_id, organizacion_id)
    REFERENCES public.unidades_inmobiliarias(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- ==============================================================================
-- MÓDULO 4: CRM, INTERESES MÚLTIPLES, OPORTUNIDAD_UNIDADES Y FUSIÓN NO DESTRUCTIVA
-- ==============================================================================

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

-- ==============================================================================
-- MÓDULO 5: ESQUEMAS FINANCIEROS Y COTIZADOR INMOBILIARIO
-- ==============================================================================

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
  max_meses_enganche_diferido INTEGER NOT NULL DEFAULT 1
    CHECK (max_meses_enganche_diferido BETWEEN 1 AND 36),
  plazos_meses_permitidos INTEGER[] NOT NULL DEFAULT '{12,24,36,48,60}',
  descuento_maximo_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00
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
  prospecto_id UUID NOT NULL,
  contacto_id UUID NULL,
  oportunidad_id UUID NULL,
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
  snapshot_comercial JSONB NOT NULL,
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
    ON DELETE RESTRICT,

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

-- ==============================================================================
-- MÓDULO 6: FUNCIONES RPC TRANSACCIONALES ENDURECIDAS (100% pg_catalog NATIVO)
-- ==============================================================================

-- 6.1 RPC: Gestión Idempotente de Operaciones Comerciales con 4 Acciones Explícitas (Hallazgos 1 y 4)
CREATE OR REPLACE FUNCTION public.asegurar_conversion_prospecto_oportunidad(
  p_organizacion_id UUID,
  p_clave_idempotencia VARCHAR(120),
  p_prospecto_id UUID,
  p_desarrollo_id UUID,
  p_unidades_ids UUID[] DEFAULT '{}'::UUID[],
  p_oportunidad_id UUID DEFAULT NULL,
  p_accion_operacion VARCHAR(40) DEFAULT 'CONVERTIR_PROSPECTO',
    -- Acciones válidas:
    --   1. 'CONVERTIR_PROSPECTO'            (Reutiliza oportunidad abierta del prospecto o crea su 1ª oportunidad)
    --   2. 'REUTILIZAR_OPORTUNIDAD'         (Reutiliza p_oportunidad_id o la oportunidad general abierta sin unidades)
    --   3. 'AGREGAR_UNIDADES_A_OPORTUNIDAD' (Agrega p_unidades_ids al paquete multi-unidad de p_oportunidad_id)
    --   4. 'CREAR_NUEVA_NEGOCIACION'        (Crea un nuevo expediente de oportunidad independiente)
  p_embudo_id UUID DEFAULT NULL,
  p_etapa_id UUID DEFAULT NULL,
  p_titulo_oportunidad VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  c_operacion CONSTANT VARCHAR(80) := 'asegurar_conversion_prospecto_oportunidad';
  v_usuario_id UUID;
  v_org_activa UUID;
  v_rol VARCHAR(50);
  v_unidades_ordenadas UUID[];
  v_payload_canonico TEXT;
  v_hash_params CHAR(64);
  v_idemp RECORD;
  v_prospecto RECORD;
  v_oportunidad_actual RECORD;
  v_contacto_id UUID;
  v_oportunidad_id UUID;
  v_unidad_principal_id UUID;
  v_embudo_id UUID;
  v_etapa_id UUID;
  v_codigo_operacion VARCHAR(40);
  v_nombre TEXT;
  v_apellidos TEXT;
  v_uid_iter UUID;
  v_suma_unidades NUMERIC(14, 2) := 0.00;
  v_resultado JSONB;
BEGIN
  -- 1. Validación de autenticación, tenant y membresía activa
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Sesión inválida.' USING ERRCODE = '28000';
  END IF;

  v_org_activa := public.obtener_organizacion_activa_usuario();
  v_rol := public.obtener_rol_jerarquico_actual(p_organizacion_id);

  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id OR v_rol IS NULL THEN
    RAISE EXCEPTION 'ACCESO_TENANT_DENEGADO: El usuario no pertenece a la organización solicitada.'
      USING ERRCODE = '42501';
  END IF;

  IF p_accion_operacion NOT IN ('CONVERTIR_PROSPECTO', 'REUTILIZAR_OPORTUNIDAD', 'AGREGAR_UNIDADES_A_OPORTUNIDAD', 'CREAR_NUEVA_NEGOCIACION') THEN
    RAISE EXCEPTION 'ACCION_OPERACION_INVALIDA: Acción (%) no reconocida.', p_accion_operacion USING ERRCODE = '22023';
  END IF;

  -- 2. Normalizar arreglo de unidades (orden ascendente y sin duplicados) y calcular SHA-256 nativo en pg_catalog
  SELECT COALESCE(pg_catalog.array_agg(u_id ORDER BY u_id ASC), '{}'::UUID[])
    INTO v_unidades_ordenadas
  FROM (SELECT DISTINCT pg_catalog.unnest(COALESCE(p_unidades_ids, '{}'::UUID[])) AS u_id) AS s;

  v_payload_canonico := pg_catalog.concat_ws(
    '|',
    p_organizacion_id::text,
    p_prospecto_id::text,
    COALESCE(p_oportunidad_id::text, 'NULL'),
    p_desarrollo_id::text,
    v_unidades_ordenadas::text,
    p_accion_operacion
  );

  v_hash_params := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(v_payload_canonico, 'UTF8')),
    'hex'
  );

  INSERT INTO public.solicitudes_idempotencia (
    organizacion_id, operacion, clave_idempotencia, usuario_id, hash_parametros, estado
  ) VALUES (
    p_organizacion_id, c_operacion, p_clave_idempotencia, v_usuario_id, v_hash_params, 'en_proceso'
  )
  ON CONFLICT (organizacion_id, operacion, clave_idempotencia) DO NOTHING;

  SELECT * INTO v_idemp
  FROM public.solicitudes_idempotencia
  WHERE organizacion_id = p_organizacion_id
    AND operacion = c_operacion
    AND clave_idempotencia = p_clave_idempotencia
  FOR UPDATE;

  -- Si la clave ya fue usada con parámetros distintos, rechazar con 23505 (Hallazgo 1)
  IF v_idemp.hash_parametros <> v_hash_params THEN
    RAISE EXCEPTION 'IDEMPOTENCIA_PAYLOAD_DIFERENTE: La clave de idempotencia (%) ya fue utilizada con parámetros diferentes.',
      p_clave_idempotencia USING ERRCODE = '23505';
  END IF;

  IF v_idemp.estado = 'completada' THEN
    RETURN v_idemp.respuesta_json;
  END IF;

  -- 3. Bloquear prospecto
  SELECT * INTO v_prospecto
  FROM public.prospectos
  WHERE id = p_prospecto_id AND organizacion_id = p_organizacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROSPECTO_NO_ENCONTRADO: El prospecto no existe en la organización.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Resolver o crear Contacto SIN fusión automática por teléfono/correo
  IF v_prospecto.contacto_convertido_id IS NOT NULL THEN
    v_contacto_id := v_prospecto.contacto_convertido_id;
  ELSE
    SELECT id INTO v_contacto_id
    FROM public.contactos
    WHERE organizacion_id = p_organizacion_id
      AND prospecto_origen_id = p_prospecto_id
      AND estado <> 'archivado'
    LIMIT 1;

    IF v_contacto_id IS NULL THEN
      v_nombre := pg_catalog.split_part(pg_catalog.btrim(v_prospecto.nombre), ' ', 1);
      v_apellidos := NULLIF(pg_catalog.btrim(pg_catalog.substr(pg_catalog.btrim(v_prospecto.nombre), pg_catalog.length(v_nombre) + 1)), '');

      INSERT INTO public.contactos (
        organizacion_id, prospecto_origen_id, nombre, apellidos,
        correo_principal, telefono_principal, telefono_e164,
        agente_responsable_id, estado
      ) VALUES (
        p_organizacion_id, p_prospecto_id, v_nombre, v_apellidos,
        v_prospecto.correo_electronico, v_prospecto.telefono,
        public.normalizar_telefono_e164(v_prospecto.telefono),
        COALESCE(v_prospecto.agente_asignado_id, v_usuario_id), 'activo'
      )
      RETURNING id INTO v_contacto_id;
    END IF;
  END IF;

  -- Serializar operaciones sobre el mismo contacto
  PERFORM 1 FROM public.contactos
  WHERE id = v_contacto_id AND organizacion_id = p_organizacion_id
  FOR UPDATE;

  v_unidad_principal_id := CASE WHEN pg_catalog.array_length(v_unidades_ordenadas, 1) >= 1 THEN v_unidades_ordenadas[1] ELSE NULL END;

  -- 5. Resolver la acción de operación solicitada (Hallazgo 1)
  IF p_accion_operacion = 'AGREGAR_UNIDADES_A_OPORTUNIDAD' THEN
    IF p_oportunidad_id IS NULL THEN
      RAISE EXCEPTION 'OPORTUNIDAD_REQUERIDA: Para agregar unidades a un paquete debe especificar p_oportunidad_id.'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_oportunidad_actual
    FROM public.oportunidades
    WHERE id = p_oportunidad_id
      AND organizacion_id = p_organizacion_id
      AND contacto_id = v_contacto_id
    FOR UPDATE;

    IF NOT FOUND OR v_oportunidad_actual.estado <> 'abierta' THEN
      RAISE EXCEPTION 'OPORTUNIDAD_NO_ABIERTA: La oportunidad especificada no existe o ya fue cerrada.'
        USING ERRCODE = '23514';
    END IF;

    IF v_oportunidad_actual.desarrollo_id IS NOT NULL AND v_oportunidad_actual.desarrollo_id <> p_desarrollo_id THEN
      RAISE EXCEPTION 'DESARROLLO_DIFERENTE: No se pueden mezclar unidades de otro desarrollo en la misma oportunidad.'
        USING ERRCODE = '23514';
    END IF;

    v_oportunidad_id := v_oportunidad_actual.id;

  ELSIF p_accion_operacion IN ('CONVERTIR_PROSPECTO', 'REUTILIZAR_OPORTUNIDAD') THEN
    IF p_oportunidad_id IS NOT NULL THEN
      SELECT id INTO v_oportunidad_id
      FROM public.oportunidades
      WHERE id = p_oportunidad_id
        AND organizacion_id = p_organizacion_id
        AND contacto_id = v_contacto_id
        AND estado = 'abierta'
      FOR UPDATE;
    END IF;

    -- Si el prospecto ya tenía una oportunidad abierta en ese desarrollo, reutilizarla
    IF v_oportunidad_id IS NULL AND v_prospecto.oportunidad_convertida_id IS NOT NULL THEN
      SELECT id INTO v_oportunidad_id
      FROM public.oportunidades
      WHERE id = v_prospecto.oportunidad_convertida_id
        AND organizacion_id = p_organizacion_id
        AND desarrollo_id = p_desarrollo_id
        AND estado = 'abierta'
      FOR UPDATE;
    END IF;

    -- Si el contacto tiene una oportunidad general abierta en ese desarrollo sin unidades asignadas aún, reutilizarla
    IF v_oportunidad_id IS NULL THEN
      SELECT o.id INTO v_oportunidad_id
      FROM public.oportunidades AS o
      WHERE o.organizacion_id = p_organizacion_id
        AND o.contacto_id = v_contacto_id
        AND o.desarrollo_id = p_desarrollo_id
        AND o.estado = 'abierta'
        AND NOT EXISTS (
          SELECT 1 FROM public.oportunidad_unidades AS ou
          WHERE ou.oportunidad_id = o.id AND ou.organizacion_id = o.organizacion_id AND ou.estado_en_operacion <> 'descartada'
        )
      ORDER BY o.fecha_creacion DESC
      LIMIT 1
      FOR UPDATE;
    END IF;
  END IF;

  -- Si p_accion_operacion = 'CREAR_NUEVA_NEGOCIACION' o no existía oportunidad abierta reutilizable, crear nueva Oportunidad
  IF v_oportunidad_id IS NULL THEN
    v_embudo_id := p_embudo_id;
    IF v_embudo_id IS NULL THEN
      SELECT id INTO v_embudo_id
      FROM public.embudos_venta
      WHERE organizacion_id = p_organizacion_id AND es_predeterminado = true
      LIMIT 1;
    END IF;

    v_etapa_id := p_etapa_id;
    IF v_etapa_id IS NULL THEN
      SELECT id INTO v_etapa_id
      FROM public.etapas_embudo
      WHERE organizacion_id = p_organizacion_id AND embudo_id = v_embudo_id
      ORDER BY orden ASC
      LIMIT 1;
    END IF;

    v_codigo_operacion := 'OP-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));

    INSERT INTO public.oportunidades (
      organizacion_id, codigo_operacion, embudo_id, etapa_id,
      contacto_id, prospecto_origen_id, desarrollo_id, unidad_principal_id,
      agente_asignado_id, titulo, valor_estimado, moneda, estado
    ) VALUES (
      p_organizacion_id, v_codigo_operacion, v_embudo_id, v_etapa_id,
      v_contacto_id, p_prospecto_id, p_desarrollo_id, v_unidad_principal_id,
      COALESCE(v_prospecto.agente_asignado_id, v_usuario_id),
      COALESCE(p_titulo_oportunidad, 'Operación Inmobiliaria — ' || v_prospecto.nombre),
      0.00, 'MXN', 'abierta'
    )
    RETURNING id INTO v_oportunidad_id;

    INSERT INTO public.historial_etapas_oportunidad (
      organizacion_id, oportunidad_id, etapa_anterior_id, etapa_nueva_id, usuario_cambio_id, notas
    ) VALUES (
      p_organizacion_id, v_oportunidad_id, NULL, v_etapa_id, v_usuario_id,
      'Apertura de operación comercial (' || p_accion_operacion || ').'
    );
  END IF;

  -- 6. Sincronizar unidades en public.oportunidad_unidades y recalcular valor_estimado del paquete
  IF pg_catalog.array_length(v_unidades_ordenadas, 1) >= 1 THEN
    FOREACH v_uid_iter IN ARRAY v_unidades_ordenadas LOOP
      INSERT INTO public.oportunidad_unidades (
        organizacion_id, oportunidad_id, desarrollo_id, unidad_id, precio_referencia, estado_en_operacion
      )
      SELECT p_organizacion_id, v_oportunidad_id, p_desarrollo_id, u.id, COALESCE(u.precio_promocional, u.precio_lista), 'en_negociacion'
      FROM public.unidades_inmobiliarias AS u
      WHERE u.id = v_uid_iter
        AND u.desarrollo_id = p_desarrollo_id
        AND u.organizacion_id = p_organizacion_id
      ON CONFLICT (oportunidad_id, unidad_id) DO UPDATE
        SET estado_en_operacion = 'en_negociacion',
            precio_referencia = EXCLUDED.precio_referencia;
    END LOOP;

    SELECT COALESCE(pg_catalog.sum(precio_referencia), 0.00)
      INTO v_suma_unidades
    FROM public.oportunidad_unidades
    WHERE oportunidad_id = v_oportunidad_id
      AND organizacion_id = p_organizacion_id
      AND estado_en_operacion <> 'descartada';

    UPDATE public.oportunidades
    SET desarrollo_id = COALESCE(desarrollo_id, p_desarrollo_id),
        unidad_principal_id = COALESCE(unidad_principal_id, v_unidad_principal_id),
        valor_estimado = v_suma_unidades,
        fecha_actualizacion = pg_catalog.clock_timestamp()
    WHERE id = v_oportunidad_id AND organizacion_id = p_organizacion_id;
  END IF;

  -- 7. Actualizar prospecto
  UPDATE public.prospectos
  SET estado = 'convertido',
      contacto_convertido_id = v_contacto_id,
      oportunidad_convertida_id = COALESCE(oportunidad_convertida_id, v_oportunidad_id),
      desarrollo_id = COALESCE(desarrollo_id, p_desarrollo_id),
      unidad_id = COALESCE(unidad_id, v_unidad_principal_id),
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = p_prospecto_id AND organizacion_id = p_organizacion_id;

  v_resultado := pg_catalog.jsonb_build_object(
    'exito', true,
    'accion_ejecutada', p_accion_operacion,
    'contacto_id', v_contacto_id,
    'oportunidad_id', v_oportunidad_id,
    'unidades_en_paquete', v_unidades_ordenadas
  );

  UPDATE public.solicitudes_idempotencia
  SET estado = 'completada',
      entidad_tipo = 'oportunidad',
      entidad_id = v_oportunidad_id,
      respuesta_json = v_resultado
  WHERE id = v_idemp.id;

  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.asegurar_conversion_prospecto_oportunidad(UUID, VARCHAR, UUID, UUID, UUID[], UUID, VARCHAR, UUID, UUID, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.asegurar_conversion_prospecto_oportunidad(UUID, VARCHAR, UUID, UUID, UUID[], UUID, VARCHAR, UUID, UUID, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.asegurar_conversion_prospecto_oportunidad(UUID, VARCHAR, UUID, UUID, UUID[], UUID, VARCHAR, UUID, UUID, VARCHAR) TO authenticated;

-- 6.2 RPC: Fusión Manual Autorizada con Preservación No Destructiva (Hallazgo 2)
CREATE OR REPLACE FUNCTION public.ejecutar_fusion_autorizada_contactos(
  p_organizacion_id UUID,
  p_contacto_principal_id UUID,
  p_contacto_secundario_id UUID,
  p_motivo TEXT,
  p_estrategia_resolucion VARCHAR(40) DEFAULT 'prevalece_principal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
  v_org_activa UUID;
  v_rol VARCHAR(50);
  v_c_principal RECORD;
  v_c_secundario RECORD;
  v_fusion_id UUID := pg_catalog.gen_random_uuid();
  v_ids_prospectos UUID[];
  v_ids_canales_movidos UUID[];
  v_ids_canales_archivados UUID[];
  v_ids_oportunidades UUID[];
  v_ids_cotizaciones UUID[];
  v_ids_actividades UUID[];
  v_ids_conversaciones UUID[];
  v_ids_reuniones UUID[];
  v_campos_rellenados JSONB;
  v_mapa_reasignados JSONB;
BEGIN
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Sesión requerida.' USING ERRCODE = '28000';
  END IF;

  v_org_activa := public.obtener_organizacion_activa_usuario();
  v_rol := public.obtener_rol_jerarquico_actual(p_organizacion_id);

  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id OR v_rol NOT IN ('superadministrador', 'gerente', 'coordinador') THEN
    RAISE EXCEPTION 'PERMISO_DENEGADO: Rol no autorizado para fusionar contactos.' USING ERRCODE = '42501';
  END IF;

  IF p_contacto_principal_id = p_contacto_secundario_id THEN
    RAISE EXCEPTION 'FUSION_INVALIDA: Los contactos deben ser distintos.' USING ERRCODE = '22023';
  END IF;

  IF p_motivo IS NULL OR pg_catalog.length(pg_catalog.btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'MOTIVO_REQUERIDO: Motivo obligatorio.' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.contactos
  WHERE organizacion_id = p_organizacion_id
    AND id IN (p_contacto_principal_id, p_contacto_secundario_id)
  ORDER BY id ASC
  FOR UPDATE NOWAIT;

  SELECT * INTO v_c_principal FROM public.contactos WHERE id = p_contacto_principal_id AND organizacion_id = p_organizacion_id;
  SELECT * INTO v_c_secundario FROM public.contactos WHERE id = p_contacto_secundario_id AND organizacion_id = p_organizacion_id;

  IF v_c_principal.id IS NULL OR v_c_secundario.id IS NULL THEN
    RAISE EXCEPTION 'CONTACTO_NO_ENCONTRADO: Ambos contactos deben pertenecer al tenant.' USING ERRCODE = 'P0002';
  END IF;

  IF v_c_secundario.estado = 'archivado' AND v_c_secundario.fusionado_en_contacto_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONTACTO_YA_FUSIONADO: El contacto secundario ya fue fusionado.' USING ERRCODE = '23505';
  END IF;

  -- Capturar IDs exactos antes de mutar
  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_prospectos
  FROM public.prospectos WHERE organizacion_id = p_organizacion_id AND contacto_convertido_id = p_contacto_secundario_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_oportunidades
  FROM public.oportunidades WHERE organizacion_id = p_organizacion_id AND contacto_id = p_contacto_secundario_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_cotizaciones
  FROM public.cotizaciones_inmobiliarias WHERE organizacion_id = p_organizacion_id AND contacto_id = p_contacto_secundario_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_actividades
  FROM public.actividades WHERE organizacion_id = p_organizacion_id AND contacto_id = p_contacto_secundario_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_conversaciones
  FROM public.conversaciones WHERE organizacion_id = p_organizacion_id AND contacto_id = p_contacto_secundario_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_reuniones
  FROM public.reuniones_google_meet WHERE organizacion_id = p_organizacion_id AND contacto_id = p_contacto_secundario_id;

  -- Canales: separar los que se mueven al principal de los que colisionan y se archivan (Hallazgo 2)
  WITH canales_movidos AS (
    UPDATE public.canales_contacto AS cc
    SET contacto_id = p_contacto_principal_id,
        contacto_origen_fusion_id = p_contacto_secundario_id,
        es_principal = false
    WHERE cc.organizacion_id = p_organizacion_id
      AND cc.contacto_id = p_contacto_secundario_id
      AND cc.archivado_por_fusion_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.canales_contacto AS cp
        WHERE cp.organizacion_id = p_organizacion_id
          AND cp.contacto_id = p_contacto_principal_id
          AND cp.archivado_por_fusion_id IS NULL
          AND cp.tipo_canal = cc.tipo_canal
          AND pg_catalog.lower(pg_catalog.btrim(cp.valor)) = pg_catalog.lower(pg_catalog.btrim(cc.valor))
      )
    RETURNING cc.id
  )
  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_canales_movidos FROM canales_movidos;

  WITH canales_archivados AS (
    UPDATE public.canales_contacto AS cc
    SET archivado_por_fusion_id = v_fusion_id
    WHERE cc.organizacion_id = p_organizacion_id
      AND cc.contacto_id = p_contacto_secundario_id
      AND cc.archivado_por_fusion_id IS NULL
    RETURNING cc.id
  )
  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_ids_canales_archivados FROM canales_archivados;

  -- Reasignar las 6 tablas restantes
  UPDATE public.prospectos SET contacto_convertido_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_prospectos);

  UPDATE public.oportunidades SET contacto_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_oportunidades);

  UPDATE public.cotizaciones_inmobiliarias SET contacto_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_cotizaciones);

  UPDATE public.actividades SET contacto_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_actividades);

  UPDATE public.conversaciones SET contacto_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_conversaciones);

  UPDATE public.reuniones_google_meet SET contacto_id = p_contacto_principal_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id AND id = ANY(v_ids_reuniones);

  -- Registrar qué campos estaban NULL en el principal y se rellenaron desde el secundario
  v_campos_rellenados := pg_catalog.jsonb_build_object(
    'apellidos', (v_c_principal.apellidos IS NULL AND v_c_secundario.apellidos IS NOT NULL),
    'correo_principal', (v_c_principal.correo_principal IS NULL AND v_c_secundario.correo_principal IS NOT NULL),
    'telefono_principal', (v_c_principal.telefono_principal IS NULL AND v_c_secundario.telefono_principal IS NOT NULL),
    'empresa_id', (v_c_principal.empresa_id IS NULL AND v_c_secundario.empresa_id IS NOT NULL),
    'cargo', (v_c_principal.cargo IS NULL AND v_c_secundario.cargo IS NOT NULL)
  );

  UPDATE public.contactos
  SET apellidos = COALESCE(v_c_principal.apellidos, v_c_secundario.apellidos),
      correo_principal = COALESCE(v_c_principal.correo_principal, v_c_secundario.correo_principal),
      telefono_principal = COALESCE(v_c_principal.telefono_principal, v_c_secundario.telefono_principal),
      telefono_e164 = COALESCE(v_c_principal.telefono_e164, v_c_secundario.telefono_e164),
      empresa_id = COALESCE(v_c_principal.empresa_id, v_c_secundario.empresa_id),
      cargo = COALESCE(v_c_principal.cargo, v_c_secundario.cargo),
      etiquetas = ARRAY(SELECT DISTINCT pg_catalog.unnest(v_c_principal.etiquetas || v_c_secundario.etiquetas)),
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = p_contacto_principal_id AND organizacion_id = p_organizacion_id;

  UPDATE public.contactos
  SET estado = 'archivado',
      fusionado_en_contacto_id = p_contacto_principal_id,
      fecha_fusion = pg_catalog.clock_timestamp(),
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = p_contacto_secundario_id AND organizacion_id = p_organizacion_id;

  v_mapa_reasignados := pg_catalog.jsonb_build_object(
    'prospectos', v_ids_prospectos,
    'canales_movidos', v_ids_canales_movidos,
    'canales_archivados', v_ids_canales_archivados,
    'oportunidades', v_ids_oportunidades,
    'cotizaciones_inmobiliarias', v_ids_cotizaciones,
    'actividades', v_ids_actividades,
    'conversaciones', v_ids_conversaciones,
    'reuniones_google_meet', v_ids_reuniones
  );

  INSERT INTO public.auditoria_fusiones_contacto (
    id, organizacion_id, contacto_principal_id, contacto_secundario_id,
    usuario_autorizador_id, motivo, estrategia_resolucion,
    snapshot_principal_antes, snapshot_secundario_antes,
    campos_rellenados_desde_secundario, mapa_ids_reasignados
  ) VALUES (
    v_fusion_id, p_organizacion_id, p_contacto_principal_id, p_contacto_secundario_id,
    v_usuario_id, p_motivo, p_estrategia_resolucion,
    pg_catalog.to_jsonb(v_c_principal), pg_catalog.to_jsonb(v_c_secundario),
    v_campos_rellenados, v_mapa_reasignados
  );

  RETURN pg_catalog.jsonb_build_object(
    'exito', true,
    'fusion_id', v_fusion_id,
    'entidades_reasignadas', v_mapa_reasignados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ejecutar_fusion_autorizada_contactos(UUID, UUID, UUID, TEXT, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ejecutar_fusion_autorizada_contactos(UUID, UUID, UUID, TEXT, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.ejecutar_fusion_autorizada_contactos(UUID, UUID, UUID, TEXT, VARCHAR) TO authenticated;

-- 6.3 RPC: Reversión No Destructiva de Fusión de Contactos con Detección de Conflictos (Hallazgo 2)
CREATE OR REPLACE FUNCTION public.revertir_fusion_contacto(
  p_organizacion_id UUID,
  p_fusion_id UUID,
  p_motivo_reversion TEXT,
  p_permitir_reversion_parcial BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
  v_org_activa UUID;
  v_rol VARCHAR(50);
  v_fusion RECORD;
  v_c_principal RECORD;
  v_c_secundario RECORD;
  v_sec_snap JSONB;
  v_oportunidades_cerradas_post UUID[];
  v_oportunidades_reasignadas_tercero UUID[];
  v_cotizaciones_aceptadas_post UUID[];
  v_tiene_conflictos BOOLEAN := false;
  v_reporte JSONB;
BEGIN
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Sesión requerida.' USING ERRCODE = '28000';
  END IF;

  v_org_activa := public.obtener_organizacion_activa_usuario();
  v_rol := public.obtener_rol_jerarquico_actual(p_organizacion_id);

  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id OR v_rol NOT IN ('superadministrador', 'gerente') THEN
    RAISE EXCEPTION 'PERMISO_DENEGADO: Solo Superadministradores o Gerentes pueden revertir una fusión.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fusion
  FROM public.auditoria_fusiones_contacto
  WHERE id = p_fusion_id AND organizacion_id = p_organizacion_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FUSION_NO_ENCONTRADA: El registro de fusión no existe.' USING ERRCODE = 'P0002';
  END IF;

  IF v_fusion.revertida THEN
    RAISE EXCEPTION 'FUSION_YA_REVERTIDA: Esta fusión ya fue revertida.' USING ERRCODE = '23505';
  END IF;

  PERFORM 1 FROM public.contactos
  WHERE organizacion_id = p_organizacion_id
    AND id IN (v_fusion.contacto_principal_id, v_fusion.contacto_secundario_id)
  ORDER BY id ASC
  FOR UPDATE NOWAIT;

  SELECT * INTO v_c_principal FROM public.contactos WHERE id = v_fusion.contacto_principal_id AND organizacion_id = p_organizacion_id;
  SELECT * INTO v_c_secundario FROM public.contactos WHERE id = v_fusion.contacto_secundario_id AND organizacion_id = p_organizacion_id;

  -- Regla LIFO: si el contacto principal fue fusionado posteriormente en un tercer contacto, bloquear
  IF v_c_principal.estado = 'archivado' AND v_c_principal.fusionado_en_contacto_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLICTO_ORDEN_LIFO: El contacto principal fue fusionado posteriormente en (%). Revierta primero la fusión más reciente.',
      v_c_principal.fusionado_en_contacto_id USING ERRCODE = '23514';
  END IF;

  -- Detectar conflictos post-fusión en oportunidades y cotizaciones transferidas
  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_oportunidades_cerradas_post
  FROM public.oportunidades
  WHERE organizacion_id = p_organizacion_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'oportunidades'))::UUID))
    AND estado = 'ganada'
    AND (fecha_cierre IS NULL OR fecha_cierre >= v_fusion.fecha_fusion);

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_oportunidades_reasignadas_tercero
  FROM public.oportunidades
  WHERE organizacion_id = p_organizacion_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'oportunidades'))::UUID))
    AND contacto_id <> v_fusion.contacto_principal_id;

  SELECT COALESCE(pg_catalog.array_agg(id), '{}'::UUID[]) INTO v_cotizaciones_aceptadas_post
  FROM public.cotizaciones_inmobiliarias
  WHERE organizacion_id = p_organizacion_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'cotizaciones_inmobiliarias'))::UUID))
    AND estado = 'aceptada';

  v_tiene_conflictos := (
    pg_catalog.array_length(v_oportunidades_cerradas_post, 1) > 0
    OR pg_catalog.array_length(v_oportunidades_reasignadas_tercero, 1) > 0
    OR pg_catalog.array_length(v_cotizaciones_aceptadas_post, 1) > 0
  );

  IF v_tiene_conflictos AND NOT p_permitir_reversion_parcial THEN
    RAISE EXCEPTION 'CONFLICTO_REVERSION_DETECTADO: Existen operaciones cerradas o reasignadas después de la fusión (oportunidades_ganadas: %, reasignadas_a_tercero: %, cotizaciones_aceptadas: %). Para revertir únicamente las relaciones seguras, confirme p_permitir_reversion_parcial = true.',
      v_oportunidades_cerradas_post, v_oportunidades_reasignadas_tercero, v_cotizaciones_aceptadas_post
      USING ERRCODE = '23514';
  END IF;

  v_sec_snap := v_fusion.snapshot_secundario_antes;

  -- 1. Reactivar contacto secundario sin destruir cambios posteriores del contacto principal
  UPDATE public.contactos
  SET estado = COALESCE(v_sec_snap->>'estado', 'activo'),
      fusionado_en_contacto_id = NULL,
      fecha_fusion = NULL,
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = v_fusion.contacto_secundario_id AND organizacion_id = p_organizacion_id;

  -- 2. En el contacto principal, solo limpiar campos que se habían rellenado desde el secundario SI no fueron editados después
  UPDATE public.contactos
  SET apellidos = CASE
        WHEN COALESCE((v_fusion.campos_rellenados_desde_secundario->>'apellidos')::boolean, false)
             AND apellidos IS NOT DISTINCT FROM (v_sec_snap->>'apellidos')
        THEN NULL ELSE apellidos END,
      correo_principal = CASE
        WHEN COALESCE((v_fusion.campos_rellenados_desde_secundario->>'correo_principal')::boolean, false)
             AND correo_principal IS NOT DISTINCT FROM (v_sec_snap->>'correo_principal')
        THEN NULL ELSE correo_principal END,
      telefono_principal = CASE
        WHEN COALESCE((v_fusion.campos_rellenados_desde_secundario->>'telefono_principal')::boolean, false)
             AND telefono_principal IS NOT DISTINCT FROM (v_sec_snap->>'telefono_principal')
        THEN NULL ELSE telefono_principal END,
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = v_fusion.contacto_principal_id AND organizacion_id = p_organizacion_id;

  -- 3. Revertir únicamente las relaciones que siguen apuntando al principal y no son ventas cerradas post-fusión
  UPDATE public.prospectos
  SET contacto_convertido_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_convertido_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'prospectos'))::UUID));

  -- Devolver canales movidos y desarchivar canales que habían colisionado
  UPDATE public.canales_contacto
  SET contacto_id = v_fusion.contacto_secundario_id,
      contacto_origen_fusion_id = NULL
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND contacto_origen_fusion_id = v_fusion.contacto_secundario_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'canales_movidos'))::UUID));

  UPDATE public.canales_contacto
  SET archivado_por_fusion_id = NULL
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_secundario_id
    AND archivado_por_fusion_id = p_fusion_id;

  UPDATE public.oportunidades
  SET contacto_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'oportunidades'))::UUID))
    AND NOT (id = ANY(v_oportunidades_cerradas_post));

  UPDATE public.cotizaciones_inmobiliarias
  SET contacto_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'cotizaciones_inmobiliarias'))::UUID))
    AND NOT (id = ANY(v_cotizaciones_aceptadas_post));

  UPDATE public.actividades
  SET contacto_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'actividades'))::UUID));

  UPDATE public.conversaciones
  SET contacto_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'conversaciones'))::UUID));

  UPDATE public.reuniones_google_meet
  SET contacto_id = v_fusion.contacto_secundario_id, fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE organizacion_id = p_organizacion_id
    AND contacto_id = v_fusion.contacto_principal_id
    AND id = ANY(ARRAY(SELECT (pg_catalog.jsonb_array_elements_text(v_fusion.mapa_ids_reasignados->'reuniones_google_meet'))::UUID));

  v_reporte := pg_catalog.jsonb_build_object(
    'reversion_parcial', v_tiene_conflictos,
    'oportunidades_retenidas_por_cierre', v_oportunidades_cerradas_post,
    'oportunidades_en_tercero_no_tocadas', v_oportunidades_reasignadas_tercero,
    'cotizaciones_retenidas_por_aceptacion', v_cotizaciones_aceptadas_post
  );

  UPDATE public.auditoria_fusiones_contacto
  SET revertida = true,
      reversion_parcial = v_tiene_conflictos,
      revertida_por_id = v_usuario_id,
      motivo_reversion = p_motivo_reversion,
      reporte_reversion = v_reporte,
      fecha_reversion = pg_catalog.clock_timestamp()
  WHERE id = p_fusion_id;

  RETURN pg_catalog.jsonb_build_object(
    'exito', true,
    'fusion_revertida_id', p_fusion_id,
    'reporte_reversion', v_reporte
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revertir_fusion_contacto(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revertir_fusion_contacto(UUID, UUID, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.revertir_fusion_contacto(UUID, UUID, TEXT, BOOLEAN) TO authenticated;

-- 6.4 RPC Pública Limitada: Consulta de Cotización por Token Seguro (100% pg_catalog.sha256 — Hallazgo 4)
CREATE OR REPLACE FUNCTION public.obtener_cotizacion_publica_por_token(
  p_token_plano TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_token_hash CHAR(64);
  v_cot RECORD;
BEGIN
  IF p_token_plano IS NULL OR pg_catalog.length(pg_catalog.btrim(p_token_plano)) <> 64 OR p_token_plano !~ '^[0-9a-fA-F]{64}$' THEN
    RETURN pg_catalog.jsonb_build_object('encontrada', false, 'motivo', 'TOKEN_INVALIDO');
  END IF;

  -- Uso exclusivo de pg_catalog.sha256 nativo de PostgreSQL (cero dependencia de pgcrypto)
  v_token_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.lower(pg_catalog.btrim(p_token_plano)), 'UTF8')),
    'hex'
  );

  SELECT
    c.folio,
    c.estado,
    c.acceso_publico_activo,
    c.revocada_en,
    c.fecha_vigencia,
    c.moneda,
    c.snapshot_comercial
  INTO v_cot
  FROM public.cotizaciones_inmobiliarias AS c
  WHERE c.token_publico_hash = v_token_hash
  LIMIT 1;

  IF NOT FOUND OR NOT v_cot.acceso_publico_activo OR v_cot.revocada_en IS NOT NULL OR v_cot.estado IN ('borrador', 'pendiente_autorizacion', 'cancelada') THEN
    RETURN pg_catalog.jsonb_build_object('encontrada', false, 'motivo', 'NO_DISPONIBLE');
  END IF;

  IF v_cot.fecha_vigencia < pg_catalog.current_date THEN
    RETURN pg_catalog.jsonb_build_object(
      'encontrada', true,
      'expirada', true,
      'folio', v_cot.folio,
      'fecha_vigencia', v_cot.fecha_vigencia,
      'desarrollo', v_cot.snapshot_comercial->'desarrollo',
      'asesor', v_cot.snapshot_comercial->'asesor'
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'encontrada', true,
    'expirada', false,
    'folio', v_cot.folio,
    'fecha_vigencia', v_cot.fecha_vigencia,
    'moneda', v_cot.moneda,
    'propuesta', pg_catalog.jsonb_build_object(
      'desarrolladora', v_cot.snapshot_comercial->'desarrolladora',
      'desarrollo', v_cot.snapshot_comercial->'desarrollo',
      'cliente_nombre', v_cot.snapshot_comercial->'cliente_nombre',
      'asesor', v_cot.snapshot_comercial->'asesor',
      'unidades', v_cot.snapshot_comercial->'unidades',
      'resumen_financiero', v_cot.snapshot_comercial->'resumen_financiero',
      'calendario_enganche', v_cot.snapshot_comercial->'calendario_enganche',
      'tabla_amortizacion', v_cot.snapshot_comercial->'tabla_amortizacion',
      'documentos_disponibles', v_cot.snapshot_comercial->'documentos_disponibles'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_cotizacion_publica_por_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_cotizacion_publica_por_token(TEXT) TO anon, authenticated;

-- 6.5 RPC: Cambio Transaccional de Estado de Unidad usando Precedencia por Campo (Hallazgos 4 y 6)
CREATE OR REPLACE FUNCTION public.cambiar_estado_unidad_inventario(
  p_organizacion_id UUID,
  p_unidad_id UUID,
  p_nuevo_estado VARCHAR(30),
  p_version_esperada INTEGER,
  p_prospecto_id UUID DEFAULT NULL,
  p_oportunidad_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
  v_org_activa UUID;
  v_rol VARCHAR(50);
  v_unidad RECORD;
  v_politica RECORD;
  v_vence_en TIMESTAMPTZ := NULL;
BEGIN
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Sesión inválida.' USING ERRCODE = '28000';
  END IF;

  v_org_activa := public.obtener_organizacion_activa_usuario();
  v_rol := public.obtener_rol_jerarquico_actual(p_organizacion_id);

  IF v_org_activa IS NULL OR v_org_activa <> p_organizacion_id OR v_rol IS NULL THEN
    RAISE EXCEPTION 'ACCESO_TENANT_DENEGADO: Usuario sin membresía activa en la organización.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_unidad
  FROM public.unidades_inmobiliarias
  WHERE id = p_unidad_id AND organizacion_id = p_organizacion_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNIDAD_NO_ENCONTRADA: La unidad no existe en la organización.' USING ERRCODE = 'P0002';
  END IF;

  IF v_unidad.version_registro <> p_version_esperada THEN
    RAISE EXCEPTION 'CONFLICTO_VERSION_INVENTARIO: La unidad (%) fue modificada por otro usuario (versión actual: %).',
      v_unidad.clave_comercial, v_unidad.version_registro USING ERRCODE = '40001';
  END IF;

  -- Resolver política comercial con herencia campo por campo (Desarrollo -> Organización -> Sistema)
  SELECT * INTO v_politica
  FROM public.obtener_politica_comercial_efectiva(p_organizacion_id, v_unidad.desarrollo_id);

  IF p_nuevo_estado = 'apartado' THEN
    IF v_unidad.estado_disponibilidad <> 'disponible' THEN
      RAISE EXCEPTION 'UNIDAD_NO_DISPONIBLE: Solo se puede apartar una unidad disponible (actual: %).',
        v_unidad.estado_disponibilidad USING ERRCODE = '23514';
    END IF;
    IF v_rol = 'asesor' AND NOT v_politica.permitir_apartado_directo_asesor THEN
      RAISE EXCEPTION 'PERMISO_DENEGADO: La política comercial exige que el apartado lo realice un Coordinador o Gerente.'
        USING ERRCODE = '42501';
    END IF;
    IF p_prospecto_id IS NULL THEN
      RAISE EXCEPTION 'PROSPECTO_REQUERIDO: Debe indicar el prospecto para apartar la unidad.' USING ERRCODE = '22023';
    END IF;
    v_vence_en := pg_catalog.clock_timestamp() + pg_catalog.make_interval(hours => v_politica.horas_vigencia_apartado);

  ELSIF p_nuevo_estado = 'disponible' THEN
    IF v_unidad.estado_disponibilidad = 'vendido' AND v_rol <> 'superadministrador' THEN
      RAISE EXCEPTION 'PERMISO_DENEGADO: Solo un Superadministrador puede liberar una unidad vendida.' USING ERRCODE = '42501';
    END IF;
    IF v_unidad.estado_disponibilidad = 'bloqueado' AND v_rol NOT IN ('superadministrador', 'gerente') THEN
      RAISE EXCEPTION 'PERMISO_DENEGADO: Solo Gerencia o Superadministración pueden desbloquear unidades.' USING ERRCODE = '42501';
    END IF;
    IF v_unidad.estado_disponibilidad = 'apartado' AND v_rol = 'asesor' THEN
      IF NOT v_politica.permitir_liberacion_propia_asesor OR v_unidad.asesor_apartado_id <> v_usuario_id THEN
        RAISE EXCEPTION 'PERMISO_DENEGADO: No tiene permiso para liberar este apartado.' USING ERRCODE = '42501';
      END IF;
    END IF;

  ELSIF p_nuevo_estado = 'bloqueado' THEN
    IF v_rol NOT IN ('superadministrador', 'gerente') THEN
      RAISE EXCEPTION 'PERMISO_DENEGADO: Solo Gerencia o Superadministración pueden bloquear unidades.' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.unidades_inmobiliarias
  SET estado_disponibilidad = p_nuevo_estado,
      asesor_apartado_id = CASE WHEN p_nuevo_estado = 'apartado' THEN v_usuario_id ELSE NULL END,
      prospecto_actual_id = CASE WHEN p_nuevo_estado IN ('apartado', 'vendido') THEN COALESCE(p_prospecto_id, prospecto_actual_id) ELSE NULL END,
      oportunidad_actual_id = CASE WHEN p_nuevo_estado IN ('apartado', 'vendido') THEN COALESCE(p_oportunidad_id, oportunidad_actual_id) ELSE NULL END,
      apartado_en = CASE WHEN p_nuevo_estado = 'apartado' THEN pg_catalog.clock_timestamp() ELSE NULL END,
      apartado_vence_en = v_vence_en,
      vendido_en = CASE WHEN p_nuevo_estado = 'vendido' THEN pg_catalog.clock_timestamp() ELSE vendido_en END,
      version_registro = version_registro + 1,
      actualizado_por_id = v_usuario_id,
      fecha_actualizacion = pg_catalog.clock_timestamp()
  WHERE id = p_unidad_id AND organizacion_id = p_organizacion_id;

  INSERT INTO public.historial_disponibilidad_unidad (
    organizacion_id, unidad_id, estado_anterior, estado_nuevo,
    actor_tipo, usuario_id, prospecto_id, oportunidad_id, motivo, metadatos
  ) VALUES (
    p_organizacion_id, p_unidad_id, v_unidad.estado_disponibilidad, p_nuevo_estado,
    'usuario', v_usuario_id, p_prospecto_id, p_oportunidad_id,
    COALESCE(p_motivo, 'Cambio de estado manual a ' || p_nuevo_estado),
    pg_catalog.jsonb_build_object(
      'apartado_vence_en', v_vence_en,
      'horas_vigencia_aplicadas', v_politica.horas_vigencia_apartado,
      'version_politica_org', v_politica.version_politica_org,
      'version_politica_desarrollo', v_politica.version_politica_desarrollo
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'exito', true,
    'unidad_id', p_unidad_id,
    'estado_disponibilidad', p_nuevo_estado,
    'apartado_vence_en', v_vence_en,
    'version_registro', v_unidad.version_registro + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cambiar_estado_unidad_inventario(UUID, UUID, VARCHAR, INTEGER, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cambiar_estado_unidad_inventario(UUID, UUID, VARCHAR, INTEGER, UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_unidad_inventario(UUID, UUID, VARCHAR, INTEGER, UUID, UUID, TEXT) TO authenticated;

-- 6.6 RPCs de Liberación de Apartados Vencidos: Separación entre pg_cron (postgres/service_role) y Sesión Autenticada (Hallazgo 4)
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

      INSERT INTO public.registros_auditoria (
        organizacion_id, usuario_id, accion, entidad_tipo, entidad_id,
        valores_anteriores, valores_nuevos, metadatos
      ) VALUES (
        r_unidad.organizacion_id, NULL,
        'inventario:apartado_expirado', 'unidad_inmobiliaria', r_unidad.id,
        pg_catalog.jsonb_build_object('estado_disponibilidad', 'apartado', 'asesor_apartado_id', r_unidad.asesor_apartado_id),
        pg_catalog.jsonb_build_object('estado_disponibilidad', 'disponible'),
        pg_catalog.jsonb_build_object('actor_tipo', 'sistema_cron', 'clave_comercial', r_unidad.clave_comercial)
      );

      v_liberadas := v_liberadas + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al liberar apartado vencido %: %', r_unidad.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_liberadas;
END;
$$;

-- Exclusiva para pg_cron (postgres) y backend con CRON_SECRET (service_role): revocada para authenticated y anon
REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.liberar_apartados_vencidos(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_apartados_vencidos(UUID) TO postgres, service_role;

-- Función Just-in-Time acotada al tenant del usuario autenticado al abrir un desarrollo/plano
CREATE OR REPLACE FUNCTION public.sincronizar_apartados_vencidos_organizacion(
  p_organizacion_id UUID,
  p_desarrollo_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_org_activa UUID;
BEGIN
  v_uid := auth.uid();
  v_org_activa := public.obtener_organizacion_activa_usuario();

  IF v_uid IS NULL OR v_org_activa IS NULL OR v_org_activa <> p_organizacion_id THEN
    RAISE EXCEPTION 'ACCESO_TENANT_DENEGADO: Organización no autorizada.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.desarrollos
    WHERE id = p_desarrollo_id AND organizacion_id = p_organizacion_id
  ) THEN
    RAISE EXCEPTION 'DESARROLLO_NO_ENCONTRADO: El desarrollo no pertenece a la organización activa.' USING ERRCODE = 'P0002';
  END IF;

  RETURN public.liberar_apartados_vencidos(p_desarrollo_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_apartados_vencidos_organizacion(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sincronizar_apartados_vencidos_organizacion(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_apartados_vencidos_organizacion(UUID, UUID) TO authenticated;
