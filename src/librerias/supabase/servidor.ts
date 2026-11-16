// ==============================================================================
// IRIS by WYLEN — CLIENTE SUPABASE PARA EL SERVIDOR
// ==============================================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteSupabaseServidor() {
  const cookieStore = await cookies();
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tu-proyecto.supabase.co";
  const llaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "tu-llave-anonima";

  return createServerClient(urlSupabase, llaveAnonima, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGuardar) {
        try {
          cookiesParaGuardar.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // El método `setAll` fue invocado desde un Server Component.
          // Esto puede ser ignorado de forma segura si existe middleware actualizando las cookies.
        }
      },
    },
  });
}

/**
 * Cliente con permisos de administración (Service Role)
 * EXCLUSIVO para operaciones de infraestructura interna, webhooks y tareas de fondo.
 * NUNCA debe ser expuesto ni importado en componentes del cliente.
 */
export function crearClienteSupabaseAdministrador() {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tu-proyecto.supabase.co";
  const llaveServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!llaveServiceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno del servidor.");
  }

  return createServerClient(urlSupabase, llaveServiceRole, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
