// ==============================================================================
// IRIS by WYLEN — PÁGINA DE ACTIVIDADES (SERVER COMPONENT)
// ==============================================================================

import { servicioCRM } from "@/servicios/crm";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaActividades } from "@/componentes/crm/vista-actividades";

export const instant = false;

export default async function PaginaActividades() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  const actividades = await servicioCRM.listarActividades(organizacionId);

  return <VistaActividades actividadesIniciales={actividades} />;
}
