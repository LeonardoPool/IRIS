// ==============================================================================
// IRIS by WYLEN — PÁGINA DE MARKETING Y PRODUCTIVIDAD
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioMarketing } from "@/servicios/marketing";
import { VistaMarketing } from "@/componentes/marketing/vista-marketing";

export const instant = false;

export default async function PaginaMarketing() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) return null;

  const servicioMarketing = new ServicioMarketing();

  const [formularios, integraciones, capturas, conexionCalendario] = await Promise.all([
    servicioMarketing.listarFormulariosWeb(contexto.organizacionId),
    servicioMarketing.listarIntegracionesMarketing(contexto.organizacionId),
    servicioMarketing.listarCapturasLead(contexto.organizacionId, 50),
    servicioMarketing.obtenerConexionCalendario(contexto.usuarioId, contexto.organizacionId),
  ]);

  return (
    <VistaMarketing
      formulariosIniciales={formularios}
      integracionesIniciales={integraciones}
      capturasIniciales={capturas}
      conexionCalendario={conexionCalendario}
      organizacionId={contexto.organizacionId}
    />
  );
}
