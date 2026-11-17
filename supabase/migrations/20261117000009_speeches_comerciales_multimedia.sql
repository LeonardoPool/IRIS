-- ==============================================================================
-- IRIS by WYLEN — MIGRACIÓN 009: SPEECHES COMERCIALES MULTIMEDIA
-- Secuencias ordenadas de mensajes, imágenes, planos y renders para WhatsApp
-- ==============================================================================
-- Entidades:
-- 1. speeches_comerciales (Catálogo maestro de secuencias por desarrollo)
-- 2. elementos_speech (Bloques ordenados de texto, imagen o imagen con pie de foto)
-- 3. ejecuciones_speech (Auditoría de envíos progresivos e idempotencia)
-- 4. Bucket de Storage: medios-speeches
-- Seguridad: RLS estricto multi-inquilino con public.obtener_organizacion_activa_usuario().
-- ==============================================================================

-- 1. TABLA: speeches_comerciales
CREATE TABLE IF NOT EXISTS public.speeches_comerciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  desarrollo_inmueble VARCHAR(200) NOT NULL, -- ej. "SOLHÁ - Lotes Campestres", "Torre Aura"
  activo BOOLEAN NOT NULL DEFAULT true,
  contador_envios INTEGER NOT NULL DEFAULT 0,
  creado_por_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_speeches_org ON public.speeches_comerciales(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_speeches_desarrollo ON public.speeches_comerciales(organizacion_id, desarrollo_inmueble);

DROP TRIGGER IF EXISTS disparador_speeches_fecha_actualizacion ON public.speeches_comerciales;
CREATE TRIGGER disparador_speeches_fecha_actualizacion
BEFORE UPDATE ON public.speeches_comerciales
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

-- 2. TABLA: elementos_speech
CREATE TABLE IF NOT EXISTS public.elementos_speech (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES public.speeches_comerciales(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL, -- 1, 2, 3...
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('texto', 'imagen', 'imagen_con_texto')),
  contenido_texto TEXT NULL,
  url_imagen TEXT NULL,
  nombre_archivo VARCHAR(255) NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(speech_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_elementos_speech_orden ON public.elementos_speech(speech_id, orden ASC);

-- 3. TABLA: ejecuciones_speech (Auditoría y control de reintentos)
CREATE TABLE IF NOT EXISTS public.ejecuciones_speech (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speech_id UUID NOT NULL REFERENCES public.speeches_comerciales(id) ON DELETE RESTRICT,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  prospecto_id UUID NULL REFERENCES public.prospectos(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  total_elementos INTEGER NOT NULL DEFAULT 0,
  elementos_enviados INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(30) NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado', 'fallido', 'pausado')),
  ultimo_error TEXT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  fecha_fin TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_ejecuciones_speech_conv ON public.ejecuciones_speech(conversacion_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_ejecuciones_speech_org ON public.ejecuciones_speech(organizacion_id);

-- 4. BUCKET DE SUPABASE STORAGE PARA MEDIOS DE SPEECHES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medios-speeches',
  'medios-speeches',
  true,
  20971520, -- 20 MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.speeches_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elementos_speech ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejecuciones_speech ENABLE ROW LEVEL SECURITY;

-- Políticas para speeches_comerciales
DROP POLICY IF EXISTS "speeches_comerciales_all" ON public.speeches_comerciales;
CREATE POLICY "speeches_comerciales_all" ON public.speeches_comerciales
  FOR ALL
  USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  );

-- Políticas para elementos_speech
DROP POLICY IF EXISTS "elementos_speech_all" ON public.elementos_speech;
CREATE POLICY "elementos_speech_all" ON public.elementos_speech
  FOR ALL
  USING (
    speech_id IN (
      SELECT id FROM public.speeches_comerciales
      WHERE organizacion_id = public.obtener_organizacion_activa_usuario()
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    speech_id IN (
      SELECT id FROM public.speeches_comerciales
      WHERE organizacion_id = public.obtener_organizacion_activa_usuario()
    )
    OR auth.role() = 'service_role'
  );

-- Políticas para ejecuciones_speech
DROP POLICY IF EXISTS "ejecuciones_speech_all" ON public.ejecuciones_speech;
CREATE POLICY "ejecuciones_speech_all" ON public.ejecuciones_speech
  FOR ALL
  USING (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    organizacion_id = public.obtener_organizacion_activa_usuario()
    OR auth.role() = 'service_role'
  );

-- Políticas de Storage para medios-speeches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Lectura publica de imagenes de speeches'
  ) THEN
    CREATE POLICY "Lectura publica de imagenes de speeches"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'medios-speeches');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Subida de imagenes de speeches autenticada'
  ) THEN
    CREATE POLICY "Subida de imagenes de speeches autenticada"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'medios-speeches' AND (auth.role() = 'authenticated' OR auth.role() = 'service_role'));
  END IF;
END $$;

-- ==============================================================================
-- 6. SEMILLA MAESTRA: SPEECH COMERCIAL DEL DESARROLLO "SOLHÁ"
-- ==============================================================================
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_speech_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizaciones LIMIT 1;
  SELECT id INTO v_user_id FROM public.usuarios LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- Obtener o generar UUID válido para el speech de SOLHÁ
    SELECT id INTO v_speech_id 
    FROM public.speeches_comerciales 
    WHERE desarrollo_inmueble = 'SOLHÁ - Lotes Campestres' 
    LIMIT 1;

    IF v_speech_id IS NULL THEN
      v_speech_id := gen_random_uuid();
    END IF;

    -- Insertar Speech SOLHÁ
    INSERT INTO public.speeches_comerciales (
      id, organizacion_id, nombre, descripcion, desarrollo_inmueble, activo, contador_envios, creado_por_id
    ) VALUES (
      v_speech_id,
      v_org_id,
      'Presentación Comercial SOLHÁ (Lotes Campestres)',
      'Secuencia estructurada de 10 impactos visuales y argumentales para primeros contactos interesados en terrenos y lotes de inversión.',
      'SOLHÁ - Lotes Campestres',
      true,
      12,
      v_user_id
    ) ON CONFLICT (id) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      desarrollo_inmueble = EXCLUDED.desarrollo_inmueble;

    -- Paso 1: Imagen de presentación del asesor comercial
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      1,
      'imagen_con_texto',
      '¡Hola! Un gusto saludarte. Soy Carlos Méndez, Asesor Patrimonial de INDOMO Desarrollos.',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
      '01-presentacion-asesor.jpg'
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto,
      url_imagen = EXCLUDED.url_imagen;

    -- Paso 2: Mensaje de bienvenida y presentación del desarrollo
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      2,
      'texto',
      'Te comparto la información exclusiva de nuestro desarrollo SOLHÁ, un proyecto campestre diseñado para quienes buscan certeza jurídica, plusvalía y alta rentabilidad en Yucatán.',
      NULL,
      NULL
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto;

    -- Paso 3: Imagen de ubicación con referencias geográficas y distancias
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      3,
      'imagen_con_texto',
      '📍 Ubicación estratégica: A solo 25 minutos del periférico de Mérida y con conectividad inmediata a los principales polos industriales y turísticos.',
      'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop',
      '03-mapa-ubicacion-solha.jpg'
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto,
      url_imagen = EXCLUDED.url_imagen;

    -- Paso 4: Mensaje sobre características (167 lotes, 10x35m, acceso de carretera)
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      4,
      'texto',
      'SOLHÁ está conformado por únicamente 167 lotes tipo campestre con amplias dimensiones de 10 × 35 metros (350 m² de superficie promedio) y acceso directo a pie de carretera pavimentada.',
      NULL,
      NULL
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto;

    -- Paso 5: Imagen aérea que muestra la disposición de los lotes
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      5,
      'imagen_con_texto',
      '📐 Master Plan de Lotificación: Distribución orientada Norte-Sur para optimizar vientos y privacidad entre vecinos.',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop',
      '05-masterplan-aereo.jpg'
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto,
      url_imagen = EXCLUDED.url_imagen;

    -- Paso 6: Mensaje sobre uso mixto, comercial y residencial
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      6,
      'texto',
      'Cuenta con vocación de uso mixto: puedes edificar tu quinta o casa de descanso familiar, o bien desarrollar un espacio comercial de baja densidad.',
      NULL,
      NULL
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto;

    -- Paso 7: Imagen ilustrativa del desarrollo residencial proyectado
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      7,
      'imagen_con_texto',
      '🏡 Render conceptual: Entornos arbolados que preservan más del 40% de vegetación nativa de la región.',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
      '07-render-residencial.jpg'
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto,
      url_imagen = EXCLUDED.url_imagen;

    -- Paso 8: Mensaje ventajas de ubicación y posibilidades de construcción
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      8,
      'texto',
      'Sin cuotas forzosas de mantenimiento ni plazos obligatorios de edificación. Tu lote adquiere plusvalía orgánica mes a mes con propiedad privada escriturable.',
      NULL,
      NULL
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto;

    -- Paso 9: Fotografía ilustrativa de infraestructura y acceso
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      9,
      'imagen_con_texto',
      '🛣️ Infraestructura en desarrollo: Calles amplias con material estabilizado, delimitación física y mojoneras de concreto.',
      'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?q=80&w=800&auto=format&fit=crop',
      '09-acceso-infraestructura.jpg'
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto,
      url_imagen = EXCLUDED.url_imagen;

    -- Paso 10: Mensaje de cierre y llamado a la acción
    INSERT INTO public.elementos_speech (speech_id, orden, tipo, contenido_texto, url_imagen, nombre_archivo)
    VALUES (
      v_speech_id,
      10,
      'texto',
      'Actualmente tenemos facilidades desde 20% de enganche y hasta 24 meses sin intereses con mensualidades de $3,500 MXN. ¿Te gustaría que te comparta el cotizador interactivo o coordinamos una videollamada para elegir tu lote en el plano?',
      NULL,
      NULL
    ) ON CONFLICT (speech_id, orden) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      contenido_texto = EXCLUDED.contenido_texto;

  END IF;
END $$;
