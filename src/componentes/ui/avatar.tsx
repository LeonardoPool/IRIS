// ==============================================================================
// IRIS by WYLEN — COMPONENTE AVATAR
// ==============================================================================

import * as React from "react";
import { cn } from "@/librerias/utilidades/cn";

export interface PropiedadesAvatar extends React.HTMLAttributes<HTMLDivElement> {
  nombre?: string;
  urlImagen?: string | null;
  tamano?: "sm" | "md" | "lg";
}

export function Avatar({ className, nombre = "U", urlImagen, tamano = "md", ...props }: PropiedadesAvatar) {
  const estilosTamanos = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  const iniciales = nombre
    .split(" ")
    .map((parte) => parte[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-[var(--azul-tenue)] text-[var(--azul-apagado-hover)] font-semibold select-none overflow-hidden shrink-0 border border-[var(--border)]",
        estilosTamanos[tamano],
        className
      )}
      {...props}
    >
      {urlImagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlImagen} alt={nombre} className="h-full w-full object-cover" />
      ) : (
        <span>{iniciales || "U"}</span>
      )}
    </div>
  );
}
