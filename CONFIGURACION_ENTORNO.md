# IRIS by WYLEN — GUÍA DE CONFIGURACIÓN DE ENTORNO
**Versión:** 1.0.0  
**Fecha:** 15 de Noviembre de 2026  
**Estado:** Especificación de Infraestructura Local y Variables de Entorno (Fase 0)  

---

## 1. DISTINCIÓN METODOLÓGICA OBLIGATORIA
- **Funcionalidad Existente Verificada:** Se detectó en el sistema operativo la presencia de Node.js `v26.13.0` y npm `11.20.0`. No existen archivos `.env` ni configuraciones de credenciales en el repositorio.
- **Arquitectura Propuesta:** Estructura de variables de entorno requeridas para el desarrollo local y producción.
- **Supuestos:** Se asumirá el uso de Supabase CLI para la orquestación y versionado de migraciones SQL locales o vinculadas a Supabase Cloud.
- **Dependencias Externas:** Supabase CLI, Docker Desktop (opcional si se utiliza Supabase local), cuentas de desarrollador en Meta y DocuSign Sandbox.
- **Decisiones Pendientes:** Aprobación de la política de inyección de secretos en entornos CI/CD (Vercel / GitHub Actions).

---

## 2. REQUISITOS PREVIOS DEL SISTEMA
- **Node.js:** Versión 20.x o superior (detectada `v26.13.0`).
- **Gestor de Paquetes:** npm `11.x` o pnpm.
- **Git CLI:** `2.x` en `C:\Program Files\Git\cmd\git.exe`.
- **Supabase CLI:** Herramienta oficial para gestión de bases de datos y generación de tipos TypeScript (`npx supabase`).

---

## 3. PLANTILLA CANÓNICA DE VARIABLES DE ENTORNO (`.env.example`)

A continuación se define la estructura oficial de variables que será requerida a partir de la Fase 1. **Ningún valor real de producción debe confirmarse en el control de versiones.**

```bash
# ==============================================================================
# IRIS by WYLEN — VARIABLES DE ENTORNO
# ==============================================================================

# ENTORNO DE APLICACIÓN
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SUPABASE — BASE DE DATOS Y AUTENTICACIÓN
# La URL pública y la llave anónima son seguras para el cliente.
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica

# SERVICE ROLE KEY — ESTRICTAMENTE PRIVADA (SOLO USO EN SERVIDOR / TAREAS CRÍTICAS)
# NUNCA usar NEXT_PUBLIC_ para esta variable ni exponerla en el bundle frontend.
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-privada

# SUPABASE STORAGE — BUCKETS PRIVADOS
SUPABASE_STORAGE_BUCKET_RECURSOS=recursos-privados
SUPABASE_STORAGE_BUCKET_CONTRATOS=contratos-privados

# META / WHATSAPP BUSINESS CLOUD API
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=token-aleatorio-seguro-verificacion
META_GRAPH_API_VERSION=v21.0

# DOCUSIGN ESIGNATURE API (SANDBOX / PRODUCCIÓN)
DOCUSIGN_ENVIRONMENT=demo
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_WEBHOOK_HMAC_KEY=

# GOOGLE WORKSPACE / CLOUD
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# ECOSISTEMA WYLEN — INTERFACES CENTRALES
WYLEN_CORE_API_URL=https://core.wylen.io/api/v1
WYLEN_CORE_PUBLIC_KEY=
NARA_AI_API_URL=https://nara.wylen.io/api/v1
NARA_AI_API_KEY=
SENA_AUTOMATION_WEBHOOK_URL=https://sena.wylen.io/api/v1/eventos
SENA_WEBHOOK_SECRET=secreto-compartido-hmac-sena
```

---

## 4. FLUJO DE TRABAJO LOCAL CON SUPABASE (FUTURA FASE 1)

1. **Inicialización del proyecto Supabase:**
   ```bash
   npx supabase init
   ```
2. **Generación de nueva migración con nomenclatura en español:**
   ```bash
   npx supabase migration new 001_tablas_iniciales_identidad_y_tenencia
   ```
3. **Aplicación de migraciones:**
   ```bash
   npx supabase db push # O npx supabase db reset en entorno local Docker
   ```
4. **Generación automática de tipos TypeScript en español:**
   ```bash
   npx supabase gen types typescript --local > src/tipos/supabase.ts
   ```

---

## 5. EJECUCIÓN DEL SERVIDOR DE DESARROLLO
Una vez aprobada la Fase 1:
```bash
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---
*Fin de guía de configuración de entorno.*
