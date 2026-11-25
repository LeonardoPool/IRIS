// ==============================================================================
// IRIS by WYLEN — MODAL DE IMPORTACIÓN MASIVA DE INVENTARIO (CSV / EXCEL)
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-010
// • Identificación y mapeo de columnas del archivo hacia campos de IRIS
// • Prevalidación en servidor con clasificación: Nueva, Duplicada en CSV,
//   Ya existente en BD (protegida contra sobrescritura) y Con error
// • Reporte final de importación
// ==============================================================================

"use client";

import * as React from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import {
  accionPrevalidarImportacionInventario,
  accionConfirmarImportacionInventario,
} from "@/acciones/proyectos";
import type {
  FilaImportacionUnidadCruda,
  ResultadoPrevalidacionImportacion,
} from "@/tipos/proyectos";

interface PropiedadesModalImportarInventario {
  abierto: boolean;
  desarrolloId: string;
  nombreDesarrollo: string;
  monedaDesarrollo: "MXN" | "USD";
  alCerrar: () => void;
  alImportacionExitosa: () => void;
}

const PLANTILLA_CSV_EJEMPLO = `clave_comercial,numero_lote_unidad,etapa_codigo,manzana_codigo,tipo_unidad,superficie_m2,frente_m,fondo_m,orientacion,precio_lista,precio_promocional,identificador_plano_svg
SOL-A07,A-07,ETAPA-1,MZA-A,lote,350,10,35,Norte-Sur,385000,,SOL-A07
SOL-A08,A-08,ETAPA-1,MZA-A,lote,350,10,35,Norte-Sur,385000,369000,SOL-A08
SOL-B07,B-07,ETAPA-1,MZA-B,lote,385,11,35,Sur-Norte,454300,435000,SOL-B07`;

function parsearTextoCSV(texto: string): { encabezados: string[]; filas: Record<string, string>[] } {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lineas.length < 2) {
    return { encabezados: [], filas: [] };
  }

  const separador = lineas[0].includes(";") ? ";" : lineas[0].includes("\t") ? "\t" : ",";
  const encabezados = lineas[0].split(separador).map((h) => h.trim().replace(/^"|"$/g, ""));

  const filas = lineas.slice(1).map((linea) => {
    const valores = linea.split(separador).map((v) => v.trim().replace(/^"|"$/g, ""));
    const registro: Record<string, string> = {};
    encabezados.forEach((enc, i) => {
      registro[enc] = valores[i] ?? "";
    });
    return registro;
  });

  return { encabezados, filas };
}

export function ModalImportarInventario({
  abierto,
  desarrolloId,
  nombreDesarrollo,
  monedaDesarrollo,
  alCerrar,
  alImportacionExitosa,
}: PropiedadesModalImportarInventario) {
  const [encabezadosArchivo, setEncabezadosArchivo] = React.useState<string[]>([]);
  const [filasArchivo, setFilasArchivo] = React.useState<Record<string, string>[]>([]);

  // Mapeo de columnas archivo -> campos de IRIS
  const [colClave, setColClave] = React.useState("clave_comercial");
  const [colSuperficie, setColSuperficie] = React.useState("superficie_m2");
  const [colPrecioLista, setColPrecioLista] = React.useState("precio_lista");
  const [colPrecioPromo, setColPrecioPromo] = React.useState("precio_promocional");
  const [colEtapa, setColEtapa] = React.useState("etapa_codigo");
  const [colManzana, setColManzana] = React.useState("manzana_codigo");
  const [colFrente, setColFrente] = React.useState("frente_m");
  const [colFondo, setColFondo] = React.useState("fondo_m");
  const [colSvgId, setColSvgId] = React.useState("identificador_plano_svg");

  const [prevalidacion, setPrevalidacion] = React.useState<ResultadoPrevalidacionImportacion | null>(null);
  const [cargandoPrevalidacion, setCargandoPrevalidacion] = React.useState(false);
  const [confirmandoImportacion, setConfirmandoImportacion] = React.useState(false);

  if (!abierto) return null;

  const procesarTextoCargado = (texto: string) => {
    const { encabezados, filas } = parsearTextoCSV(texto);
    if (encabezados.length === 0 || filas.length === 0) {
      notificar.error("Archivo vacío o inválido", "Asegúrese de incluir una fila de encabezados y al menos una unidad.");
      return;
    }

    setEncabezadosArchivo(encabezados);
    setFilasArchivo(filas);
    setPrevalidacion(null);

    // Auto-detectar columnas por nombre aproximado
    const buscarCol = (candidatos: string[], fallback: string) => {
      const hallada = encabezados.find((h) =>
        candidatos.some((c) => h.toLowerCase().includes(c))
      );
      return hallada || fallback;
    };

    setColClave(buscarCol(["clave", "codigo", "lote", "unidad", "id"], encabezados[0]));
    setColSuperficie(buscarCol(["superficie", "m2", "area", "metros"], "superficie_m2"));
    setColPrecioLista(buscarCol(["precio_lista", "lista", "precio", "valor"], "precio_lista"));
    setColPrecioPromo(buscarCol(["promo", "descuento"], "precio_promocional"));
    setColEtapa(buscarCol(["etapa", "fase"], "etapa_codigo"));
    setColManzana(buscarCol(["manzana", "mza", "cluster"], "manzana_codigo"));
    setColFrente(buscarCol(["frente"], "frente_m"));
    setColFondo(buscarCol(["fondo"], "fondo_m"));
    setColSvgId(buscarCol(["svg", "plano", "unit_id"], "identificador_plano_svg"));
  };

  const manejarSubidaArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (ev) => {
      procesarTextoCargado(String(ev.target?.result || ""));
    };
    lector.readAsText(archivo);
  };

  const construirFilasNormalizadas = (): FilaImportacionUnidadCruda[] => {
    return filasArchivo.map((f) => ({
      clave_comercial: f[colClave] || "",
      numero_lote_unidad: f[colClave] || "",
      etapa_codigo: f[colEtapa] || undefined,
      manzana_codigo: f[colManzana] || undefined,
      tipo_unidad: "lote",
      superficie_m2: Number(String(f[colSuperficie] || "0").replace(/[^0-9.]/g, "")),
      frente_m: f[colFrente] ? Number(String(f[colFrente]).replace(/[^0-9.]/g, "")) : null,
      fondo_m: f[colFondo] ? Number(String(f[colFondo]).replace(/[^0-9.]/g, "")) : null,
      precio_lista: Number(String(f[colPrecioLista] || "0").replace(/[^0-9.]/g, "")),
      precio_promocional: f[colPrecioPromo]
        ? Number(String(f[colPrecioPromo]).replace(/[^0-9.]/g, ""))
        : null,
      moneda: monedaDesarrollo,
      identificador_plano_svg: f[colSvgId] || f[colClave] || null,
      estado_disponibilidad: "disponible",
    }));
  };

  const ejecutarPrevalidacion = async () => {
    setCargandoPrevalidacion(true);
    try {
      const filas = construirFilasNormalizadas();
      const res = await accionPrevalidarImportacionInventario(desarrolloId, filas);
      if (res.exito && "resultado" in res && res.resultado) {
        setPrevalidacion(res.resultado);
      } else {
        notificar.error("Error al validar", res.error || "No se pudo validar el archivo.");
      }
    } finally {
      setCargandoPrevalidacion(false);
    }
  };

  const ejecutarConfirmacion = async () => {
    setConfirmandoImportacion(true);
    try {
      const filas = construirFilasNormalizadas();
      const res = await accionConfirmarImportacionInventario(desarrolloId, filas);
      if (res.exito && "reporte" in res && res.reporte) {
        notificar.exito(
          "Importación completada",
          `Se dieron de alta ${res.reporte.insertadas} unidades nuevas (${res.reporte.omitidas} omitidas sin sobrescribir).`
        );
        alImportacionExitosa();
        alCerrar();
      } else {
        notificar.error("Error al importar", res.error || "No se pudo completar la importación.");
      }
    } finally {
      setConfirmandoImportacion(false);
    }
  };

  const descargarPlantillaCSV = () => {
    const blob = new Blob([PLANTILLA_CSV_EJEMPLO], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla-inventario-${nombreDesarrollo.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">
                Importación Masiva de Inventario — {nombreDesarrollo}
              </h2>
              <p className="text-xs text-gray-500">
                Protección activa: las unidades existentes en IRIS nunca se sobrescriben silenciosamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={alCerrar}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          {/* Paso 1: Subir archivo o cargar ejemplo */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#f8f9fa] border border-gray-200">
            <div className="space-y-0.5">
              <span className="font-bold text-gray-900 block">
                1. Seleccione su archivo CSV estructurado
              </span>
              <span className="text-[11px] text-gray-500">
                Soporta delimitadores por coma (,), punto y coma (;) o tabulador.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={descargarPlantillaCSV}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-700 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar Plantilla CSV</span>
              </button>

              <button
                type="button"
                onClick={() => procesarTextoCargado(PLANTILLA_CSV_EJEMPLO)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-blue-700 cursor-pointer"
              >
                Cargar Lotes de Ejemplo
              </button>

              <label className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span>Seleccionar CSV</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={manejarSubidaArchivo}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Paso 2: Mapeo de columnas */}
          {encabezadosArchivo.length > 0 && (
            <div className="p-4 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">
                  2. Relación de columnas del archivo con campos de IRIS ({filasArchivo.length} filas detectadas)
                </span>
                <button
                  type="button"
                  onClick={ejecutarPrevalidacion}
                  disabled={cargandoPrevalidacion}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {cargandoPrevalidacion ? "Validando registros..." : "Validar y Previsualizar"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Clave Comercial *</label>
                  <select
                    value={colClave}
                    onChange={(e) => setColClave(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold"
                  >
                    {encabezadosArchivo.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Superficie (m²) *</label>
                  <select
                    value={colSuperficie}
                    onChange={(e) => setColSuperficie(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold"
                  >
                    {encabezadosArchivo.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Precio de Lista *</label>
                  <select
                    value={colPrecioLista}
                    onChange={(e) => setColPrecioLista(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#f8f9fa] border border-gray-200 rounded-lg font-semibold"
                  >
                    {encabezadosArchivo.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Vista previa y reporte de prevalidación */}
          {prevalidacion && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-700 block">Nuevas Válidas</span>
                  <span className="text-lg font-extrabold text-emerald-900">{prevalidacion.nuevasValidas}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-700 block">Ya Existentes (Protegidas)</span>
                  <span className="text-lg font-extrabold text-blue-900">{prevalidacion.existentesEnBaseDatos}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-700 block">Duplicadas en CSV</span>
                  <span className="text-lg font-extrabold text-amber-900">{prevalidacion.duplicadasEnArchivo}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[11px] font-bold text-red-700 block">Con Errores</span>
                  <span className="text-lg font-extrabold text-red-900">{prevalidacion.conErrores}</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-500">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Clave Comercial</th>
                      <th className="py-2 px-3">Superficie</th>
                      <th className="py-2 px-3">Precio Lista</th>
                      <th className="py-2 px-3">Estado de Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prevalidacion.filas.map((f) => (
                      <tr key={f.indiceFila} className="hover:bg-gray-50/70">
                        <td className="py-2 px-3 text-gray-400 font-mono">{f.indiceFila}</td>
                        <td className="py-2 px-3 font-bold text-gray-900">{f.clave_comercial || "—"}</td>
                        <td className="py-2 px-3 text-gray-700">{f.superficie_m2} m²</td>
                        <td className="py-2 px-3 font-semibold text-gray-900">
                          ${Number(f.precio_lista || 0).toLocaleString("es-MX")}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1",
                              f.clasificacion === "nueva_valida"
                                ? "bg-emerald-100 text-emerald-800"
                                : f.clasificacion === "existente_en_bd"
                                ? "bg-blue-100 text-blue-800"
                                : f.clasificacion === "duplicada_en_archivo"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            {f.clasificacion === "nueva_valida" && <CheckCircle2 className="h-3 w-3" />}
                            {f.clasificacion === "existente_en_bd" && <ShieldAlert className="h-3 w-3" />}
                            {f.clasificacion !== "nueva_valida" && f.clasificacion !== "existente_en_bd" && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <span>{f.mensajeValidacion}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={alCerrar}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!prevalidacion || prevalidacion.nuevasValidas === 0 || confirmandoImportacion}
            onClick={ejecutarConfirmacion}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
          >
            {confirmandoImportacion
              ? "Importando unidades..."
              : `Confirmar Importación (${prevalidacion?.nuevasValidas || 0} unidades nuevas)`}
          </button>
        </div>
      </div>
    </div>
  );
}
