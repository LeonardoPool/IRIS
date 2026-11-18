-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 010: ESTRUCTURA ORGANIZACIONAL Y POOL DE LEADS
-- ==============================================================================
-- 1. Jerarquía Organizacional: Gerente -> Coordinador -> Asesor + Auditoría de Traspasos
-- 2. Estados Comerciales Configurables por Inmobiliaria
-- 3. Pool de Leads Centralizado y Trazabilidad por Plataforma de Captación
-- 4. Tablero de Seguimiento Kanban e Historial de Cambios de Estado
-- Seguridad: RLS estricto multi-inquilino con public.obtener_organizacion_activa_usuario()
-- ==============================================================================

-- 1. EVOLUCIÓN DE public.usuarios: ROLES JERÁRQUICOS Y RESPONSABLE DIRECTO
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rol_jerarquico VARCHAR(50) NOT NULL DEFAULT 'asesor',
  ADD COLUMN IF NOT EXISTS responsable_directo_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_usuarios_rol_jerarquico'
  ) THEN
    ALTER TABLE public.usuarios 
      ADD CONSTRAINT check_usuarios_rol_jerarquico 
      CHECK (rol_jerarquico IN ('superadministrador', 'gerente', 'coordinador', 'asesor', 'atencion_cliente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_rol_jerarquico ON public.usuarios(rol_jerarquico);
CREATE INDEX IF NOT EXISTS idx_usuarios_responsable_directo ON public.usuarios(responsable_directo_id);

-- Sincronización inicial de rol_jerarquico para superadministradores, gerentes y coordinadores
UPDATE public.usuarios
SET rol_jerarquico = 'superadministrador'
WHERE correo_electronico ILIKE '%admin@%'
   OR correo_electronico = 'admin@iris.wylen.com'
   OR id IN (
     SELECT m.usuario_id
     FROM public.membresias m
     JOIN public.roles r ON r.id = m.rol_id
     WHERE r.codigo IN ('administrador_organizacion', 'super_admin', 'admin_organizacion')
   );

UPDATE public.usuarios
SET rol_jerarquico = 'gerente'
WHERE rol_jerarquico = 'asesor'
  AND id IN (
    SELECT m.usuario_id
    FROM public.membresias m
    JOIN public.roles r ON r.id = m.rol_id
    WHERE r.codigo = 'gerente_ventas'
  );

UPDATE public.usuarios
SET rol_jerarquico = 'coordinador'
WHERE rol_jerarquico = 'asesor'
  AND id IN (
    SELECT m.usuario_id
    FROM public.membresias m
    JOIN public.roles r ON r.id = m.rol_id
    WHERE r.codigo = 'supervisor_atencion'
  );

-- 2. TABLA: auditoria_traspasos_personal
-- Registro forense inmutable de reorganizaciones de equipos y transferencias
CREATE TABLE IF NOT EXISTS public.auditoria_traspasos_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  usuario_responsable_movimiento_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  usuario_transferido_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  responsable_anterior_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  responsable_nuevo_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  tipo_movimiento VARCHAR(50) NOT NULL CHECK (tipo_movimiento IN ('traspaso_coordinador', 'traspaso_asesor')),
  motivo TEXT NULL,
  fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_traspasos_org ON public.auditoria_traspasos_personal(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_traspasos_transferido ON public.auditoria_traspasos_personal(usuario_transferido_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_traspasos_fecha ON public.auditoria_traspasos_personal(fecha_movimiento DESC);

-- 3. TABLA: estados_comerciales_lead
-- Estados dinámicos y personalizables por cada inmobiliaria (sin enums fijos)
CREATE TABLE IF NOT EXISTS public.estados_comerciales_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  descripcion TEXT NULL,
  color VARCHAR(30) NOT NULL DEFAULT '#6b7280',
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT true,
  es_predeterminado BOOLEAN NOT NULL DEFAULT false,
  es_cierre BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organizacion_id, codigo),
  UNIQUE (organizacion_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_estados_comerciales_org_orden ON public.estados_comerciales_lead(organizacion_id, orden ASC);

DROP TRIGGER IF EXISTS disparador_estados_comerciales_fecha_actualizacion ON public.estados_comerciales_lead;
CREATE TRIGGER disparador_estados_comerciales_fecha_actualizacion
BEFORE UPDATE ON public.estados_comerciales_lead
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 4. EVOLUCIÓN DE public.prospectos: ESTADO COMERCIAL DINÁMICO, PLATAFORMA Y CATEGORÍA
ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS estado_comercial_id UUID NULL REFERENCES public.estados_comerciales_lead(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plataforma_origen VARCHAR(50) NOT NULL DEFAULT 'formulario_web',
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_prospectos_estado_comercial ON public.prospectos(estado_comercial_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_plataforma ON public.prospectos(organizacion_id, plataforma_origen);

-- 5. TABLA: historial_estados_lead
-- Bitácora inmutable de movimientos en el tablero Kanban y transiciones de estado
CREATE TABLE IF NOT EXISTS public.historial_estados_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  prospecto_id UUID NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  estado_anterior_id UUID NULL REFERENCES public.estados_comerciales_lead(id) ON DELETE SET NULL,
  estado_nuevo_id UUID NOT NULL REFERENCES public.estados_comerciales_lead(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  notas TEXT NULL,
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_historial_estados_lead_prospecto ON public.historial_estados_lead(prospecto_id, fecha_cambio ASC);
CREATE INDEX IF NOT EXISTS idx_historial_estados_lead_org ON public.historial_estados_lead(organizacion_id, fecha_cambio DESC);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.auditoria_traspasos_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_comerciales_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estados_lead ENABLE ROW LEVEL SECURITY;

-- Políticas para auditoria_traspasos_personal
DROP POLICY IF EXISTS "auditoria_traspasos_all" ON public.auditoria_traspasos_personal;
CREATE POLICY "auditoria_traspasos_all" ON public.auditoria_traspasos_personal
  FOR ALL
  USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  );

-- Políticas para estados_comerciales_lead
DROP POLICY IF EXISTS "estados_comerciales_lead_all" ON public.estados_comerciales_lead;
CREATE POLICY "estados_comerciales_lead_all" ON public.estados_comerciales_lead
  FOR ALL
  USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  );

-- Políticas para historial_estados_lead
DROP POLICY IF EXISTS "historial_estados_lead_all" ON public.historial_estados_lead;
CREATE POLICY "historial_estados_lead_all" ON public.historial_estados_lead
  FOR ALL
  USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  );

-- 7. SEMILLA DE ESTADOS PREDETERMINADOS PARA CADA ORGANIZACIÓN EXISTENTE
DO $$
DECLARE
  r_org RECORD;
  v_estado_no_contesto UUID;
  v_estado_seguimiento UUID;
  v_estado_cierre UUID;
BEGIN
  FOR r_org IN SELECT id FROM public.organizaciones LOOP
    -- 1. No contestó
    INSERT INTO public.estados_comerciales_lead (
      id, organizacion_id, nombre, codigo, descripcion, color, orden, activo, es_predeterminado, es_cierre
    ) VALUES (
      gen_random_uuid(),
      r_org.id,
      'No contestó',
      'no_contesto',
      'El prospecto no ha respondido al primer contacto o llamadas iniciales.',
      '#f59e0b', -- Ámbar
      1,
      true,
      true,
      false
    )
    ON CONFLICT (organizacion_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      color = EXCLUDED.color,
      orden = EXCLUDED.orden
    RETURNING id INTO v_estado_no_contesto;

    -- 2. Seguimiento
    INSERT INTO public.estados_comerciales_lead (
      id, organizacion_id, nombre, codigo, descripcion, color, orden, activo, es_predeterminado, es_cierre
    ) VALUES (
      gen_random_uuid(),
      r_org.id,
      'Seguimiento',
      'seguimiento',
      'Contacto establecido, asesor en comunicación y envío de información comercial.',
      '#3b82f6', -- Azul
      2,
      true,
      false,
      false
    )
    ON CONFLICT (organizacion_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      color = EXCLUDED.color,
      orden = EXCLUDED.orden
    RETURNING id INTO v_estado_seguimiento;

    -- 3. Cierre
    INSERT INTO public.estados_comerciales_lead (
      id, organizacion_id, nombre, codigo, descripcion, color, orden, activo, es_predeterminado, es_cierre
    ) VALUES (
      gen_random_uuid(),
      r_org.id,
      'Cierre',
      'cierre',
      'Prospecto calificado con negociación avanzada, cita presencial o apartado.',
      '#10b981', -- Esmeralda
      3,
      true,
      false,
      true
    )
    ON CONFLICT (organizacion_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      color = EXCLUDED.color,
      orden = EXCLUDED.orden
    RETURNING id INTO v_estado_cierre;

    -- Backfill de prospectos que aún no tengan estado_comercial_id
    UPDATE public.prospectos
    SET estado_comercial_id = v_estado_no_contesto
    WHERE organizacion_id = r_org.id AND estado_comercial_id IS NULL;
  END LOOP;
END $$;
