// ==============================================================================
// IRIS by WYLEN — SECCIÓN UNIFICADA: MI TRABAJO (/mi-trabajo)
// ==============================================================================
// Consolida:
// 1. Hoy y vencidas (Llamadas, tareas, reuniones y seguimientos pendientes)
// 2. Tablero de seguimiento (Reutiliza VistaSeguimientoKanban)
// 3. Agenda y Google Calendar (Reutiliza VistaActividades + OAuth Google Meet)
// ==============================================================================

"use client";

import * as React from "react";
import {
  Clock,
  Columns,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Video,
  Phone,
  CheckSquare,
  Eye,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { VistaSeguimientoKanban } from "@/componentes/leads/vista-seguimiento-kanban";
import { VistaActividades } from "@/componentes/crm/vista-actividades";
import {
  FichaUnificadaCliente,
  type SolicitudAbrirFichaCliente,
} from "@/componentes/clientes/ficha-unificada-cliente";
import { accionGenerarUrlConectarGoogle } from "@/acciones/calendario";
import type { Actividad } from "@/tipos/crm";
import type { LeadPool, EstadoComercialLead } from "@/tipos/leads";
import type { ExpedienteAsesor } from "@/tipos/asesores";

export type PestanaMiTrabajo = "hoy" | "seguimiento" | "agenda";

interface PropiedadesVistaMiTrabajo {
  pestanaInicial: PestanaMiTrabajo;
  actividades: Actividad[];
  leadsKanban: LeadPool[];
  estadosKanban: EstadoComercialLead[];
  asesores: ExpedienteAsesor[];
  estadoGoogleCalendar: { conectado: boolean; emailCuenta: string | null };
}

export function VistaMiTrabajo({
  pestanaInicial,
  actividades,
  leadsKanban,
  estadosKanban,
  asesores,
  estadoGoogleCalendar,
}: PropiedadesVistaMiTrabajo) {
  const [pestana, setPestana] = React.useState<PestanaMiTrabajo>(pestanaInicial);
  const [conectandoGoogle, setConectandoGoogle] = React.useState(false);
  const [fichaSolicitud, setFichaSolicitud] = React.useState<SolicitudAbrirFichaCliente | null>(
    null
  );

  const ahoraMs = Date.now();
  const finDeHoy = new Date();
  finDeHoy.setHours(23, 59, 59, 999);
  const finDeHoyMs = finDeHoy.getTime();

  const actividadesPendientes = React.useMemo(
    () => actividades.filter((a) => a.estado !== "completada" && a.estado !== "cancelada"),
    [actividades]
  );

  const actividadesVencidas = React.useMemo(
    () =>
      actividadesPendientes.filter((a) => {
        if (!a.fecha_vencimiento) return false;
        return new Date(a.fecha_vencimiento).getTime() < ahoraMs;
      }),
    [actividadesPendientes, ahoraMs]
  );

  const actividadesHoy = React.useMemo(
    () =>
      actividadesPendientes.filter((a) => {
        if (!a.fecha_vencimiento) return true;
        const ms = new Date(a.fecha_vencimiento).getTime();
        return ms >= ahoraMs && ms <= finDeHoyMs;
      }),
    [actividadesPendientes, ahoraMs, finDeHoyMs]
  );

  const seguimientosUrgentes = React.useMemo(
    () => leadsKanban.slice(0, 8),
    [leadsKanban]
  );

  const manejarConectarGoogle = async () => {
    setConectandoGoogle(true);
    try {
      const res = await accionGenerarUrlConectarGoogle();
      if (res.exito && res.url) {
        window.location.href = res.url;
      } else {
        notificar.error("No se pudo iniciar la conexión", res.error || "Verifica la configuración OAuth.");
      }
    } finally {
      setConectandoGoogle(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Operación Diaria y Seguimiento
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Mi Trabajo</h1>
        </div>

        {/* Estado de Google Calendar */}
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                estadoGoogleCalendar.conectado ? "bg-emerald-500" : "bg-amber-400"
              )}
            />
            <div>
              <span className="font-semibold text-neutral-900 block">
                Google Calendar y Meet
              </span>
              <span className="text-[11px] text-neutral-500">
                {estadoGoogleCalendar.conectado
                  ? estadoGoogleCalendar.emailCuenta || "Sincronizado"
                  : "Pendiente de vincular"}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={conectandoGoogle}
            onClick={manejarConectarGoogle}
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer inline-flex items-center gap-1"
          >
            <Video className="h-3 w-3 text-blue-600" />
            {estadoGoogleCalendar.conectado ? "Revalidar" : "Conectar"}
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Pestañas de Mi Trabajo */}
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Vistas de Mi Trabajo">
        {[
          {
            id: "hoy",
            label: `Hoy y vencidas (${actividadesVencidas.length + actividadesHoy.length})`,
            icono: Clock,
          },
          {
            id: "seguimiento",
            label: `Tablero de seguimiento (${leadsKanban.length})`,
            icono: Columns,
          },
          {
            id: "agenda",
            label: `Agenda completa (${actividades.length})`,
            icono: Calendar,
          },
        ].map((tab) => {
          const Icono = tab.icono;
          const activa = pestana === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPestana(tab.id as PestanaMiTrabajo)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
                activa
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
              )}
            >
              <Icono className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* VISTA 1: HOY Y VENCIDAS */}
      {pestana === "hoy" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {/* Vencidas */}
            <section className="rounded-2xl border border-red-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-red-100 bg-red-50/70 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Actividades Vencidas ({actividadesVencidas.length})</span>
                </div>
              </div>

              {actividadesVencidas.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  Excelente: no tienes actividades vencidas.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {actividadesVencidas.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {act.tipo_actividad === "llamada" ? (
                            <Phone className="h-3.5 w-3.5 text-red-600" />
                          ) : (
                            <CheckSquare className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span className="font-semibold text-neutral-900 truncate">
                            {act.titulo}
                          </span>
                        </div>
                        {act.fecha_vencimiento && (
                          <span className="text-[11px] text-red-600 block mt-0.5">
                            Venció:{" "}
                            {new Date(act.fecha_vencimiento).toLocaleString("es-MX", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                      </div>

                      {(act.prospecto_id || act.contacto_id) && (
                        <button
                          type="button"
                          onClick={() =>
                            setFichaSolicitud({
                              prospectoId: act.prospecto_id,
                              contactoId: act.contacto_id,
                              nombreRespaldo: act.titulo,
                            })
                          }
                          className="shrink-0 rounded-lg border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Ficha 360°
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Programadas para Hoy */}
            <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Agenda de Hoy ({actividadesHoy.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPestana("agenda")}
                  className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  Programar nueva +
                </button>
              </div>

              {actividadesHoy.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  Sin tareas o citas pendientes para el resto del día.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {actividadesHoy.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-neutral-900 block">{act.titulo}</span>
                        <span className="text-[11px] text-neutral-500">
                          {act.tipo_actividad} ·{" "}
                          {act.fecha_vencimiento
                            ? new Date(act.fecha_vencimiento).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Sin hora"}
                        </span>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase text-neutral-700">
                        {act.prioridad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Seguimientos Activos */}
          <div className="lg:col-span-5">
            <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-3">
                <span className="text-xs font-bold text-neutral-900">
                  Seguimientos Comerciales Prioritarios
                </span>
                <button
                  type="button"
                  onClick={() => setPestana("seguimiento")}
                  className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  Abrir Kanban
                </button>
              </div>

              {seguimientosUrgentes.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No hay prospectos en seguimiento en este momento.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {seguimientosUrgentes.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-neutral-50"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-neutral-900 block truncate">
                          {lead.nombre}
                        </span>
                        <span className="text-[11px] text-neutral-500 block truncate">
                          {lead.desarrollo_interes || "Interés por definir"} ·{" "}
                          {lead.estado_comercial?.nombre || "Nuevo"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFichaSolicitud({
                            prospectoId: lead.id,
                            nombreRespaldo: lead.nombre,
                            telefono: lead.telefono,
                            correo: lead.correo_electronico,
                          })
                        }
                        className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer"
                      >
                        Ver Ficha
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* VISTA 2: TABLERO DE SEGUIMIENTO KANBAN */}
      {pestana === "seguimiento" && (
        <VistaSeguimientoKanban
          leadsIniciales={leadsKanban}
          estadosIniciales={estadosKanban}
          asesoresDisponibles={asesores}
        />
      )}

      {/* VISTA 3: AGENDA COMPLETA */}
      {pestana === "agenda" && <VistaActividades actividadesIniciales={actividades} />}

      {/* GAVETA DE FICHA UNIFICADA 360° */}
      <FichaUnificadaCliente
        solicitud={fichaSolicitud}
        alCerrar={() => setFichaSolicitud(null)}
      />
    </div>
  );
}
