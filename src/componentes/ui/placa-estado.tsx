// ==============================================================================
// IRIS by WYLEN — COMPONENTE PLACA DE ESTADO (BADGE)
// ==============================================================================

import * as React from "react";
import { cn } from "@/librerias/utilidades/cn";

export interface PropiedadesPlacaEstado extends React.HTMLAttributes<HTMLSpanElement> {
  variante?: "neutro" | "exito" | "advertencia" | "destructivo" | "acento" | "borde";
  tamano?: "sm" | "md";
}

export function PlacaEstado({
  className,
  variante = "neutro",
  tamano = "md",
  children,
  ...props
}: PropiedadesPlacaEstado) {
  const estilosBase = "inline-flex items-center font-medium select-none";

  const estilosVariantes = {
    neutro: "bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)]",
    exito: "bg-[var(--success-background)] text-[var(--success)] border border-[var(--success-border)]",
    advertencia: "bg-[var(--warning-background)] text-[var(--warning)] border border-[var(--warning-border)]",
    destructivo: "bg-[var(--destructive-background)] text-[var(--destructive)] border border-[var(--destructive-border)]",
    acento: "bg-[var(--azul-tenue)] text-[var(--azul-apagado-hover)] border border-[var(--azul-apagado)]/30",
    borde: "border border-[var(--border)] text-[var(--foreground)] bg-transparent",
  };

  const estilosTamanos = {
    sm: "px-2 py-0.5 text-[11px] rounded-[var(--radius-sm)]",
    md: "px-2.5 py-0.5 text-xs rounded-[var(--radius-md)]",
  };

  return (
    <span className={cn(estilosBase, estilosVariantes[variante], estilosTamanos[tamano], className)} {...props}>
      {children}
    </span>
  );
}
