// ==============================================================================
// IRIS by WYLEN — RESOLUCIÓN DE ROL JERÁRQUICO Y NAVEGACIÓN POR ROL
// ==============================================================================
// Nota de seguridad: La visibilidad del menú mejora la UX, pero cada página
// y Server Action valida autorización efectiva en el servidor.
// ==============================================================================

import type { ContextoInquilino } from "@/tipos/identidad";

export type RolJerarquicoIRIS =
  | "superadministrador"
  | "gerente"
  | "coordinador"
  | "asesor"
  | "atencion_cliente";

export interface ElementoNavegacionConfig {
  id: string;
  nombre: string;
  href: string;
  badge?: string;
}

export function resolverRolJerarquicoEfectivo(
  contexto: ContextoInquilino | null
): RolJerarquicoIRIS {
  if (!contexto) {
    return "asesor";
  }

  const correo = (contexto.usuario?.correo_electronico || "").toLowerCase();
  const rolCodigo = (contexto.rol?.codigo || "").toLowerCase();
  const permisos = contexto.permisos || [];

  if (
    correo === "admin@iris.wylen.com" ||
    correo.startsWith("admin@") ||
    rolCodigo === "administrador_organizacion" ||
    rolCodigo === "super_admin" ||
    rolCodigo === "admin_organizacion" ||
    permisos.includes("organizacion:administrar")
  ) {
    return "superadministrador";
  }

  if (rolCodigo === "gerente_ventas" || rolCodigo === "gerente") {
    return "gerente";
  }

  if (
    rolCodigo === "supervisor_atencion" ||
    rolCodigo === "coordinador" ||
    permisos.includes("equipos:gestionar")
  ) {
    return "coordinador";
  }

  if (rolCodigo === "atencion_cliente") {
    return "atencion_cliente";
  }

  return "asesor";
}

export function puedeVerAnalitica(rol: RolJerarquicoIRIS, permisos: string[] = []): boolean {
  return (
    rol === "superadministrador" ||
    rol === "gerente" ||
    rol === "coordinador" ||
    permisos.includes("reportes:ver")
  );
}

export function puedeAccederConfiguracion(rol: RolJerarquicoIRIS, permisos: string[] = []): boolean {
  return (
    rol === "superadministrador" ||
    rol === "gerente" ||
    permisos.includes("configuracion:administrar") ||
    permisos.includes("organizacion:administrar")
  );
}

export function puedeGestionarMarketing(rol: RolJerarquicoIRIS, permisos: string[] = []): boolean {
  return (
    rol === "superadministrador" ||
    rol === "gerente" ||
    permisos.includes("configuracion:administrar") ||
    permisos.includes("organizacion:administrar")
  );
}

export function puedeVerContratosGlobales(rol: RolJerarquicoIRIS, permisos: string[] = []): boolean {
  return (
    rol === "superadministrador" ||
    rol === "gerente" ||
    rol === "coordinador" ||
    permisos.includes("contratos:gestionar")
  );
}

export function puedeUsarCotizador(rol: RolJerarquicoIRIS, permisos: string[] = []): boolean {
  if (rol === "atencion_cliente" && !permisos.includes("oportunidades:gestionar")) {
    return false;
  }
  return true;
}

export function obtenerRutasVisiblesPorRol(
  rol: RolJerarquicoIRIS,
  permisos: string[] = []
): string[] {
  const rutas = [
    "/panel-control",
    "/bandeja",
    "/mi-trabajo",
    "/clientes",
    "/desarrollos",
  ];

  if (puedeUsarCotizador(rol, permisos)) {
    rutas.push("/cotizador");
  }

  rutas.push("/recursos");

  if (puedeAccederConfiguracion(rol, permisos)) {
    rutas.push("/configuracion");
  }

  return rutas;
}
