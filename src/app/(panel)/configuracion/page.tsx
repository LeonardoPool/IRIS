// ==============================================================================
// IRIS by WYLEN — PÁGINA DE CONFIGURACIÓN Y ASESORES (SERVER COMPONENT)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import {
  listarAsesoresDeOrganizacion,
  listarEquiposYSupervisores,
  obtenerConfiguracionGeocercaYSLA,
} from "@/servicios/asesores";
import { VistaAsesores } from "@/componentes/configuracion/vista-asesores";

export const instant = false;

export default async function PaginaConfiguracion() {
  let asesores: any[] = [];
  let equipos: any[] = [];
  let supervisores: any[] = [];
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
    if (contexto?.organizacionId) {
      const [listaAsesores, datosEstructura, config] = await Promise.all([
        listarAsesoresDeOrganizacion(contexto.organizacionId),
        listarEquiposYSupervisores(contexto.organizacionId),
        obtenerConfiguracionGeocercaYSLA(contexto.organizacionId),
      ]);
      asesores = listaAsesores;
      equipos = datosEstructura.equipos;
      supervisores = datosEstructura.supervisores;
      if (config) {
        configuracionGeocerca = config;
      }
    }
  } catch (error) {
    console.error("Error al cargar datos de asesores y geocerca:", error);
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
      { id: "sup-1", nombre_completo: "Administrador IRIS", correo_electronico: "admin@iris.wylen.com" },
      { id: "sup-2", nombre_completo: "Carlos Méndez (Líder Ventas)", correo_electronico: "carlos@horizonte.wylen.io" },
    ];
  }

  return (
    <VistaAsesores
      asesoresIniciales={asesores}
      equiposIniciales={equipos}
      supervisoresIniciales={supervisores}
      configuracionGeocercaInicial={configuracionGeocerca}
    />
  );
}
