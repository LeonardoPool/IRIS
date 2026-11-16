-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 003: COMUNICACIONES OMNICANAL, BANDEJA Y MOTOR SLA
-- ==============================================================================
-- Entidades: canales_comunicacion, cuentas_canal, conversaciones, mensajes,
--            asignaciones_conversacion, participantes_conversacion,
--            eventos_conversacion, registros_sla, cierres_conversacion.
-- Seguridad: Row Level Security (RLS) mandatorio con Denegación por Defecto.
-- Lenguaje: Español, snake_case.
-- ==============================================================================

-- 1. TABLA: canales_comunicacion (Catálogo de Proveedores)
CREATE TABLE IF NOT EXISTS public.canales_comunicacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. TABLA: cuentas_canal (Instancias y Credenciales por Organización)
CREATE TABLE IF NOT EXISTS public.cuentas_canal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  canal_id UUID NOT NULL REFERENCES public.canales_comunicacion(id) ON DELETE RESTRICT,
  nombre_identificador VARCHAR(150) NOT NULL,
  proveedor_cuenta_id VARCHAR(255) NOT NULL, -- ej. Phone Number ID de WhatsApp
  identificador_waba VARCHAR(255) NULL,      -- WhatsApp Business Account ID
  credenciales_cifradas JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado VARCHAR(50) NOT NULL DEFAULT 'conectado' CHECK (estado IN ('conectado', 'error_autenticacion', 'desconectado')),
  fecha_conexion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organizacion_id, proveedor_cuenta_id)
);

CREATE INDEX IF NOT EXISTS idx_cuentas_canal_org ON public.cuentas_canal(organizacion_id);

CREATE OR REPLACE TRIGGER disparador_cuentas_canal_fecha_actualizacion
BEFORE UPDATE ON public.cuentas_canal
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 3. TABLA: conversaciones (Hilos Omnicanal)
CREATE TABLE IF NOT EXISTS public.conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  cuenta_canal_id UUID NOT NULL REFERENCES public.cuentas_canal(id) ON DELETE RESTRICT,
  contacto_id UUID NULL REFERENCES public.contactos(id) ON DELETE SET NULL,
  prospecto_id UUID NULL REFERENCES public.prospectos(id) ON DELETE SET NULL,
  identificador_remoto_cliente VARCHAR(255) NOT NULL, -- Número WhatsApp E.164 o User ID de Messenger
  nombre_remoto_cliente VARCHAR(255) NULL,
  agente_receptor_inicial_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  agente_asignado_actual_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'no_asignada' CHECK (estado IN ('no_asignada', 'asignada', 'pendiente', 'en_espera', 'cerrada')),
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  ultimo_mensaje_texto TEXT NULL,
  fecha_ultimo_mensaje TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  no_leidos_agente INTEGER NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_org ON public.conversaciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_agente ON public.conversaciones(agente_asignado_actual_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado ON public.conversaciones(organizacion_id, estado);
CREATE INDEX IF NOT EXISTS idx_conversaciones_prioridad ON public.conversaciones(organizacion_id, prioridad);
CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente ON public.conversaciones(cuenta_canal_id, identificador_remoto_cliente);

CREATE OR REPLACE TRIGGER disparador_conversaciones_fecha_actualizacion
BEFORE UPDATE ON public.conversaciones
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 4. TABLA: mensajes
CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  proveedor_mensaje_id VARCHAR(255) NULL, -- Identificador único externo para Idempotencia
  direccion VARCHAR(20) NOT NULL CHECK (direccion IN ('entrante', 'saliente', 'interna')),
  remitente_tipo VARCHAR(30) NOT NULL CHECK (remitente_tipo IN ('cliente', 'agente', 'sistema', 'bot')),
  remitente_usuario_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo_contenido VARCHAR(30) NOT NULL DEFAULT 'texto' CHECK (tipo_contenido IN ('texto', 'imagen', 'documento', 'audio', 'video', 'ubicacion', 'nota_interna')),
  contenido_texto TEXT NULL,
  metadatos_adjunto JSONB NULL,
  estado_entrega VARCHAR(30) NOT NULL DEFAULT 'enviado' CHECK (estado_entrega IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON public.mensajes(conversacion_id, fecha_creacion ASC);
CREATE INDEX IF NOT EXISTS idx_mensajes_proveedor_id ON public.mensajes(proveedor_mensaje_id);

-- Restricción única de Idempotencia: el mismo mensaje del proveedor no puede insertarse dos veces
CREATE UNIQUE INDEX IF NOT EXISTS uq_mensajes_idempotencia 
ON public.mensajes (conversacion_id, proveedor_mensaje_id) 
WHERE proveedor_mensaje_id IS NOT NULL;

-- 5. TABLA: asignaciones_conversacion (Auditoría Inmutable de Asignación)
CREATE TABLE IF NOT EXISTS public.asignaciones_conversacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  agente_anterior_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  agente_nuevo_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  actor_reasignacion_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  motivo TEXT NOT NULL,
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_asignaciones_conversacion ON public.asignaciones_conversacion(conversacion_id, fecha_asignacion ASC);

-- 6. TABLA: participantes_conversacion
CREATE TABLE IF NOT EXISTS public.participantes_conversacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  primer_aporte TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ultimo_aporte TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  cantidad_mensajes INTEGER NOT NULL DEFAULT 1,
  UNIQUE(conversacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_participantes_conversacion_usr ON public.participantes_conversacion(usuario_id);

-- 7. TABLA: eventos_conversacion (Bitácora Cronológica Inmutable)
CREATE TABLE IF NOT EXISTS public.eventos_conversacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
    'creacion',
    'primera_respuesta_humana',
    'asignacion',
    'reasignacion',
    'nota_interna',
    'cambio_prioridad',
    'sla_alerta',
    'sla_violado',
    'cierre',
    'reapertura'
  )),
  actor_usuario_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_evento TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_eventos_conversacion ON public.eventos_conversacion(conversacion_id, fecha_evento ASC);

-- 8. TABLA: registros_sla (Motor de Cumplimiento de Nivel de Servicio)
CREATE TABLE IF NOT EXISTS public.registros_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  tiempo_objetivo_segundos INTEGER NOT NULL DEFAULT 600, -- 10 minutos por defecto
  tiempo_transcurrido_segundos INTEGER NOT NULL DEFAULT 0,
  estado_sla VARCHAR(30) NOT NULL DEFAULT 'a_tiempo' CHECK (estado_sla IN ('a_tiempo', 'en_alerta', 'violado', 'pausado', 'cumplido')),
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_primera_respuesta TIMESTAMPTZ NULL,
  fecha_limite TIMESTAMPTZ NOT NULL,
  es_primera_respuesta_completada BOOLEAN NOT NULL DEFAULT false,
  alerta_emitida BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(conversacion_id)
);

CREATE INDEX IF NOT EXISTS idx_registros_sla_estado ON public.registros_sla(organizacion_id, estado_sla);
CREATE INDEX IF NOT EXISTS idx_registros_sla_limite ON public.registros_sla(fecha_limite);

CREATE OR REPLACE TRIGGER disparador_registros_sla_fecha_actualizacion
BEFORE UPDATE ON public.registros_sla
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 9. TABLA: cierres_conversacion
CREATE TABLE IF NOT EXISTS public.cierres_conversacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  agente_cierre_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  motivo_cierre VARCHAR(100) NOT NULL, -- ej. 'consulta_resuelta', 'prospecto_calificado', 'sin_interes', 'spam'
  resultado_comercial VARCHAR(100) NULL,
  notas TEXT NULL,
  fecha_cierre TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) MANDATORIO PARA COMUNICACIONES
-- ==============================================================================

ALTER TABLE public.canales_comunicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canales_comunicacion FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cuentas_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_canal FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.asignaciones_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_conversacion FORCE ROW LEVEL SECURITY;

ALTER TABLE public.participantes_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes_conversacion FORCE ROW LEVEL SECURITY;

ALTER TABLE public.eventos_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_conversacion FORCE ROW LEVEL SECURITY;

ALTER TABLE public.registros_sla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_sla FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cierres_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_conversacion FORCE ROW LEVEL SECURITY;

-- Políticas de Consulta y Mutación
CREATE POLICY "canales_select_todos" ON public.canales_comunicacion FOR SELECT USING (true);

CREATE POLICY "cuentas_canal_select" ON public.cuentas_canal
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "conversaciones_select" ON public.conversaciones
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "conversaciones_insert" ON public.conversaciones
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "conversaciones_update" ON public.conversaciones
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "mensajes_select" ON public.mensajes
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "mensajes_insert" ON public.mensajes
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "asignaciones_select" ON public.asignaciones_conversacion
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "asignaciones_insert" ON public.asignaciones_conversacion
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "participantes_select" ON public.participantes_conversacion
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "participantes_insert" ON public.participantes_conversacion
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "eventos_select" ON public.eventos_conversacion
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "eventos_insert" ON public.eventos_conversacion
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "registros_sla_select" ON public.registros_sla
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "registros_sla_update" ON public.registros_sla
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "cierres_select" ON public.cierres_conversacion
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());
CREATE POLICY "cierres_insert" ON public.cierres_conversacion
  FOR INSERT WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());

-- ==============================================================================
-- 11. SEMILLA DE CANALES Y CUENTA DEMO WHATSAPP
-- ==============================================================================

INSERT INTO public.canales_comunicacion (codigo, nombre, descripcion) VALUES
  ('whatsapp_cloud', 'WhatsApp Business Cloud API', 'Canal oficial de mensajería interactiva de Meta'),
  ('facebook_messenger', 'Facebook Messenger', 'Mensajería directa de páginas oficiales de Facebook'),
  ('instagram_direct', 'Instagram Direct', 'Mensajería interactiva de perfiles comerciales de Instagram')
ON CONFLICT (codigo) DO NOTHING;

-- Cuenta Demo de WhatsApp para Inmobiliaria Horizonte WYLEN
INSERT INTO public.cuentas_canal (
  id,
  organizacion_id,
  canal_id,
  nombre_identificador,
  proveedor_cuenta_id,
  identificador_waba,
  estado
) VALUES (
  'c1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM public.canales_comunicacion WHERE codigo = 'whatsapp_cloud'),
  'WhatsApp Oficial Horizonte Riviera',
  'PHONE_NUM_DEMO_12345',
  'WABA_DEMO_67890',
  'conectado'
) ON CONFLICT (organizacion_id, proveedor_cuenta_id) DO NOTHING;
