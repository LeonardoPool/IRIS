// ==============================================================================
// IRIS by WYLEN — TIPOS PARA EXPEDIENTE DE ASESORES, SUPERVISIÓN Y PERMISOS
// ==============================================================================
// Lenguaje: Español | Convención: PascalCase / camelCase
// ==============================================================================

import type { Usuario, Equipo, Rol } from "./identidad";

export type EstadoSemaforoSLA = "verde" | "amarillo" | "rojo";

export interface MetricasSlaAsesor {
  tiempo_promedio_min: number;
  porcentaje_cumplimiento: number;
  estado_semaforo: EstadoSemaforoSLA;
  total_casos: number;
  a_tiempo: number;
  con_retardo: number;
}

export interface PermisosPersonalizadosAsesor {
  id?: string;
  organizacion_id: string;
  usuario_id: string;
  puede_ver_todos_los_prospectos: boolean;
  puede_reasignar_casos: boolean;
  puede_exportar_datos: boolean;
  puede_ver_analitica_global: boolean;
  puede_crear_oportunidades: boolean;
  puede_editar_contactos_ajenos: boolean;
  exento_geocerca: boolean; // Si es true, puede acceder sin restricción geográfica
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ExpedienteAsesor extends Usuario {
  nombres?: string | null;
  apellidos?: string | null;
  curp?: string | null;
  rfc?: string | null;
  fecha_ingreso?: string | null;
  fecha_nacimiento?: string | null;
  supervisor_id?: string | null;
  equipo_id?: string | null;
  supervisor?: Usuario | null;
  equipo?: Equipo | null;
  rol?: Rol | null;
  permisos_personalizados?: PermisosPersonalizadosAsesor | null;
  total_prospectos_asignados?: number;
  metricas_sla?: MetricasSlaAsesor;
  rol_jerarquico?: string | null;
  responsable_directo_id?: string | null;
}

export interface ConfiguracionGeocercaYSLA {
  geocerca_activa: boolean;
  geocerca_nombre_lugar: string;
  geocerca_latitud: number;
  geocerca_longitud: number;
  geocerca_radio_metros: number;
  sla_minutos_primera_respuesta: number;
}

export interface DatosCrearAsesor {
  nombres: string;
  apellidos: string;
  correo: string;
  pin: string; // 4 dígitos exactos
  curp: string; // 18 caracteres
  rfc: string; // 12-13 caracteres
  fecha_ingreso: string;
  fecha_nacimiento: string;
  supervisor_id?: string | null;
  equipo_id?: string | null;
  rol_codigo?: "agente_ventas" | "supervisor_atencion";
  permisos?: Partial<PermisosPersonalizadosAsesor>;
}

export interface DatosReasignarCaso {
  tipo_caso: "prospecto" | "conversacion" | "oportunidad";
  caso_id: string;
  nuevo_asesor_id: string;
  motivo?: string;
}

export interface DatosEditarColaborador {
  usuarioId: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string | null;
  curp?: string | null;
  rfc?: string | null;
  estado: "activo" | "inactivo" | "bloqueado";
  rolJerarquico: "asesor" | "coordinador" | "gerente" | "atencion_cliente" | "superadministrador";
  responsableDirectoId?: string | null;
  equipoId?: string | null;
  permisos?: Partial<PermisosPersonalizadosAsesor>;
}
