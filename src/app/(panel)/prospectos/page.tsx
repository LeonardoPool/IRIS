import { redirect } from "next/navigation";

export default function PaginaProspectosHeredada() {
  redirect("/clientes?vista=prospectos");
}
