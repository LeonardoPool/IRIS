// ==============================================================================
// IRIS by WYLEN — COMPONENTE TARJETA (CARD)
// ==============================================================================

import * as React from "react";
import { cn } from "@/librerias/utilidades/cn";

export function Tarjeta({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CabeceraTarjeta({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5 border-b border-[var(--border-subtle)]", className)} {...props} />;
}

export function TituloTarjeta({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function DescripcionTarjeta({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[var(--muted)] mt-1", className)} {...props} />;
}

export function ContenidoTarjeta({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function PieTarjeta({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-4 bg-[var(--surface-hover)] border-t border-[var(--border-subtle)] flex items-center justify-between", className)}
      {...props}
    />
  );
}
