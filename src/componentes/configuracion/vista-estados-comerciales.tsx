// ==============================================================================
// IRIS by WYLEN — VISTA: CONFIGURACIÓN DE ESTADOS COMERCIALES DE LEADS
// ==============================================================================

"use client";

import * as React from "react";
import {
  Clock,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import {
  accionCrearEstadoComercial,
  accionActualizarEstadoComercial,
  accionReordenarEstadosComerciales,
  accionEliminarEstadoComercial,
} from "@/acciones/seguimiento";
import type { EstadoComercialLead } from "@/tipos/leads";

interface PropiedadesEstadosComerciales {
  estadosIniciales: EstadoComercialLead[];
}

const PALETA_COLORES_PREDEFINIDOS = [
  "#f59e0b", // Ámbar
  "#3b82f6", // Azul
  "#10b981", // Esmeralda
  "#8b5cf6", // Púrpura
  "#ec4899", // Rosa
  "#06b6d4", // Cian
  "#ef4444", // Rojo
  "#6b7280", // Gris
];

export function VistaEstadosComerciales({
  estadosIniciales,
}: PropiedadesEstadosComerciales) {
  const [estados, setEstados] = React.useState<EstadoComercialLead[]>(estadosIniciales);

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = React.useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = React.useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = React.useState(false);

  // Formulario Crear / Editar
  const [estadoEditarId, setEstadoEditarId] = React.useState<string | null>(null);
  const [nombreForm, setNombreForm] = React.useState("");
  const [colorForm, setColorForm] = React.useState("#3b82f6");
  const [descripcionForm, setDescripcionForm] = React.useState("");
  const [esCierreForm, setEsCierreForm] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);

  // Formulario Eliminar con migración
  const [estadoAEliminar, setEstadoAEliminar] = React.useState<EstadoComercialLead | null>(null);
  const [estadoDestinoMigracionId, setEstadoDestinoMigracionId] = React.useState("");

  // Abrir modal de edición
  const abrirEditar = (est: EstadoComercialLead) => {
    setEstadoEditarId(est.id);
    setNombreForm(est.nombre);
    setColorForm(est.color);
    setDescripcionForm(est.descripcion || "");
    setEsCierreForm(est.es_cierre);
    setModalEditarAbierto(true);
  };

  // Guardar nuevo estado
  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreForm.trim()) return;

    setGuardando(true);
    try {
      const res = await accionCrearEstadoComercial({
        nombre: nombreForm.trim(),
        color: colorForm,
        descripcion: descripcionForm.trim() || undefined,
        es_cierre: esCierreForm,
      });

      if (res.exito && "estado" in res && res.estado) {
        notificar.exito("Estado creado", `"${res.estado.nombre}" registrado correctamente.`);
        setEstados((prev) => [...prev, res.estado!]);
        setModalCrearAbierto(false);
        setNombreForm("");
        setDescripcionForm("");
        setEsCierreForm(false);
      } else {
        notificar.error("Error al crear", res.error || "No se pudo registrar el estado.");
      }
    } catch {
      notificar.error("Error", "Error de conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  // Guardar edición de estado
  const manejarActualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoEditarId || !nombreForm.trim()) return;

    setGuardando(true);
    try {
      const res = await accionActualizarEstadoComercial(estadoEditarId, {
        nombre: nombreForm.trim(),
        color: colorForm,
        descripcion: descripcionForm.trim() || undefined,
        es_cierre: esCierreForm,
      });

      if (res.exito) {
        notificar.exito("Estado actualizado", "Los cambios han sido guardados.");
        setEstados((prev) =>
          prev.map((est) =>
            est.id === estadoEditarId
              ? {
                  ...est,
                  nombre: nombreForm.trim(),
                  color: colorForm,
                  descripcion: descripcionForm.trim() || null,
                  es_cierre: esCierreForm,
                }
              : est
          )
        );
        setModalEditarAbierto(false);
      } else {
        notificar.error("Error", res.error || "No se pudo actualizar el estado.");
      }
    } catch {
      notificar.error("Error", "Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  // Reordenar (subir / bajar)
  const moverOrden = async (indice: number, direccion: "arriba" | "abajo") => {
    const nuevoIndice = direccion === "arriba" ? indice - 1 : indice + 1;
    if (nuevoIndice < 0 || nuevoIndice >= estados.length) return;

    const copia = [...estados];
    const temp = copia[indice];
    copia[indice] = copia[nuevoIndice];
    copia[nuevoIndice] = temp;

    // Recalcular número de orden
    const reordenados = copia.map((est, i) => ({
      ...est,
      orden: i + 1,
    }));

    setEstados(reordenados);

    await accionReordenarEstadosComerciales(
      reordenados.map((est) => ({ id: est.id, orden: est.orden }))
    );
  };

  // Abrir modal eliminar
  const abrirEliminar = (est: EstadoComercialLead) => {
    setEstadoAEliminar(est);
    // Sugerir el primer estado distinto como destino
    const primerOtro = estados.find((e) => e.id !== est.id);
    setEstadoDestinoMigracionId(primerOtro?.id || "");
    setModalEliminarAbierto(true);
  };

  // Confirmar eliminación con migración
  const manejarConfirmarEliminar = async () => {
    if (!estadoAEliminar) return;

    setGuardando(true);
    try {
      const res = await accionEliminarEstadoComercial(
        estadoAEliminar.id,
        (estadoAEliminar.total_leads || 0) > 0 ? estadoDestinoMigracionId : undefined
      );

      if (res.exito) {
        notificar.exito(
          "Estado eliminado",
          (estadoAEliminar.total_leads || 0) > 0
            ? `Se eliminó el estado y se migraron sus prospectos.`
            : `El estado fue eliminado correctamente.`
        );
        setEstados((prev) => prev.filter((e) => e.id !== estadoAEliminar.id));
        setModalEliminarAbierto(false);
        setEstadoAEliminar(null);
      } else {
        notificar.error("No se pudo eliminar", res.error || "Ocurrió un error.");
      }
    } catch {
      notificar.error("Error", "Error al procesar la eliminación.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb] shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-700" />
            Estados Comerciales Configurables
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Personaliza las columnas del tablero de seguimiento y clasifica el ciclo de vida de los leads
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNombreForm("");
            setDescripcionForm("");
            setColorForm("#3b82f6");
            setEsCierreForm(false);
            setModalCrearAbierto(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nuevo Estado Comercial</span>
        </button>
      </div>

      {/* Lista de Estados */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#f1f3f5] bg-[#fafbfc]">
          <span className="text-xs font-bold text-gray-700">
            {estados.length} estados activos en el embudo comercial
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {estados.map((est, idx) => (
            <div
              key={est.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-gray-400 w-6">
                  #{est.orden}
                </span>

                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: est.color }}
                />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">{est.nombre}</span>
                    {est.es_predeterminado && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Predeterminado
                      </span>
                    )}
                    {est.es_cierre && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Etapa de Cierre
                      </span>
                    )}
                  </div>
                  {est.descripcion && (
                    <span className="text-xs text-gray-400 block mt-0.5">{est.descripcion}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Conteo de leads */}
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {est.total_leads || 0} prospectos
                </span>

                {/* Controles de orden */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moverOrden(idx, "arriba")}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Subir de orden"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moverOrden(idx, "abajo")}
                    disabled={idx === estados.length - 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Bajar de orden"
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                </div>

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => abrirEditar(est)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 cursor-pointer"
                  title="Editar estado"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                {/* Eliminar (Protegido) */}
                <button
                  type="button"
                  onClick={() => abrirEliminar(est)}
                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                  title="Eliminar estado"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL CREAR / EDITAR ESTADO */}
      {/* ==================================================================== */}
      {(modalCrearAbierto || modalEditarAbierto) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900">
                {modalCrearAbierto ? "Crear Nuevo Estado Comercial" : "Editar Estado Comercial"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalCrearAbierto(false);
                  setModalEditarAbierto(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={modalCrearAbierto ? manejarCrear : manejarActualizar}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre del Estado</label>
                <input
                  type="text"
                  required
                  value={nombreForm}
                  onChange={(e) => setNombreForm(e.target.value)}
                  placeholder="Ej. Cita Agendada, Documentación, Apartado..."
                  className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Color Identificador</label>
                <div className="flex items-center gap-2">
                  {PALETA_COLORES_PREDEFINIDOS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorForm(c)}
                      className={cn(
                        "h-7 w-7 rounded-full cursor-pointer transition-transform",
                        colorForm === c && "ring-2 ring-gray-900 scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Descripción Opcional</label>
                <textarea
                  rows={2}
                  value={descripcionForm}
                  onChange={(e) => setDescripcionForm(e.target.value)}
                  placeholder="Objetivo o criterio para situar un prospecto en esta etapa..."
                  className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="es_cierre_chk"
                  checked={esCierreForm}
                  onChange={(e) => setEsCierreForm(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <label htmlFor="es_cierre_chk" className="text-gray-700 font-semibold cursor-pointer">
                  Marcar como etapa de Cierre Comercial (Venta / Conversión)
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalCrearAbierto(false);
                    setModalEditarAbierto(false);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer"
                >
                  {guardando ? "Guardando..." : "Guardar Estado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL ELIMINAR CON MIGRACIÓN PROTECTORA DE PROSPECTOS */}
      {/* ==================================================================== */}
      {modalEliminarAbierto && estadoAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-extrabold text-gray-900">
                Eliminar Estado: "{estadoAEliminar.nombre}"
              </h3>
            </div>

            {(estadoAEliminar.total_leads || 0) > 0 ? (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600 leading-relaxed">
                  Este estado cuenta actualmente con{" "}
                  <strong>{estadoAEliminar.total_leads} prospectos asociados</strong>.
                  Para proteger la integridad de tus datos comerciales, debes seleccionar un estado de
                  destino para migrar los prospectos antes de eliminarlo:
                </p>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Migrar prospectos a:
                  </label>
                  <select
                    value={estadoDestinoMigracionId}
                    onChange={(e) => setEstadoDestinoMigracionId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                  >
                    {estados
                      .filter((e) => e.id !== estadoAEliminar.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                ¿Estás seguro de que deseas eliminar este estado comercial? No contiene prospectos
                asociados actualmente.
              </p>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalEliminarAbierto(false)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={manejarConfirmarEliminar}
                disabled={guardando}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer text-xs"
              >
                {guardando ? "Eliminando..." : "Confirmar y Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
