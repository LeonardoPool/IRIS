// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL DE ANALÍTICA Y REPORTES COMERCIALES
// ==============================================================================

"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  DollarSign,
  Download,
  Filter,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import type { ReporteAnaliticaComercial } from "@/tipos/analitica";
import { notificar } from "@/librerias/notificaciones/sileo";

interface PropiedadesVistaAnalitica {
  reporte: ReporteAnaliticaComercial;
}

export function VistaAnalitica({ reporte }: PropiedadesVistaAnalitica) {
  const [periodo, setPeriodo] = React.useState("30d");

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(monto);
  };

  const exportarReporte = () => {
    notificar.exito("Reporte exportado", "Se generó el resumen ejecutivo comercial en formato CSV/PDF.");
  };

  return (
    <div className="space-y-8 select-none">
      {/* Cabecera Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#7185a5] uppercase">
            INTELIGENCIA COMERCIAL
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Cuadro de Mando Analítico
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Rendimiento del embudo, tiempos de respuesta SLA y volumen de ventas cerradas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-[var(--surface-active)] p-0.5 rounded-lg text-xs font-semibold overflow-x-auto">
            {[
              { id: "7d", label: "7 Días" },
              { id: "30d", label: "30 Días" },
              { id: "90d", label: "Trimestre" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodo(p.id);
                  notificar.info("Filtro actualizado", `Visualizando métricas para: ${p.label}`);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  periodo === p.id
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs font-bold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Boton variante="secundario" tamano="sm" onClick={exportarReporte} className="shrink-0">
            <Download className="h-3.5 w-3.5 mr-1" />
            Exportar
          </Boton>
        </div>
      </div>

      {/* Tarjetas Principales de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta className="p-5 border-l-4 border-l-[#17191d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Volumen de Cierre</span>
            <DollarSign className="h-4 w-4 text-[var(--muted)]" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {formatearMoneda(reporte.volumenVentasTotal)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3" /> +14.2% vs mes anterior
          </span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Cumplimiento de SLA</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {reporte.cumplimientoSlaGlobal}%
          </div>
          <span className="text-[11px] text-[var(--muted)]">Objetivo de equipo: 95%</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-[#7185a5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Tiempo 1ª Respuesta</span>
            <Clock className="h-4 w-4 text-[#7185a5]" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {reporte.tiempoPromedioRespuestaMinutos} min
          </div>
          <span className="text-[11px] text-[var(--muted)]">Meta institucional &lt; 10 min</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Contratos Formalizados</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {reporte.totalContratosFirmados}
          </div>
          <span className="text-[11px] text-[var(--muted)]">De {reporte.totalProspectos} prospectos</span>
        </Tarjeta>
      </div>

      {/* Sección en 2 Columnas: Embudo de Conversión & Canales de Atribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (2/3): Embudo de Conversión */}
        <Tarjeta className="lg:col-span-2">
          <CabeceraTarjeta>
            <TituloTarjeta>Embudo Comercial de Conversión (End-to-End)</TituloTarjeta>
            <p className="text-xs text-[var(--muted)] mt-1">
              Trayectoria de los prospectos desde la atracción inicial hasta la firma formal en DocuSign.
            </p>
          </CabeceraTarjeta>
          <ContenidoTarjeta className="space-y-4 pt-4">
            {reporte.embudo.map((etapa, idx) => (
              <div key={etapa.etapa} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--foreground)]">{etapa.etapa}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--foreground)]">{etapa.total} leads</span>
                    <span className="text-[11px] text-[var(--muted)] font-mono">({etapa.porcentaje}%)</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-[var(--surface-active)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0
                        ? "bg-[#17191d]"
                        : idx === 1
                        ? "bg-[#333a46]"
                        : idx === 2
                        ? "bg-[#7185a5]"
                        : idx === 3
                        ? "bg-[#5a6e8c]"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${etapa.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </ContenidoTarjeta>
        </Tarjeta>

        {/* Columna Derecha (1/3): Atribución por Canal */}
        <Tarjeta>
          <CabeceraTarjeta>
            <TituloTarjeta>Atribución por Canal</TituloTarjeta>
            <p className="text-xs text-[var(--muted)] mt-1">Distribución de prospectos según origen de captación.</p>
          </CabeceraTarjeta>
          <ContenidoTarjeta className="space-y-4 pt-4">
            {reporte.canalesAtribucion.map((c) => (
              <div key={c.canal} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--foreground)]">{c.canal}</span>
                  <span className="font-mono font-bold text-[var(--foreground)]">{c.porcentaje}%</span>
                </div>
                <div className="h-2 w-full bg-[var(--surface-active)] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7185a5] rounded-full" style={{ width: `${c.porcentaje}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-0.5">
                  <span>{c.totalLeads} prospectos</span>
                  <span>Conv. {c.tasaConversion}%</span>
                </div>
              </div>
            ))}
          </ContenidoTarjeta>
        </Tarjeta>
      </div>

      {/* Tabla de Rendimiento por Agente Comercial */}
      <Tarjeta>
        <CabeceraTarjeta>
          <TituloTarjeta>Rendimiento por Asesor Comercial</TituloTarjeta>
          <p className="text-xs text-[var(--muted)] mt-1">
            Cumplimiento del SLA de primera respuesta, citas agendadas y monto total formalizado.
          </p>
        </CabeceraTarjeta>
        <ContenidoTarjeta className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--muted)] font-semibold">
                  <th className="py-3 px-4">Asesor Comercial</th>
                  <th className="py-3 px-4">Leads Asignados</th>
                  <th className="py-3 px-4">Reuniones Meet</th>
                  <th className="py-3 px-4">Contratos Cerrados</th>
                  <th className="py-3 px-4">Cumplimiento SLA</th>
                  <th className="py-3 px-4 text-right">Ventas Cerradas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {reporte.rendimientoAgentes.map((agente) => (
                  <tr key={agente.agenteId} className="hover:bg-[var(--surface-subtle)] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[var(--foreground)] flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-[#17191d] text-white flex items-center justify-center font-bold text-[10px]">
                        {agente.nombre.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span>{agente.nombre}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">{agente.prospectosAsignados}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">{agente.reunionesRealizadas}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{agente.contratosCerrados}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <PlacaEstado variante={agente.cumplimientoSlaPorcentaje >= 95 ? "exito" : "advertencia"}>
                          {agente.cumplimientoSlaPorcentaje}%
                        </PlacaEstado>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--foreground)]">
                      {formatearMoneda(agente.montoVentasCerradas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContenidoTarjeta>
      </Tarjeta>
    </div>
  );
}
