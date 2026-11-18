// ==============================================================================
// IRIS by WYLEN — PÁGINA: POOL DE LEADS (SERVER COMPONENT)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioPoolLeads } from "@/servicios/pool-leads";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { listarAsesoresDeOrganizacion } from "@/servicios/asesores";
import { VistaPoolLeads } from "@/componentes/leads/vista-pool-leads";

export const instant = false;

export default async function PaginaPoolLeads() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  // Carga concurrente en servidor
  const [resultadoLeads, estados, asesores, categorias] = await Promise.all([
    servicioPoolLeads.listarPoolLeadsPaginado(organizacionId, { pagina: 1, porPagina: 50 }),
    servicioSeguimientoKanban.listarEstadosComerciales(organizacionId),
    listarAsesoresDeOrganizacion(organizacionId),
    servicioPoolLeads.obtenerCategoriasDisponibles(organizacionId),
  ]);

  return (
    <VistaPoolLeads
      resultadoInicial={resultadoLeads}
      estadosComerciales={estados}
      asesoresDisponibles={asesores}
      categoriasDisponibles={categorias}
    />
  );
}
