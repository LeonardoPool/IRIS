// ==============================================================================
// IRIS by WYLEN — PÁGINA DE CONTACTOS (SERVER COMPONENT)
// ==============================================================================

import { servicioCRM } from "@/servicios/crm";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaContactos } from "@/componentes/crm/vista-contactos";

export const instant = false;

export default async function PaginaContactos() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  const contactos = await servicioCRM.listarContactos(organizacionId);

  return <VistaContactos contactosIniciales={contactos} />;
}
