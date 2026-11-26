# IRIS by WYLEN — MODELO DE BASE DE DATOS
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Propuesta de Arquitectura y Especificación de Entidades (Fase 0)  
**Motor de Persistencia:** PostgreSQL 15+ / Supabase  

---

## 1. DISTINCIÓN METODOLÓGICA OBLIGATORIA
- **Funcionalidad Existente Verificada:** Ninguna tabla ni migración existe actualmente en el repositorio. No hay esquema SQL aplicado.
- **Arquitectura Propuesta:** El modelo expuesto a continuación representa el diseño canónico de entidades para soportar multi-tenancy, auditoría inmutable, omnicanalidad, SLA y trazabilidad comercial.
- **Supuestos:** Se asume el uso de UUID v4 como identificadores primarios y extensiones PostgreSQL estándar (`pgcrypto`, `uuid-ossp`).
- **Dependencias Externas:** Supabase Auth (esquema `auth.users`), Supabase Storage.
- **Decisiones Pendientes de Aprobación:** Estrategia de particionamiento para tablas de alto volumen (`mensajes`, `eventos_conversacion`, `registros_auditoria`).

---

## 2. CONVENCIONES DE NOMENCLATURA
En cumplimiento estricto del Addendum Lingüístico de IRIS:
- Todas las tablas, columnas, restricciones, índices y funciones están en español y `snake_case`.
- Claves primarias: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- Claves foráneas: `<entidad_singular>_id UUID NOT NULL REFERENCES <entidades_plural>(id)`.
- Marcas de tiempo: `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion` (con zona horaria `TIMESTAMPTZ`).
- Aislamiento multi-tenant: Columna `organizacion_id` en todas las entidades de negocio.

---

## 3. DOMINIO: IDENTIDAD, TENENCIA Y EQUIPOS

### 3.1 `organizaciones`
Almacena las empresas o inquilinos de IRIS.
- `id`: UUID (PK).
- `nombre`: VARCHAR(255) NOT NULL.
- `slug`: VARCHAR(100) UNIQUE NOT NULL.
- `identificador_fiscal`: VARCHAR(50) NULL.
- `dominio`: VARCHAR(255) NULL.
- `estado`: VARCHAR(50) NOT NULL DEFAULT 'activo' (CHECK: `activo`, `suspendido`, `cancelado`).
- `configuracion`: JSONB NOT NULL DEFAULT '{}'::jsonb.
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 3.2 `usuarios`
Perfiles locales de usuarios vinculados a `auth.users` de Supabase.
- `id`: UUID (PK, FK a `auth.users.id`).
- `nombre_completo`: VARCHAR(255) NOT NULL.
- `correo_electronico`: VARCHAR(255) UNIQUE NOT NULL.
- `telefono`: VARCHAR(50) NULL.
- `avatar_url`: TEXT NULL.
- `estado`: VARCHAR(50) NOT NULL DEFAULT 'activo' (CHECK: `activo`, `inactivo`, `bloqueado`).
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 3.3 `membresias`
Asocia usuarios con organizaciones y define su pertenencia.
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE.
- `usuario_id`: UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE.
- `rol_id`: UUID NOT NULL REFERENCES roles(id).
- `estado`: VARCHAR(50) NOT NULL DEFAULT 'activo' (CHECK: `activo`, `invitado`, `suspendido`).
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- *Restricción única:* `UNIQUE(organizacion_id, usuario_id)`.

### 3.4 `roles` y `permisos`
- `roles`: `id`, `organizacion_id` (NULL para roles base del sistema), `nombre`, `codigo`, `descripcion`, `es_sistema`.
- `permisos`: `id`, `codigo` (ej. `prospectos:crear`), `modulo`, `descripcion`.
- `roles_permisos`: `rol_id`, `permiso_id` (PK compuesta).

### 3.5 `equipos` y `miembros_equipo`
- `equipos`: `id`, `organizacion_id`, `nombre`, `descripcion`, `lider_usuario_id` (FK usuarios), `fecha_creacion`.
- `miembros_equipo`: `id`, `organizacion_id`, `equipo_id`, `usuario_id`, `rol_en_equipo`, `fecha_creacion`.

---

## 4. DOMINIO: CRM, PROSPECTOS Y CONTACTOS

### 4.1 `origenes_prospecto`
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `nombre`: VARCHAR(100) NOT NULL (ej. Meta Ads, Google Ads, Formulario Web, Orgánico).
- `codigo`: VARCHAR(50) NOT NULL.
- `activo`: BOOLEAN NOT NULL DEFAULT true.

### 4.2 `prospectos`
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `origen_id`: UUID NOT NULL REFERENCES origenes_prospecto(id).
- `nombre`: VARCHAR(255) NOT NULL.
- `correo_electronico`: VARCHAR(255) NULL.
- `telefono`: VARCHAR(50) NULL (E.164 recomendado).
- `empresa_nombre`: VARCHAR(255) NULL.
- `estado`: VARCHAR(50) NOT NULL DEFAULT 'nuevo' (CHECK: `nuevo`, `contactado`, `calificado`, `descalificado`, `convertido`).
- `puntuacion`: INTEGER NOT NULL DEFAULT 0.
- `agente_asignado_id`: UUID NULL REFERENCES usuarios(id).
- `metadatos_adquisicion`: JSONB NOT NULL DEFAULT '{}'::jsonb (campaña, conjunto_anuncios, anuncio_id, formulario_id, etc.).
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 4.3 `contactos` y `empresas`
- `empresas`: `id`, `organizacion_id`, `nombre`, `sector`, `sitio_web`, `telefono`, `direccion`, `fecha_creacion`.
- `contactos`: `id`, `organizacion_id`, `empresa_id` (NULLABLE), `prospecto_origen_id` (NULLABLE), `nombre`, `apellidos`, `correo_principal`, `telefono_principal`, `cargo`, `estado`, `fecha_creacion`.
- `canales_contacto`: `id`, `organizacion_id`, `contacto_id`, `tipo_canal` (`telefono`, `correo`, `whatsapp`, `instagram`), `valor`, `es_principal`, `verificado`.

---

## 5. DOMINIO: PIPELINE Y OPORTUNIDADES COMERCIALES

### 5.1 `embudos_venta` y `etapas_embudo`
- `embudos_venta`: `id`, `organizacion_id`, `nombre`, `descripcion`, `es_predeterminado`, `activo`.
- `etapas_embudo`: `id`, `organizacion_id`, `embudo_id`, `nombre`, `orden` INT, `probabilidad_cierre` INT, `es_etapa_ganada`, `es_etapa_perdida`.

### 5.2 `oportunidades`
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `embudo_id`: UUID NOT NULL REFERENCES embudos_venta(id).
- `etapa_id`: UUID NOT NULL REFERENCES etapas_embudo(id).
- `contacto_id`: UUID NOT NULL REFERENCES contactos(id).
- `empresa_id`: UUID NULL REFERENCES empresas(id).
- `agente_asignado_id`: UUID NOT NULL REFERENCES usuarios(id).
- `titulo`: VARCHAR(255) NOT NULL.
- `valor_estimado`: NUMERIC(14, 2) NOT NULL DEFAULT 0.00.
- `moneda`: VARCHAR(3) NOT NULL DEFAULT 'MXN'.
- `fecha_cierre_esperada`: DATE NULL.
- `estado`: VARCHAR(50) NOT NULL DEFAULT 'abierta' (CHECK: `abierta`, `ganada`, `perdida`, `cancelada`).
- `motivo_perdida`: TEXT NULL.
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 5.3 `historial_etapas_oportunidad` y `atribuciones_venta`
- `historial_etapas_oportunidad`: `id`, `organizacion_id`, `oportunidad_id`, `etapa_anterior_id`, `etapa_nueva_id`, `usuario_cambio_id`, `tiempo_en_etapa_segundos`, `fecha_cambio`.
- `atribuciones_venta`: `id`, `organizacion_id`, `oportunidad_id`, `agente_cierre_id` (FK usuarios), `monto_final`, `fecha_cierre`, `notas`.

---

## 6. DOMINIO: COMUNICACIONES OMNICANAL, SLA Y AUDITORÍA

### 6.1 `canales_comunicacion` y `cuentas_canal`
- `canales_comunicacion`: `id`, `codigo` (`whatsapp_cloud`, `facebook_messenger`, `instagram_direct`), `nombre`, `activo`.
- `cuentas_canal`: `id`, `organizacion_id`, `canal_id`, `nombre_identificador`, `proveedor_cuenta_id` (ej. WhatsApp Phone Number ID), `credenciales_cifradas` JSONB, `estado` (`conectado`, `error_autenticacion`, `desconectado`), `fecha_conexion`.

### 6.2 `conversaciones` y `mensajes`
- `conversaciones`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
  - `cuenta_canal_id`: UUID NOT NULL REFERENCES cuentas_canal(id).
  - `contacto_id`: UUID NULL REFERENCES contactos(id).
  - `prospecto_id`: UUID NULL REFERENCES prospectos(id).
  - `identificador_remoto_cliente`: VARCHAR(255) NOT NULL (ej. número WhatsApp en E.164).
  - `agente_receptor_inicial_id`: UUID NULL REFERENCES usuarios(id).
  - `agente_asignado_actual_id`: UUID NULL REFERENCES usuarios(id).
  - `estado`: VARCHAR(50) NOT NULL DEFAULT 'no_asignada' (CHECK: `no_asignada`, `asignada`, `pendiente`, `en_espera`, `cerrada`).
  - `prioridad`: VARCHAR(20) NOT NULL DEFAULT 'media' (CHECK: `baja`, `media`, `alta`, `urgente`).
  - `ultimo_mensaje_texto`: TEXT NULL.
  - `fecha_ultimo_mensaje`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
  - `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

- `mensajes`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
  - `conversacion_id`: UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE.
  - `proveedor_mensaje_id`: VARCHAR(255) NULL (Idempotencia externa).
  - `direccion`: VARCHAR(20) NOT NULL (CHECK: `entrante`, `saliente`).
  - `remitente_tipo`: VARCHAR(30) NOT NULL (CHECK: `cliente`, `agente`, `sistema`, `bot`).
  - `remitente_usuario_id`: UUID NULL REFERENCES usuarios(id).
  - `tipo_contenido`: VARCHAR(30) NOT NULL DEFAULT 'texto' (CHECK: `texto`, `imagen`, `documento`, `audio`, `video`, `ubicacion`).
  - `contenido_texto`: TEXT NULL.
  - `metadatos_adjunto`: JSONB NULL.
  - `estado_entrega`: VARCHAR(30) NOT NULL DEFAULT 'enviado' (CHECK: `pendiente`, `enviado`, `entregado`, `leido`, `fallido`).
  - `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
  - *Restricción única:* `UNIQUE(cuenta_canal_id, proveedor_mensaje_id)`.

### 6.3 Trazabilidad Inmutable: Asignaciones, Eventos y SLA
- `asignaciones_conversacion`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL.
  - `conversacion_id`: UUID NOT NULL REFERENCES conversaciones(id).
  - `agente_anterior_id`: UUID NULL REFERENCES usuarios(id).
  - `agente_nuevo_id`: UUID NOT NULL REFERENCES usuarios(id).
  - `actor_reasignacion_id`: UUID NOT NULL REFERENCES usuarios(id).
  - `motivo`: TEXT NULL.
  - `fecha_asignacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

- `participantes_conversacion`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL.
  - `conversacion_id`: UUID NOT NULL REFERENCES conversaciones(id).
  - `usuario_id`: UUID NOT NULL REFERENCES usuarios(id).
  - `primer_aporte`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
  - `ultimo_aporte`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
  - `cantidad_mensajes`: INT NOT NULL DEFAULT 1.

- `eventos_conversacion`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL.
  - `conversacion_id`: UUID NOT NULL REFERENCES conversaciones(id).
  - `tipo_evento`: VARCHAR(50) NOT NULL (`creacion`, `primera_respuesta_humana`, `nota_interna`, `cambio_prioridad`, `sla_alerta`, `sla_violado`, `cierre`, `reapertura`).
  - `actor_usuario_id`: UUID NULL REFERENCES usuarios(id).
  - `detalles`: JSONB NOT NULL DEFAULT '{}'::jsonb.
  - `fecha_evento`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

- `registros_sla`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL.
  - `conversacion_id`: UUID NOT NULL REFERENCES conversaciones(id).
  - `tiempo_objetivo_segundos`: INT NOT NULL DEFAULT 600 (10 minutos).
  - `tiempo_transcurrido_segundos`: INT NOT NULL DEFAULT 0.
  - `estado_sla`: VARCHAR(30) NOT NULL DEFAULT 'a_tiempo' (CHECK: `a_tiempo`, `en_alerta`, `violado`, `pausado`, `cumplido`).
  - `fecha_inicio`: TIMESTAMPTZ NOT NULL.
  - `fecha_primera_respuesta`: TIMESTAMPTZ NULL.
  - `fecha_limite`: TIMESTAMPTZ NOT NULL.

---

## 7. DOMINIO: RECURSOS Y ARCHIVOS

### 7.1 `respuestas_rapidas`
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `equipo_id`: UUID NULL REFERENCES equipos(id).
- `titulo`: VARCHAR(150) NOT NULL.
- `atajo`: VARCHAR(50) NOT NULL (ej. `/bienvenida`).
- `contenido`: TEXT NOT NULL (soporta `{{nombre}}`, `{{desarrollo}}`).
- `categoria`: VARCHAR(100) NOT NULL DEFAULT 'general'.
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 7.2 `carpetas_recursos` y `archivos_recursos`
- `carpetas_recursos`: `id`, `organizacion_id`, `carpeta_padre_id` (autorreferencia NULLABLE), `nombre`, `fecha_creacion`.
- `archivos_recursos`: `id`, `organizacion_id`, `carpeta_id` (NULLABLE), `nombre`, `tipo_mime`, `peso_bytes`, `ruta_storage`, `es_privado`, `fecha_creacion`.
- `versiones_archivo`: `id`, `archivo_id`, `numero_version`, `ruta_storage`, `creado_por_usuario_id`, `fecha_creacion`.

---

## 8. DOMINIO: CONTRATOS Y FIRMA ELECTRÓNICA (DOCUSIGN)

### 8.1 `plantillas_contrato` y `contratos`
- `plantillas_contrato`: `id`, `organizacion_id`, `nombre`, `descripcion`, `plantilla_remota_id` (DocuSign Template ID), `version`, `activo`, `fecha_creacion`.
- `contratos`:
  - `id`: UUID (PK).
  - `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
  - `oportunidad_id`: UUID NOT NULL REFERENCES oportunidades(id).
  - `contacto_id`: UUID NOT NULL REFERENCES contactos(id).
  - `plantilla_id`: UUID NOT NULL REFERENCES plantillas_contrato(id).
  - `agente_responsable_id`: UUID NOT NULL REFERENCES usuarios(id).
  - `titulo`: VARCHAR(255) NOT NULL.
  - `estado`: VARCHAR(50) NOT NULL DEFAULT 'borrador' (CHECK: `borrador`, `generado`, `enviado`, `entregado`, `en_progreso`, `completado`, `rechazado`, `anulado`, `expirado`).
  - `datos_contrato`: JSONB NOT NULL DEFAULT '{}'::jsonb (precios, enganche, lote, etc.).
  - `ruta_documento_generado`: TEXT NULL.
  - `ruta_documento_firmado`: TEXT NULL.
  - `ruta_certificado_finalizacion`: TEXT NULL.
  - `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
  - `fecha_actualizacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 8.2 `firmantes_contrato` y `sobres_firma`
- `firmantes_contrato`: `id`, `contrato_id`, `nombre`, `correo_electronico`, `orden_firma` INT, `rol_firmante` (`comprador`, `vendedor`, `aval`), `estado_firma` (`pendiente`, `enviado`, `firmado`, `rechazado`), `fecha_firma`.
- `sobres_firma`: `id`, `contrato_id`, `proveedor_sobre_id` (DocuSign Envelope ID), `estado_proveedor`, `datos_evento_webhook` JSONB, `fecha_envio`, `fecha_completado`.

---

## 9. DOMINIO: OPERACIONES Y OUTBOX PATTERN

### 9.1 `eventos_salientes` (*Outbox Pattern* para SENA)
Garantiza la entrega transaccional garantizada de eventos hacia el motor de automatización SENA:
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `nombre_evento`: VARCHAR(100) NOT NULL (ej. `prospecto.creado`, `conversacion.asignada`, `contrato.completado`).
- `clave_agregado`: VARCHAR(100) NOT NULL (ej. `prospecto`, `conversacion`, `contrato`).
- `agregado_id`: UUID NOT NULL.
- `payload`: JSONB NOT NULL.
- `estado_entrega`: VARCHAR(30) NOT NULL DEFAULT 'pendiente' (CHECK: `pendiente`, `en_proceso`, `entregado`, `fallido_definitivo`).
- `intentos`: INT NOT NULL DEFAULT 0.
- `ultimo_error`: TEXT NULL.
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().
- `fecha_proximo_intento`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

### 9.2 `registros_auditoria`
- `id`: UUID (PK).
- `organizacion_id`: UUID NOT NULL REFERENCES organizaciones(id).
- `usuario_id`: UUID NULL REFERENCES usuarios(id).
- `accion`: VARCHAR(100) NOT NULL.
- `entidad_tipo`: VARCHAR(100) NOT NULL.
- `entidad_id`: UUID NOT NULL.
- `valores_anteriores`: JSONB NULL.
- `valores_nuevos`: JSONB NULL.
- `direccion_ip`: INET NULL.
- `agente_usuario`: TEXT NULL.
- `fecha_creacion`: TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp().

---
*Fin de especificación del modelo de base de datos.*
