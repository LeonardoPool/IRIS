// ==============================================================================
// IRIS by WYLEN — PÁGINA DE PROSPECTOS (SERVER COMPONENT)
// ==============================================================================

import { servicioCRM } from "@/servicios/crm";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaProspectos } from "@/componentes/crm/vista-prospectos";
import { crearClienteSupabaseServidor } from "@/librerias/supabase/servidor";

export const instant = false;

export default async function PaginaProspectos() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  // Carga de prospectos
  const prospectos = await servicioCRM.listarProspectos(organizacionId);

  // Carga de orígenes
  const supabase = await crearClienteSupabaseServidor();
  const { data: origenes } = await supabase
    .from("origenes_prospecto")
    .select("*")
    .eq("organizacion_id", organizacionId)
    .order("nombre");

  // Embudo predeterminado
  const embudo = await servicioCRM.obtenerEmbudoPredeterminado(organizacionId);

  return (
    <VistaProspectos
      prospectosIniciales={prospectos}
      origenes={(origenes as any) || []}
      embudoPredeterminado={embudo}
    />
  );
}
