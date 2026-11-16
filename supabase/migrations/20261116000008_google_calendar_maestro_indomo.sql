-- ==============================================================================
-- IRIS by WYLEN — FASE 4: INTEGRACIÓN CENTRALIZADA GOOGLE CALENDAR & MEET (INDOMO)
-- ==============================================================================
-- Cuenta Maestra: indomodesarrollos@gmail.com para todos los asesores
-- Idioma: Español | Nomenclatura: snake_case | Multi-Tenancy RLS
-- ==============================================================================

-- 1. ADAPTAR TABLA: conexiones_calendario PARA CUENTA MAESTRA ORGANIZACIONAL
-- Permitir usuario_id NULL para representar la conexión central de INDOMO
ALTER TABLE public.conexiones_calendario 
  ALTER COLUMN usuario_id DROP NOT NULL;

-- Agregar columna para identificar la cuenta maestra de la organización
ALTER TABLE public.conexiones_calendario
  ADD COLUMN IF NOT EXISTS es_cuenta_maestra BOOLEAN NOT NULL DEFAULT false;

-- Agregar columna para almacenar el ID del calendario secundario si aplica
ALTER TABLE public.conexiones_calendario
  ADD COLUMN IF NOT EXISTS nombre_cuenta VARCHAR(255) NULL;

-- Eliminar la restricción previa UNIQUE (usuario_id, proveedor) si impedía nulos duplicados
ALTER TABLE public.conexiones_calendario
  DROP CONSTRAINT IF EXISTS conexiones_calendario_usuario_id_proveedor_key;

-- Nueva restricción única condicional: Una sola cuenta maestra por proveedor por organización
CREATE UNIQUE INDEX IF NOT EXISTS uq_conexiones_cal_maestra_org
  ON public.conexiones_calendario (organizacion_id, proveedor)
  WHERE (es_cuenta_maestra = true);

-- Restricción única para conexiones individuales por usuario (si existieran)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conexiones_cal_usuario_prov
  ON public.conexiones_calendario (usuario_id, proveedor)
  WHERE (usuario_id IS NOT NULL AND es_cuenta_maestra = false);

-- 2. TABLA: reuniones_google_meet
-- Almacena todas las reuniones agendadas por asesores con Google Meet centralizado
CREATE TABLE IF NOT EXISTS public.reuniones_google_meet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  asesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  prospecto_id UUID NULL REFERENCES public.prospectos(id) ON DELETE SET NULL,
  contacto_id UUID NULL REFERENCES public.contactos(id) ON DELETE SET NULL,
  actividad_id UUID NULL REFERENCES public.actividades(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  zona_horaria VARCHAR(100) NOT NULL DEFAULT 'America/Mexico_City',
  google_event_id VARCHAR(255) NOT NULL,
  google_calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
  google_meet_link TEXT NULL,
  google_html_link TEXT NULL,
  email_cuenta_maestra VARCHAR(255) NOT NULL DEFAULT 'indomodesarrollos@gmail.com',
  asistentes JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR(50) NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en_curso', 'completada', 'cancelada')),
  notas_resultado TEXT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Índices de alto rendimiento para búsquedas y consultas del CRM
CREATE INDEX IF NOT EXISTS idx_reuniones_meet_org_inicio 
  ON public.reuniones_google_meet (organizacion_id, fecha_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_reuniones_meet_asesor 
  ON public.reuniones_google_meet (asesor_id);

CREATE INDEX IF NOT EXISTS idx_reuniones_meet_prospecto 
  ON public.reuniones_google_meet (prospecto_id);

CREATE INDEX IF NOT EXISTS idx_reuniones_meet_event_id 
  ON public.reuniones_google_meet (google_event_id);

-- Disparador de fecha de actualización
CREATE OR REPLACE TRIGGER disparador_reuniones_meet_fecha_actualizacion
BEFORE UPDATE ON public.reuniones_google_meet
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reuniones_google_meet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuniones_google_meet FORCE ROW LEVEL SECURITY;

-- 3.1 Consulta de reuniones: Miembros de la organización pueden consultar reuniones
CREATE POLICY "reuniones_meet_select" ON public.reuniones_google_meet
  FOR SELECT USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
  );

-- 3.2 Inserción de reuniones: Asesores y administradores de la organización
CREATE POLICY "reuniones_meet_insert" ON public.reuniones_google_meet
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND asesor_id = auth.uid()
  );

-- 3.3 Actualización de reuniones: El asesor creador o administradores
CREATE POLICY "reuniones_meet_update" ON public.reuniones_google_meet
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND (asesor_id = auth.uid() OR public.usuario_tiene_permiso('organizacion:administrar'))
  );

-- 3.4 Eliminación de reuniones: Administradores de la organización
CREATE POLICY "reuniones_meet_delete" ON public.reuniones_google_meet
  FOR DELETE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND (asesor_id = auth.uid() OR public.usuario_tiene_permiso('organizacion:administrar'))
  );

-- 3.5 Actualizar RLS en conexiones_calendario para permitir lectura de la cuenta maestra
DROP POLICY IF EXISTS "conexiones_cal_select" ON public.conexiones_calendario;
CREATE POLICY "conexiones_cal_select" ON public.conexiones_calendario
  FOR SELECT USING (
    -- El usuario puede ver su propia conexión O la cuenta maestra de su organización
    (usuario_id = auth.uid())
    OR (
      es_cuenta_maestra = true
      AND organizacion_id = public.obtener_organizacion_activa_usuario()
    )
  );
