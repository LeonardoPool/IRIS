// ==============================================================================
// IRIS by WYLEN — VISTA: SEGUIMIENTO COMERCIAL (TABLERO KANBAN DRAG & DROP)
// ==============================================================================

"use client";

import * as React from "react";
import {
  Columns,
  Search,
  User,
  Phone,
  Calendar,
  Building,
  Flame,
  Globe,
  Sparkles,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { accionMoverLeadKanban } from "@/acciones/seguimiento";
import type { LeadPool, EstadoComercialLead } from "@/tipos/leads";
import type { ExpedienteAsesor } from "@/tipos/asesores";

interface PropiedadesVistaSeguimientoKanban {
  leadsIniciales: LeadPool[];
  estadosIniciales: EstadoComercialLead[];
  asesoresDisponibles: ExpedienteAsesor[];
}

export function VistaSeguimientoKanban({
  leadsIniciales,
  estadosIniciales,
  asesoresDisponibles,
}: PropiedadesVistaSeguimientoKanban) {
  const [leads, setLeads] = React.useState<LeadPool[]>(leadsIniciales);
  const [estados] = React.useState<EstadoComercialLead[]>(estadosIniciales);
  const [leadArrastradoId, setLeadArrastradoId] = React.useState<string | null>(null);
  const [columnaDestinoId, setColumnaDestinoId] = React.useState<string | null>(null);

  // Filtros en tablero
  const [busqueda, setBusqueda] = React.useState("");
  const [asesorFiltro, setAsesorFiltro] = React.useState<string>("todos");
  const [leadSeleccionadoId, setLeadSeleccionadoId] = React.useState<string | null>(
    leadsIniciales[0]?.id || null
  );

  // Filtrar leads según buscador y asesor
  const leadsFiltrados = React.useMemo(() => {
    return leads.filter((l) => {
      const coincideAsesor =
        asesorFiltro === "todos" || l.agente_asignado_id === asesorFiltro;
      const coincideBusqueda =
        !busqueda ||
        l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (l.telefono && l.telefono.includes(busqueda)) ||
        (l.desarrollo_interes &&
          l.desarrollo_interes.toLowerCase().includes(busqueda.toLowerCase()));
      return coincideAsesor && coincideBusqueda;
    });
  }, [leads, busqueda, asesorFiltro]);

  // Lead actualmente seleccionado para la barra lateral
  const leadSeleccionado = React.useMemo(() => {
    return leads.find((l) => l.id === leadSeleccionadoId) || leads[0] || null;
  }, [leads, leadSeleccionadoId]);

  // Manejo de Drag and Drop
  const manejarDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setLeadArrastradoId(leadId);
  };

  const manejarDragOver = (e: React.DragEvent<HTMLDivElement>, estadoId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (columnaDestinoId !== estadoId) {
      setColumnaDestinoId(estadoId);
    }
  };

  const manejarDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const manejarDrop = async (e: React.DragEvent<HTMLDivElement>, nuevoEstadoId: string) => {
    e.preventDefault();
    setColumnaDestinoId(null);
    const leadId = e.dataTransfer.getData("text/plain") || leadArrastradoId;
    setLeadArrastradoId(null);

    if (!leadId) return;

    const leadActual = leads.find((l) => l.id === leadId);
    if (!leadActual || leadActual.estado_comercial_id === nuevoEstadoId) {
      return; // No hubo cambio de columna
    }

    const estadoAnteriorId = leadActual.estado_comercial_id;
    const nuevoEstado = estados.find((est) => est.id === nuevoEstadoId);

    // 1. Actualización optimista inmediata en la UI
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              estado_comercial_id: nuevoEstadoId,
              estado_comercial: nuevoEstado || l.estado_comercial,
              fecha_actualizacion: new Date().toISOString(),
            }
          : l
      )
    );

    notificar.exito(
      "Estado actualizado",
      `"${leadActual.nombre}" se movió a "${nuevoEstado?.nombre || "Nueva etapa"}".`
    );

    // 2. Persistencia en Servidor y BD con auditoría
    try {
      const res = await accionMoverLeadKanban(leadId, nuevoEstadoId);
      if (!res.exito) {
        // Revertir optimismo en caso de error
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  estado_comercial_id: estadoAnteriorId,
                }
              : l
          )
        );
        notificar.error("Error al actualizar", res.error || "No se pudo sincronizar el cambio.");
      }
    } catch {
      // Revertir
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                estado_comercial_id: estadoAnteriorId,
              }
            : l
        )
      );
      notificar.error("Error", "Error de conexión con el servidor.");
    }
  };

  // Icono para la plataforma
  const renderIconoPlataforma = (plat: string) => {
    switch (plat) {
      case "meta_ads":
        return <Flame className="h-3 w-3 text-sky-600" />;
      case "facebook":
        return <Globe className="h-3 w-3 text-blue-600" />;
      case "instagram":
        return <Sparkles className="h-3 w-3 text-rose-600" />;
      default:
        return <Globe className="h-3 w-3 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. CABECERA Y FILTROS DEL TABLERO KANBAN */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e5e7eb] pb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-900 text-white rounded-xl shadow-2xs">
            <Columns className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Seguimiento Comercial
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Tablero de avance con estados dinámicos y persistencia Drag & Drop
            </p>
          </div>
        </div>

        {/* Filtros rápidos en cabecera */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar prospecto o teléfono..."
              className="pl-8 pr-3 py-1.5 bg-white border border-[#e5e7eb] rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 w-48 sm:w-60"
            />
          </div>

          {/* Selector de Asesor */}
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e7eb] rounded-xl px-2.5 py-1.5 text-xs">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={asesorFiltro}
              onChange={(e) => setAsesorFiltro(e.target.value)}
              className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los asesores</option>
              {asesoresDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre_completo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. ESPACIO DE TRABAJO: BARRA LATERAL + TABLERO KANBAN */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ================================================================ */}
        {/* BARRA LATERAL (LISTADO Y RESUMEN DEL PROSPECTO) */}
        {/* ================================================================ */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-[#e5e7eb] shadow-2xs p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-500" />
              Prospectos ({leadsFiltrados.length})
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Activos
            </span>
          </div>

          {/* Listado compacto con scroll */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100 pr-1 space-y-1">
            {leadsFiltrados.slice(0, 15).map((l) => {
              const estaSeleccionado = leadSeleccionado?.id === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => setLeadSeleccionadoId(l.id)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all cursor-pointer text-left select-none",
                    estaSeleccionado
                      ? "bg-gray-900 text-white shadow-xs"
                      : "hover:bg-gray-50 text-gray-900"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{l.nombre}</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                        estaSeleccionado
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {l.estado_comercial?.nombre || "Nuevo"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] block mt-0.5 truncate",
                      estaSeleccionado ? "text-gray-300" : "text-gray-400"
                    )}
                  >
                    {l.desarrollo_interes || "Interés General"} • {l.telefono || "Sin tel"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Ficha rápida del prospecto seleccionado */}
          {leadSeleccionado && (
            <div className="pt-3 border-t border-gray-100 space-y-3 bg-[#fafbfc] -mx-4 -mb-4 p-4 rounded-b-2xl">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block">
                Ficha del Prospecto
              </span>

              <div className="space-y-1.5 text-xs">
                <span className="font-extrabold text-gray-900 block text-sm">
                  {leadSeleccionado.nombre}
                </span>

                {leadSeleccionado.telefono && (
                  <a
                    href={`https://wa.me/${leadSeleccionado.telefono.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{leadSeleccionado.telefono}</span>
                  </a>
                )}

                {leadSeleccionado.correo_electronico && (
                  <span className="text-gray-500 block truncate">
                    {leadSeleccionado.correo_electronico}
                  </span>
                )}

                <div className="pt-2 border-t border-gray-200/60 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Plataforma:</span>
                    <span className="font-bold text-gray-800 uppercase">
                      {leadSeleccionado.plataforma_origen}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-gray-500">
                    <span>Asesor:</span>
                    <span className="font-bold text-gray-800 truncate max-w-[120px]">
                      {leadSeleccionado.agente_asignado?.nombre_completo || "Sin asignar"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-gray-500">
                    <span>Estado:</span>
                    <span
                      className="font-bold px-2 py-0.5 rounded-full text-white text-[10px]"
                      style={{
                        backgroundColor: leadSeleccionado.estado_comercial?.color || "#6b7280",
                      }}
                    >
                      {leadSeleccionado.estado_comercial?.nombre || "No contestó"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* ÁREA PRINCIPAL: TABLERO KANBAN DINÁMICO */}
        {/* ================================================================ */}
        <div className="flex-1 w-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[750px]">
            {estados.map((columna) => {
              // Obtener leads de esta columna
              const leadsColumna = leadsFiltrados.filter(
                (l) => l.estado_comercial_id === columna.id || (!l.estado_comercial_id && columna.orden === 1)
              );

              const estaSobre = columnaDestinoId === columna.id;

              return (
                <div
                  key={columna.id}
                  onDragOver={(e) => manejarDragOver(e, columna.id)}
                  onDragLeave={manejarDragLeave}
                  onDrop={(e) => manejarDrop(e, columna.id)}
                  className={cn(
                    "flex-1 min-w-[240px] max-w-[340px] bg-[#f8f9fa] rounded-2xl border flex flex-col transition-all min-h-[500px]",
                    estaSobre
                      ? "border-gray-900 bg-gray-100/70 ring-2 ring-gray-900/10 shadow-md"
                      : "border-[#e5e7eb]"
                  )}
                >
                  {/* Cabecera de la Columna */}
                  <div className="p-3.5 border-b border-[#e5e7eb] flex items-center justify-between bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: columna.color }}
                      />
                      <span className="font-extrabold text-xs text-gray-900 tracking-tight">
                        {columna.nombre}
                      </span>
                    </div>

                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {leadsColumna.length}
                    </span>
                  </div>

                  {/* Lista de Tarjetas de la Columna */}
                  <div className="p-3 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-16rem)]">
                    {leadsColumna.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-3 text-center">
                        <span className="text-[11px] text-gray-400 font-medium">
                          Arrastra un prospecto aquí
                        </span>
                      </div>
                    ) : (
                      leadsColumna.map((lead) => {
                        const esArrastrado = leadArrastradoId === lead.id;
                        const fechaStr = new Date(lead.fecha_creacion).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                        });

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => manejarDragStart(e, lead.id)}
                            onClick={() => setLeadSeleccionadoId(lead.id)}
                            className={cn(
                              "p-3.5 bg-white rounded-xl border border-[#e5e7eb] shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing select-none group",
                              esArrastrado && "opacity-40 scale-95 border-dashed border-gray-400",
                              leadSeleccionadoId === lead.id && "ring-1.5 ring-gray-900"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <span className="text-xs font-bold text-gray-900 group-hover:text-gray-950 truncate">
                                {lead.nombre}
                              </span>
                              <span className="text-[9px] font-mono text-gray-400 shrink-0">
                                {fechaStr}
                              </span>
                            </div>

                            {lead.desarrollo_interes && (
                              <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-2 truncate">
                                <Building className="h-3 w-3 text-gray-400 shrink-0" />
                                {lead.desarrollo_interes}
                              </span>
                            )}

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                              {/* Teléfono */}
                              {lead.telefono ? (
                                <a
                                  href={`https://wa.me/${lead.telefono.replace(/[^\d]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3 text-emerald-600" />
                                  <span>{lead.telefono}</span>
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Sin teléfono</span>
                              )}

                              {/* Plataforma */}
                              <div className="flex items-center gap-1 text-gray-400 font-semibold uppercase text-[9px]">
                                {renderIconoPlataforma(lead.plataforma_origen)}
                                <span className="truncate max-w-[80px]">
                                  {lead.plataforma_origen}
                                </span>
                              </div>
                            </div>

                            {/* Asesor asignado */}
                            {lead.agente_asignado && (
                              <div className="mt-2 pt-1.5 border-t border-gray-50 flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                <div className="h-4 w-4 rounded-full bg-gray-200 text-gray-700 font-bold text-[8px] flex items-center justify-center shrink-0">
                                  {lead.agente_asignado.nombre_completo.charAt(0)}
                                </div>
                                <span className="truncate">{lead.agente_asignado.nombre_completo}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
