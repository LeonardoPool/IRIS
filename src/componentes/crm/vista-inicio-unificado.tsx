// ==============================================================================
// IRIS by WYLEN — VISTA UNIFICADA DE INICIO (RESUMEN OPERATIVO + ANALÍTICA)
// ==============================================================================

"use client";

import * as React from "react";
import { LayoutDashboard, BarChart3 } from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { VistaPanelOperativo } from "@/componentes/crm/vista-panel-operativo";
import { VistaAnalitica } from "@/componentes/analitica/vista-analitica";
import type { ReporteAnaliticaComercial } from "@/tipos/analitica";
import type { RolJerarquicoIRIS } from "@/librerias/seguridad/navegacion-rol";

interface PropiedadesVistaInicioUnificado {
  nombreOrganizacion: string;
  rol: RolJerarquicoIRIS;
  puedeVerAnalitica: boolean;
  vistaInicial: "resumen" | "analitica";
  metricas: {
    totalProspectos: number;
    prospectosNuevos: number;
    prospectosCalificados: number;
    oportunidadesActivas: number;
    valorTotalCartera: number;
    tasaConversion: number;
    ventasGanadasMes: number;
    actividadesPendientes: number;
  };
  reporteAnalitica: ReporteAnaliticaComercial | null;
}

export function VistaInicioUnificado({
  nombreOrganizacion,
  rol,
  puedeVerAnalitica,
  vistaInicial,
  metricas,
  reporteAnalitica,
}: PropiedadesVistaInicioUnificado) {
  const [vista, setVista] = React.useState<"resumen" | "analitica">(vistaInicial);

  return (
    <div className="space-y-6">
      {puedeVerAnalitica && reporteAnalitica && (
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setVista("resumen")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-colors cursor-pointer",
                vista === "resumen"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Resumen Operativo
            </button>
            <button
              type="button"
              onClick={() => setVista("analitica")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-colors cursor-pointer",
                vista === "analitica"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analítica Comercial
            </button>
          </div>

          <span className="text-[11px] font-medium text-neutral-500 capitalize">
            Perfil activo: {rol.replace("_", " ")}
          </span>
        </div>
      )}

      {vista === "analitica" && puedeVerAnalitica && reporteAnalitica ? (
        <div className="max-w-7xl mx-auto">
          <VistaAnalitica reporte={reporteAnalitica} />
        </div>
      ) : (
        <VistaPanelOperativo nombreOrganizacion={nombreOrganizacion} metricas={metricas} />
      )}
    </div>
  );
}
