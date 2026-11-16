-- ==============================================================================
-- IRIS by WYLEN — FASE 5: GEOCERCA, SLA CONFIGURABLE Y ACCESO POR CURP + PIN
-- ==============================================================================

-- 1. Agregar columna exento_geocerca a public.permisos_personalizados_asesor
ALTER TABLE public.permisos_personalizados_asesor
  ADD COLUMN IF NOT EXISTS exento_geocerca BOOLEAN NOT NULL DEFAULT false;

-- 2. Actualizar configuración de organizaciones con campos de geocerca y SLA
ALTER TABLE public.organizaciones
  ADD COLUMN IF NOT EXISTS geocerca_activa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geocerca_nombre_lugar VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS geocerca_latitud NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS geocerca_longitud NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS geocerca_radio_metros INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS sla_minutos_primera_respuesta INTEGER NOT NULL DEFAULT 10;
