-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 012: PLANOS INTERACTIVOS SVG Y VINCULACIÓN DE UNIDADES
-- ==============================================================================
-- Decisiones implementadas: IRIS-DEC-006, IRIS-DEC-008, IRIS-DEC-009, IRIS-DEC-013, IRIS-DEC-031.
-- El inventario de IRIS (unidades_inmobiliarias) es la única fuente de verdad de disponibilidad.
-- ==============================================================================

-- 1. Tabla: planos_interactivos (Versionamiento de planos SVG sanitizados)
CREATE TABLE IF NOT EXISTS public.planos_interactivos (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  desarrollo_id UUID NOT NULL,
  etapa_id UUID NULL,
  manzana_id UUID NULL,
  nombre VARCHAR(180) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  contenido_svg TEXT NOT NULL,
  viewbox VARCHAR(120) NULL DEFAULT '0 0 900 520',
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
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
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
  CONSTRAINT fk_planos_manzana_desarrollo_tenant
    FOREIGN KEY (manzana_id, desarrollo_id, organizacion_id)
    REFERENCES public.manzanas_desarrollo(id, desarrollo_id, organizacion_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (manzana_id),
  CONSTRAINT fk_planos_creador_miembro
    FOREIGN KEY (organizacion_id, creado_por_id)
    REFERENCES public.membresias(organizacion_id, usuario_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL (creado_por_id)
);

CREATE INDEX IF NOT EXISTS idx_planos_org_desarrollo_activo
  ON public.planos_interactivos(organizacion_id, desarrollo_id, es_activo, version DESC);

DROP TRIGGER IF EXISTS disparador_planos_fecha_actualizacion ON public.planos_interactivos;
CREATE TRIGGER disparador_planos_fecha_actualizacion
BEFORE UPDATE ON public.planos_interactivos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 2. Tabla: vinculos_plano_unidad (Asociación svg_element_id <-> unidad_id)
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

CREATE INDEX IF NOT EXISTS idx_vinculos_plano_org ON public.vinculos_plano_unidad(organizacion_id, plano_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.planos_interactivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculos_plano_unidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_interactivos_select" ON public.planos_interactivos;
CREATE POLICY "planos_interactivos_select" ON public.planos_interactivos
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "planos_interactivos_mutacion_admin" ON public.planos_interactivos;
CREATE POLICY "planos_interactivos_mutacion_admin" ON public.planos_interactivos
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

DROP POLICY IF EXISTS "vinculos_plano_unidad_select" ON public.vinculos_plano_unidad;
CREATE POLICY "vinculos_plano_unidad_select" ON public.vinculos_plano_unidad
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

DROP POLICY IF EXISTS "vinculos_plano_unidad_mutacion_admin" ON public.vinculos_plano_unidad;
CREATE POLICY "vinculos_plano_unidad_mutacion_admin" ON public.vinculos_plano_unidad
  FOR ALL USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.obtener_rol_jerarquico_actual(organizacion_id) IN ('superadministrador', 'gerente')
  );

-- 4. Semilla de Plano Maestro Interactivo SVG para "SOLHÁ - Lotes Campestres" y sus 12 vínculos
DO $$
DECLARE
  v_org_id UUID;
  v_desarrollo_id UUID;
  v_etapa1_id UUID;
  v_plano_id UUID;
  r_unidad RECORD;
BEGIN
  SELECT organizacion_id, id INTO v_org_id, v_desarrollo_id
  FROM public.desarrollos
  WHERE slug = 'solha-lotes-campestres'
  LIMIT 1;

  IF v_desarrollo_id IS NOT NULL THEN
    SELECT id INTO v_etapa1_id
    FROM public.etapas_desarrollo
    WHERE desarrollo_id = v_desarrollo_id AND codigo = 'ETAPA-1'
    LIMIT 1;

    SELECT id INTO v_plano_id
    FROM public.planos_interactivos
    WHERE desarrollo_id = v_desarrollo_id AND version = 1
    LIMIT 1;

    IF v_plano_id IS NULL THEN
      INSERT INTO public.planos_interactivos (
        organizacion_id, desarrollo_id, etapa_id, nombre, version, viewbox, contenido_svg, es_activo
      ) VALUES (
        v_org_id,
        v_desarrollo_id,
        v_etapa1_id,
        'Master Plan Lotificación SOLHÁ — Etapa 1 (v1)',
        1,
        '0 0 900 520',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
          <rect x="0" y="0" width="900" height="520" fill="#f8fafc" rx="16"/>
          <rect x="30" y="30" width="840" height="460" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" rx="12"/>
          <!-- Vialidades y Parque Central -->
          <rect x="60" y="225" width="780" height="70" fill="#e2e8f0" rx="8"/>
          <rect x="240" y="242" width="420" height="36" fill="#dcfce7" stroke="#86efac" stroke-width="1.5" rx="18"/>
          <!-- Manzana A (Norte) -->
          <g id="GRUPO-MZA-A">
            <rect id="SOL-A01" data-unit-id="SOL-A01" x="75" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-A02" data-unit-id="SOL-A02" x="200" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-A03" data-unit-id="SOL-A03" x="325" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-A04" data-unit-id="SOL-A04" x="450" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-A05" data-unit-id="SOL-A05" x="575" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-A06" data-unit-id="SOL-A06" x="700" y="65" width="125" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
          </g>
          <!-- Manzana B (Sur) -->
          <g id="GRUPO-MZA-B">
            <rect id="SOL-B01" data-unit-id="SOL-B01" x="75" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-B02" data-unit-id="SOL-B02" x="200" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-B03" data-unit-id="SOL-B03" x="325" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-B04" data-unit-id="SOL-B04" x="450" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-B05" data-unit-id="SOL-B05" x="575" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
            <rect id="SOL-B06" data-unit-id="SOL-B06" x="700" y="315" width="125" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
          </g>
        </svg>',
        true
      )
      RETURNING id INTO v_plano_id;
    END IF;

    -- Vincular cada lote de SOLHÁ con su figura SVG
    FOR r_unidad IN
      SELECT id, identificador_plano_svg
      FROM public.unidades_inmobiliarias
      WHERE desarrollo_id = v_desarrollo_id
        AND identificador_plano_svg IS NOT NULL
    LOOP
      INSERT INTO public.vinculos_plano_unidad (
        organizacion_id, desarrollo_id, plano_id, svg_element_id, unidad_id
      ) VALUES (
        v_org_id, v_desarrollo_id, v_plano_id, r_unidad.identificador_plano_svg, r_unidad.id
      )
      ON CONFLICT (plano_id, svg_element_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
