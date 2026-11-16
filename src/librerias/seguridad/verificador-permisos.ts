// ==============================================================================
// IRIS by WYLEN — VERIFICADOR DE PERMISOS SERVER-SIDE (RBAC)
// ==============================================================================

import { obtenerContextoInquilino } from "./contexto-inquilino";
import type { ContextoInquilino } from "@/tipos/identidad";

export class ErrorAccesoDenegado extends Error {
  public readonly permisoRequerido: string;

  constructor(permisoRequerido: string) {
    super(`Acceso denegado: Se requiere el permiso '${permisoRequerido}' para realizar esta operación.`);
    this.name = "ErrorAccesoDenegado";
    this.permisoRequerido = permisoRequerido;
  }
}

/**
 * Comprueba si el usuario en sesión cuenta con un permiso específico.
 * Devuelve un booleano sin lanzar excepción.
 */
export async function verificarPermiso(permisoCodigo: string): Promise<boolean> {
  try {
    const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
    if (!contexto) return false;

    // El administrador de organización tiene acceso total
    if (contexto.rol.codigo === "administrador_organizacion") {
      return true;
    }

    return contexto.permisos.includes(permisoCodigo);
  } catch {
    return false;
  }
}

/**
 * Exige un permiso obligatorio en Server Actions o Route Handlers.
 * Si el usuario no lo posee, arroja `ErrorAccesoDenegado`.
 */
export async function exigirPermiso(permisoCodigo: string): Promise<ContextoInquilino> {
  const contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: true });
  if (!contexto) {
    throw new Error("Sesión no disponible.");
  }

  if (contexto.rol.codigo === "administrador_organizacion") {
    return contexto;
  }

  if (!contexto.permisos.includes(permisoCodigo)) {
    throw new ErrorAccesoDenegado(permisoCodigo);
  }

  return contexto;
}
