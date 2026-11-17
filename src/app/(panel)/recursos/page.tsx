// ==============================================================================
// IRIS by WYLEN — PÁGINA DE RECURSOS DIGITALES Y RESPUESTAS RÁPIDAS
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioRecursos } from "@/servicios/recursos";
import { ServicioSpeeches } from "@/servicios/speeches";
import { VistaRecursos } from "@/componentes/recursos/vista-recursos";

export const instant = false;

export default async function PaginaRecursos() {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) return null;

  const servicioRecursos = new ServicioRecursos();
  const servicioSpeeches = new ServicioSpeeches();

  const [respuestas, archivos, speeches] = await Promise.all([
    servicioRecursos.listarRespuestasRapidas(contexto.organizacionId),
    servicioRecursos.listarArchivosDigitales(contexto.organizacionId),
    servicioSpeeches.listarSpeeches(contexto.organizacionId),
  ]);

  return (
    <VistaRecursos
      respuestasIniciales={respuestas}
      archivosIniciales={archivos}
      speechesIniciales={speeches}
    />
  );
}
