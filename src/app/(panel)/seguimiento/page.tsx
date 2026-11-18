// ==============================================================================
// IRIS by WYLEN — PÁGINA: SEGUIMIENTO COMERCIAL KANBAN (SERVER COMPONENT)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { listarAsesoresDeOrganizacion } from "@/servicios/asesores";
import { VistaSeguimientoKanban } from "@/componentes/leads/vista-seguimiento-kanban";

export const instant = false;

export default async function PaginaSeguimiento() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  // Carga concurrente en servidor
  const [estados, leads, asesores] = await Promise.all([
    servicioSeguimientoKanban.listarEstadosComerciales(organizacionId),
    servicioSeguimientoKanban.listarLeadsParaKanban(organizacionId),
    listarAsesoresDeOrganizacion(organizacionId),
  ]);

  return (
    <VistaSeguimientoKanban
      leadsIniciales={leads}
      estadosIniciales={estados}
      asesoresDisponibles={asesores}
    />
  );
}
