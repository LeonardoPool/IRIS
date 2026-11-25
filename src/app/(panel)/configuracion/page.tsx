// ==============================================================================
// IRIS by WYLEN — PÁGINA DE ADMINISTRACIÓN Y CONFIGURACIÓN (/configuracion)
// ==============================================================================

import { redirect } from "next/navigation";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  puedeAccederConfiguracion,
  resolverRolJerarquicoEfectivo,
} from "@/librerias/seguridad/navegacion-rol";
import {
  listarAsesoresDeOrganizacion,
  listarEquiposYSupervisores,
  obtenerConfiguracionGeocercaYSLA,
} from "@/servicios/asesores";
import { servicioEstructuraOrganizacional } from "@/servicios/estructura-organizacional";
import { servicioSeguimientoKanban } from "@/servicios/seguimiento-kanban";
import { ServicioMarketing } from "@/servicios/marketing";
import { VistaAsesores } from "@/componentes/configuracion/vista-asesores";

export const instant = false;

interface PropiedadesPaginaConfiguracion {
  searchParams: Promise<{
    seccion?: string;
  }>;
}

export default async function PaginaConfiguracion({
  searchParams,
}: PropiedadesPaginaConfiguracion) {
  const params = await searchParams;

  let asesores: any[] = [];
  let equipos: any[] = [];
  let supervisores: any[] = [];
  let organigrama: any = null;
  let estadosComerciales: any[] = [];
  let auditoriaTraspasos: any[] = [];
  let datosMarketing: any = undefined;
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
    if (contexto) {
      const rol = resolverRolJerarquicoEfectivo(contexto);
      if (!puedeAccederConfiguracion(rol, contexto.permisos)) {
        redirect("/panel-control");
      }
    }

    const orgId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";
    const usuarioId = contexto?.usuarioId || orgId;
    const servicioMarketing = new ServicioMarketing();

    const [
      listaAsesores,
      datosEstructura,
      config,
      datosOrganigrama,
      datosEstados,
      datosAuditoria,
      formularios,
      integraciones,
      capturas,
      conexionCalendario,
    ] = await Promise.all([
      listarAsesoresDeOrganizacion(orgId),
      listarEquiposYSupervisores(orgId),
      obtenerConfiguracionGeocercaYSLA(orgId),
      servicioEstructuraOrganizacional.obtenerOrganigrama(orgId),
      servicioSeguimientoKanban.listarEstadosComerciales(orgId),
      servicioEstructuraOrganizacional.listarAuditoriaTraspasos(orgId, 25),
      servicioMarketing.listarFormulariosWeb(orgId).catch(() => []),
      servicioMarketing.listarIntegracionesMarketing(orgId).catch(() => []),
      servicioMarketing.listarCapturasLead(orgId, 50).catch(() => []),
      servicioMarketing.obtenerConexionCalendario(usuarioId, orgId).catch(() => null),
    ]);

    asesores = listaAsesores;
    equipos = datosEstructura.equipos;
    supervisores = datosEstructura.supervisores;
    organigrama = datosOrganigrama;
    estadosComerciales = datosEstados;
    auditoriaTraspasos = datosAuditoria;
    datosMarketing = {
      formularios,
      integraciones,
      capturas,
      conexionCalendario,
      organizacionId: orgId,
    };

    if (config) {
      configuracionGeocerca = config;
    }
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Error al cargar datos de configuración y organigrama:", error);
  }

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
      seccionInicial={params.seccion || "asesores"}
      datosMarketing={datosMarketing}
    />
  );
}
