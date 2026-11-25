// ==============================================================================
// IRIS by WYLEN — VISOR Y EDITOR ADMINISTRATIVO DE PLANOS INTERACTIVOS SVG
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-009, IRIS-DEC-013
// • Coloreado reactivo en tiempo real conectado al inventario de IRIS (fuente de verdad)
// • Controles de Zoom (+, -, 100%), Paneo (Drag), Filtro por Etapa y Manzana
// • Selección individual y Selección Múltiple de unidades con suma de superficie y valor
// • Editor Administrativo de Planos SVG: Carga de archivo .svg, sanitización XSS,
//   asociación manual polígono <-> unidad por clic, detección de unidades huérfanas
//   e IDs duplicados, configuración de colores por estado y versionamiento.
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  CheckSquare,
  Upload,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Sliders,
  History,
  FileCode2,
  Sparkles,
  Calculator,
  Lock,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { sanitizarYAnalizarPlanoSVG } from "@/librerias/utilidades/sanitizador-svg";
import {
  accionGuardarPlanoInteractivo,
  accionGuardarVinculosPlano,
} from "@/acciones/proyectos";
import type {
  UnidadInmobiliaria,
  EtapaDesarrollo,
  ManzanaDesarrollo,
  PlanoInteractivo,
  VinculoPlanoUnidad,
  ConfiguracionColoresPlano,
} from "@/tipos/proyectos";

const COLORES_POR_DEFECTO: ConfiguracionColoresPlano = {
  disponible: "#10b981",
  apartado: "#f59e0b",
  vendido: "#ef4444",
  bloqueado: "#64748b",
  sin_vincular: "#cbd5e1",
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
  bloqueado: "Bloqueado",
};

interface PropiedadesVisorEditorPlanoSVG {
  desarrolloId: string;
  nombreDesarrollo: string;
  moneda: "MXN" | "USD";
  unidades: UnidadInmobiliaria[];
  etapas: EtapaDesarrollo[];
  manzanas: ManzanaDesarrollo[];
  planos: PlanoInteractivo[];
  vinculosIniciales: VinculoPlanoUnidad[];
  svgDemoFallback: string;
  puedeAdministrar: boolean;
  alSeleccionarUnidadDetalle: (unidad: UnidadInmobiliaria) => void;
  alActualizarPlanosYVinculos: (nuevoPlano: PlanoInteractivo, nuevosVinculos: VinculoPlanoUnidad[]) => void;
}

export function VisorEditorPlanoSVG({
  desarrolloId,
  nombreDesarrollo,
  moneda,
  unidades,
  etapas,
  manzanas,
  planos,
  vinculosIniciales,
  svgDemoFallback,
  puedeAdministrar,
  alSeleccionarUnidadDetalle,
  alActualizarPlanosYVinculos,
}: PropiedadesVisorEditorPlanoSVG) {
  const planoActivo = React.useMemo(
    () => planos.find((p) => p.es_activo) || planos[0] || null,
    [planos]
  );

  const [modoEditor, setModoEditor] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = React.useState(false);
  const [inicioArrastre, setInicioArrastre] = React.useState({ x: 0, y: 0 });

  // Filtros de visualización
  const [filtroEtapaId, setFiltroEtapaId] = React.useState<string>("todas");
  const [filtroManzanaId, setFiltroManzanaId] = React.useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = React.useState<string>("todos");

  // Selección simple o múltiple
  const [modoSeleccionMultiple, setModoSeleccionMultiple] = React.useState(false);
  const [unidadesSeleccionadasIds, setUnidadesSeleccionadasIds] = React.useState<string[]>([]);
  const [svgElementIdActivo, setSvgElementIdActivo] = React.useState<string | null>(null);

  // Estado del Editor Administrativo de Planos SVG
  const [svgEditableTexto, setSvgEditableTexto] = React.useState<string>(
    planoActivo?.contenido_svg || svgDemoFallback
  );
  const [nombreNuevoPlano, setNombreNuevoPlano] = React.useState<string>(
    planoActivo ? `${planoActivo.nombre.replace(/\s*\(v\d+\)$/, "")}` : `Master Plan ${nombreDesarrollo}`
  );
  const [coloresEstado, setColoresEstado] = React.useState<ConfiguracionColoresPlano>(
    planoActivo?.configuracion_colores || COLORES_POR_DEFECTO
  );
  const [mapaVinculos, setMapaVinculos] = React.useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    if (vinculosIniciales.length > 0) {
      vinculosIniciales.forEach((v) => {
        inicial[v.svg_element_id] = v.unidad_id;
      });
    } else {
      // Auto-emparejar por identificador_plano_svg o clave_comercial para experiencia inmediata
      unidades.forEach((u) => {
        const clave = u.identificador_plano_svg || u.clave_comercial;
        if (clave) inicial[clave] = u.id;
      });
    }
    return inicial;
  });
  const [guardandoPlano, setGuardandoPlano] = React.useState(false);
  const contenedorSvgRef = React.useRef<HTMLDivElement | null>(null);

  // Sincronizar cuando cambie el plano activo o las unidades del desarrollo
  React.useEffect(() => {
    setSvgEditableTexto(planoActivo?.contenido_svg || svgDemoFallback);
    setColoresEstado(planoActivo?.configuracion_colores || COLORES_POR_DEFECTO);

    const nuevoMapa: Record<string, string> = {};
    if (vinculosIniciales.length > 0) {
      vinculosIniciales.forEach((v) => {
        nuevoMapa[v.svg_element_id] = v.unidad_id;
      });
    } else {
      unidades.forEach((u) => {
        const clave = u.identificador_plano_svg || u.clave_comercial;
        if (clave) nuevoMapa[clave] = u.id;
      });
    }
    setMapaVinculos(nuevoMapa);
  }, [planoActivo, vinculosIniciales, unidades, svgDemoFallback]);

  // Diagnóstico del SVG actual
  const diagnosticoSvg = React.useMemo(() => {
    try {
      return sanitizarYAnalizarPlanoSVG(svgEditableTexto);
    } catch {
      return sanitizarYAnalizarPlanoSVG(svgDemoFallback);
    }
  }, [svgEditableTexto, svgDemoFallback]);

  // Mapa rápido unidadId -> UnidadInmobiliaria
  const mapaUnidadesPorId = React.useMemo(() => {
    const m = new Map<string, UnidadInmobiliaria>();
    unidades.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidades]);

  // Unidades huérfanas (en inventario pero sin polígono asociado en el plano)
  const unidadesSinAsociar = React.useMemo(() => {
    const idsAsociados = new Set(Object.values(mapaVinculos));
    return unidades.filter((u) => !idsAsociados.has(u.id));
  }, [unidades, mapaVinculos]);

  // Figuras del SVG sin unidad asociada
  const figurasSinAsociar = React.useMemo(() => {
    return diagnosticoSvg.figurasDetectadas.filter((f) => !mapaVinculos[f.svgElementId]);
  }, [diagnosticoSvg.figurasDetectadas, mapaVinculos]);

  // Colorear reactivamente los nodos del DOM del SVG cada vez que cambie disponibilidad, filtros o selección
  React.useEffect(() => {
    const contenedor = contenedorSvgRef.current;
    if (!contenedor) return;

    for (const fig of diagnosticoSvg.figurasDetectadas) {
      const nodo =
        contenedor.querySelector<SVGElement>(`[data-unit-id="${CSS.escape(fig.svgElementId)}"]`) ||
        contenedor.querySelector<SVGElement>(`#${CSS.escape(fig.svgElementId)}`);

      if (!nodo) continue;

      const unidadId = mapaVinculos[fig.svgElementId];
      const unidad = unidadId ? mapaUnidadesPorId.get(unidadId) : undefined;

      // Verificar si pasa los filtros de etapa, manzana y estado
      const pasaEtapa = filtroEtapaId === "todas" || unidad?.etapa_id === filtroEtapaId;
      const pasaManzana = filtroManzanaId === "todas" || unidad?.manzana_id === filtroManzanaId;
      const pasaEstado = filtroEstado === "todos" || unidad?.estado_disponibilidad === filtroEstado;
      const visiblePorFiltro = !unidad || (pasaEtapa && pasaManzana && pasaEstado);

      let colorRelleno = coloresEstado.sin_vincular;
      if (fig.duplicadoEnArchivo) {
        colorRelleno = "#db2777"; // Magenta de alerta para IDs duplicados
      } else if (unidad) {
        colorRelleno =
          coloresEstado[unidad.estado_disponibilidad] || COLORES_POR_DEFECTO[unidad.estado_disponibilidad];
      }

      const estaSeleccionada =
        (unidad && unidadesSeleccionadasIds.includes(unidad.id)) ||
        svgElementIdActivo === fig.svgElementId;

      nodo.style.fill = colorRelleno;
      nodo.style.fillOpacity = visiblePorFiltro ? (estaSeleccionada ? "1" : "0.86") : "0.18";
      nodo.style.stroke = estaSeleccionada ? "#111827" : "#ffffff";
      nodo.style.strokeWidth = estaSeleccionada ? "3.5px" : "2px";
      nodo.style.cursor = "pointer";
      nodo.style.transition = "fill 150ms ease, fill-opacity 150ms ease, stroke-width 120ms ease";
    }
  }, [
    diagnosticoSvg,
    mapaVinculos,
    mapaUnidadesPorId,
    coloresEstado,
    filtroEtapaId,
    filtroManzanaId,
    filtroEstado,
    unidadesSeleccionadasIds,
    svgElementIdActivo,
  ]);

  // Manejar clic sobre cualquier figura del SVG (delegación de eventos)
  const manejarClicEnLienzoSVG = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const nodoFigura = target.closest("[data-unit-id], rect[id], polygon[id], path[id]") as SVGElement | null;
    if (!nodoFigura) return;

    const svgId = nodoFigura.getAttribute("data-unit-id") || nodoFigura.getAttribute("id");
    if (!svgId || svgId.startsWith("GRUPO-")) return;

    setSvgElementIdActivo(svgId);
    const unidadId = mapaVinculos[svgId];
    const unidad = unidadId ? mapaUnidadesPorId.get(unidadId) : undefined;

    if (modoEditor) {
      return;
    }

    if (!unidad) {
      notificar.info(
        `Figura ${svgId} sin unidad vinculada`,
        puedeAdministrar
          ? "Active el Editor de Planos para asociar este polígono con una unidad del inventario."
          : "Este polígono aún no está vinculado a una unidad."
      );
      return;
    }

    if (modoSeleccionMultiple) {
      setUnidadesSeleccionadasIds((prev) =>
        prev.includes(unidad.id) ? prev.filter((id) => id !== unidad.id) : [...prev, unidad.id]
      );
    } else {
      setUnidadesSeleccionadasIds([unidad.id]);
      alSeleccionarUnidadDetalle(unidad);
    }
  };

  // Cargar archivo .svg desde disco en el Editor Administrativo
  const manejarSubidaArchivoSVG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (ev) => {
      const contenido = String(ev.target?.result || "");
      try {
        const diag = sanitizarYAnalizarPlanoSVG(contenido);
        setSvgEditableTexto(diag.svgSanitizado);

        // Auto-vincular por clave comercial si coincide
        const nuevoMapa: Record<string, string> = {};
        const mapaClaves = new Map<string, string>();
        unidades.forEach((u) => {
          mapaClaves.set(u.clave_comercial.toUpperCase(), u.id);
          if (u.identificador_plano_svg) {
            mapaClaves.set(u.identificador_plano_svg.toUpperCase(), u.id);
          }
        });

        diag.figurasDetectadas.forEach((f) => {
          const matchId = mapaClaves.get(f.svgElementId.toUpperCase());
          if (matchId) nuevoMapa[f.svgElementId] = matchId;
        });

        setMapaVinculos(nuevoMapa);
        notificar.exito(
          "Plano SVG cargado y sanitizado",
          `Se detectaron ${diag.figurasDetectadas.length} figuras vectoriales (${Object.keys(nuevoMapa).length} auto-vinculadas).`
        );
      } catch (err: any) {
        notificar.error("SVG inválido", err.message || "No se pudo procesar el archivo SVG.");
      }
    };
    lector.readAsText(archivo);
  };

  // Asociar manualmente en el editor un polígono con una unidad
  const asignarUnidadAPoligono = (svgElementId: string, unidadId: string) => {
    setMapaVinculos((prev) => {
      const copia = { ...prev };
      if (!unidadId) {
        delete copia[svgElementId];
        return copia;
      }
      // Garantizar relación 1:1 (si esa unidad estaba en otro polígono, liberarlo)
      for (const [k, v] of Object.entries(copia)) {
        if (v === unidadId) delete copia[k];
      }
      copia[svgElementId] = unidadId;
      return copia;
    });
  };

  // Guardar versión del plano y vínculos en base de datos
  const manejarGuardarPlanoYVinculos = async () => {
    if (diagnosticoSvg.idsDuplicadosEnSvg.length > 0) {
      notificar.error(
        "IDs duplicados detectados",
        `Corrija los identificadores duplicados en el SVG antes de guardar: ${diagnosticoSvg.idsDuplicadosEnSvg.join(", ")}`
      );
      return;
    }

    setGuardandoPlano(true);
    try {
      const resPlano = await accionGuardarPlanoInteractivo({
        desarrolloId,
        nombre: nombreNuevoPlano.trim() || `Master Plan ${nombreDesarrollo}`,
        contenidoSvg: diagnosticoSvg.svgSanitizado,
        configuracionColores: coloresEstado,
      });

      if (!resPlano.exito || !("plano" in resPlano) || !resPlano.plano) {
        notificar.error("Error al guardar plano", resPlano.error || "No se pudo guardar la versión del plano.");
        return;
      }

      const listaVinculos = Object.entries(mapaVinculos)
        .filter(([, uId]) => Boolean(uId))
        .map(([svgElementId, unidadId]) => ({ svgElementId, unidadId }));

      const resVinculos = await accionGuardarVinculosPlano(
        desarrolloId,
        resPlano.plano.id,
        listaVinculos
      );

      const vinculosFinales =
        resVinculos.exito && "vinculos" in resVinculos && resVinculos.vinculos
          ? resVinculos.vinculos
          : [];

      alActualizarPlanosYVinculos(resPlano.plano, vinculosFinales);
      setModoEditor(false);
      notificar.exito(
        `Plano v${resPlano.plano.version} publicado`,
        `Se guardaron ${listaVinculos.length} asociaciones entre polígonos SVG y unidades del inventario.`
      );
    } catch (err: any) {
      notificar.error("Error", err.message || "Error inesperado al guardar el plano.");
    } finally {
      setGuardandoPlano(false);
    }
  };

  const unidadesSeleccionadas = React.useMemo(
    () => unidades.filter((u) => unidadesSeleccionadasIds.includes(u.id)),
    [unidades, unidadesSeleccionadasIds]
  );

  const unidadActivaEnVisor = React.useMemo(() => {
    if (svgElementIdActivo && mapaVinculos[svgElementIdActivo]) {
      return mapaUnidadesPorId.get(mapaVinculos[svgElementIdActivo]) || null;
    }
    return unidadesSeleccionadas[0] || null;
  }, [svgElementIdActivo, mapaVinculos, mapaUnidadesPorId, unidadesSeleccionadas]);

  const formatearMoneda = (monto: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(monto);

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR DE CONTROLES DEL PLANO INTERACTIVO */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Etapa */}
          <select
            value={filtroEtapaId}
            onChange={(e) => {
              setFiltroEtapaId(e.target.value);
              setFiltroManzanaId("todas");
            }}
            className="px-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-gray-900"
          >
            <option value="todas">Todas las Etapas ({etapas.length})</option>
            {etapas.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre} ({et.codigo})
              </option>
            ))}
          </select>

          {/* Filtro por Manzana */}
          <select
            value={filtroManzanaId}
            onChange={(e) => setFiltroManzanaId(e.target.value)}
            className="px-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-gray-900"
          >
            <option value="todas">Todas las Manzanas ({manzanas.length})</option>
            {manzanas
              .filter((m) => filtroEtapaId === "todas" || m.etapa_id === filtroEtapaId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.codigo})
                </option>
              ))}
          </select>

          {/* Filtro por Disponibilidad */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-gray-900"
          >
            <option value="todos">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="apartado">Apartados</option>
            <option value="vendido">Vendidos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>

          {/* Conmutador de Selección Múltiple */}
          {!modoEditor && (
            <button
              type="button"
              onClick={() => {
                setModoSeleccionMultiple((prev) => !prev);
                setUnidadesSeleccionadasIds([]);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border",
                modoSeleccionMultiple
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{modoSeleccionMultiple ? "Selección Múltiple Activa" : "Selección Múltiple"}</span>
            </button>
          )}
        </div>

        {/* Controles de Zoom y Modo Editor Administrativo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
              className="p-1.5 text-gray-600 hover:text-gray-900 cursor-pointer"
              title="Alejar plano"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-[11px] font-bold text-gray-700 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
              className="p-1.5 text-gray-600 hover:text-gray-900 cursor-pointer"
              title="Acercar plano"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 text-gray-500 hover:text-gray-900 border-l border-gray-200 cursor-pointer"
              title="Restablecer vista"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {puedeAdministrar && (
            <button
              type="button"
              onClick={() => setModoEditor((prev) => !prev)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                modoEditor
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              )}
            >
              {modoEditor ? <Eye className="h-3.5 w-3.5" /> : <Sliders className="h-3.5 w-3.5" />}
              <span>{modoEditor ? "Volver al Visor Comercial" : "Editor de Planos SVG"}</span>
            </button>
          )}
        </div>
      </div>

      {/* LEYENDA REACTIVA DE DISPONIBILIDAD EN VIVO */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {(["disponible", "apartado", "vendido", "bloqueado"] as const).map((est) => {
            const totalEstado = unidades.filter((u) => u.estado_disponibilidad === est).length;
            return (
              <div key={est} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-xs inline-block border border-black/10"
                  style={{ backgroundColor: coloresEstado[est] }}
                />
                <span className="font-semibold text-gray-700">{ETIQUETAS_ESTADO[est]}:</span>
                <span className="font-extrabold text-gray-900 tabular-nums">{totalEstado}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-xs inline-block border border-black/10"
              style={{ backgroundColor: coloresEstado.sin_vincular }}
            />
            <span className="text-gray-500">Figuras sin vincular:</span>
            <span className="font-bold text-gray-700 tabular-nums">{figurasSinAsociar.length}</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 font-medium">
          {planoActivo ? (
            <span>
              Versión activa: <strong className="text-gray-800">v{planoActivo.version}</strong> ·{" "}
              {Object.keys(mapaVinculos).length} polígonos asociados
            </span>
          ) : (
            <span>Master Plan Interactivo · Fuente de verdad: Inventario IRIS</span>
          )}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: LIENZO SVG + PANEL LATERAL (DETALLE O EDITOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LIENZO INTERACTIVO SVG */}
        <div className="lg:col-span-8 bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden relative min-h-[460px] flex flex-col">
          <div
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              setArrastrando(true);
              setInicioArrastre({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (!arrastrando) return;
              setPan({ x: e.clientX - inicioArrastre.x, y: e.clientY - inicioArrastre.y });
            }}
            onMouseUp={() => setArrastrando(false)}
            onMouseLeave={() => setArrastrando(false)}
            onClick={manejarClicEnLienzoSVG}
            className={cn(
              "flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4 select-none bg-[#f8fafc]",
              arrastrando ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div
              ref={contenedorSvgRef}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
              className="w-full max-w-[860px] transition-transform duration-75 ease-out [&_svg]:w-full [&_svg]:h-auto [&_svg]:drop-shadow-xs"
              dangerouslySetInnerHTML={{ __html: diagnosticoSvg.svgSanitizado }}
            />
          </div>

          {/* Barra inferior de Selección Múltiple cuando hay unidades marcadas */}
          {unidadesSeleccionadas.length > 0 && !modoEditor && (
            <div className="bg-gray-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white/15 font-extrabold">
                  {unidadesSeleccionadas.length}{" "}
                  {unidadesSeleccionadas.length === 1 ? "unidad seleccionada" : "unidades seleccionadas"}
                </span>
                <span className="text-gray-300">
                  Superficie total:{" "}
                  <strong className="text-white">
                    {unidadesSeleccionadas.reduce((acc, u) => acc + Number(u.superficie_m2), 0).toFixed(2)} m²
                  </strong>
                </span>
                <span className="text-gray-300">
                  Valor acumulado:{" "}
                  <strong className="text-emerald-400">
                    {formatearMoneda(
                      unidadesSeleccionadas.reduce(
                        (acc, u) => acc + Number(u.precio_promocional ?? u.precio_lista),
                        0
                      )
                    )}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/cotizador?desarrollo=${desarrolloId}&unidades=${unidadesSeleccionadas.map((u) => u.id).join(",")}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Cotizar Paquete ({unidadesSeleccionadas.length})</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setUnidadesSeleccionadasIds([])}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white cursor-pointer"
                >
                  Limpiar selección
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PANEL LATERAL DERECHO: INSPECTOR COMERCIAL O EDITOR ADMINISTRATIVO */}
        <div className="lg:col-span-4 bg-white border border-[#e5e7eb] rounded-2xl p-4 flex flex-col justify-between space-y-4">
          {!modoEditor ? (
            /* MODO VISOR COMERCIAL: FICHA DE LA UNIDAD SELECCIONADA */
            unidadActivaEnVisor ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Unidad Seleccionada en Plano
                    </span>
                    <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                      {unidadActivaEnVisor.clave_comercial}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {unidadActivaEnVisor.etapa?.nombre || "Etapa General"} ·{" "}
                      {unidadActivaEnVisor.manzana?.nombre || "Manzana General"}
                    </span>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-extrabold text-white capitalize"
                    style={{
                      backgroundColor:
                        coloresEstado[unidadActivaEnVisor.estado_disponibilidad] || "#10b981",
                    }}
                  >
                    {ETIQUETAS_ESTADO[unidadActivaEnVisor.estado_disponibilidad]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-100">
                    <span className="text-gray-400 block text-[11px]">Superficie Total</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {Number(unidadActivaEnVisor.superficie_m2).toFixed(2)} m²
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-100">
                    <span className="text-gray-400 block text-[11px]">Dimensiones</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {unidadActivaEnVisor.frente_m && unidadActivaEnVisor.fondo_m
                        ? `${unidadActivaEnVisor.frente_m} × ${unidadActivaEnVisor.fondo_m} m`
                        : "Estándar"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-100 col-span-2">
                    <span className="text-gray-400 block text-[11px]">Precio de Lista</span>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-base font-extrabold text-gray-900">
                        {formatearMoneda(Number(unidadActivaEnVisor.precio_lista))}
                      </span>
                      {unidadActivaEnVisor.precio_promocional && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Promo: {formatearMoneda(Number(unidadActivaEnVisor.precio_promocional))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  {unidadActivaEnVisor.estado_disponibilidad === "disponible" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/cotizador?desarrollo=${desarrolloId}&unidades=${unidadActivaEnVisor.id}`}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        <span>Cotizar Unidad</span>
                      </Link>
                      <Link
                        href={`/cotizador?desarrollo=${desarrolloId}&unidades=${unidadActivaEnVisor.id}&tab=apartados`}
                        className="py-2.5 px-3 rounded-xl border border-gray-900 text-gray-900 hover:bg-gray-50 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Apartar</span>
                      </Link>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => alSeleccionarUnidadDetalle(unidadActivaEnVisor)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Ver Expediente e Historial de Unidad</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <Layers className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-700">
                  Seleccione una unidad en el plano interactivo
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Haga clic sobre cualquier lote o polígono coloreado para consultar su superficie, precio de lista, medidas y estado en tiempo real.
                </p>
              </div>
            )
          ) : (
            /* MODO EDITOR ADMINISTRATIVO DE PLANOS SVG */
            <div className="space-y-4 text-xs overflow-y-auto max-h-[540px] pr-1">
              <div className="border-b border-gray-100 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Herramienta Administrativa
                </span>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Editor y Vinculador de Planos SVG
                </h3>
              </div>

              {/* 1. Cargar archivo SVG */}
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">Nombre de la Versión del Plano</label>
                <input
                  type="text"
                  value={nombreNuevoPlano}
                  onChange={(e) => setNombreNuevoPlano(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs font-semibold"
                  placeholder="Ej. Master Plan Etapa 1"
                />

                <label className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-3 border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-xl cursor-pointer bg-gray-50/60 transition-colors font-bold text-gray-700">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>Cargar archivo .SVG del Desarrollo</span>
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={manejarSubidaArchivoSVG}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 2. Diagnóstico de integridad del SVG */}
              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <FileCode2 className="h-3.5 w-3.5 text-blue-600" />
                    Diagnóstico del Vector SVG
                  </span>
                  <span className="text-[11px] font-bold text-gray-600">
                    {diagnosticoSvg.figurasDetectadas.length} figuras
                  </span>
                </div>

                {diagnosticoSvg.idsDuplicadosEnSvg.length > 0 ? (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      IDs duplicados detectados:{" "}
                      <strong>{diagnosticoSvg.idsDuplicadosEnSvg.join(", ")}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>0 identificadores duplicados · XML sanitizado</span>
                  </div>
                )}

                <div className="text-[11px] text-gray-600 flex items-center justify-between pt-1 border-t border-gray-200/70">
                  <span>Unidades en inventario sin polígono:</span>
                  <strong className={unidadesSinAsociar.length > 0 ? "text-amber-700" : "text-emerald-700"}>
                    {unidadesSinAsociar.length}
                  </strong>
                </div>
              </div>

              {/* 3. Asociación de Polígonos con Unidades Existentes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-gray-700" />
                    Asociación Polígono SVG ↔ Unidad
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const auto: Record<string, string> = {};
                      unidades.forEach((u) => {
                        const clave = (u.identificador_plano_svg || u.clave_comercial).toUpperCase();
                        const fig = diagnosticoSvg.figurasDetectadas.find(
                          (f) => f.svgElementId.toUpperCase() === clave
                        );
                        if (fig) auto[fig.svgElementId] = u.id;
                      });
                      setMapaVinculos(auto);
                      notificar.exito("Auto-vinculación aplicada", `Se emparejaron ${Object.keys(auto).length} unidades por clave comercial.`);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-emparejar por clave</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                  {diagnosticoSvg.figurasDetectadas.map((fig) => {
                    const unidadAsociadaId = mapaVinculos[fig.svgElementId] || "";
                    const esActiva = svgElementIdActivo === fig.svgElementId;
                    return (
                      <div
                        key={fig.svgElementId}
                        onClick={() => setSvgElementIdActivo(fig.svgElementId)}
                        className={cn(
                          "p-2 rounded-lg border flex items-center justify-between gap-2 transition-colors cursor-pointer",
                          esActiva
                            ? "bg-blue-50/80 border-blue-400"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[11px] text-gray-900 block truncate">
                            #{fig.svgElementId}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate">
                            {fig.geometriaResumen}
                          </span>
                        </div>

                        <select
                          value={unidadAsociadaId}
                          onChange={(e) => asignarUnidadAPoligono(fig.svgElementId, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-[#f8f9fa] border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-800 max-w-[155px]"
                        >
                          <option value="">— Sin vincular —</option>
                          {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.clave_comercial} ({u.estado_disponibilidad})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Configuración de colores por estado */}
              <div className="space-y-1.5">
                <span className="font-bold text-gray-700 block">Colores por Estado de Inventario</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["disponible", "apartado", "vendido", "bloqueado"] as const).map((est) => (
                    <label
                      key={est}
                      className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-gray-50/50"
                    >
                      <span className="capitalize font-semibold text-gray-700">{est}</span>
                      <input
                        type="color"
                        value={coloresEstado[est]}
                        onChange={(e) =>
                          setColoresEstado((prev) => ({ ...prev, [est]: e.target.value }))
                        }
                        className="h-5 w-8 rounded cursor-pointer border-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Botón Guardar Nueva Versión del Plano */}
              <button
                type="button"
                disabled={guardandoPlano || diagnosticoSvg.idsDuplicadosEnSvg.length > 0}
                onClick={manejarGuardarPlanoYVinculos}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {guardandoPlano ? "Guardando versión..." : "Guardar y Publicar Versión del Plano"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
