// ==============================================================================
// IRIS by WYLEN — PÁGINA DE BANDEJA OMNICANAL (SERVER COMPONENT)
// ==============================================================================

import { servicioComunicacion } from "@/servicios/comunicacion";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { VistaBandeja } from "@/componentes/omnicanal/vista-bandeja";
import { crearClienteSupabaseServidor } from "@/librerias/supabase/servidor";

export const instant = false;

export default async function PaginaBandeja() {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";
  const usuarioActualId = contexto?.usuarioId || "11111111-1111-1111-1111-111111111111";

  // Listar todas las conversaciones activas y cuenta WhatsApp de la organización
  const [conversaciones, cuentaWhatsApp] = await Promise.all([
    servicioComunicacion.listarConversaciones(organizacionId, "todas"),
    servicioComunicacion.obtenerCuentaWhatsAppOrganizacion(organizacionId),
  ]);

  // Listar agentes comerciales de la organización para reasignación
  const supabase = await crearClienteSupabaseServidor();
  const { data: miembros } = await supabase
    .from("membresias")
    .select("usuario:usuarios(id, nombre_completo, correo_electronico, avatar_url)")
    .eq("organizacion_id", organizacionId)
    .eq("estado", "activo");

  const agentes = (miembros || []).map((m: any) => m.usuario).filter(Boolean);

  return (
    <VistaBandeja
      conversacionesIniciales={conversaciones}
      agentesDisponibles={agentes}
      usuarioActualId={usuarioActualId}
      cuentaWhatsAppInicial={cuentaWhatsApp}
    />
  );
}
