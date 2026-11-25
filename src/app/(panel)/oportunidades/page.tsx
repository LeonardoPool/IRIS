import { redirect } from "next/navigation";

export default function PaginaOportunidadesHeredada() {
  redirect("/clientes?vista=oportunidades");
}
