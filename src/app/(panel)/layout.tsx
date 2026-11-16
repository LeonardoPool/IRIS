// ==============================================================================
// IRIS by WYLEN — LAYOUT PRINCIPAL DEL PANEL AUTENTICADO
// ==============================================================================

import * as React from "react";
import { BarraLateral } from "@/componentes/estructura/barra-lateral";
import { CabeceraSuperior } from "@/componentes/estructura/cabecera-superior";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";

export const instant = false;

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  let contexto = null;
  try {
    contexto = await obtenerContextoInquilino({ redirigirSiNoAutenticado: false });
  } catch {
    contexto = null;
  }

  // Si no hay sesión activa aún (ej. modo desarrollo), usamos valores de demostración estructurados
  const nombreOrganizacion = contexto?.organizacion?.nombre || "Inmobiliaria Horizonte WYLEN";
  const nombreUsuario = contexto?.usuario?.nombre_completo || "Leonardo Pool";
  const correoUsuario = contexto?.usuario?.correo_electronico || "leonardo@horizonte.wylen.io";
  const nombreRol = contexto?.rol?.nombre || "Administrador de Organización";

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Barra Lateral de Navegación Fija */}
      <BarraLateral nombreOrganizacion={nombreOrganizacion} rolUsuario={nombreRol} />

      {/* Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <CabeceraSuperior
          nombreOrganizacion={nombreOrganizacion}
          nombreUsuario={nombreUsuario}
          correoUsuario={correoUsuario}
          nombreRol={nombreRol}
        />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
