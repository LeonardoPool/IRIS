-- ==============================================================================
-- IRIS by WYLEN — FASE 4+: EXPEDIENTE DE ASESORES, SUPERVISIÓN Y CONTROL DE PERMISOS
-- ==============================================================================
-- Soporte para gestión de asesores, PIN de 4 dígitos, CURP, RFC, reasignación y PWA
-- ==============================================================================

-- 1. Agregar campos del expediente laboral y credencial PIN a public.usuarios
ALTER TABLE public.usuarios 
  ADD COLUMN IF NOT EXISTS nombres VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS apellidos VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS curp VARCHAR(18) NULL,
  ADD COLUMN IF NOT EXISTS rfc VARCHAR(13) NULL,
  ADD COLUMN IF NOT EXISTS fecha_ingreso DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE NULL,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipo_id UUID NULL REFERENCES public.equipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_supervisor ON public.usuarios(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_equipo ON public.usuarios(equipo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_curp ON public.usuarios(curp);
CREATE INDEX IF NOT EXISTS idx_usuarios_rfc ON public.usuarios(rfc);

-- 2. Permisos del sistema para administración de usuarios y reasignación
INSERT INTO public.permisos (codigo, modulo, descripcion) VALUES
  ('usuarios:crear', 'administracion', 'Dar de alta asesores y personal operativo'),
  ('usuarios:actualizar', 'administracion', 'Modificar expedientes y permisos de asesores'),
  ('prospectos:todos:leer', 'crm', 'Visualizar la totalidad de los prospectos de la empresa'),
  ('prospectos:todos:actualizar', 'crm', 'Reasignar y transferir casos entre asesores')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar permisos al rol administrador
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.codigo IN ('super_admin', 'admin_organizacion')
  AND p.codigo IN ('usuarios:crear', 'usuarios:actualizar', 'prospectos:todos:leer', 'prospectos:todos:actualizar')
ON CONFLICT DO NOTHING;

-- 3. TABLA: permisos_personalizados_asesor
-- Control granular por parte del Administrador para restringir/conceder accesos a cada asesor
CREATE TABLE IF NOT EXISTS public.permisos_personalizados_asesor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  puede_ver_todos_los_prospectos BOOLEAN NOT NULL DEFAULT false,
  puede_reasignar_casos BOOLEAN NOT NULL DEFAULT false, -- True para supervisores y admins
  puede_exportar_datos BOOLEAN NOT NULL DEFAULT false,
  puede_ver_analitica_global BOOLEAN NOT NULL DEFAULT false,
  puede_crear_oportunidades BOOLEAN NOT NULL DEFAULT true,
  puede_editar_contactos_ajenos BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organizacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_permisos_asesor_usuario ON public.permisos_personalizados_asesor(usuario_id);

CREATE TRIGGER disparador_permisos_asesor_fecha_actualizacion
BEFORE UPDATE ON public.permisos_personalizados_asesor
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 4. Habilitar RLS en permisos_personalizados_asesor
ALTER TABLE public.permisos_personalizados_asesor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permisos_asesor_select" ON public.permisos_personalizados_asesor
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR organizacion_id = public.obtener_organizacion_activa_usuario()
  );

CREATE POLICY "permisos_asesor_insert" ON public.permisos_personalizados_asesor
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND (public.usuario_tiene_permiso('usuarios:crear') OR public.usuario_tiene_permiso('organizacion:administrar'))
  );

CREATE POLICY "permisos_asesor_update" ON public.permisos_personalizados_asesor
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND (public.usuario_tiene_permiso('usuarios:actualizar') OR public.usuario_tiene_permiso('organizacion:administrar'))
  );

-- 5. Función de seguridad: usuario_puede_ver_prospecto
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_prospecto(p_prospecto_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_asignado_id UUID;
  v_equipo_prospecto_id UUID;
  v_usuario_equipo_id UUID;
  v_ver_todos BOOLEAN;
BEGIN
  -- 1. Si es admin de la organización, tiene acceso irrestricto
  IF public.usuario_tiene_permiso('prospectos:todos:leer') OR public.usuario_tiene_permiso('organizacion:administrar') THEN
    RETURN true;
  END IF;

  -- 2. Consultar asignación del prospecto
  SELECT agente_asignado_id, equipo_asignado_id 
  INTO v_asignado_id, v_equipo_prospecto_id
  FROM public.prospectos 
  WHERE id = p_prospecto_id;

  -- Si es el agente asignado directamente
  IF v_asignado_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- 3. Verificar si el usuario tiene permiso personalizado para ver todos
  SELECT puede_ver_todos_los_prospectos
  INTO v_ver_todos
  FROM public.permisos_personalizados_asesor
  WHERE usuario_id = auth.uid();

  IF v_ver_todos = true THEN
    RETURN true;
  END IF;

  -- 4. Si el usuario es supervisor/líder del equipo al que pertenece el prospecto
  SELECT equipo_id INTO v_usuario_equipo_id FROM public.usuarios WHERE id = auth.uid();
  IF EXISTS (
    SELECT 1 FROM public.equipos 
    WHERE id = v_equipo_prospecto_id 
      AND lider_usuario_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
