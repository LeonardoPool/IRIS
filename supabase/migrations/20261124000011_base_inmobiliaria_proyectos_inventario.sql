-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 011: BASE INMOBILIARIA (DESARROLLADORAS, PROYECTOS E INVENTARIO)
-- ==============================================================================
-- Decisiones implementadas: IRIS-DEC-001, IRIS-DEC-002, IRIS-DEC-005, IRIS-DEC-006,
-- IRIS-DEC-008, IRIS-DEC-009, IRIS-DEC-010, IRIS-DEC-024, IRIS-DEC-031, IRIS-DEC-032.
-- ==============================================================================

-- 1. Preparar restricciones UNIQUE (id, organizacion_id) en tablas padre existentes
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

-- 2. Función canónica de rol jerárquico (Homologa usuarios.rol_jerarquico y roles.codigo)
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

-- 3. Trigger para validar que las nuevas asignaciones operativas recaigan en miembros activos
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

-- 4. Tabla: solicitudes_idempotencia (Alcance por organizacion_id + operacion + clave_idempotencia)
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

DROP POLICY IF EXISTS "solicitudes_idemp_select" ON public.solicitudes_idempotencia;
CREATE POLICY "solicitudes_idemp_select" ON public.solicitudes_idempotencia
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

-- 5. Tabla: desarrolladoras (Marcas o razones sociales promotoras dentro del tenant)
CREATE TABLE IF NOT EXISTS public.desarrolladoras (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(180) NOT NULL,
  razon_social VARCHAR(255) NULL,
  identificador_fiscal VARCHAR(50) NULL,
  logo_url TEXT NULL,
  color_marca VARCHAR(30) NOT NULL DEFAULT '#111827',
  sitio_web VARCHAR(255) NULL,
  descripcion TEXT NULL,
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

CREATE INDEX IF NOT EXISTS idx_desarrolladoras_org ON public.desarrolladoras(organizacion_id, estado);

DROP TRIGGER IF EXISTS disparador_desarrolladoras_fecha_actualizacion ON public.desarrolladoras;
CREATE TRIGGER disparador_desarrolladoras_fecha_actualizacion
BEFORE UPDATE ON public.desarrolladoras
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 6. Tabla: desarrollos (Proyectos inmobiliarios)
CREATE TABLE IF NOT EXISTS public.desarrollos (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrolladora_id UUID NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  tipo_desarrollo VARCHAR(60) NOT NULL DEFAULT 'lotes_campestres'
    CHECK (tipo_desarrollo IN ('lotes_campestres', 'lotes_residenciales', 'vertical_departamentos', 'horizontal_casas', 'uso_mixto', 'comercial_industrial')),
  descripcion TEXT NULL,
  ubicacion_texto VARCHAR(255) NULL,
  estado_provincia VARCHAR(120) NULL,
  municipio_ciudad VARCHAR(120) NULL,
  direccion TEXT NULL,
  latitud NUMERIC(10, 7) NULL,
  longitud NUMERIC(10, 7) NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  precio_desde NUMERIC(14, 2) NULL CHECK (precio_desde IS NULL OR precio_desde >= 0),
  superficie_total_hectareas NUMERIC(10, 2) NULL,
  amenidades TEXT[] NOT NULL DEFAULT '{}'::text[],
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

CREATE INDEX IF NOT EXISTS idx_desarrollos_org_estado ON public.desarrollos(organizacion_id, estado_publicacion);
CREATE INDEX IF NOT EXISTS idx_desarrollos_desarrolladora ON public.desarrollos(organizacion_id, desarrolladora_id);

DROP TRIGGER IF EXISTS disparador_desarrollos_fecha_actualizacion ON public.desarrollos;
CREATE TRIGGER disparador_desarrollos_fecha_actualizacion
BEFORE UPDATE ON public.desarrollos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 7. Tabla: politicas_comerciales (Herencia granular Desarrollo -> Organización -> Sistema)
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
  CONSTRAINT fk_politicas_desarrollo_tenant
    FOREIGN KEY (desarrollo_id, organizacion_id)
    REFERENCES public.desarrollos(id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_politicas_miembro_actualizador
    FOREIGN KEY (organizacion_id, actualizado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (actualizado_por_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_politicas_global_org_unica
  ON public.politicas_comerciales(organizacion_id)
  WHERE desarrollo_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_politicas_desarrollo_unica
  ON public.politicas_comerciales(organizacion_id, desarrollo_id)
  WHERE desarrollo_id IS NOT NULL;

-- 8. Tabla: etapas_desarrollo
CREATE TABLE IF NOT EXISTS public.etapas_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(60) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  fecha_entrega_estimada DATE NULL,
  precio_m2_base NUMERIC(14, 2) NULL CHECK (precio_m2_base IS NULL OR precio_m2_base >= 0),
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

CREATE INDEX IF NOT EXISTS idx_etapas_desarrollo_orden ON public.etapas_desarrollo(organizacion_id, desarrollo_id, orden ASC);

-- 9. Tabla: manzanas_desarrollo
CREATE TABLE IF NOT EXISTS public.manzanas_desarrollo (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(60) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
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

CREATE INDEX IF NOT EXISTS idx_manzanas_etapa_orden ON public.manzanas_desarrollo(organizacion_id, desarrollo_id, etapa_id, orden ASC);

-- 10. Tabla: unidades_inmobiliarias (Fuente única de verdad del inventario)
CREATE TABLE IF NOT EXISTS public.unidades_inmobiliarias (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NULL,
  manzana_id UUID NULL,
  clave_comercial VARCHAR(100) NOT NULL,
  numero_lote_unidad VARCHAR(60) NULL,
  identificador_plano_svg VARCHAR(120) NULL,
  tipo_unidad VARCHAR(50) NOT NULL DEFAULT 'lote'
    CHECK (tipo_unidad IN ('lote', 'departamento', 'casa', 'local_comercial', 'bodega', 'oficina')),
  superficie_m2 NUMERIC(12, 2) NOT NULL CHECK (superficie_m2 > 0),
  frente_m NUMERIC(10, 2) NULL CHECK (frente_m IS NULL OR frente_m > 0),
  fondo_m NUMERIC(10, 2) NULL CHECK (fondo_m IS NULL OR fondo_m > 0),
  orientacion VARCHAR(60) NULL,
  precio_m2 NUMERIC(14, 2) NULL CHECK (precio_m2 IS NULL OR precio_m2 >= 0),
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
  notas_inventario TEXT NULL,
  version_registro INTEGER NOT NULL DEFAULT 1,
  creado_por_id UUID NULL,
  actualizado_por_id UUID NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  UNIQUE (id, organizacion_id),
  UNIQUE (id, desarrollo_id, organizacion_id),
  UNIQUE (desarrollo_id, clave_comercial),

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

CREATE INDEX IF NOT EXISTS idx_unidades_org_etapa_manzana
  ON public.unidades_inmobiliarias(organizacion_id, desarrollo_id, etapa_id, manzana_id);

DROP TRIGGER IF EXISTS disparador_unidades_fecha_actualizacion ON public.unidades_inmobiliarias;
CREATE TRIGGER disparador_unidades_fecha_actualizacion
BEFORE UPDATE ON public.unidades_inmobiliarias
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trg_unidades_validar_asesor_apartado_activo ON public.unidades_inmobiliarias;
CREATE TRIGGER trg_unidades_validar_asesor_apartado_activo
BEFORE INSERT OR UPDATE OF asesor_apartado_id ON public.unidades_inmobiliarias
FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion_miembro_activo('asesor_apartado_id');

-- 11. Tabla: historial_disponibilidad_unidad (Bitácora auditable de cambios de estado y precios)
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

-- 12. Tablas: documentos_desarrollo, solicitudes_documento y asignaciones_asesor_desarrollo
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

CREATE TABLE IF NOT EXISTS public.solicitudes_documento (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  documento_id UUID NOT NULL,
  prospecto_id UUID NULL,
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

DROP TRIGGER IF EXISTS trg_asig_desarrollo_validar_asesor_activo ON public.asignaciones_asesor_desarrollo;
CREATE TRIGGER trg_asig_desarrollo_validar_asesor_activo
BEFORE INSERT OR UPDATE OF asesor_id ON public.asignaciones_asesor_desarrollo
FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion_miembro_activo('asesor_id');

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) ESTRICTO MULTIEMPRESA
-- ==============================================================================

ALTER TABLE public.politicas_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desarrolladoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desarrollos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_desarrollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manzanas_desarrollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_inmobiliarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_disponibilidad_unidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_desarrollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_asesor_desarrollo ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los miembros autenticados de la organización activa
DROP POLICY IF EXISTS "politicas_comerciales_select" ON public.politicas_comerciales;
CREATE POLICY "politicas_comerciales_select" ON public.politicas_comerciales
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "desarrolladoras_select" ON public.desarrolladoras;
CREATE POLICY "desarrolladoras_select" ON public.desarrolladoras
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "desarrollos_select" ON public.desarrollos;
CREATE POLICY "desarrollos_select" ON public.desarrollos
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "etapas_desarrollo_select" ON public.etapas_desarrollo;
CREATE POLICY "etapas_desarrollo_select" ON public.etapas_desarrollo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "manzanas_desarrollo_select" ON public.manzanas_desarrollo;
CREATE POLICY "manzanas_desarrollo_select" ON public.manzanas_desarrollo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "unidades_inmobiliarias_select" ON public.unidades_inmobiliarias;
CREATE POLICY "unidades_inmobiliarias_select" ON public.unidades_inmobiliarias
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "historial_disponibilidad_select" ON public.historial_disponibilidad_unidad;
CREATE POLICY "historial_disponibilidad_select" ON public.historial_disponibilidad_unidad
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "documentos_desarrollo_select" ON public.documentos_desarrollo;
CREATE POLICY "documentos_desarrollo_select" ON public.documentos_desarrollo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "solicitudes_documento_select" ON public.solicitudes_documento;
CREATE POLICY "solicitudes_documento_select" ON public.solicitudes_documento
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "asignaciones_asesor_desarrollo_select" ON public.asignaciones_asesor_desarrollo;
CREATE POLICY "asignaciones_asesor_desarrollo_select" ON public.asignaciones_asesor_desarrollo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

-- Mutación administrativa para Superadministradores y Gerentes de la organización activa
DROP POLICY IF EXISTS "desarrolladoras_mutacion_admin" ON public.desarrolladoras;
CREATE POLICY "desarrolladoras_mutacion_admin" ON public.desarrolladoras
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "desarrollos_mutacion_admin" ON public.desarrollos;
CREATE POLICY "desarrollos_mutacion_admin" ON public.desarrollos
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "etapas_mutacion_admin" ON public.etapas_desarrollo;
CREATE POLICY "etapas_mutacion_admin" ON public.etapas_desarrollo
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "manzanas_mutacion_admin" ON public.manzanas_desarrollo;
CREATE POLICY "manzanas_mutacion_admin" ON public.manzanas_desarrollo
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "unidades_mutacion_admin" ON public.unidades_inmobiliarias;
CREATE POLICY "unidades_mutacion_admin" ON public.unidades_inmobiliarias
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "documentos_mutacion_admin" ON public.documentos_desarrollo;
CREATE POLICY "documentos_mutacion_admin" ON public.documentos_desarrollo
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "asignaciones_asesor_des_mutacion_admin" ON public.asignaciones_asesor_desarrollo;
CREATE POLICY "asignaciones_asesor_des_mutacion_admin" ON public.asignaciones_asesor_desarrollo
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

-- ==============================================================================
-- 14. SEMILLA INICIAL IDEMPOTENTE: DESARROLLADORA "INDOMO" Y DESARROLLO "SOLHÁ"
-- ==============================================================================
DO $$
DECLARE
  v_org_id UUID;
  v_desarrolladora_id UUID;
  v_desarrollo_id UUID;
  v_etapa1_id UUID;
  v_manzana_a_id UUID;
  v_manzana_b_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizaciones ORDER BY fecha_creacion ASC LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- 1. Desarrolladora INDOMO Desarrollos
    INSERT INTO public.desarrolladoras (
      organizacion_id, nombre, razon_social, identificador_fiscal, color_marca, sitio_web, descripcion, estado
    ) VALUES (
      v_org_id,
      'INDOMO Desarrollos',
      'INDOMO Desarrollos Patrimoniales S.A. de C.V.',
      'IDP230510YUC',
      '#111827',
      'https://indomo.mx',
      'Desarrolladora inmobiliaria especializada en lotes campestres y residenciales de alta plusvalía en Yucatán.',
      'activo'
    )
    ON CONFLICT (organizacion_id, nombre) DO UPDATE SET
      razon_social = EXCLUDED.razon_social
    RETURNING id INTO v_desarrolladora_id;

    -- 2. Desarrollo SOLHÁ - Lotes Campestres
    INSERT INTO public.desarrollos (
      organizacion_id, desarrolladora_id, nombre, slug, tipo_desarrollo,
      descripcion, ubicacion_texto, estado_provincia, municipio_ciudad, direccion,
      latitud, longitud, moneda, precio_desde, superficie_total_hectareas,
      amenidades, estado_publicacion
    ) VALUES (
      v_org_id,
      v_desarrolladora_id,
      'SOLHÁ - Lotes Campestres',
      'solha-lotes-campestres',
      'lotes_campestres',
      'Proyecto campestre de 167 lotes con dimensiones promedio de 10 × 35 m (350 m²), orientación Norte-Sur, acceso directo a pie de carretera pavimentada y propiedad privada escriturable.',
      'A 25 min del Periférico de Mérida, Yucatán',
      'Yucatán',
      'Mérida / Conkal',
      'Carretera Estatal Mérida - Costa Esmeralda Km 18.5',
      21.0845000,
      -89.5123000,
      'MXN',
      385000.00,
      12.40,
      ARRAY['Acceso a pie de carretera', 'Áreas verdes endémicas (40%)', 'Orientación Norte-Sur', 'Certeza jurídica escriturable', 'Calles blancas compactadas'],
      'activo'
    )
    ON CONFLICT (organizacion_id, slug) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      precio_desde = EXCLUDED.precio_desde
    RETURNING id INTO v_desarrollo_id;

    -- 3. Etapa 1
    INSERT INTO public.etapas_desarrollo (
      organizacion_id, desarrollo_id, nombre, codigo, orden, fecha_entrega_estimada, precio_m2_base, estado
    ) VALUES (
      v_org_id, v_desarrollo_id, 'Etapa 1 — Lanzamiento Fundadores', 'ETAPA-1', 1, '2027-12-15', 1100.00, 'activa'
    )
    ON CONFLICT (desarrollo_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre
    RETURNING id INTO v_etapa1_id;

    -- 4. Manzanas A y B
    INSERT INTO public.manzanas_desarrollo (
      organizacion_id, desarrollo_id, etapa_id, nombre, codigo, orden
    ) VALUES (
      v_org_id, v_desarrollo_id, v_etapa1_id, 'Manzana A (Acceso Principal)', 'MZA-A', 1
    )
    ON CONFLICT (etapa_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre
    RETURNING id INTO v_manzana_a_id;

    INSERT INTO public.manzanas_desarrollo (
      organizacion_id, desarrollo_id, etapa_id, nombre, codigo, orden
    ) VALUES (
      v_org_id, v_desarrollo_id, v_etapa1_id, 'Manzana B (Parque Central)', 'MZA-B', 2
    )
    ON CONFLICT (etapa_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre
    RETURNING id INTO v_manzana_b_id;

    -- 5. Semilla de 12 lotes de inventario (Manzana A y Manzana B) vinculados con unit_id para el plano SVG
    INSERT INTO public.unidades_inmobiliarias (
      organizacion_id, desarrollo_id, etapa_id, manzana_id, clave_comercial, numero_lote_unidad,
      identificador_plano_svg, tipo_unidad, superficie_m2, frente_m, fondo_m, orientacion,
      precio_m2, precio_lista, precio_promocional, moneda, estado_disponibilidad, caracteristicas
    ) VALUES
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A01', 'A-01', 'SOL-A01', 'lote', 350.00, 10.00, 35.00, 'Norte-Sur', 1200.00, 420000.00, 399000.00, 'MXN', 'disponible', '{"esquina": true, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A02', 'A-02', 'SOL-A02', 'lote', 350.00, 10.00, 35.00, 'Norte-Sur', 1100.00, 385000.00, NULL, 'MXN', 'disponible', '{"esquina": false, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A03', 'A-03', 'SOL-A03', 'lote', 350.00, 10.00, 35.00, 'Norte-Sur', 1100.00, 385000.00, NULL, 'MXN', 'apartado', '{"esquina": false, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A04', 'A-04', 'SOL-A04', 'lote', 350.00, 10.00, 35.00, 'Norte-Sur', 1100.00, 385000.00, NULL, 'MXN', 'vendido', '{"esquina": false, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A05', 'A-05', 'SOL-A05', 'lote', 350.00, 10.00, 35.00, 'Norte-Sur', 1100.00, 385000.00, NULL, 'MXN', 'disponible', '{"esquina": false, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_a_id, 'SOL-A06', 'A-06', 'SOL-A06', 'lote', 385.00, 11.00, 35.00, 'Norte-Sur', 1200.00, 462000.00, 438900.00, 'MXN', 'disponible', '{"esquina": true, "frente_parque": false}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B01', 'B-01', 'SOL-B01', 'lote', 350.00, 10.00, 35.00, 'Sur-Norte', 1250.00, 437500.00, 415000.00, 'MXN', 'disponible', '{"esquina": true, "frente_parque": true}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B02', 'B-02', 'SOL-B02', 'lote', 350.00, 10.00, 35.00, 'Sur-Norte', 1180.00, 413000.00, NULL, 'MXN', 'disponible', '{"esquina": false, "frente_parque": true}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B03', 'B-03', 'SOL-B03', 'lote', 350.00, 10.00, 35.00, 'Sur-Norte', 1180.00, 413000.00, NULL, 'MXN', 'apartado', '{"esquina": false, "frente_parque": true}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B04', 'B-04', 'SOL-B04', 'lote', 350.00, 10.00, 35.00, 'Sur-Norte', 1180.00, 413000.00, NULL, 'MXN', 'disponible', '{"esquina": false, "frente_parque": true}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B05', 'B-05', 'SOL-B05', 'lote', 350.00, 10.00, 35.00, 'Sur-Norte', 1180.00, 413000.00, NULL, 'MXN', 'bloqueado', '{"esquina": false, "frente_parque": true}'::jsonb),
      (v_org_id, v_desarrollo_id, v_etapa1_id, v_manzana_b_id, 'SOL-B06', 'B-06', 'SOL-B06', 'lote', 400.00, 11.43, 35.00, 'Sur-Norte', 1250.00, 500000.00, 475000.00, 'MXN', 'disponible', '{"esquina": true, "frente_parque": true}'::jsonb)
    ON CONFLICT (desarrollo_id, clave_comercial) DO NOTHING;
  END IF;
END $$;
