import { redirect } from "next/navigation";

export default function PaginaContratosHeredada() {
  redirect("/clientes?vista=contratos");
}
