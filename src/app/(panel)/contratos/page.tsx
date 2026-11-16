// ==============================================================================
// IRIS by WYLEN — PÁGINA DE CONTRATOS (DOCUSIGN ESIGNATURE)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioContratos } from "@/servicios/contratos";
import { VistaContratos } from "@/componentes/contratos/vista-contratos";

export const instant = false;

export default async function PaginaContratos() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) return null;

  const servicioContratos = new ServicioContratos();
  const contratos = await servicioContratos.listarContratos(contexto.organizacionId);

  return <VistaContratos contratosIniciales={contratos} />;
}
