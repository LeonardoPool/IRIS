import { redirect } from "next/navigation";

export default function PaginaContactosHeredada() {
  redirect("/clientes?vista=contactos");
}
