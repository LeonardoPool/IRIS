-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN DE CORRECCIÓN: POLÍTICAS RLS EN MEMBRESÍAS
-- ==============================================================================
-- Elimina la autorreferencia recursiva en la política de SELECT sobre 'membresias'
-- ==============================================================================

-- 1. Eliminar la política con subconsulta circular recursiva
DROP POLICY IF EXISTS "membresias_select_colegas" ON public.membresias;
DROP POLICY IF EXISTS "membresias_select_propia" ON public.membresias;

-- 2. Asegurar que no se fuerza RLS a funciones SECURITY DEFINER
ALTER TABLE public.membresias NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permisos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permisos NO FORCE ROW LEVEL SECURITY;

-- 3. Crear política directa sin recursión: el usuario siempre puede consultar sus membresías
CREATE POLICY "membresias_select_propia" ON public.membresias
  FOR SELECT USING (usuario_id = auth.uid());

-- 4. Reemplazar la función de resolución con search_path explícito
CREATE OR REPLACE FUNCTION public.obtener_organizacion_activa_usuario()
RETURNS UUID AS $$
  SELECT organizacion_id 
  FROM public.membresias 
  WHERE usuario_id = auth.uid() 
    AND estado = 'activo'
  ORDER BY es_predeterminada DESC, fecha_creacion ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Crear política para ver a colegas de la misma organización mediante la función
CREATE POLICY "membresias_select_colegas" ON public.membresias
  FOR SELECT USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
  );
