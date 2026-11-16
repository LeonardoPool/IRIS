// ==============================================================================
// IRIS by WYLEN — CLIENTE SUPABASE PARA EL NAVEGADOR
// ==============================================================================

import { createBrowserClient } from "@supabase/ssr";

export function crearClienteSupabaseNavegador() {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tu-proyecto.supabase.co";
  const llaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "tu-llave-anonima";

  return createBrowserClient(urlSupabase, llaveAnonima);
}
