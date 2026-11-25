// ==============================================================================
// IRIS by WYLEN — PÁGINA SERVIDOR: CLIENTES UNIFICADO (/clientes)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { crearClienteSupabaseServidor } from "@/librerias/supabase/servidor";
import { servicioCRM } from "@/servicios/crm";
import { servicioPoolLeads } from "@/servicios/pool-leads";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { listarAsesoresDeOrganizacion } from "@/servicios/asesores";
import { ServicioContratos } from "@/servicios/contratos";
import {
  puedeVerContratosGlobales,
  resolverRolJerarquicoEfectivo,
} from "@/librerias/seguridad/navegacion-rol";
import {
  VistaClientesUnificada,
  type PestanaClientes,
} from "@/componentes/clientes/vista-clientes-unificada";

export const instant = false;

interface PropiedadesPaginaClientes {
  searchParams: Promise<{
    vista?: string;
    modo?: string;
  }>;
}

export default async function PaginaClientes({ searchParams }: PropiedadesPaginaClientes) {
  const params = await searchParams;
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";
  const rol = resolverRolJerarquicoEfectivo(contexto);
  const permisos = contexto?.permisos || [];

  const autorizacionContratos = puedeVerContratosGlobales(rol, permisos);
  const autorizacionPool = rol !== "asesor";

  const supabase = await crearClienteSupabaseServidor();
  const servicioContratos = new ServicioContratos();

  const [
    prospectos,
    asesores,
    embudo,
    origenesRes,
    resultadoPool,
    estadosComerciales,
    categoriasPool,
    contactos,
    contratos,
  ] = await Promise.all([
    servicioCRM.listarProspectos(organizacionId),
    listarAsesoresDeOrganizacion(organizacionId),
    servicioCRM.obtenerEmbudoPredeterminado(organizacionId),
    supabase
      .from("origenes_prospecto")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .order("nombre"),
    servicioPoolLeads.listarPoolLeadsPaginado(organizacionId, { pagina: 1, porPagina: 50 }),
    servicioSeguimientoKanban.listarEstadosComerciales(organizacionId),
    servicioPoolLeads.obtenerCategoriasDisponibles(organizacionId),
    servicioCRM.listarContactos(organizacionId),
    autorizacionContratos ? servicioContratos.listarContratos(organizacionId) : Promise.resolve([]),
  ]);

  const oportunidades = embudo
    ? await servicioCRM.listarOportunidadesPorEmbudo(embudo.id, organizacionId)
    : [];

  let pestanaInicial: PestanaClientes = "resumen";
  if (params.vista === "prospectos") pestanaInicial = "prospectos";
  else if (params.vista === "contactos") pestanaInicial = "contactos";
  else if (params.vista === "oportunidades") pestanaInicial = "oportunidades";
  else if (params.vista === "contratos" && autorizacionContratos) pestanaInicial = "contratos";

  const modoProspectosInicial =
    params.modo === "pool" && autorizacionPool ? "pool" : "gestion";

  return (
    <VistaClientesUnificada
      pestanaInicial={pestanaInicial}
      modoProspectosInicial={modoProspectosInicial}
      puedeVerContratosGlobales={autorizacionContratos}
      puedeVerPoolLeads={autorizacionPool}
      prospectos={prospectos}
      origenes={(origenesRes.data as any[]) || []}
      embudo={embudo}
      asesores={asesores}
      resultadoPool={resultadoPool}
      estadosComerciales={estadosComerciales}
      categoriasPool={categoriasPool}
      contactos={contactos}
      oportunidades={oportunidades}
      contratos={contratos}
    />
  );
}
