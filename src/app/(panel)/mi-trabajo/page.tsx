// ==============================================================================
// IRIS by WYLEN — PÁGINA SERVIDOR: MI TRABAJO (/mi-trabajo)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioCRM } from "@/servicios/crm";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { listarAsesoresDeOrganizacion } from "@/servicios/asesores";
import { ServicioGoogleCalendarMaestro } from "@/servicios/google-calendar-maestro";
import {
  VistaMiTrabajo,
  type PestanaMiTrabajo,
} from "@/componentes/trabajo/vista-mi-trabajo";

export const instant = false;

interface PropiedadesPaginaMiTrabajo {
  searchParams: Promise<{
    vista?: string;
  }>;
}

export default async function PaginaMiTrabajo({ searchParams }: PropiedadesPaginaMiTrabajo) {
  const params = await searchParams;
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  const [actividades, leadsKanban, estadosKanban, asesores, estadoGoogleCalendar] =
    await Promise.all([
      servicioCRM.listarActividades(organizacionId),
      servicioSeguimientoKanban.listarLeadsParaKanban(organizacionId),
      servicioSeguimientoKanban.listarEstadosComerciales(organizacionId),
      listarAsesoresDeOrganizacion(organizacionId),
      ServicioGoogleCalendarMaestro.obtenerEstadoConexion(organizacionId).catch(() => ({
        conectado: false,
        emailCuenta: null,
      })),
    ]);

  let pestanaInicial: PestanaMiTrabajo = "hoy";
  if (params.vista === "seguimiento") pestanaInicial = "seguimiento";
  else if (params.vista === "agenda") pestanaInicial = "agenda";

  return (
    <VistaMiTrabajo
      pestanaInicial={pestanaInicial}
      actividades={actividades}
      leadsKanban={leadsKanban}
      estadosKanban={estadosKanban}
      asesores={asesores}
      estadoGoogleCalendar={estadoGoogleCalendar}
    />
  );
}
