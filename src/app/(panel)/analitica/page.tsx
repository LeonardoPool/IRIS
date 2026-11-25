import { redirect } from "next/navigation";

export default function PaginaAnaliticaHeredada() {
  redirect("/panel-control?vista=analitica");
}
