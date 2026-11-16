# IRIS by WYLEN — PROJECT ARCHITECTURE / ARQUITECTURA DE PROYECTO
> **Nota de Gobernanza Lingüística:** En cumplimiento estricto del *Addendum — Política Lingüística y Nomenclatura Técnica de IRIS*, el documento maestro oficial en español se encuentra en [ARQUITECTURA_PROYECTO.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/ARQUITECTURA_PROYECTO.md). Este archivo mantiene sincronía idéntica para cumplir con las referencias de gobierno de proyecto y especificación arquitectónica.

---

# IRIS by WYLEN — ARQUITECTURA DE PROYECTO
**Versión del Documento:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Descubrimiento Arquitectónico y Especificación Técnica (Fase 0)  
**Clasificación:** Confidencial / Arquitectura de Software  

---

## 1. EVALUACIÓN DEL REPOSITORIO ACTUAL (ESTADO REAL VERIFICADO)

A la fecha de emisión de este documento, se ha ejecutado una inspección forense rigurosa sobre el espacio de trabajo local y el repositorio Git asociado (`https://github.com/LeonardoPool/IRIS.git`).

### 1.1 Estado del Código y Árbol de Trabajo
- **Rama activa:** `main` (alineada con `origin/main`, commit inicial `b5457ea Initial commit from Create Next App`).
- **Estado de Git:** Árbol de trabajo limpio (`working tree clean`). No existen cambios locales sin confirmar ni conflictos de fusión.
- **Entorno de ejecución base detectado en sistema operativo:**
  - Node.js: `v26.13.0`
  - npm: `11.20.0`
  - Git CLI: `2.x` en `C:\Program Files\Git\cmd\git.exe`

### 1.2 Dependencias Actuales (`package.json`)
El proyecto se encuentra en su estado de inicialización elemental con la plantilla base de Next.js:
- `next`: `16.4.6` (Next.js con App Router y Turbopack).
- `react`: `19.3.0`
- `react-dom`: `19.3.0`
- `@tailwindcss/turbopack`: `4.3.3`
- `tailwindcss`: `4.3.3`
- `typescript`: `^5`
- `eslint`: `^9` / `eslint-config-next`: `16.4.6`

### 1.3 Infraestructura y Funcionalidades Pendientes (Ausentes en Código)
Es crítico explicitar qué **no existe** en este momento para evitar suposiciones erróneas:
1. **Sin base de datos configurada:** No existe directorio `supabase/`, no hay migraciones SQL ni esquemas declarados.
2. **Sin SDK de Supabase:** `@supabase/supabase-js` y `@supabase/ssr` no han sido instalados.
3. **Sin variables de entorno:** No existen archivos `.env`, `.env.local` ni `.env.example`. No hay llaves ni secretos presentes en el repositorio.
4. **Sin librería de componentes visuales:** `shadcn/ui`, `radix-ui`, `lucide-react` no han sido incorporados aún.
5. **Sin lógica de negocio ni modelos:** No existen servicios, hooks de negocio, controladores, adaptadores de canales, clientes de IA ni conectores de firma electrónica.
6. **Contenido de interfaz:** La ruta principal `src/app/page.tsx` contiene la plantilla predeterminada de Create Next App.

---

## 2. VISIÓN Y PRINCIPIOS ARQUITECTÓNICOS DE IRIS

IRIS no es un CRM convencional ni una bandeja superficial de mensajería; es la **plataforma operativa comercial** de alto rendimiento dentro del ecosistema tecnológico **WYLEN**, diseñada bajo el lema:
> *"Every relationship, understood."*  
> *"Engineering that inspires."*

### 2.1 Principios Rectores de Ingeniería
1. **Monolito Modular por Diseño:** Se adopta un monolito modular altamente cohesivo y desacoplado, estructurado en dominios de negocio claros. Se prohíbe la fragmentación prematura en microservicios hasta que existan imperativos de escala o aislamiento operativo comprobados.
2. **Multi-Inquilino (Multi-Tenant) Mandatorio:** Aislamiento estricto de datos por organización en la capa de persistencia utilizando PostgreSQL Row Level Security (RLS) y validación server-side forzosa.
3. **Seguridad por Defecto y Cero Confianza (Zero Trust):** Denegación por defecto en RLS. Jamás confiar en identificadores de organización (`organizacion_id`) provenientes del cliente sin validación criptográfica de sesión y pertenencia. Jamás exponer `service_role` al cliente.
4. **Dominio Estricto en Español:** En cumplimiento del Addendum Lingüístico oficial de IRIS, toda la modelación de entidades, tablas, columnas, funciones SQL, procedimientos, tipos TypeScript, estados y servicios se define rigurosamente en español bajo convención `snake_case` (DB) y `camelCase`/`PascalCase` (TypeScript). Se reservan los términos en inglés únicamente para nombres de tecnologías, protocolos o contratos de APIs de proveedores externos (p. ej. Meta, DocuSign).
5. **Auditoría e Inmutabilidad de Operaciones Comerciales:** Ningún registro de asignación, evento de SLA o cambio de titularidad comercial debe sobrescribirse. Las correcciones administrativas generan nuevos eventos auditables.
6. **Sin Simulaciones de Integración:** Ninguna integración (WhatsApp, Meta, Google, DocuSign, NARA, SENA) debe fingirse operativa en la interfaz si no cuenta con contratos reales y credenciales validadas.

---

## 3. LÍMITES DE DOMINIO Y ARQUITECTURA EN CAPAS

La plataforma se organiza en cuatro capas de responsabilidad claramente delimitadas para evitar la mezcla de consultas SQL, reglas de negocio y presentación visual:

```
┌─────────────────────────────────────────────────────────────┐
│                 1. CAPA DE PRESENTACIÓN                     │
│    (Next.js App Router, Server/Client Components, UI)       │
├─────────────────────────────────────────────────────────────┤
│                 2. CAPA DE APLICACIÓN                       │
│    (Server Actions, Route Handlers, Casos de Uso, DTOs)     │
├─────────────────────────────────────────────────────────────┤
│                 3. CAPA DE DOMINIO (CORE)                   │
│    (Reglas de Negocio, Entidades, Motores de SLA, Eventos)  │
├─────────────────────────────────────────────────────────────┤
│               4. CAPA DE INFRAESTRUCTURA                    │
│    (Supabase/PostgreSQL, Storage, Adaptadores de Canales,   │
│     DocuSign Client, Conectores NARA/SENA, Outbox Pattern)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. ESTRATEGIA MULTI-INQUILINO (MULTI-TENANCY)

Toda entidad perteneciente a la operación comercial de una empresa se vincula obligatoriamente a un registro en la tabla `organizaciones` mediante `organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE RESTRICT`.

El aislamiento se ejecuta en la capa de persistencia mediante **PostgreSQL Row Level Security (RLS)** obligatorio, asociando el usuario autenticado con la función `public.obtener_organizacion_activa_usuario()`.

---

## 5. ESTRATEGIA DE IDENTIDAD Y AUTENTICACIÓN (FRONTERA CON WYLEN CORE)

WYLEN CORE es la autoridad central del ecosistema para la administración global de cuentas, licencias y módulos suscritos. IRIS gestiona la autenticación local (vía Supabase Auth federado) y la matriz granular de roles y permisos (RBAC) organizacionales.

---

## 6. MAPA DE DOMINIOS DE BASE DE DATOS (ESQUEMA INICIAL)

La base de datos se estructura en español bajo las siguientes agrupaciones de dominios:
- **Identidad y Tenencia:** `organizaciones`, `usuarios`, `membresias`, `roles`, `permisos`, `roles_permisos`, `equipos`, `miembros_equipo`.
- **CRM y Ventas:** `prospectos`, `contactos`, `empresas`, `canales_contacto`, `origenes_prospecto`, `etiquetas_prospecto`, `embudos_venta`, `etapas_embudo`, `oportunidades`, `historial_etapas_oportunidad`, `atribuciones_venta`.
- **Comunicaciones y Auditoría:** `canales_comunicacion`, `cuentas_canal`, `conversaciones`, `mensajes`, `eventos_conversacion`, `asignaciones_conversacion`, `participantes_conversacion`, `registros_sla`, `cierres_conversacion`.
- **Recursos:** `respuestas_rapidas`, `carpetas_recursos`, `archivos_recursos`, `versiones_archivo`.
- **Contratos:** `plantillas_contrato`, `contratos`, `firmantes_contrato`, `sobres_firma`, `eventos_contrato`.
- **Operaciones:** `actividades`, `notificaciones`, `registros_auditoria`, `eventos_salientes` (Outbox).

---

## 7. MATRIZ DE RIESGOS TÉCNICOS Y PREGUNTAS ABIERTAS

Ver detalles completos en [ARQUITECTURA_PROYECTO.md](file:///c:/Users/thegr/OneDrive/Documentos/GitHub/IRIS/ARQUITECTURA_PROYECTO.md#L240-L280).
- Riesgo de APIs de terceros (Meta, DocuSign) y control de tokens.
- Criterios de conciliación de identidades de contactos sin falsos positivos.
- Decisión de infraestructura Supabase (Cloud vs. Local Docker).
- Confirmación de moneda base (MXN) y zona horaria (`America/Mexico_City`).

---

## 8. CONCLUSIÓN Y ESTADO DE FASE 0

Se ha completado el descubrimiento arquitectónico sin modificar configuraciones de producción, dependencias de código ni esquemas de base de datos. Se detiene la ejecución en estricto cumplimiento de las reglas de la Fase 0, a la espera de autorización explícita para iniciar la Fase 1.
