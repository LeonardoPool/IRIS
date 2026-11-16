// ==============================================================================
// IRIS by WYLEN — PÁGINA DE ANALÍTICA Y REPORTES COMERCIALES
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioAnalitica } from "@/servicios/analitica";
import { VistaAnalitica } from "@/componentes/analitica/vista-analitica";

export const instant = false;

export default async function PaginaAnalitica() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) return null;

  const servicioAnalitica = new ServicioAnalitica();
  const reporte = await servicioAnalitica.obtenerReporteGeneral(contexto.organizacionId);

  return <VistaAnalitica reporte={reporte} />;
}
