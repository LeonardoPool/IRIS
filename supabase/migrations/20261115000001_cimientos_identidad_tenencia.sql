-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 001: CIMIENTOS, IDENTIDAD, TENENCIA Y SEGURIDAD
-- ==============================================================================
-- Lenguaje y Nomenclatura: Español, snake_case
-- Políticas: Row Level Security (RLS) mandatorio con Denegación por Defecto
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNCIÓN DE ACTUALIZACIÓN DE MARCA DE TIEMPO
CREATE OR REPLACE FUNCTION public.actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLA: organizaciones (Inquilinos / Tenants)
CREATE TABLE IF NOT EXISTS public.organizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  identificador_fiscal VARCHAR(50) NULL,
  dominio VARCHAR(255) NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'cancelado')),
  configuracion JSONB NOT NULL DEFAULT '{
    "zona_horaria": "America/Mexico_City",
    "moneda_predeterminada": "MXN",
    "sla_minutos_primera_respuesta": 10
  }'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_eliminacion TIMESTAMPTZ NULL
);

CREATE TRIGGER disparador_organizaciones_fecha_actualizacion
BEFORE UPDATE ON public.organizaciones
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 4. TABLA: usuarios (Perfiles vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255) NOT NULL,
  correo_electronico VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50) NULL,
  avatar_url TEXT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER disparador_usuarios_fecha_actualizacion
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 5. TABLA: roles
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  codigo VARCHAR(100) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  es_sistema BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organizacion_id, codigo)
);

-- 6. TABLA: permisos
CREATE TABLE IF NOT EXISTS public.permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(100) UNIQUE NOT NULL,
  modulo VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. TABLA INTERMEDIA: roles_permisos
CREATE TABLE IF NOT EXISTS public.roles_permisos (
  rol_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES public.permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

-- 8. TABLA: membresias (Relación Usuario - Organización)
CREATE TABLE IF NOT EXISTS public.membresias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  rol_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'invitado', 'suspendido')),
  es_predeterminada BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organizacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_membresias_usuario ON public.membresias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_membresias_organizacion ON public.membresias(organizacion_id);

CREATE TRIGGER disparador_membresias_fecha_actualizacion
BEFORE UPDATE ON public.membresias
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 9. TABLA: equipos
CREATE TABLE IF NOT EXISTS public.equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  lider_usuario_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  color VARCHAR(30) NULL DEFAULT '#7185A5',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organizacion_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_equipos_organizacion ON public.equipos(organizacion_id);

CREATE TRIGGER disparador_equipos_fecha_actualizacion
BEFORE UPDATE ON public.equipos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 10. TABLA: miembros_equipo
CREATE TABLE IF NOT EXISTS public.miembros_equipo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  rol_en_equipo VARCHAR(50) NOT NULL DEFAULT 'miembro' CHECK (rol_en_equipo IN ('lider', 'miembro', 'observador')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(equipo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_miembros_equipo_usuario ON public.miembros_equipo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_miembros_equipo_org ON public.miembros_equipo(organizacion_id);

-- 11. TABLA: registros_auditoria
CREATE TABLE IF NOT EXISTS public.registros_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  entidad_tipo VARCHAR(100) NOT NULL,
  entidad_id UUID NOT NULL,
  valores_anteriores JSONB NULL,
  valores_nuevos JSONB NULL,
  metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
  direccion_ip INET NULL,
  agente_usuario TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_org ON public.registros_auditoria(organizacion_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.registros_auditoria(entidad_tipo, entidad_id);

-- ==============================================================================
-- 12. FUNCIONES DE SEGURIDAD SERVER-SIDE PARA RLS
-- ==============================================================================

-- Obtiene la organización activa y verificada del usuario actual en Supabase
CREATE OR REPLACE FUNCTION public.obtener_organizacion_activa_usuario()
RETURNS UUID AS $$
  SELECT organizacion_id 
  FROM public.membresias 
  WHERE usuario_id = auth.uid() 
    AND estado = 'activo'
  ORDER BY es_predeterminada DESC, fecha_creacion ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Comprueba si el usuario autenticado posee un permiso específico en su organización activa
CREATE OR REPLACE FUNCTION public.usuario_tiene_permiso(p_permiso_codigo TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.membresias m
    JOIN public.roles_permisos rp ON rp.rol_id = m.rol_id
    JOIN public.permisos p ON p.id = rp.permiso_id
    WHERE m.usuario_id = auth.uid()
      AND m.organizacion_id = public.obtener_organizacion_activa_usuario()
      AND m.estado = 'activo'
      AND p.codigo = p_permiso_codigo
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 13. POLÍTICAS DE ROW LEVEL SECURITY (RLS) CON DENEGACIÓN POR DEFECTO
-- ==============================================================================

ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones FORCE ROW LEVEL SECURITY;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios FORCE ROW LEVEL SECURITY;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.roles_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permisos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.membresias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membresias FORCE ROW LEVEL SECURITY;

ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos FORCE ROW LEVEL SECURITY;

ALTER TABLE public.miembros_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_equipo FORCE ROW LEVEL SECURITY;

ALTER TABLE public.registros_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_auditoria FORCE ROW LEVEL SECURITY;

-- Políticas para organizaciones
CREATE POLICY "organizaciones_select_miembros" ON public.organizaciones
  FOR SELECT USING (
    id IN (SELECT organizacion_id FROM public.membresias WHERE usuario_id = auth.uid() AND estado = 'activo')
  );

CREATE POLICY "organizaciones_update_admin" ON public.organizaciones
  FOR UPDATE USING (
    id = public.obtener_organizacion_activa_usuario() 
    AND public.usuario_tiene_permiso('organizacion:administrar')
  );

-- Políticas para usuarios
CREATE POLICY "usuarios_select_propios_y_colegas" ON public.usuarios
  FOR SELECT USING (
    id = auth.uid() OR id IN (
      SELECT m2.usuario_id 
      FROM public.membresias m1
      JOIN public.membresias m2 ON m1.organizacion_id = m2.organizacion_id
      WHERE m1.usuario_id = auth.uid() AND m1.estado = 'activo' AND m2.estado = 'activo'
    )
  );

CREATE POLICY "usuarios_update_propio" ON public.usuarios
  FOR UPDATE USING (id = auth.uid());

-- Políticas para membresias
CREATE POLICY "membresias_select_colegas" ON public.membresias
  FOR SELECT USING (
    organizacion_id IN (SELECT organizacion_id FROM public.membresias WHERE usuario_id = auth.uid() AND estado = 'activo')
  );

CREATE POLICY "membresias_insert_admin" ON public.membresias
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('miembros:gestionar')
  );

CREATE POLICY "membresias_update_admin" ON public.membresias
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('miembros:gestionar')
  );

-- Políticas para roles y permisos
CREATE POLICY "roles_select_organizacion_y_sistema" ON public.roles
  FOR SELECT USING (
    organizacion_id IS NULL OR organizacion_id = public.obtener_organizacion_activa_usuario()
  );

CREATE POLICY "permisos_select_todos" ON public.permisos
  FOR SELECT USING (true);

CREATE POLICY "roles_permisos_select_todos" ON public.roles_permisos
  FOR SELECT USING (true);

-- Políticas para equipos
CREATE POLICY "equipos_select_organizacion" ON public.equipos
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "equipos_insert_admin" ON public.equipos
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('equipos:gestionar')
  );

CREATE POLICY "equipos_update_admin" ON public.equipos
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('equipos:gestionar')
  );

-- Políticas para miembros de equipo
CREATE POLICY "miembros_equipo_select_org" ON public.miembros_equipo
  FOR SELECT USING (organizacion_id = public.obtener_organizacion_activa_usuario());

CREATE POLICY "miembros_equipo_insert_admin" ON public.miembros_equipo
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('equipos:gestionar')
  );

-- Políticas para auditoría (solo lectura para usuarios autorizados, inserción por sistema/servidor)
CREATE POLICY "auditoria_select_supervisores" ON public.registros_auditoria
  FOR SELECT USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('auditoria:leer')
  );

CREATE POLICY "auditoria_insert_servidor" ON public.registros_auditoria
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
  );

-- ==============================================================================
-- 14. INSERCIÓN DE PERMISOS BASE Y ROLES DEL SISTEMA
-- ==============================================================================

INSERT INTO public.permisos (codigo, modulo, descripcion) VALUES
  ('organizacion:administrar', 'administracion', 'Modificar ajustes globales de la organización'),
  ('miembros:gestionar', 'administracion', 'Invitar, suspender o cambiar roles de miembros'),
  ('equipos:gestionar', 'administracion', 'Crear, editar o disolver equipos comerciales'),
  ('auditoria:leer', 'auditoria', 'Consultar registros de auditoría y bitácoras del sistema'),
  ('prospectos:crear', 'crm', 'Crear y registrar nuevos prospectos comerciales'),
  ('prospectos:leer', 'crm', 'Visualizar prospectos comerciales'),
  ('prospectos:editar', 'crm', 'Modificar datos y estados de prospectos'),
  ('prospectos:eliminar', 'crm', 'Archivar o eliminar prospectos comerciales'),
  ('oportunidades:gestionar', 'crm', 'Administrar el embudo de ventas y oportunidades'),
  ('conversaciones:leer', 'comunicacion', 'Visualizar conversaciones en la bandeja'),
  ('conversaciones:asignar', 'comunicacion', 'Asignar y transferir conversaciones entre agentes'),
  ('conversaciones:responder', 'comunicacion', 'Enviar mensajes a clientes en conversaciones activas'),
  ('contratos:gestionar', 'contratos', 'Crear plantillas y generar contratos de venta'),
  ('reportes:ver', 'analitica', 'Visualizar reportes comerciales y métricas de SLA')
ON CONFLICT (codigo) DO NOTHING;

-- Roles del sistema (organizacion_id IS NULL)
INSERT INTO public.roles (codigo, nombre, descripcion, es_sistema) VALUES
  ('administrador_organizacion', 'Administrador de Organización', 'Control total de la organización y sus miembros', true),
  ('gerente_ventas', 'Gerente Comercial', 'Supervisión de equipos, embudos, métricas y asignaciones', true),
  ('supervisor_atencion', 'Supervisor de Atención', 'Monitoreo de SLAs, reasignación de conversaciones y auditoría', true),
  ('agente_ventas', 'Agente Comercial', 'Atención directa de prospectos, clientes y oportunidades asignadas', true)
ON CONFLICT DO NOTHING;

-- Asignación de permisos al Administrador de Organización
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo = 'administrador_organizacion' AND r.es_sistema = true
ON CONFLICT DO NOTHING;

-- Asignación de permisos al Gerente Comercial
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p ON p.codigo IN (
  'prospectos:crear', 'prospectos:leer', 'prospectos:editar',
  'oportunidades:gestionar', 'conversaciones:leer', 'conversaciones:asignar',
  'conversaciones:responder', 'reportes:ver', 'equipos:gestionar', 'contratos:gestionar'
)
WHERE r.codigo = 'gerente_ventas' AND r.es_sistema = true
ON CONFLICT DO NOTHING;

-- Asignación de permisos al Supervisor de Atención
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p ON p.codigo IN (
  'conversaciones:leer', 'conversaciones:asignar', 'conversaciones:responder',
  'prospectos:leer', 'auditoria:leer', 'reportes:ver'
)
WHERE r.codigo = 'supervisor_atencion' AND r.es_sistema = true
ON CONFLICT DO NOTHING;

-- Asignación de permisos al Agente Comercial
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p ON p.codigo IN (
  'prospectos:crear', 'prospectos:leer', 'prospectos:editar',
  'conversaciones:leer', 'conversaciones:responder', 'oportunidades:gestionar'
)
WHERE r.codigo = 'agente_ventas' AND r.es_sistema = true
ON CONFLICT DO NOTHING;
