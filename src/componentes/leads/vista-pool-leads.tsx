// ==============================================================================
// IRIS by WYLEN — VISTA: POOL DE LEADS (BOLSA CENTRALIZADA MULTIPLATAFORMA)
// ==============================================================================

"use client";

import * as React from "react";
import {
  Flame,
  Globe,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  X,
  MessageCircle,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  Tag,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { accionListarPoolLeads } from "@/acciones/pool-leads";
import type {
  LeadPool,
  ResultadoPaginadoPoolLeads,
  PlataformaOrigenLead,
  FiltrosPoolLeads,
  EstadoComercialLead,
} from "@/tipos/leads";
import type { ExpedienteAsesor } from "@/tipos/asesores";

interface PropiedadesVistaPoolLeads {
  resultadoInicial: ResultadoPaginadoPoolLeads;
  estadosComerciales: EstadoComercialLead[];
  asesoresDisponibles: ExpedienteAsesor[];
  categoriasDisponibles: string[];
}

export function VistaPoolLeads({
  resultadoInicial,
  estadosComerciales,
  asesoresDisponibles,
  categoriasDisponibles,
}: PropiedadesVistaPoolLeads) {
  // Estado local para resultados y filtros reactivos
  const [datos, setDatos] = React.useState<ResultadoPaginadoPoolLeads>(resultadoInicial);
  const [cargando, setCargando] = React.useState(false);

  // Filtros activos
  const [plataformaActiva, setPlataformaActiva] = React.useState<PlataformaOrigenLead | "todas">("todas");
  const [categoriaActiva, setCategoriaActiva] = React.useState<string>("todas");
  const [estadoActivo, setEstadoActivo] = React.useState<string>("todos");
  const [asesorActivo, setAsesorActivo] = React.useState<string>("todos");
  const [busqueda, setBusqueda] = React.useState("");
  const [fechaDesde, setFechaDesde] = React.useState("");
  const [fechaHasta, setFechaHasta] = React.useState("");
  const [paginaActual, setPaginaActual] = React.useState(1);
  const [cantidadPorPagina, setCantidadPorPagina] = React.useState<50 | 100 | 150>(50);

  // Función para consultar con filtros sin recargar la página
  const ejecutarConsulta = React.useCallback(
    async (nuevosFiltros?: Partial<FiltrosPoolLeads>) => {
      setCargando(true);
      try {
        const filtrosFinales: FiltrosPoolLeads = {
          plataforma: nuevosFiltros?.plataforma !== undefined ? nuevosFiltros.plataforma : plataformaActiva,
          categoria: nuevosFiltros?.categoria !== undefined ? nuevosFiltros.categoria : categoriaActiva,
          estadoComercialId: nuevosFiltros?.estadoComercialId !== undefined ? nuevosFiltros.estadoComercialId : estadoActivo,
          agenteId: nuevosFiltros?.agenteId !== undefined ? nuevosFiltros.agenteId : asesorActivo,
          busqueda: nuevosFiltros?.busqueda !== undefined ? nuevosFiltros.busqueda : busqueda,
          fechaDesde: nuevosFiltros?.fechaDesde !== undefined ? nuevosFiltros.fechaDesde : fechaDesde,
          fechaHasta: nuevosFiltros?.fechaHasta !== undefined ? nuevosFiltros.fechaHasta : fechaHasta,
          pagina: nuevosFiltros?.pagina !== undefined ? nuevosFiltros.pagina : paginaActual,
          porPagina: nuevosFiltros?.porPagina !== undefined ? nuevosFiltros.porPagina : cantidadPorPagina,
        };

        const res = await accionListarPoolLeads(filtrosFinales);
        if (res.exito && res.resultado) {
          setDatos(res.resultado);
        } else {
          notificar.error("Error al filtrar", res.error || "No se pudieron obtener los datos.");
        }
      } catch {
        notificar.error("Error", "Ocurrió un error inesperado al conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    },
    [
      plataformaActiva,
      categoriaActiva,
      estadoActivo,
      asesorActivo,
      busqueda,
      fechaDesde,
      fechaHasta,
      paginaActual,
      cantidadPorPagina,
    ]
  );

  // Manejador al seleccionar tarjeta de plataforma
  const manejarSeleccionarPlataforma = (plat: PlataformaOrigenLead | "todas") => {
    const nueva = plataformaActiva === plat ? "todas" : plat;
    setPlataformaActiva(nueva);
    setPaginaActual(1);
    ejecutarConsulta({ plataforma: nueva, pagina: 1 });
  };

  // Manejador de cambio de cantidad por página (50, 100, 150)
  const manejarCambioPorPagina = (nuevaCantidad: 50 | 100 | 150) => {
    setCantidadPorPagina(nuevaCantidad);
    setPaginaActual(1);
    ejecutarConsulta({ porPagina: nuevaCantidad, pagina: 1 });
  };

  // Manejador de paginación
  const manejarCambioPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > datos.totalPaginas) return;
    setPaginaActual(nuevaPagina);
    ejecutarConsulta({ pagina: nuevaPagina });
  };

  // Resetear filtros
  const limpiarFiltros = () => {
    setPlataformaActiva("todas");
    setCategoriaActiva("todas");
    setEstadoActivo("todos");
    setAsesorActivo("todos");
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setPaginaActual(1);
    ejecutarConsulta({
      plataforma: "todas",
      categoria: "todas",
      estadoComercialId: "todos",
      agenteId: "todos",
      busqueda: "",
      fechaDesde: "",
      fechaHasta: "",
      pagina: 1,
    });
  };

  // Etiquetas e iconos visuales para plataformas
  const obtenerBadgePlataforma = (plat: PlataformaOrigenLead) => {
    switch (plat) {
      case "meta_ads":
        return { nombre: "Meta Lead Ads", clase: "bg-sky-50 text-sky-800 border-sky-200" };
      case "facebook":
        return { nombre: "Facebook", clase: "bg-blue-50 text-blue-800 border-blue-200" };
      case "instagram":
        return { nombre: "Instagram", clase: "bg-rose-50 text-rose-800 border-rose-200" };
      case "formulario_web":
        return { nombre: "Formulario Web", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "google_ads":
        return { nombre: "Google Ads", clase: "bg-amber-50 text-amber-800 border-amber-200" };
      case "whatsapp":
        return { nombre: "WhatsApp", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      default:
        return { nombre: "Manual / Directo", clase: "bg-gray-100 text-gray-800 border-gray-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* CABECERA PRINCIPAL CON CONTEXTO Y ACCIÓN DE REFRESH */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e5e7eb] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-900 text-white rounded-xl shadow-2xs">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                Pool de Leads
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Bolsa centralizada de captación omnicanal • Meta Ads, Formularios Web y Redes Sociales
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => ejecutarConsulta()}
            disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-[#e5e7eb] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-gray-500", cargando && "animate-spin")} />
            <span>{cargando ? "Actualizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. PANEL DE TARJETAS POR PLATAFORMA (INTERACTIVAS CON CONTEO REAL) */}
      {/* ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-gray-500" />
            Plataformas de Captación
          </span>
          {plataformaActiva !== "todas" && (
            <button
              onClick={() => manejarSeleccionarPlataforma("todas")}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" /> Ver todas las fuentes
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {datos.metricasPlataformas.map((metrica) => {
            const estaSeleccionada = plataformaActiva === metrica.plataforma;
            return (
              <div
                key={metrica.plataforma}
                onClick={() => manejarSeleccionarPlataforma(metrica.plataforma)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer relative select-none",
                  estaSeleccionada
                    ? "bg-gray-900 text-white border-gray-900 shadow-md ring-2 ring-gray-900 ring-offset-2"
                    : "bg-white border-[#e5e7eb] hover:border-gray-300 hover:shadow-xs text-gray-900"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "p-2 rounded-xl text-xs font-bold",
                      estaSeleccionada ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {metrica.plataforma === "meta_ads" && <Flame className="h-4 w-4" />}
                    {metrica.plataforma === "formulario_web" && <Globe className="h-4 w-4" />}
                    {metrica.plataforma === "facebook" && <Building className="h-4 w-4" />}
                    {metrica.plataforma === "instagram" && <Sparkles className="h-4 w-4" />}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      estaSeleccionada
                        ? "bg-white/20 text-white"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    )}
                  >
                    {metrica.leadsNuevos} nuevos
                  </span>
                </div>

                <div className="mt-3">
                  <span
                    className={cn(
                      "text-2xl font-black block tracking-tight",
                      estaSeleccionada ? "text-white" : "text-gray-900"
                    )}
                  >
                    {metrica.totalLeads}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold block mt-0.5",
                      estaSeleccionada ? "text-gray-200" : "text-gray-500"
                    )}
                  >
                    {metrica.etiqueta}
                  </span>
                </div>

                <div
                  className={cn(
                    "mt-3 pt-2.5 border-t text-[11px] flex items-center justify-between font-medium",
                    estaSeleccionada ? "border-white/10 text-gray-300" : "border-gray-100 text-gray-400"
                  )}
                >
                  <span>En seguimiento: {metrica.leadsEnSeguimiento}</span>
                  <span>Cierres: {metrica.leadsCerrados}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BARRA DE FILTROS AVANZADOS (CATEGORÍA, ESTADO, ASESOR, FECHA) */}
      {/* ==================================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Buscador de prospectos */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                ejecutarConsulta({ busqueda: e.target.value, pagina: 1 });
              }}
              placeholder="Buscar por nombre, teléfono, correo o desarrollo..."
              className="w-full pl-9 pr-4 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 focus:bg-white placeholder-gray-400 font-medium transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Categoría */}
            <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-2.5 py-1.5 text-xs">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={categoriaActiva}
                onChange={(e) => {
                  setCategoriaActiva(e.target.value);
                  ejecutarConsulta({ categoria: e.target.value, pagina: 1 });
                }}
                className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="todas">Todas las categorías</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado Comercial Dinámico */}
            <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-2.5 py-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={estadoActivo}
                onChange={(e) => {
                  setEstadoActivo(e.target.value);
                  ejecutarConsulta({ estadoComercialId: e.target.value, pagina: 1 });
                }}
                className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                {estadosComerciales.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Asesor Asignado */}
            <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-2.5 py-1.5 text-xs">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={asesorActivo}
                onChange={(e) => {
                  setAsesorActivo(e.target.value);
                  ejecutarConsulta({ agenteId: e.target.value, pagina: 1 });
                }}
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

            {/* Botón para limpiar filtros */}
            {(plataformaActiva !== "todas" ||
              categoriaActiva !== "todas" ||
              estadoActivo !== "todos" ||
              asesorActivo !== "todos" ||
              busqueda ||
              fechaDesde) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <X className="h-3.5 w-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TABLA DE LEADS CON PAGINACIÓN SERVER-SIDE */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xs overflow-hidden">
        {/* Barra superior de conteo y selector de registros por página */}
        <div className="p-3.5 px-5 bg-[#fafbfc] border-b border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">
              {datos.totalRegistros} prospectos en total
            </span>
            {plataformaActiva !== "todas" && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                Filtrado por: {plataformaActiva}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Mostrar:</span>
            <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-white p-0.5">
              {[50, 100, 150].map((cant) => (
                <button
                  key={cant}
                  type="button"
                  onClick={() => manejarCambioPorPagina(cant as 50 | 100 | 150)}
                  className={cn(
                    "px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors cursor-pointer",
                    cantidadPorPagina === cant
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {cant}
                </button>
              ))}
            </div>
            <span className="text-gray-400 font-normal">por página</span>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa] text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-4 sm:px-6">Prospecto</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Plataforma</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Estado Comercial</th>
                <th className="py-3 px-4">Asesor Asignado</th>
                <th className="py-3 px-4 text-right">Captación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5] text-xs">
              {datos.leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Flame className="h-8 w-8 mx-auto text-gray-300" />
                      <p className="font-bold text-gray-700 text-sm">No se encontraron prospectos</p>
                      <p className="text-xs text-gray-400">
                        No hay leads que coincidan con los filtros seleccionados o la plataforma activa.
                      </p>
                      <button
                        onClick={limpiarFiltros}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-gray-900 text-white font-bold text-xs"
                      >
                        Ver todos los prospectos
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                datos.leads.map((lead) => {
                  const badgePlat = obtenerBadgePlataforma(lead.plataforma_origen);
                  const fechaStr = new Date(lead.fecha_creacion).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Nombre y desarrollo de interés */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                            {lead.nombre.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate">
                              {lead.nombre}
                            </span>
                            {lead.desarrollo_interes && (
                              <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                <Building className="h-3 w-3 text-gray-400 shrink-0" />
                                {lead.desarrollo_interes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Teléfono y correo */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {lead.telefono ? (
                            <a
                              href={`https://wa.me/${lead.telefono.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-900 font-mono font-medium hover:text-emerald-600 flex items-center gap-1.5"
                            >
                              <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{lead.telefono}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Sin teléfono</span>
                          )}

                          {lead.correo_electronico && (
                            <span className="text-[11px] text-gray-400 block truncate max-w-[180px]">
                              {lead.correo_electronico}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Plataforma de captación */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
                            badgePlat.clase
                          )}
                        >
                          {badgePlat.nombre}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4">
                        {lead.categoria ? (
                          <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            {lead.categoria}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">General</span>
                        )}
                      </td>

                      {/* Estado comercial dinámico */}
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                          style={{
                            backgroundColor: lead.estado_comercial?.color || "#6b7280",
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          {lead.estado_comercial?.nombre || "No contestó"}
                        </span>
                      </td>

                      {/* Asesor Asignado */}
                      <td className="py-3 px-4">
                        {lead.agente_asignado ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {lead.agente_asignado.nombre_completo.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-gray-800 truncate max-w-[130px]">
                              {lead.agente_asignado.nombre_completo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      {/* Fecha de Captación */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-[11px] text-gray-500 font-mono block">
                          {fechaStr}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Server-Side */}
        <div className="p-4 px-6 border-t border-[#e5e7eb] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs text-gray-500 font-medium">
            Página <strong>{datos.paginaActual}</strong> de <strong>{datos.totalPaginas}</strong> (
            {datos.totalRegistros} leads registrados)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => manejarCambioPagina(datos.paginaActual - 1)}
              disabled={datos.paginaActual <= 1 || cargando}
              className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>

            <span className="text-xs font-bold text-gray-800 px-2">
              {datos.paginaActual} / {datos.totalPaginas}
            </span>

            <button
              type="button"
              onClick={() => manejarCambioPagina(datos.paginaActual + 1)}
              disabled={datos.paginaActual >= datos.totalPaginas || cargando}
              className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
