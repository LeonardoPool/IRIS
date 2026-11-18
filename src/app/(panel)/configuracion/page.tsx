// ==============================================================================
// IRIS by WYLEN — PÁGINA DE CONFIGURACIÓN Y ASESORES (SERVER COMPONENT)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  listarAsesoresDeOrganizacion,
  listarEquiposYSupervisores,
  obtenerConfiguracionGeocercaYSLA,
} from "@/servicios/asesores";
import { servicioEstructuraOrganizacional } from "@/servicios/estructura-organizacional";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { VistaAsesores } from "@/componentes/configuracion/vista-asesores";

export const instant = false;

export default async function PaginaConfiguracion() {
  let asesores: any[] = [];
  let equipos: any[] = [];
  let supervisores: any[] = [];
  let organigrama: any = null;
  let estadosComerciales: any[] = [];
  let auditoriaTraspasos: any[] = [];
  let configuracionGeocerca = {
    geocerca_activa: true,
    geocerca_nombre_lugar: "Showroom Torre Aura • Cancún",
    geocerca_latitud: 21.1619,
    geocerca_longitud: -86.8515,
    geocerca_radio_metros: 500,
    sla_minutos_primera_respuesta: 10,
  };

  try {
    const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
    const orgId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

    const [
      listaAsesores,
      datosEstructura,
      config,
      datosOrganigrama,
      datosEstados,
      datosAuditoria,
    ] = await Promise.all([
      listarAsesoresDeOrganizacion(orgId),
      listarEquiposYSupervisores(orgId),
      obtenerConfiguracionGeocercaYSLA(orgId),
      servicioEstructuraOrganizacional.obtenerOrganigrama(orgId),
      servicioSeguimientoKanban.listarEstadosComerciales(orgId),
      servicioEstructuraOrganizacional.listarAuditoriaTraspasos(orgId, 25),
    ]);

    asesores = listaAsesores;
    equipos = datosEstructura.equipos;
    supervisores = datosEstructura.supervisores;
    organigrama = datosOrganigrama;
    estadosComerciales = datosEstados;
    auditoriaTraspasos = datosAuditoria;

    if (config) {
      configuracionGeocerca = config;
    }
  } catch (error) {
    console.error("Error al cargar datos de configuración y organigrama:", error);
  }

  // Datos base de demostración si la base de datos está vacía
  if (equipos.length === 0) {
    equipos = [
      { id: "eq-1", nombre: "Ventas Riviera Maya", color: "#10b981" },
      { id: "eq-2", nombre: "Desarrollos Urbanos", color: "#3b82f6" },
      { id: "eq-3", nombre: "Atención Digital y WhatsApp", color: "#8b5cf6" },
    ];
  }

  if (supervisores.length === 0) {
    supervisores = [
      { id: "sup-1", nombre_completo: "Carlos Méndez (Gerente Comercial)", correo_electronico: "carlos@horizonte.wylen.io" },
      { id: "sup-2", nombre_completo: "Mariana Rivera (Coordinadora Ventas)", correo_electronico: "mariana@horizonte.wylen.io" },
    ];
  }

  return (
    <VistaAsesores
      asesoresIniciales={asesores}
      equiposIniciales={equipos}
      supervisoresIniciales={supervisores}
      configuracionGeocercaInicial={configuracionGeocerca}
      organigramaInicial={organigrama}
      estadosComercialesIniciales={estadosComerciales}
      auditoriaTraspasosInicial={auditoriaTraspasos}
    />
  );
}
