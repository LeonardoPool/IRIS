// ==============================================================================
// IRIS by WYLEN — TIPOS: ESTRUCTURA ORGANIZACIONAL Y JERARQUÍA DE USUARIOS
// ==============================================================================

export type RolJerarquico =
  | "superadministrador"
  | "gerente"
  | "coordinador"
  | "asesor"
  | "atencion_cliente";

export type TipoMovimientoTraspaso = "traspaso_coordinador" | "traspaso_asesor";

export interface UsuarioJerarquico {
  id: string;
  nombre_completo: string;
  correo_electronico: string;
  telefono: string | null;
  avatar_url: string | null;
  rol_jerarquico: RolJerarquico;
  estado: "activo" | "inactivo" | "bloqueado";
  responsable_directo_id: string | null;
  responsable_directo?: {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol_jerarquico: RolJerarquico;
  } | null;
  equipo_id: string | null;
  equipo_nombre?: string | null;
  coordinadores?: UsuarioJerarquico[];
  asesores?: UsuarioJerarquico[];
  total_leads_asignados?: number;
  fecha_creacion: string;
}

export interface AuditoriaTraspasoPersonal {
  id: string;
  organizacion_id: string;
  usuario_responsable_movimiento_id: string;
  usuario_responsable?: {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
  };
  usuario_transferido_id: string;
  usuario_transferido?: {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol_jerarquico: RolJerarquico;
  };
  responsable_anterior_id: string | null;
  responsable_anterior?: {
    id: string;
    nombre_completo: string;
  } | null;
  responsable_nuevo_id: string;
  responsable_nuevo?: {
    id: string;
    nombre_completo: string;
  };
  tipo_movimiento: TipoMovimientoTraspaso;
  motivo: string | null;
  fecha_movimiento: string;
}

export interface DatosTraspasoPersonal {
  usuarioTransferidoId: string;
  responsableNuevoId: string;
  tipoMovimiento: TipoMovimientoTraspaso;
  motivo?: string;
}

export interface EstructuraOrganigrama {
  superadministradores: UsuarioJerarquico[];
  gerentes: UsuarioJerarquico[];
  personalAtencion: UsuarioJerarquico[];
  totalColaboradores: number;
}
