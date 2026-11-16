-- ==============================================================================
-- IRIS by WYLEN — FASE 4: INTEGRACIONES DE MARKETING Y PRODUCTIVIDAD
-- ==============================================================================
-- Meta Lead Ads, Formularios Web Institucionales y Google Calendar / Meet
-- Idioma Oficial: Español | Nomenclatura: snake_case | Multi-Tenancy RLS
-- ==============================================================================

-- 1. TABLA: integraciones_marketing
-- Configuraciones por inquilino para fuentes de atracción masiva
CREATE TABLE IF NOT EXISTS public.integraciones_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  proveedor VARCHAR(50) NOT NULL CHECK (proveedor IN ('meta_lead_ads', 'google_ads', 'formulario_externo')),
  nombre VARCHAR(150) NOT NULL,
  identificador_cuenta VARCHAR(255) NULL,
  credenciales JSONB NOT NULL DEFAULT '{}'::jsonb,
  configuracion JSONB NOT NULL DEFAULT '{
    "mapeo_campos": {},
    "origen_predeterminado_id": null,
    "agente_predeterminado_id": null,
    "equipo_predeterminado_id": null,
    "notificar_al_asignado": true
  }'::jsonb,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'inactivo', 'error')),
  ultimo_error TEXT NULL,
  ultima_sincronizacion TIMESTAMPTZ NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organizacion_id, proveedor, identificador_cuenta)
);

CREATE INDEX IF NOT EXISTS idx_integraciones_mkt_org ON public.integraciones_marketing(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_integraciones_mkt_prov ON public.integraciones_marketing(proveedor, estado);

CREATE TRIGGER disparador_integraciones_mkt_fecha_actualizacion
BEFORE UPDATE ON public.integraciones_marketing
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 2. TABLA: formularios_web
-- Formularios embebibles para sitios web institucionales con claves de API públicas
CREATE TABLE IF NOT EXISTS public.formularios_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  clave_api_publica VARCHAR(100) NOT NULL UNIQUE,
  origen_prospecto_id UUID NULL REFERENCES public.origenes_prospecto(id) ON DELETE SET NULL,
  agente_predeterminado_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  equipo_predeterminado_id UUID NULL REFERENCES public.equipos(id) ON DELETE SET NULL,
  etapa_predeterminada_id UUID NULL REFERENCES public.etapas_embudo(id) ON DELETE SET NULL,
  campos_habilitados JSONB NOT NULL DEFAULT '["nombre", "correo_electronico", "telefono", "mensaje", "presupuesto"]'::jsonb,
  permitir_dominios TEXT[] NOT NULL DEFAULT '{"*"}',
  mensaje_exito TEXT NOT NULL DEFAULT '¡Gracias por contactarnos! Un asesor se comunicará contigo a la brevedad.',
  url_redireccion TEXT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  contador_envios INTEGER NOT NULL DEFAULT 0,
  ultimo_envio TIMESTAMPTZ NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organizacion_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_formularios_web_org ON public.formularios_web(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_formularios_web_clave ON public.formularios_web(clave_api_publica);

CREATE TRIGGER disparador_formularios_web_fecha_actualizacion
BEFORE UPDATE ON public.formularios_web
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 3. TABLA: registros_captura_lead
-- Trazabilidad y auditoría forense de leads entrantes desde campañas y formularios
CREATE TABLE IF NOT EXISTS public.registros_captura_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  formulario_web_id UUID NULL REFERENCES public.formularios_web(id) ON DELETE SET NULL,
  integracion_marketing_id UUID NULL REFERENCES public.integraciones_marketing(id) ON DELETE SET NULL,
  proveedor VARCHAR(50) NOT NULL,
  prospecto_id UUID NULL REFERENCES public.prospectos(id) ON DELETE SET NULL,
  datos_crudos JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadatos_campana JSONB NOT NULL DEFAULT '{
    "utm_source": null,
    "utm_medium": null,
    "utm_campaign": null,
    "utm_content": null,
    "utm_term": null,
    "ad_id": null,
    "adset_id": null,
    "campaign_id": null,
    "form_id": null
  }'::jsonb,
  ip_origen INET NULL,
  agente_usuario TEXT NULL,
  estado_procesamiento VARCHAR(50) NOT NULL DEFAULT 'exitoso' CHECK (estado_procesamiento IN ('exitoso', 'duplicado', 'error', 'descartado_spam')),
  mensaje_error TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_capturas_lead_org ON public.registros_captura_lead(organizacion_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_capturas_lead_prospecto ON public.registros_captura_lead(prospecto_id);

-- 4. TABLA: conexiones_calendario
-- Tokens OAuth 2.0 por usuario para Google Calendar y generación de Google Meet
CREATE TABLE IF NOT EXISTS public.conexiones_calendario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  proveedor VARCHAR(50) NOT NULL DEFAULT 'google_calendar' CHECK (proveedor IN ('google_calendar', 'outlook')),
  email_calendario VARCHAR(255) NOT NULL,
  id_calendario_principal VARCHAR(255) NOT NULL DEFAULT 'primary',
  access_token TEXT NOT NULL,
  refresh_token TEXT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  alcances TEXT[] NOT NULL DEFAULT '{"https://www.googleapis.com/auth/calendar.events"}',
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'desconectado', 'error_token')),
  sincronizacion_automatica BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (usuario_id, proveedor)
);

CREATE INDEX IF NOT EXISTS idx_conexiones_cal_usuario ON public.conexiones_calendario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_cal_org ON public.conexiones_calendario(organizacion_id);

CREATE TRIGGER disparador_conexiones_cal_fecha_actualizacion
BEFORE UPDATE ON public.conexiones_calendario
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- ==============================================================================
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.integraciones_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formularios_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_captura_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexiones_calendario ENABLE ROW LEVEL SECURITY;

-- 5.1 integraciones_marketing
CREATE POLICY "integraciones_mkt_select" ON public.integraciones_marketing
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "integraciones_mkt_insert" ON public.integraciones_marketing
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "integraciones_mkt_update" ON public.integraciones_marketing
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "integraciones_mkt_delete" ON public.integraciones_marketing
  FOR DELETE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

-- 5.2 formularios_web
CREATE POLICY "formularios_web_select" ON public.formularios_web
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "formularios_web_insert" ON public.formularios_web
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "formularios_web_update" ON public.formularios_web
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "formularios_web_delete" ON public.formularios_web
  FOR DELETE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

-- 5.3 registros_captura_lead
CREATE POLICY "capturas_lead_select" ON public.registros_captura_lead
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

-- 5.4 conexiones_calendario
CREATE POLICY "conexiones_cal_select" ON public.conexiones_calendario
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR (
      organizacion_id = public.obtener_organizacion_activa_usuario()
      AND public.usuario_tiene_permiso('usuarios:leer')
    )
  );

CREATE POLICY "conexiones_cal_insert" ON public.conexiones_calendario
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "conexiones_cal_update" ON public.conexiones_calendario
  FOR UPDATE USING (usuario_id = auth.uid());

CREATE POLICY "conexiones_cal_delete" ON public.conexiones_calendario
  FOR DELETE USING (usuario_id = auth.uid());

-- ==============================================================================
-- 6. DATOS SEMILLA PARA FASE 4 (Organización Demo)
-- ==============================================================================
INSERT INTO public.formularios_web (
  id,
  organizacion_id,
  nombre,
  slug,
  descripcion,
  clave_api_publica,
  campos_habilitados,
  permitir_dominios,
  mensaje_exito,
  estado
) VALUES (
  'f1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Contacto Web Principal - Residencial Riviera',
  'contacto-residencial-riviera',
  'Formulario institucional embebido en la landing page del desarrollo Riviera',
  'iris_pub_live_riviera_9a8b7c6d5e4f3a2b1c',
  '["nombre", "correo_electronico", "telefono", "mensaje", "presupuesto"]'::jsonb,
  '{"*"}',
  '¡Gracias por tu interés en Residencial Riviera! Un asesor patrimonial te contactará.',
  'activo'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.integraciones_marketing (
  id,
  organizacion_id,
  proveedor,
  nombre,
  identificador_cuenta,
  credenciales,
  estado
) VALUES (
  'c4444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'meta_lead_ads',
  'Campañas Meta Ads - Horizonte Riviera',
  'act_102030405060708',
  '{"page_id": "100998877665544", "modo": "produccion"}'::jsonb,
  'pendiente'
) ON CONFLICT (id) DO NOTHING;
