-- ==============================================================================
-- IRIS by WYLEN — DATOS DE SEMILLA (SEED.SQL)
-- ==============================================================================
-- Datos de prueba para desarrollo local y validación de multi-tenancy
-- ==============================================================================

-- 1. ORGANIZACIÓN DEMO
INSERT INTO public.organizaciones (id, nombre, slug, identificador_fiscal, dominio, estado, configuracion)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Inmobiliaria Horizonte WYLEN',
  'horizonte-wylen',
  'IHW240101XYZ',
  'horizonte.wylen.io',
  'activo',
  '{
    "zona_horaria": "America/Mexico_City",
    "moneda_predeterminada": "MXN",
    "sla_minutos_primera_respuesta": 10
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. SEGUNDA ORGANIZACIÓN PARA PRUEBAS DE AISLAMIENTO MULTI-TENANT
INSERT INTO public.organizaciones (id, nombre, slug, identificador_fiscal, dominio, estado, configuracion)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Desarrollos Residenciales del Norte',
  'residenciales-norte',
  'DRN240101ABC',
  'norte.residenciales.mx',
  'activo',
  '{
    "zona_horaria": "America/Monterrey",
    "moneda_predeterminada": "MXN",
    "sla_minutos_primera_respuesta": 15
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 3. EQUIPOS EN ORGANIZACIÓN 1
INSERT INTO public.equipos (id, organizacion_id, nombre, descripcion, color)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ventas Residencial Riviera', 'Equipo dedicado a desarrollos premium en costa', '#7185A5'),
  ('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Atención Digital Inmediata', 'Equipo de respuesta rápida a prospectos de WhatsApp y Meta Ads', '#17191D')
ON CONFLICT (id) DO NOTHING;
