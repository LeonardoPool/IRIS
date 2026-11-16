// ==============================================================================
// IRIS by WYLEN — TIPOS DE IDENTIDAD, TENENCIA Y EQUIPOS
// ==============================================================================
// Lenguaje: Español | Convención: PascalCase / camelCase
// ==============================================================================

export type EstadoOrganizacion = "activo" | "suspendido" | "cancelado";
export type EstadoUsuario = "activo" | "inactivo" | "bloqueado";
export type EstadoMembresia = "activo" | "invitado" | "suspendido";
export type RolEnEquipo = "lider" | "miembro" | "observador";

export interface ConfiguracionOrganizacion {
  zona_horaria: string;
  moneda_predeterminada: string;
  sla_minutos_primera_respuesta: number;
  sitio_web?: string;
  telefono_contacto?: string;
}

export interface Organizacion {
  id: string;
  nombre: string;
  slug: string;
  identificador_fiscal: string | null;
  dominio: string | null;
  estado: EstadoOrganizacion;
  configuracion: ConfiguracionOrganizacion;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo_electronico: string;
  telefono: string | null;
  avatar_url: string | null;
  estado: EstadoUsuario;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Rol {
  id: string;
  organizacion_id: string | null;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  fecha_creacion: string;
  permisos?: Permiso[];
}

export interface Permiso {
  id: string;
  codigo: string;
  modulo: string;
  descripcion: string;
  fecha_creacion: string;
}

export interface Membresia {
  id: string;
  organizacion_id: string;
  usuario_id: string;
  rol_id: string;
  estado: EstadoMembresia;
  es_predeterminada: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  organizacion?: Organizacion;
  usuario?: Usuario;
  rol?: Rol;
}

export interface Equipo {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  lider_usuario_id: string | null;
  color: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  lider?: Usuario | null;
  miembros?: MiembroEquipo[];
  total_miembros?: number;
}

export interface MiembroEquipo {
  id: string;
  organizacion_id: string;
  equipo_id: string;
  usuario_id: string;
  rol_en_equipo: RolEnEquipo;
  fecha_creacion: string;
  usuario?: Usuario;
}

export interface RegistroAuditoria {
  id: string;
  organizacion_id: string;
  usuario_id: string | null;
  accion: string;
  entidad_tipo: string;
  entidad_id: string;
  valores_anteriores: Record<string, unknown> | null;
  valores_nuevos: Record<string, unknown> | null;
  metadatos: Record<string, unknown>;
  direccion_ip: string | null;
  agente_usuario: string | null;
  fecha_creacion: string;
  usuario?: Usuario;
}

export interface ContextoInquilino {
  organizacionId: string;
  organizacion: Organizacion;
  usuarioId: string;
  usuario: Usuario;
  membresiaId: string;
  rol: Rol;
  permisos: string[];
}
