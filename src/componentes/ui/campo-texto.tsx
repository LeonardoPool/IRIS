// ==============================================================================
// IRIS by WYLEN — COMPONENTE CAMPO DE TEXTO (INPUT)
// ==============================================================================

import * as React from "react";
import { cn } from "@/librerias/utilidades/cn";

export interface PropiedadesCampoTexto extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string;
  error?: string;
  ayuda?: string;
}

export const CampoTexto = React.forwardRef<HTMLInputElement, PropiedadesCampoTexto>(
  ({ className, etiqueta, error, ayuda, id, ...props }, ref) => {
    const idGenerado = React.useId();
    const idInput = id || idGenerado;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {etiqueta && (
          <label htmlFor={idInput} className="text-xs font-semibold tracking-wide text-[var(--muted)] select-none">
            {etiqueta}
          </label>
        )}
        <input
          id={idInput}
          ref={ref}
          className={cn(
            "h-10 w-full px-3.5 text-sm bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-[var(--radius-md)] transition-all placeholder:text-[var(--muted-light)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[var(--destructive)] focus-visible:border-[var(--destructive)] focus-visible:ring-[var(--destructive)]",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-[var(--destructive)] font-medium">{error}</span>}
        {ayuda && !error && <span className="text-xs text-[var(--muted)]">{ayuda}</span>}
      </div>
    );
  }
);

CampoTexto.displayName = "CampoTexto";
