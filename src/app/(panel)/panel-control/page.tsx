// ==============================================================================
// IRIS by WYLEN — PÁGINA DE INICIO UNIFICADO (RESUMEN OPERATIVO + ANALÍTICA)
// ==============================================================================

import * as React from "react";
import { servicioCRM } from "@/servicios/crm";
import { ServicioAnalitica } from "@/servicios/analitica";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  puedeVerAnalitica,
  resolverRolJerarquicoEfectivo,
} from "@/librerias/seguridad/navegacion-rol";
import { VistaInicioUnificado } from "@/componentes/crm/vista-inicio-unificado";

export const instant = false;

interface PropiedadesPaginaPanelControl {
  searchParams: Promise<{
    vista?: string;
  }>;
}

export default async function PaginaPanelControl({
  searchParams,
}: PropiedadesPaginaPanelControl) {
  const params = await searchParams;
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";
  const nombreOrganizacion = contexto?.organizacion?.nombre || "Inmobiliaria Horizonte WYLEN";
  const rol = resolverRolJerarquicoEfectivo(contexto);
  const permisos = contexto?.permisos || [];

  const autorizacionAnalitica = puedeVerAnalitica(rol, permisos);

  const [metricas, reporteAnalitica] = await Promise.all([
    servicioCRM.obtenerMetricasConsolidadas(organizacionId),
    autorizacionAnalitica
      ? new ServicioAnalitica().obtenerReporteGeneral(organizacionId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const vistaInicial =
    params.vista === "analitica" && autorizacionAnalitica ? "analitica" : "resumen";

  return (
    <VistaInicioUnificado
      nombreOrganizacion={nombreOrganizacion}
      rol={rol}
      puedeVerAnalitica={autorizacionAnalitica}
      vistaInicial={vistaInicial}
      metricas={{
        totalProspectos: metricas.totalProspectos,
        prospectosNuevos: metricas.prospectosNuevos,
        prospectosCalificados: metricas.prospectosCalificados,
        oportunidadesActivas: metricas.oportunidadesActivas,
        valorTotalCartera: metricas.valorTotalCartera,
        tasaConversion: metricas.tasaConversion,
        ventasGanadasMes: metricas.ventasGanadasMes,
        actividadesPendientes: metricas.actividadesPendientes,
      }}
      reporteAnalitica={reporteAnalitica}
    />
  );
}
