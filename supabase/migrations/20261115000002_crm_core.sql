-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 002: CRM CORE Y GESTIÓN COMERCIAL 360°
-- ==============================================================================
-- Entidades: origenes_prospecto, prospectos, empresas, contactos, canales_contacto,
--            embudos_venta, etapas_embudo, oportunidades, historial_etapas_oportunidad,
--            atribuciones_venta, actividades.
-- Seguridad: Row Level Security (RLS) mandatorio con Denegación por Defecto.
-- Lenguaje: Español, snake_case.
-- ==============================================================================

-- 1. TABLA: origenes_prospecto
CREATE TABLE IF NOT EXISTS public.origenes_prospecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organizacion_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_origenes_prospecto_org ON public.origenes_prospecto(organizacion_id);

-- 2. TABLA: prospectos (Leads)
CREATE TABLE IF NOT EXISTS public.prospectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  origen_id UUID NOT NULL REFERENCES public.origenes_prospecto(id) ON DELETE RESTRICT,
  nombre VARCHAR(255) NOT NULL,
  correo_electronico VARCHAR(255) NULL,
  telefono VARCHAR(50) NULL,
  empresa_nombre VARCHAR(255) NULL,
  desarrollo_interes VARCHAR(255) NULL,
  notas TEXT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'contactado', 'calificado', 'descalificado', 'convertido')),
  puntuacion INTEGER NOT NULL DEFAULT 0,
  agente_asignado_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  metadatos_adquisicion JSONB NOT NULL DEFAULT '{}'::jsonb,
  contacto_convertido_id UUID NULL,
  oportunidad_convertida_id UUID NULL,
  fecha_asignacion TIMESTAMPTZ NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_prospectos_org ON public.prospectos(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_agente ON public.prospectos(agente_asignado_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_estado ON public.prospectos(organizacion_id, estado);
CREATE INDEX IF NOT EXISTS idx_prospectos_telefono ON public.prospectos(organizacion_id, telefono);

CREATE OR REPLACE TRIGGER disparador_prospectos_fecha_actualizacion
BEFORE UPDATE ON public.prospectos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 3. TABLA: empresas (Cuentas Corporativas B2B)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  identificador_fiscal VARCHAR(50) NULL,
  sector VARCHAR(100) NULL,
  sitio_web VARCHAR(255) NULL,
  telefono VARCHAR(50) NULL,
  direccion TEXT NULL,
  agente_responsable_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_empresas_org ON public.empresas(organizacion_id);

CREATE OR REPLACE TRIGGER disparador_empresas_fecha_actualizacion
BEFORE UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 4. TABLA: contactos (Directorio Unificado 360°)
CREATE TABLE IF NOT EXISTS public.contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  empresa_id UUID NULL REFERENCES public.empresas(id) ON DELETE SET NULL,
  prospecto_origen_id UUID NULL REFERENCES public.prospectos(id) ON DELETE SET NULL,
  nombre VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NULL,
  correo_principal VARCHAR(255) NULL,
  telefono_principal VARCHAR(50) NULL,
  cargo VARCHAR(150) NULL,
  etiquetas TEXT[] NOT NULL DEFAULT '{}'::text[],
  notas TEXT NULL,
  agente_responsable_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'archivado')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_contactos_org ON public.contactos(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_contactos_correo ON public.contactos(organizacion_id, correo_principal);
CREATE INDEX IF NOT EXISTS idx_contactos_telefono ON public.contactos(organizacion_id, telefono_principal);

CREATE OR REPLACE TRIGGER disparador_contactos_fecha_actualizacion
BEFORE UPDATE ON public.contactos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- Agregar FK de prospecto hacia contacto_convertido_id
ALTER TABLE public.prospectos 
ADD CONSTRAINT fk_prospectos_contacto_convertido 
FOREIGN KEY (contacto_convertido_id) REFERENCES public.contactos(id) ON DELETE SET NULL;

-- 5. TABLA: canales_contacto (Vías multicanal por contacto)
CREATE TABLE IF NOT EXISTS public.canales_contacto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  contacto_id UUID NOT NULL REFERENCES public.contactos(id) ON DELETE CASCADE,
  tipo_canal VARCHAR(50) NOT NULL CHECK (tipo_canal IN ('telefono', 'correo', 'whatsapp', 'instagram', 'facebook')),
  valor VARCHAR(255) NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  verificado BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_canales_contacto_org ON public.canales_contacto(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_canales_contacto_valor ON public.canales_contacto(valor);

-- 6. TABLA: embudos_venta (Pipelines de Venta)
CREATE TABLE IF NOT EXISTS public.embudos_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  es_predeterminado BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_embudos_venta_org ON public.embudos_venta(organizacion_id);

CREATE OR REPLACE TRIGGER disparador_embudos_venta_fecha_actualizacion
BEFORE UPDATE ON public.embudos_venta
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 7. TABLA: etapas_embudo
CREATE TABLE IF NOT EXISTS public.etapas_embudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  embudo_id UUID NOT NULL REFERENCES public.embudos_venta(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 1,
  probabilidad_cierre INTEGER NOT NULL DEFAULT 10 CHECK (probabilidad_cierre BETWEEN 0 AND 100),
  color VARCHAR(30) NULL DEFAULT '#7185A5',
  es_etapa_ganada BOOLEAN NOT NULL DEFAULT false,
  es_etapa_perdida BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(embudo_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_etapas_embudo_embudo ON public.etapas_embudo(embudo_id, orden ASC);

-- 8. TABLA: oportunidades (Deals / Negociaciones)
CREATE TABLE IF NOT EXISTS public.oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  embudo_id UUID NOT NULL REFERENCES public.embudos_venta(id) ON DELETE RESTRICT,
  etapa_id UUID NOT NULL REFERENCES public.etapas_embudo(id) ON DELETE RESTRICT,
  contacto_id UUID NOT NULL REFERENCES public.contactos(id) ON DELETE RESTRICT,
  empresa_id UUID NULL REFERENCES public.empresas(id) ON DELETE SET NULL,
  agente_asignado_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  valor_estimado NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  probabilidad_cierre INTEGER NOT NULL DEFAULT 10,
  fecha_cierre_esperada DATE NULL,
  desarrollo_propiedad VARCHAR(255) NULL,
  lote_unidad VARCHAR(100) NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'ganada', 'perdida', 'cancelada')),
  motivo_perdida TEXT NULL,
  fecha_cierre TIMESTAMPTZ NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_org ON public.oportunidades(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON public.oportunidades(etapa_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_contacto ON public.oportunidades(contacto_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_agente ON public.oportunidades(agente_asignado_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estado ON public.oportunidades(organizacion_id, estado);

CREATE OR REPLACE TRIGGER disparador_oportunidades_fecha_actualizacion
BEFORE UPDATE ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- Vincular FK de prospecto hacia oportunidad_convertida_id
ALTER TABLE public.prospectos 
ADD CONSTRAINT fk_prospectos_oportunidad_convertida 
FOREIGN KEY (oportunidad_convertida_id) REFERENCES public.oportunidades(id) ON DELETE SET NULL;

-- 9. TABLA: historial_etapas_oportunidad (Inmutable)
CREATE TABLE IF NOT EXISTS public.historial_etapas_oportunidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  etapa_anterior_id UUID NULL REFERENCES public.etapas_embudo(id) ON DELETE SET NULL,
  etapa_nueva_id UUID NOT NULL REFERENCES public.etapas_embudo(id) ON DELETE RESTRICT,
  usuario_cambio_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  tiempo_en_etapa_segundos INTEGER NULL,
  notas TEXT NULL,
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_historial_etapas_oportunidad ON public.historial_etapas_oportunidad(oportunidad_id, fecha_cambio ASC);

-- 10. TABLA: atribuciones_venta (Auditoría de Cierre Comercial)
CREATE TABLE IF NOT EXISTS public.atribuciones_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  agente_cierre_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  agente_receptor_inicial_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  monto_final NUMERIC(14, 2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  fecha_cierre TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  notas TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(oportunidad_id)
);

CREATE INDEX IF NOT EXISTS idx_atribuciones_venta_agente ON public.atribuciones_venta(agente_cierre_id);

-- 11. TABLA: actividades (Tareas, llamadas, citas y seguimientos)
CREATE TABLE IF NOT EXISTS public.actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_responsable_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  prospecto_id UUID NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  contacto_id UUID NULL REFERENCES public.contactos(id) ON DELETE CASCADE,
  oportunidad_id UUID NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  tipo_actividad VARCHAR(50) NOT NULL CHECK (tipo_actividad IN ('llamada', 'reunion', 'tarea', 'correo', 'visita', 'whatsapp')),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
  fecha_vencimiento TIMESTAMPTZ NOT NULL,
  fecha_completada TIMESTAMPTZ NULL,
  resultado_notas TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_actividades_org_usuario ON public.actividades(organizacion_id, usuario_responsable_id);
CREATE INDEX IF NOT EXISTS idx_actividades_vencimiento ON public.actividades(organizacion_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_actividades_prospecto ON public.actividades(prospecto_id);
CREATE INDEX IF NOT EXISTS idx_actividades_oportunidad ON public.actividades(oportunidad_id);

CREATE OR REPLACE TRIGGER disparador_actividades_fecha_actualizacion
BEFORE UPDATE ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) MANDATORIO PARA ENTIDADES CRM
-- ==============================================================================

ALTER TABLE public.origenes_prospecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origenes_prospecto FORCE ROW LEVEL SECURITY;

ALTER TABLE public.prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospectos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.canales_contacto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canales_contacto FORCE ROW LEVEL SECURITY;

ALTER TABLE public.embudos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embudos_venta FORCE ROW LEVEL SECURITY;

ALTER TABLE public.etapas_embudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_embudo FORCE ROW LEVEL SECURITY;

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades FORCE ROW LEVEL SECURITY;

ALTER TABLE public.historial_etapas_oportunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_etapas_oportunidad FORCE ROW LEVEL SECURITY;

ALTER TABLE public.atribuciones_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atribuciones_venta FORCE ROW LEVEL SECURITY;

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades FORCE ROW LEVEL SECURITY;

-- Políticas de aislamiento por organización (Inquilino)
CREATE POLICY "origenes_select" ON public.origenes_prospecto
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "prospectos_select" ON public.prospectos
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "prospectos_insert" ON public.prospectos
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "prospectos_update" ON public.prospectos
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "empresas_select" ON public.empresas
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "empresas_insert" ON public.empresas
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "empresas_update" ON public.empresas
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "contactos_select" ON public.contactos
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "contactos_insert" ON public.contactos
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "contactos_update" ON public.contactos
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "canales_contacto_select" ON public.canales_contacto
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "canales_contacto_insert" ON public.canales_contacto
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "embudos_venta_select" ON public.embudos_venta
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "etapas_embudo_select" ON public.etapas_embudo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "oportunidades_select" ON public.oportunidades
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "oportunidades_insert" ON public.oportunidades
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "oportunidades_update" ON public.oportunidades
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "historial_etapas_select" ON public.historial_etapas_oportunidad
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "historial_etapas_insert" ON public.historial_etapas_oportunidad
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "atribuciones_select" ON public.atribuciones_venta
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "atribuciones_insert" ON public.atribuciones_venta
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "actividades_select" ON public.actividades
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "actividades_insert" ON public.actividades
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "actividades_update" ON public.actividades
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

-- ==============================================================================
-- 13. SEMILLA DE ORÍGENES Y EMBUDO POR DEFECTO
-- ==============================================================================

-- Orígenes para Inmobiliaria Horizonte WYLEN
INSERT INTO public.origenes_prospecto (organizacion_id, nombre, codigo, descripcion)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Meta Lead Ads (Facebook/Instagram)', 'meta_ads', 'Campañas digitales pagadas en Meta'),
  ('11111111-1111-1111-1111-111111111111', 'WhatsApp Business Directo', 'whatsapp_directo', 'Prospectos que inician conversación directa'),
  ('11111111-1111-1111-1111-111111111111', 'Sitio Web Oficial', 'sitio_web', 'Formularios de contacto institucional'),
  ('11111111-1111-1111-1111-111111111111', 'Referido / Recomendación', 'referido', 'Clientes presentados por agentes o terceros')
ON CONFLICT (organizacion_id, codigo) DO NOTHING;

-- Embudo de Venta Residencial
INSERT INTO public.embudos_venta (id, organizacion_id, nombre, descripcion, es_predeterminado)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Embudo Comercial Inmobiliario',
  'Ciclo de venta para desarrollos residenciales y lotes premium',
  true
) ON CONFLICT (id) DO NOTHING;

-- Etapas del Embudo
INSERT INTO public.etapas_embudo (id, organizacion_id, embudo_id, nombre, orden, probabilidad_cierre, color, es_etapa_ganada, es_etapa_perdida)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Contacto Inicial', 1, 10, '#7185A5', false, false),
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Cita / Demostración', 2, 30, '#5A6E8C', false, false),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Propuesta y Cotización', 3, 50, '#B45309', false, false),
  ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Apartado / Promesa', 4, 80, '#2563EB', false, false),
  ('a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Venta Ganada (Cerrada)', 5, 100, '#15803D', true, false),
  ('a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Venta Perdida', 6, 0, '#B91C1C', false, true)
ON CONFLICT (id) DO NOTHING;
