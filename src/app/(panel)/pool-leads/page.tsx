import { redirect } from "next/navigation";

export default function PaginaPoolLeadsHeredada() {
  redirect("/clientes?vista=prospectos&modo=pool");
}
