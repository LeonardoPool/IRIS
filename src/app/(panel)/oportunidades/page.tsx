// ==============================================================================
// IRIS by WYLEN — PÁGINA DE OPORTUNIDADES (SERVER COMPONENT)
// ==============================================================================

import { servicioCRM } from "@/servicios/crm";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaOportunidades } from "@/componentes/crm/vista-oportunidades";

export const instant = false;

export default async function PaginaOportunidades() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  const embudo = await servicioCRM.obtenerEmbudoPredeterminado(organizacionId);
  const oportunidades = embudo ? await servicioCRM.listarOportunidadesPorEmbudo(embudo.id, organizacionId) : [];
  const contactos = await servicioCRM.listarContactos(organizacionId);

  return (
    <VistaOportunidades
      embudo={embudo}
      oportunidadesIniciales={oportunidades}
      contactos={contactos}
    />
  );
}
