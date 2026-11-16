// ==============================================================================
// IRIS by WYLEN — PANEL DE CONTROL PRINCIPAL (CONSOLIDADO CRM CORE)
// ==============================================================================

import * as React from "react";
import { servicioCRM } from "@/servicios/crm";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaPanelOperativo } from "@/componentes/crm/vista-panel-operativo";

export const instant = false;

export default async function PaginaPanelControl() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";
  const nombreOrganizacion = contexto?.organizacion?.nombre || "Inmobiliaria Horizonte WYLEN";

  // Métricas reales calculadas desde PostgreSQL
  const metricas = await servicioCRM.obtenerMetricasConsolidadas(organizacionId);

  return (
    <VistaPanelOperativo
      nombreOrganizacion={nombreOrganizacion}
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
    />
  );
}
