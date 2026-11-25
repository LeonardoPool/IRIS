// ==============================================================================
// IRIS by WYLEN — LAYOUT PRINCIPAL DEL PANEL AUTENTICADO
// ==============================================================================

import * as React from "react";
import { ArmazonPanel } from "@/componentes/estructura/armazo-panel";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { resolverRolJerarquicoEfectivo } from "@/librerias/seguridad/navegacion-rol";

export const instant = false;

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  let contexto = null;
  try {
    contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  } catch {
    contexto = null;
  }

  const nombreOrganizacion = contexto?.organizacion?.nombre || "Inmobiliaria Horizonte WYLEN";
  const nombreUsuario = contexto?.usuario?.nombre_completo || "Administrador IRIS";
  const correoUsuario = contexto?.usuario?.correo_electronico || "admin@iris.wylen.com";
  const nombreRol = contexto?.rol?.nombre || "Administrador de Organización";
  const rolJerarquico = resolverRolJerarquicoEfectivo(contexto);
  const permisos = contexto?.permisos || [];

  return (
    <ArmazonPanel
      nombreOrganizacion={nombreOrganizacion}
      nombreUsuario={nombreUsuario}
      correoUsuario={correoUsuario}
      nombreRol={nombreRol}
      rolJerarquico={rolJerarquico}
      permisos={permisos}
    >
      {children}
    </ArmazonPanel>
  );
}
