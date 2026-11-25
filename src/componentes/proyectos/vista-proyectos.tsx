// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL: GESTIÓN DE DESARROLLOS, INVENTARIO Y PLANOS SVG
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-005, IRIS-DEC-009, IRIS-DEC-010, IRIS-DEC-013
// Estructura jerárquica: Desarrolladora -> Desarrollo -> Etapas -> Manzanas -> Unidades
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Plus,
  Layers,
  Grid,
  FileSpreadsheet,
  Search,
  History,
  CheckCircle2,
  FolderTree,
  Sliders,
  Calculator,
  X,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { VisorEditorPlanoSVG } from "@/componentes/proyectos/visor-editor-plano-svg";
import { ModalImportarInventario } from "@/componentes/proyectos/modal-importar-inventario";
import {
  accionObtenerEstructuraDesarrollo,
  accionCrearDesarrolladora,
  accionGuardarDesarrollo,
  accionCrearEtapaDesarrollo,
  accionCrearManzanaDesarrollo,
  accionGuardarUnidadInmobiliaria,
  accionObtenerHistorialUnidad,
} from "@/acciones/proyectos";
import {
  calcularResumenInventario,
  type Desarrolladora,
  type DesarrolloInmobiliario,
  type EtapaDesarrollo,
  type ManzanaDesarrollo,
  type UnidadInmobiliaria,
  type HistorialDisponibilidadUnidad,
  PlanoInteractivo,
  VinculoPlanoUnidad,
  EstadoDisponibilidadUnidad,
} from "@/tipos/proyectos";

interface PropiedadesVistaProyectos {
  desarrolladorasIniciales: Desarrolladora[];
  desarrollosIniciales: DesarrolloInmobiliario[];
  estructuraInicial: {
    desarrollo: DesarrolloInmobiliario | null;
    etapas: EtapaDesarrollo[];
    manzanas: ManzanaDesarrollo[];
    unidades: UnidadInmobiliaria[];
    planos: PlanoInteractivo[];
    vinculosPlanoActivo: VinculoPlanoUnidad[];
  };
  svgDemoFallback: string;
  puedeAdministrar: boolean;
}

export function VistaProyectos({
  desarrolladorasIniciales,
  desarrollosIniciales,
  estructuraInicial,
  svgDemoFallback,
  puedeAdministrar,
}: PropiedadesVistaProyectos) {
  const [desarrolladoras, setDesarrolladoras] = React.useState(desarrolladorasIniciales);
  const [desarrollos, setDesarrollos] = React.useState(desarrollosIniciales);
  const [desarrolloActivo, setDesarrolloActivo] = React.useState<DesarrolloInmobiliario | null>(
    estructuraInicial.desarrollo || desarrollosIniciales[0] || null
  );
  const [etapas, setEtapas] = React.useState<EtapaDesarrollo[]>(estructuraInicial.etapas);
  const [manzanas, setManzanas] = React.useState<ManzanaDesarrollo[]>(estructuraInicial.manzanas);
  const [unidades, setUnidades] = React.useState<UnidadInmobiliaria[]>(estructuraInicial.unidades);
  const [planos, setPlanos] = React.useState<PlanoInteractivo[]>(estructuraInicial.planos);
  const [vinculosPlano, setVinculosPlano] = React.useState<VinculoPlanoUnidad[]>(
    estructuraInicial.vinculosPlanoActivo
  );

  // Pestañas del espacio de trabajo
  const [pestana, setPestana] = React.useState<"plano_svg" | "inventario" | "jerarquia" | "configuracion">("plano_svg");
  const [cargandoDesarrollo, setCargandoDesarrollo] = React.useState(false);

  // Filtros de tabla de inventario
  const [busquedaUnidad, setBusquedaUnidad] = React.useState("");
  const [filtroEstadoTabla, setFiltroEstadoTabla] = React.useState<string>("todos");
  const [filtroEtapaTabla, setFiltroEtapaTabla] = React.useState<string>("todas");

  // Modales administrativos
  const [modalImportarAbierto, setModalImportarAbierto] = React.useState(false);
  const [modalDesarrolloAbierto, setModalDesarrolloAbierto] = React.useState(false);
  const [modalDesarrolladoraAbierto, setModalDesarrolladoraAbierto] = React.useState(false);
  const [modalUnidadAbierto, setModalUnidadAbierto] = React.useState(false);
  const [unidadEditando, setUnidadEditando] = React.useState<UnidadInmobiliaria | null>(null);

  // Cajón de expediente e historial auditable de una unidad
  const [unidadDetalleHistorial, setUnidadDetalleHistorial] = React.useState<UnidadInmobiliaria | null>(null);
  const [historialUnidad, setHistorialUnidad] = React.useState<HistorialDisponibilidadUnidad[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = React.useState(false);

  // Formularios rápidos
  const [formDevNombre, setFormDevNombre] = React.useState("");
  const [formDevDesarrolladoraId, setFormDevDesarrolladoraId] = React.useState(
    desarrolladorasIniciales[0]?.id || ""
  );
  const [formDevTipo, setFormDevTipo] = React.useState<"lotes_campestres" | "lotes_residenciales" | "vertical_departamentos" | "horizontal_casas">("lotes_campestres");
  const [formDevUbicacion, setFormDevUbicacion] = React.useState("");
  const [formDevDescripcion, setFormDevDescripcion] = React.useState("");
  const [formDevPrecioDesde, setFormDevPrecioDesde] = React.useState("385000");
  const [formDevEstadoPub, setFormDevEstadoPub] = React.useState<"borrador" | "activo">("activo");

  // Formulario Nueva Desarrolladora
  const [formDesNombre, setFormDesNombre] = React.useState("");
  const [formDesRazonSocial, setFormDesRazonSocial] = React.useState("");

  // Formulario Etapa y Manzana
  const [formEtapaNombre, setFormEtapaNombre] = React.useState("");
  const [formEtapaCodigo, setFormEtapaCodigo] = React.useState("");
  const [formManzanaNombre, setFormManzanaNombre] = React.useState("");
  const [formManzanaCodigo, setFormManzanaCodigo] = React.useState("");
  const [formManzanaEtapaId, setFormManzanaEtapaId] = React.useState(etapas[0]?.id || "");

  // Formulario Unidad
  const [formUniClave, setFormUniClave] = React.useState("");
  const [formUniEtapaId, setFormUniEtapaId] = React.useState(etapas[0]?.id || "");
  const [formUniManzanaId, setFormUniManzanaId] = React.useState(manzanas[0]?.id || "");
  const [formUniSuperficie, setFormUniSuperficie] = React.useState("350");
  const [formUniFrente, setFormUniFrente] = React.useState("10");
  const [formUniFondo, setFormUniFondo] = React.useState("35");
  const [formUniPrecioLista, setFormUniPrecioLista] = React.useState("385000");
  const [formUniPrecioPromo, setFormUniPrecioPromo] = React.useState("");
  const [formUniEstado, setFormUniEstado] = React.useState<EstadoDisponibilidadUnidad>("disponible");
  const [formUniMotivo, setFormUniMotivo] = React.useState("");

  const resumenActual = React.useMemo(() => calcularResumenInventario(unidades), [unidades]);

  const cambiarDesarrolloActivo = async (nuevoDesarrolloId: string) => {
    setCargandoDesarrollo(true);
    try {
      const res = await accionObtenerEstructuraDesarrollo(nuevoDesarrolloId);
      if (res.exito && "desarrollo" in res && res.desarrollo) {
        setDesarrolloActivo(res.desarrollo);
        setEtapas(res.etapas || []);
        setManzanas(res.manzanas || []);
        setUnidades(res.unidades || []);
        setPlanos(res.planos || []);
        setVinculosPlano(res.vinculosPlanoActivo || []);
      }
    } finally {
      setCargandoDesarrollo(false);
    }
  };

  const abrirInspectorUnidad = async (unidad: UnidadInmobiliaria) => {
    setUnidadDetalleHistorial(unidad);
    setCargandoHistorial(true);
    try {
      const res = await accionObtenerHistorialUnidad(unidad.id);
      if (res.exito && "historial" in res && res.historial) {
        setHistorialUnidad(res.historial);
      } else {
        setHistorialUnidad([]);
      }
    } finally {
      setCargandoHistorial(false);
    }
  };

  const abrirModalEditarUnidad = (unidad?: UnidadInmobiliaria) => {
    if (unidad) {
      setUnidadEditando(unidad);
      setFormUniClave(unidad.clave_comercial);
      setFormUniEtapaId(unidad.etapa_id || etapas[0]?.id || "");
      setFormUniManzanaId(unidad.manzana_id || manzanas[0]?.id || "");
      setFormUniSuperficie(String(unidad.superficie_m2));
      setFormUniFrente(unidad.frente_m ? String(unidad.frente_m) : "");
      setFormUniFondo(unidad.fondo_m ? String(unidad.fondo_m) : "");
      setFormUniPrecioLista(String(unidad.precio_lista));
      setFormUniPrecioPromo(unidad.precio_promocional ? String(unidad.precio_promocional) : "");
      setFormUniEstado(unidad.estado_disponibilidad);
      setFormUniMotivo("");
    } else {
      setUnidadEditando(null);
      setFormUniClave("");
      setFormUniEtapaId(etapas[0]?.id || "");
      setFormUniManzanaId(manzanas[0]?.id || "");
      setFormUniSuperficie("350");
      setFormUniFrente("10");
      setFormUniFondo("35");
      setFormUniPrecioLista("385000");
      setFormUniPrecioPromo("");
      setFormUniEstado("disponible");
      setFormUniMotivo("");
    }
    setModalUnidadAbierto(true);
  };

  const manejarGuardarUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desarrolloActivo) return;

    const res = await accionGuardarUnidadInmobiliaria({
      id: unidadEditando?.id || null,
      desarrolloId: desarrolloActivo.id,
      etapaId: formUniEtapaId || null,
      manzanaId: formUniManzanaId || null,
      claveComercial: formUniClave,
      identificadorPlanoSvg: formUniClave.trim().toUpperCase(),
      tipoUnidad: "lote",
      superficieM2: Number(formUniSuperficie),
      frenteM: formUniFrente ? Number(formUniFrente) : null,
      fondoM: formUniFondo ? Number(formUniFondo) : null,
      precioLista: Number(formUniPrecioLista),
      precioPromocional: formUniPrecioPromo ? Number(formUniPrecioPromo) : null,
      moneda: desarrolloActivo.moneda,
      estadoDisponibilidad: formUniEstado,
      motivoCambioEstado: formUniMotivo || undefined,
    });

    if (res.exito && "unidad" in res && res.unidad) {
      const uGuardada = res.unidad;
      setUnidades((prev) =>
        unidadEditando
          ? prev.map((u) => (u.id === uGuardada.id ? uGuardada : u))
          : [...prev, uGuardada]
      );
      setModalUnidadAbierto(false);
      notificar.exito(
        unidadEditando ? "Unidad actualizada" : "Unidad registrada",
        `La unidad ${uGuardada.clave_comercial} se guardó y auditó en el inventario.`
      );
    } else {
      notificar.error("Error", res.error || "No se pudo guardar la unidad.");
    }
  };

  const manejarCrearDesarrolladora = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await accionCrearDesarrolladora({
      nombre: formDesNombre,
      razonSocial: formDesRazonSocial || null,
      colorMarca: "#111827",
    });
    if (res.exito && "desarrolladora" in res && res.desarrolladora) {
      setDesarrolladoras((prev) => [...prev, res.desarrolladora!]);
      setFormDevDesarrolladoraId(res.desarrolladora.id);
      setModalDesarrolladoraAbierto(false);
      setFormDesNombre("");
      setFormDesRazonSocial("");
      notificar.exito("Desarrolladora registrada", res.desarrolladora.nombre);
    } else {
      notificar.error("Error", res.error || "No se pudo crear la desarrolladora.");
    }
  };

  const manejarGuardarNuevoDesarrollo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await accionGuardarDesarrollo({
      desarrolladoraId: formDevDesarrolladoraId || desarrolladoras[0]?.id,
      nombre: formDevNombre,
      tipoDesarrollo: formDevTipo,
      ubicacionTexto: formDevUbicacion || null,
      descripcion: formDevDescripcion || null,
      moneda: "MXN",
      precioDesde: Number(formDevPrecioDesde) || 0,
      amenidades: [],
      estadoPublicacion: formDevEstadoPub,
    });

    if (res.exito && "desarrollo" in res && res.desarrollo) {
      setDesarrollos((prev) => [res.desarrollo!, ...prev]);
      setModalDesarrolloAbierto(false);
      await cambiarDesarrolloActivo(res.desarrollo.id);
      notificar.exito(
        formDevEstadoPub === "borrador" ? "Avance guardado en borrador" : "Desarrollo publicado",
        res.desarrollo.nombre
      );
    } else {
      notificar.error("Error", res.error || "No se pudo guardar el desarrollo.");
    }
  };

  const manejarCrearEtapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desarrolloActivo) return;
    const res = await accionCrearEtapaDesarrollo({
      desarrolloId: desarrolloActivo.id,
      nombre: formEtapaNombre,
      codigo: formEtapaCodigo,
      orden: etapas.length + 1,
      estado: "activa",
    });
    if (res.exito && "etapa" in res && res.etapa) {
      setEtapas((prev) => [...prev, res.etapa!]);
      setFormManzanaEtapaId(res.etapa.id);
      setFormEtapaNombre("");
      setFormEtapaCodigo("");
      notificar.exito("Etapa creada", res.etapa.nombre);
    } else {
      notificar.error("Error", res.error || "No se pudo crear la etapa.");
    }
  };

  const manejarCrearManzana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desarrolloActivo) return;
    const res = await accionCrearManzanaDesarrollo({
      desarrolloId: desarrolloActivo.id,
      etapaId: formManzanaEtapaId || etapas[0]?.id,
      nombre: formManzanaNombre,
      codigo: formManzanaCodigo,
      orden: manzanas.length + 1,
    });
    if (res.exito && "manzana" in res && res.manzana) {
      setManzanas((prev) => [...prev, res.manzana!]);
      setFormManzanaNombre("");
      setFormManzanaCodigo("");
      notificar.exito("Manzana creada", res.manzana.nombre);
    } else {
      notificar.error("Error", res.error || "No se pudo crear la manzana.");
    }
  };

  const unidadesFiltradas = React.useMemo(() => {
    return unidades.filter((u) => {
      if (filtroEstadoTabla !== "todos" && u.estado_disponibilidad !== filtroEstadoTabla) return false;
      if (filtroEtapaTabla !== "todas" && u.etapa_id !== filtroEtapaTabla) return false;
      if (busquedaUnidad.trim()) {
        const q = busquedaUnidad.trim().toLowerCase();
        return (
          u.clave_comercial.toLowerCase().includes(q) ||
          (u.numero_lote_unidad || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unidades, filtroEstadoTabla, filtroEtapaTabla, busquedaUnidad]);

  const formatearMoneda = (monto: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: desarrolloActivo?.moneda || "MXN",
      maximumFractionDigits: 0,
    }).format(monto);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* CABECERA DEL MÓDULO Y SELECTOR DE DESARROLLO ACTIVO */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {desarrolloActivo?.desarrolladora?.nombre || "INDOMO Desarrollos"}
            </span>
            {desarrolloActivo && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                  desarrolloActivo.estado_publicacion === "activo"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                )}
              >
                {desarrolloActivo.estado_publicacion}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={desarrolloActivo?.id || ""}
              onChange={(e) => cambiarDesarrolloActivo(e.target.value)}
              disabled={cargandoDesarrollo}
              className="text-base sm:text-lg font-extrabold text-gray-900 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-1.5 focus:outline-none focus:border-gray-900 cursor-pointer"
            >
              {desarrollos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>

            {desarrolloActivo?.ubicacion_texto && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {desarrolloActivo.ubicacion_texto}
              </span>
            )}
          </div>
        </div>

        {puedeAdministrar && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalDesarrolladoraAbierto(true)}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Nueva Desarrolladora</span>
            </button>

            <button
              type="button"
              onClick={() => setModalImportarAbierto(true)}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Importar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setModalDesarrolloAbierto(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Desarrollo</span>
            </button>
          </div>
        )}
      </div>

      {/* FRANJA DE MÉTRICAS EN VIVO DEL INVENTARIO DEL DESARROLLO */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-gray-500 block">Total Unidades</span>
          <span className="text-xl font-extrabold text-gray-900 tabular-nums">
            {resumenActual.total_unidades}
          </span>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-700 block">Disponibles</span>
          <span className="text-xl font-extrabold text-emerald-700 tabular-nums">
            {resumenActual.disponibles}
          </span>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-amber-700 block">Apartadas</span>
          <span className="text-xl font-extrabold text-amber-700 tabular-nums">
            {resumenActual.apartadas}
          </span>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-red-700 block">Vendidas</span>
          <span className="text-xl font-extrabold text-red-700 tabular-nums">
            {resumenActual.vendidas}
          </span>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-gray-500 block">Bloqueadas</span>
          <span className="text-xl font-extrabold text-gray-700 tabular-nums">
            {resumenActual.bloqueadas}
          </span>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-gray-500 block">Valor Disponible</span>
          <span className="text-sm font-extrabold text-gray-900 tabular-nums block mt-1">
            {formatearMoneda(resumenActual.valor_disponible)}
          </span>
        </div>
      </div>

      {/* NAVEGACIÓN DE PESTAÑAS DEL DESARROLLO */}
      <div className="flex items-center gap-1.5 bg-[#eceef1] p-1 rounded-xl w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setPestana("plano_svg")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            pestana === "plano_svg" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Plano Interactivo SVG</span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("inventario")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            pestana === "inventario" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Inventario de Unidades ({unidades.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("jerarquia")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            pestana === "jerarquia" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <FolderTree className="h-3.5 w-3.5" />
          <span>Etapas y Manzanas ({etapas.length} / {manzanas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("configuracion")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            pestana === "configuracion" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Ficha del Proyecto</span>
        </button>
      </div>

      {/* PESTAÑA 1: PLANO INTERACTIVO SVG Y EDITOR */}
      {pestana === "plano_svg" && desarrolloActivo && (
        <VisorEditorPlanoSVG
          desarrolloId={desarrolloActivo.id}
          nombreDesarrollo={desarrolloActivo.nombre}
          moneda={desarrolloActivo.moneda}
          unidades={unidades}
          etapas={etapas}
          manzanas={manzanas}
          planos={planos}
          vinculosIniciales={vinculosPlano}
          svgDemoFallback={svgDemoFallback}
          puedeAdministrar={puedeAdministrar}
          alSeleccionarUnidadDetalle={abrirInspectorUnidad}
          alActualizarPlanosYVinculos={(nuevoPlano, nuevosVinculos) => {
            setPlanos((prev) => [
              nuevoPlano,
              ...prev.map((p) => ({ ...p, es_activo: false })),
            ]);
            setVinculosPlano(nuevosVinculos);
          }}
        />
      )}

      {/* PESTAÑA 2: INVENTARIO DE UNIDADES */}
      {pestana === "inventario" && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaUnidad}
                  onChange={(e) => setBusquedaUnidad(e.target.value)}
                  placeholder="Buscar por clave comercial..."
                  className="pl-8 pr-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-medium w-56 focus:outline-none focus:border-gray-900"
                />
              </div>

              <select
                value={filtroEtapaTabla}
                onChange={(e) => setFiltroEtapaTabla(e.target.value)}
                className="px-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold"
              >
                <option value="todas">Todas las Etapas</option>
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>{et.nombre}</option>
                ))}
              </select>

              <select
                value={filtroEstadoTabla}
                onChange={(e) => setFiltroEstadoTabla(e.target.value)}
                className="px-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold"
              >
                <option value="todos">Todos los Estados</option>
                <option value="disponible">Disponible</option>
                <option value="apartado">Apartado</option>
                <option value="vendido">Vendido</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>

            {puedeAdministrar && (
              <button
                type="button"
                onClick={() => abrirModalEditarUnidad()}
                className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Alta de Unidad</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-500">
                  <th className="py-3 px-4">Clave Comercial</th>
                  <th className="py-3 px-4">Etapa / Manzana</th>
                  <th className="py-3 px-4">Superficie</th>
                  <th className="py-3 px-4">Dimensiones</th>
                  <th className="py-3 px-4">Precio de Lista</th>
                  <th className="py-3 px-4">ID Plano SVG</th>
                  <th className="py-3 px-4">Disponibilidad</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unidadesFiltradas.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4 font-extrabold text-gray-900">{u.clave_comercial}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {u.etapa?.codigo || "—"} · {u.manzana?.codigo || "—"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {Number(u.superficie_m2).toFixed(2)} m²
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {u.frente_m && u.fondo_m ? `${u.frente_m} × ${u.fondo_m} m` : "—"}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {formatearMoneda(Number(u.precio_lista))}
                      {u.precio_promocional && (
                        <span className="block text-[10px] text-emerald-700 font-semibold">
                          Promo: {formatearMoneda(Number(u.precio_promocional))}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      #{u.identificador_plano_svg || u.clave_comercial}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize",
                          u.estado_disponibilidad === "disponible"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : u.estado_disponibilidad === "apartado"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : u.estado_disponibilidad === "vendido"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {u.estado_disponibilidad}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      {u.estado_disponibilidad === "disponible" && desarrolloActivo && (
                        <Link
                          href={`/cotizador?desarrollo=${desarrolloActivo.id}&unidades=${u.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold"
                        >
                          <Calculator className="h-3 w-3" />
                          <span>Cotizar</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirInspectorUnidad(u)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
                      >
                        Historial
                      </button>
                      {puedeAdministrar && (
                        <button
                          type="button"
                          onClick={() => abrirModalEditarUnidad(u)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ESTRUCTURA JERÁRQUICA (ETAPAS Y MANZANAS) */}
      {pestana === "jerarquia" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900">
              Árbol Jerárquico: {desarrolloActivo?.desarrolladora?.nombre || "Desarrolladora"} →{" "}
              {desarrolloActivo?.nombre}
            </h3>

            <div className="space-y-3">
              {etapas.map((et) => {
                const manzanasEtapa = manzanas.filter((m) => m.etapa_id === et.id);
                return (
                  <div key={et.id} className="p-3.5 rounded-2xl border border-gray-200 bg-[#f8f9fa] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-gray-900">{et.nombre}</span>
                        <span className="ml-2 font-mono text-[11px] text-gray-500">({et.codigo})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-700">
                        {et.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3 border-l-2 border-gray-300">
                      {manzanasEtapa.map((mza) => {
                        const totalUnidadesMza = unidades.filter((u) => u.manzana_id === mza.id).length;
                        return (
                          <div
                            key={mza.id}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-800 block">{mza.nombre}</span>
                              <span className="text-[10px] font-mono text-gray-400">{mza.codigo}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 font-bold text-gray-700">
                              {totalUnidadesMza} lotes
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {puedeAdministrar && (
            <div className="lg:col-span-5 space-y-4">
              <form
                onSubmit={manejarCrearEtapa}
                className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3 text-xs"
              >
                <h4 className="font-extrabold text-gray-900">Agregar Nueva Etapa al Desarrollo</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formEtapaNombre}
                      onChange={(e) => setFormEtapaNombre(e.target.value)}
                      placeholder="Ej. Etapa 2"
                      className="w-full px-3 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Código *</label>
                    <input
                      type="text"
                      required
                      value={formEtapaCodigo}
                      onChange={(e) => setFormEtapaCodigo(e.target.value)}
                      placeholder="ETAPA-2"
                      className="w-full px-3 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-xl uppercase"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
                >
                  Registrar Etapa
                </button>
              </form>

              <form
                onSubmit={manejarCrearManzana}
                className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3 text-xs"
              >
                <h4 className="font-extrabold text-gray-900">Agregar Nueva Manzana</h4>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Etapa *</label>
                  <select
                    value={formManzanaEtapaId}
                    onChange={(e) => setFormManzanaEtapaId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-xl font-semibold"
                  >
                    {etapas.map((et) => (
                      <option key={et.id} value={et.id}>{et.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formManzanaNombre}
                      onChange={(e) => setFormManzanaNombre(e.target.value)}
                      placeholder="Manzana C"
                      className="w-full px-3 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Código *</label>
                    <input
                      type="text"
                      required
                      value={formManzanaCodigo}
                      onChange={(e) => setFormManzanaCodigo(e.target.value)}
                      placeholder="MZA-C"
                      className="w-full px-3 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-xl uppercase"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
                >
                  Registrar Manzana
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: FICHA TÉCNICA DEL PROYECTO */}
      {pestana === "configuracion" && desarrolloActivo && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-extrabold text-gray-900">
            Ficha Comercial y Geográfica — {desarrolloActivo.nombre}
          </h3>
          <p className="text-gray-600 leading-relaxed max-w-3xl">
            {desarrolloActivo.descripcion || "Sin descripción registrada."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Desarrolladora Responsable</span>
              <span className="font-bold text-gray-900">
                {desarrolloActivo.desarrolladora?.nombre || "INDOMO Desarrollos"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Coordenadas GPS</span>
              <span className="font-mono font-bold text-gray-900">
                {desarrolloActivo.latitud || "21.0845"}, {desarrolloActivo.longitud || "-89.5123"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Superficie Promedio por Lote</span>
              <span className="font-bold text-gray-900">
                {resumenActual.superficie_promedio_m2} m²
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA / EDICIÓN DE UNIDAD */}
      {modalUnidadAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={manejarGuardarUnidad}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">
                {unidadEditando ? `Editar Unidad ${unidadEditando.clave_comercial}` : "Alta de Unidad Inmobiliaria"}
              </h3>
              <button
                type="button"
                onClick={() => setModalUnidadAbierto(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Clave Comercial / ID SVG *</label>
                <input
                  type="text"
                  required
                  value={formUniClave}
                  onChange={(e) => setFormUniClave(e.target.value)}
                  placeholder="SOL-A07"
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-bold uppercase"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Estado de Inventario *</label>
                <select
                  value={formUniEstado}
                  onChange={(e) => setFormUniEstado(e.target.value as EstadoDisponibilidadUnidad)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-bold capitalize"
                >
                  <option value="disponible">Disponible</option>
                  <option value="apartado">Apartado</option>
                  <option value="vendido">Vendido</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Superficie (m²) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formUniSuperficie}
                  onChange={(e) => setFormUniSuperficie(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Precio de Lista *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formUniPrecioLista}
                  onChange={(e) => setFormUniPrecioLista(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            {unidadEditando && (
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Motivo de actualización (para bitácora auditable)
                </label>
                <input
                  type="text"
                  value={formUniMotivo}
                  onChange={(e) => setFormUniMotivo(e.target.value)}
                  placeholder="Ej. Actualización de lista de precios o bloqueo administrativo"
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalUnidadAbierto(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
              >
                Guardar Unidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: NUEVO DESARROLLO CON GUARDADO DE BORRADOR */}
      {modalDesarrolloAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={manejarGuardarNuevoDesarrollo}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">Registrar Nuevo Desarrollo Inmobiliario</h3>
              <button
                type="button"
                onClick={() => setModalDesarrolloAbierto(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Desarrolladora Responsable *</label>
                <select
                  value={formDevDesarrolladoraId}
                  onChange={(e) => setFormDevDesarrolladoraId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-semibold"
                >
                  {desarrolladoras.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre Comercial del Desarrollo *</label>
                <input
                  type="text"
                  required
                  value={formDevNombre}
                  onChange={(e) => setFormDevNombre(e.target.value)}
                  placeholder="Ej. Reserva Yucalpetén"
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Ubicación Geográfica</label>
                <input
                  type="text"
                  value={formDevUbicacion}
                  onChange={(e) => setFormDevUbicacion(e.target.value)}
                  placeholder="Mérida, Yucatán"
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Descripción General</label>
                <textarea
                  rows={2}
                  value={formDevDescripcion}
                  onChange={(e) => setFormDevDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="submit"
                onClick={() => setFormDevEstadoPub("borrador")}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Guardar Avance (Borrador)
              </button>
              <button
                type="submit"
                onClick={() => setFormDevEstadoPub("activo")}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
              >
                Publicar Desarrollo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: NUEVA DESARROLLADORA */}
      {modalDesarrolladoraAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={manejarCrearDesarrolladora}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">Alta de Desarrolladora Inmobiliaria</h3>
              <button
                type="button"
                onClick={() => setModalDesarrolladoraAbierto(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Nombre Comercial *</label>
              <input
                type="text"
                required
                value={formDesNombre}
                onChange={(e) => setFormDesNombre(e.target.value)}
                placeholder="Ej. INDOMO Desarrollos"
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Razón Social</label>
              <input
                type="text"
                value={formDesRazonSocial}
                onChange={(e) => setFormDesRazonSocial(e.target.value)}
                placeholder="INDOMO Desarrollos Patrimoniales S.A. de C.V."
                className="w-full px-3 py-2 bg-[#f8f9fa] border border-gray-200 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalDesarrolladoraAbierto(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
              >
                Registrar Desarrolladora
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: IMPORTACIÓN MASIVA CSV */}
      {desarrolloActivo && (
        <ModalImportarInventario
          abierto={modalImportarAbierto}
          desarrolloId={desarrolloActivo.id}
          nombreDesarrollo={desarrolloActivo.nombre}
          monedaDesarrollo={desarrolloActivo.moneda}
          alCerrar={() => setModalImportarAbierto(false)}
          alImportacionExitosa={() => cambiarDesarrolloActivo(desarrolloActivo.id)}
        />
      )}

      {/* CAJÓN DE EXPEDIENTE E HISTORIAL AUDITABLE DE LA UNIDAD */}
      {unidadDetalleHistorial && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl border-l border-gray-200 flex flex-col justify-between overflow-y-auto space-y-4 text-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Expediente e Historial de Unidad
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {unidadDetalleHistorial.clave_comercial}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUnidadDetalleHistorial(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8f9fa] border border-gray-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Superficie:</span>
                  <strong className="text-gray-900">{unidadDetalleHistorial.superficie_m2} m²</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio de Lista:</span>
                  <strong className="text-gray-900">
                    {formatearMoneda(Number(unidadDetalleHistorial.precio_lista))}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado Actual:</span>
                  <strong className="capitalize text-gray-900">
                    {unidadDetalleHistorial.estado_disponibilidad}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Versión de Concurrencia:</span>
                  <strong className="font-mono text-gray-700">v{unidadDetalleHistorial.version_registro}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-blue-600" />
                  Bitácora Auditable de Disponibilidad
                </h4>

                {cargandoHistorial ? (
                  <p className="text-gray-400 py-4 text-center">Cargando historial...</p>
                ) : historialUnidad.length === 0 ? (
                  <div className="p-3 rounded-xl border border-gray-200 text-gray-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Estado inicial de alta en inventario ({unidadDetalleHistorial.estado_disponibilidad}).</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historialUnidad.map((h) => (
                      <div key={h.id} className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 capitalize">
                            {h.estado_anterior ? `${h.estado_anterior} → ${h.estado_nuevo}` : `Alta (${h.estado_nuevo})`}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(h.fecha_cambio).toLocaleString("es-MX")}
                          </span>
                        </div>
                        <p className="text-gray-600">{h.motivo}</p>
                        <span className="text-[10px] text-gray-400 block">
                          Actor: {h.usuario?.nombre_completo || h.actor_sistema_identificador || h.actor_tipo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {puedeAdministrar && (
              <button
                type="button"
                onClick={() => {
                  const u = unidadDetalleHistorial;
                  setUnidadDetalleHistorial(null);
                  abrirModalEditarUnidad(u);
                }}
                className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
              >
                Editar Unidad
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
