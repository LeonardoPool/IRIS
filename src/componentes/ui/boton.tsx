// ==============================================================================
// IRIS by WYLEN — COMPONENTE BOTÓN
// ==============================================================================

import * as React from "react";
import { cn } from "@/librerias/utilidades/cn";
import { Loader2 } from "lucide-react";

export interface PropiedadesBoton extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "borde" | "fantasma" | "destructivo" | "acento";
  tamano?: "sm" | "md" | "lg" | "icono";
  cargando?: boolean;
}

export const Boton = React.forwardRef<HTMLButtonElement, PropiedadesBoton>(
  ({ className, variante = "primario", tamano = "md", cargando = false, disabled, children, ...props }, ref) => {
    const estilosBase =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const estilosVariantes = {
      primario:
        "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 active:scale-[0.99] focus-visible:ring-[var(--primary)]",
      secundario:
        "bg-[var(--surface-active)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--border)]",
      borde:
        "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--azul-apagado)]",
      fantasma:
        "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--border)]",
      destructivo:
        "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 focus-visible:ring-[var(--destructive)]",
      acento:
        "bg-[var(--azul-apagado)] text-white hover:bg-[var(--azul-apagado-hover)] active:scale-[0.99] focus-visible:ring-[var(--azul-apagado)]",
    };

    const estilosTamanos = {
      sm: "h-8 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5",
      md: "h-10 px-4 text-sm rounded-[var(--radius-md)] gap-2",
      lg: "h-12 px-6 text-base rounded-[var(--radius-lg)] gap-2.5",
      icono: "h-10 w-10 p-0 rounded-[var(--radius-md)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        className={cn(estilosBase, estilosVariantes[variante], estilosTamanos[tamano], className)}
        {...props}
      >
        {cargando && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Boton.displayName = "Boton";
