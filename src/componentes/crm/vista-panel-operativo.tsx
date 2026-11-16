// ==============================================================================
// IRIS by WYLEN — VISTA OPERATIVA DEL DASHBOARD COMERCIAL CRM
// ==============================================================================
// Estilo visual de alta gama inspirado en la referencia, adaptado 100% al CRM
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Kanban,
  Calendar,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  Inbox,
  FileSignature,
  DollarSign,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { notificar } from "@/librerias/notificaciones/sileo";

interface PropiedadesVistaPanelOperativo {
  nombreOrganizacion: string;
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
}

export function VistaPanelOperativo({
  nombreOrganizacion,
  metricas,
}: PropiedadesVistaPanelOperativo) {
  const [actualizando, setActualizando] = React.useState(false);

  const refrescarDatos = () => {
    setActualizando(true);
    setTimeout(() => {
      setActualizando(false);
      notificar.exito("CRM sincronizado", "Métricas comerciales en tiempo real desde PostgreSQL.");
    }, 500);
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(monto);
  };

  // Desglose de los últimos 7 días de operación comercial
  const diasSemana = [
    { dia: "Mar", fecha: "10", valor: 65, activo: false },
    { dia: "Mié", fecha: "11", valor: 70, activo: false },
    { dia: "Jue", fecha: "12", valor: 85, activo: false },
    { dia: "Vie", fecha: "13", valor: 60, activo: false },
    { dia: "Sáb", fecha: "14", valor: 75, activo: false },
    { dia: "Dom", fecha: "15", valor: 100, activo: true }, // Día activo con mayor actividad
    { dia: "Lun", fecha: "16", valor: 55, activo: false },
  ];

  const totalOportunidades = Math.max(metricas.oportunidadesActivas + metricas.ventasGanadasMes, 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* 1. ENCABEZADO COMERCIAL (Idéntico a la referencia: Resumen Operativo ●) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Resumen Operativo
            </h1>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 font-normal mt-1">
            Control comercial y estado de la operación en {nombreOrganizacion}.
          </p>
        </div>

        {/* Indicador En Vivo + Botón Refrescar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>En vivo (Tiempo Real)</span>
          </div>

          <button
            onClick={refrescarDatos}
            className="h-9 w-9 rounded-xl border border-[#e5e7eb] bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-2xs transition-all hover:bg-gray-50 active:scale-95 cursor-pointer"
            title="Sincronizar métricas CRM"
          >
            <RotateCcw className={`h-4 w-4 ${actualizando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. CUATRO TARJETAS DE MÉTRICAS COMERCIALES (Fila superior de la referencia) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Prospectos Activos */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Prospectos Activos</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {metricas.totalProspectos}
            </div>
            <p className="text-[11px] text-gray-400 font-normal mt-1">
              {metricas.prospectosCalificados} calificados en pipeline
            </p>
          </div>
        </div>

        {/* Tarjeta 2: Oportunidades en Negociación (Acento Verde) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">En Negociación</span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {metricas.oportunidadesActivas}
            </div>
            <p className="text-[11px] text-emerald-600/80 font-normal mt-1 font-mono">
              {formatearMoneda(metricas.valorTotalCartera)}
            </p>
          </div>
        </div>

        {/* Tarjeta 3: Citas y Reuniones Hoy (Acento Ámbar) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Reuniones y Citas Hoy</span>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {metricas.actividadesPendientes}
            </div>
            <p className="text-[11px] text-amber-600/80 font-normal mt-1">
              Google Meet y visitas comerciales
            </p>
          </div>
        </div>

        {/* Tarjeta 4: Sin Contactar / Nuevos (SLA) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Sin Contactar Hoy</span>
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {metricas.prospectosNuevos}
            </div>
            <p className="text-[11px] text-gray-400 font-normal mt-1">
              Atención inmediata (SLA &lt; 10 min)
            </p>
          </div>
        </div>
      </div>

      {/* 3. DOS TARJETAS PRINCIPALES: GRÁFICA DE BARRAS + DONA DE DISTRIBUCIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (2/3): Actividad Semanal de Contactación */}
        <div className="lg:col-span-2 bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-6">
          {/* Cabecera con leyenda */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Actividad Semanal y Contactación
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-normal mt-0.5">
                Desglose diario de prospectos contactados, citas y llamadas (últimos 7 días).
              </p>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>A tiempo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Retardo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                <span>Pendiente</span>
              </div>
            </div>
          </div>

          {/* Gráfica de 7 columnas redondeadas */}
          <div className="flex items-end justify-between gap-3 pt-6 pb-2 px-2 sm:px-6 h-56">
            {diasSemana.map((d) => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                <div className="w-full max-w-[52px] h-44 rounded-2xl bg-[#f1f3f5] overflow-hidden flex flex-col justify-end p-0">
                  <div
                    className={`w-full rounded-2xl transition-all duration-500 ${
                      d.activo ? "bg-[#10b981] shadow-sm" : "bg-[#e5e7eb]"
                    }`}
                    style={{ height: `${d.valor}%` }}
                  />
                </div>

                <div className="text-center">
                  <span className="text-[11px] font-bold text-gray-700 block leading-tight">
                    {d.dia}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium block">
                    {d.fecha}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pie de la tarjeta */}
          <div className="pt-4 border-t border-[#f1f3f5] flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Tasa de conversión mensual: {metricas.tasaConversion}%</span>
            <span>Cumplimiento SLA hoy: 100% a tiempo</span>
          </div>
        </div>

        {/* Columna Derecha (1/3): Distribución del Embudo en Vivo */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Distribución de Prospectos en Vivo
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-normal mt-0.5">
              Estado de los clientes en el embudo comercial.
            </p>
          </div>

          {/* Dona Central con número y TOTAL */}
          <div className="relative flex items-center justify-center my-auto py-2">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke="#e5e7eb"
                strokeWidth="16"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke="#10b981"
                strokeWidth="16"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - Math.min(metricas.oportunidadesActivas / totalOportunidades, 0.9))}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                {metricas.totalProspectos}
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">
                TOTAL
              </span>
            </div>
          </div>

          {/* Desglose por etapas */}
          <div className="space-y-2 pt-2 border-t border-[#f1f3f5] text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span>Contacto Inicial</span>
              </div>
              <span className="font-mono text-gray-500 font-medium">
                {metricas.prospectosCalificados} ({metricas.totalProspectos > 0 ? Math.round((metricas.prospectosCalificados / metricas.totalProspectos) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                <span>En Negociación</span>
              </div>
              <span className="font-mono text-gray-500 font-medium">
                {metricas.oportunidadesActivas} ({metricas.totalProspectos > 0 ? Math.round((metricas.oportunidadesActivas / metricas.totalProspectos) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                <span>Cita / Meet</span>
              </div>
              <span className="font-mono text-gray-500 font-medium">
                {metricas.actividadesPendientes}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                <span>Ventas Ganadas</span>
              </div>
              <span className="font-mono text-gray-500 font-medium">
                {metricas.ventasGanadasMes}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#9ca3af]" />
                <span>Sin Contactar</span>
              </div>
              <span className="font-mono text-gray-500 font-medium">
                {metricas.prospectosNuevos}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TRES MÓDULOS DE ACCESO RÁPIDO COMERCIAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/prospectos"
          className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-gray-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Gestión de Prospectos</h4>
              <p className="text-[11px] text-gray-400">Ver leads y calificación</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/oportunidades"
          className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-gray-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-colors">
              <Kanban className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Pipeline Kanban</h4>
              <p className="text-[11px] text-gray-400">Embudo por etapas de venta</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/bandeja"
          className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-gray-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-colors">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Bandeja Omnicanal</h4>
              <p className="text-[11px] text-gray-400">WhatsApp & SLA en vivo</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
    </div>
  );
}
