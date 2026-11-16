// ==============================================================================
// IRIS by WYLEN — ENTRADA PRINCIPAL
// ==============================================================================

import { redirect } from "next/navigation";

export default function PaginaRaiz() {
  // Redirige al panel de control principal
  redirect("/panel-control");
}
