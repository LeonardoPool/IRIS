-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN: RLS PARA CONFIGURACIÓN DE CUENTAS DE CANAL Y ESTADOS DE MENSAJES
-- ==============================================================================
-- Justificación:
--   1. cuentas_canal solo tenía política SELECT; se habilitan INSERT y UPDATE
--      para administradores de organización (configuracion:administrar) sin
--      permitir cruces entre organizaciones.
--   2. mensajes solo tenía SELECT e INSERT; se habilita UPDATE dentro de la
--      organización para reflejar estados de entrega y lecturas.
-- ==============================================================================

CREATE POLICY "cuentas_canal_insert" ON public.cuentas_canal
  FOR INSERT WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "cuentas_canal_update" ON public.cuentas_canal
  FOR UPDATE USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    AND public.usuario_tiene_permiso('configuracion:administrar')
  );

CREATE POLICY "mensajes_update" ON public.mensajes
  FOR UPDATE USING (organizacion_id = public.obtener_organizacion_activa_usuario())
  WITH CHECK (organizacion_id = public.obtener_organizacion_activa_usuario());
