// ==============================================================================
// IRIS by WYLEN — VISTA: ESTRUCTURA ORGANIZACIONAL, EQUIPOS Y TRASPASOS
// ==============================================================================

"use client";

import * as React from "react";
import {
  Users,
  Shield,
  ArrowRightLeft,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Building,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import {
  accionEjecutarTraspaso,
  accionListarAuditoriaTraspasos,
} from "@/acciones/estructura-organizacional";
import type {
  EstructuraOrganigrama,
  UsuarioJerarquico,
  AuditoriaTraspasoPersonal,
  TipoMovimientoTraspaso,
} from "@/tipos/estructura-organizacional";

interface PropiedadesEstructuraJerarquica {
  organigramaInicial: EstructuraOrganigrama;
  auditoriaInicial: AuditoriaTraspasoPersonal[];
}

export function VistaEstructuraJerarquica({
  organigramaInicial,
  auditoriaInicial,
}: PropiedadesEstructuraJerarquica) {
  const [organigrama, setOrganigrama] = React.useState<EstructuraOrganigrama>(organigramaInicial);
  const [auditorias, setAuditorias] = React.useState<AuditoriaTraspasoPersonal[]>(auditoriaInicial);
  const [cargando, setCargando] = React.useState(false);

  // Estados expandidos del árbol
  const [gerentesExpandidos, setGerentesExpandidos] = React.useState<Record<string, boolean>>({});
  const [coordinadoresExpandidos, setCoordinadoresExpandidos] = React.useState<Record<string, boolean>>({});

  // Modal de traspaso
  const [modalTraspasoAbierto, setModalTraspasoAbierto] = React.useState(false);
  const [tipoMovimiento, setTipoMovimiento] = React.useState<TipoMovimientoTraspaso>("traspaso_asesor");
  const [usuarioTransferirId, setUsuarioTransferirId] = React.useState("");
  const [nuevoResponsableId, setNuevoResponsableId] = React.useState("");
  const [motivoTraspaso, setMotivoTraspaso] = React.useState("");
  const [guardandoTraspaso, setGuardandoTraspaso] = React.useState(false);

  // Inicializar expandidos por defecto
  React.useEffect(() => {
    const objGer: Record<string, boolean> = {};
    const objCoord: Record<string, boolean> = {};
    organigrama.gerentes.forEach((g) => {
      objGer[g.id] = true;
      g.coordinadores?.forEach((c) => {
        objCoord[c.id] = true;
      });
    });
    setGerentesExpandidos(objGer);
    setCoordinadoresExpandidos(objCoord);
  }, [organigrama]);

  // Lista plana de coordinadores y asesores para los selects
  const todosLosCoordinadores = React.useMemo(() => {
    const list: UsuarioJerarquico[] = [];
    organigrama.gerentes.forEach((g) => {
      g.coordinadores?.forEach((c) => list.push(c));
    });
    return list;
  }, [organigrama]);

  const todosLosAsesores = React.useMemo(() => {
    const list: UsuarioJerarquico[] = [];
    organigrama.gerentes.forEach((g) => {
      g.coordinadores?.forEach((c) => {
        c.asesores?.forEach((a) => list.push(a));
      });
    });
    return list;
  }, [organigrama]);

  // Ejecutar traspaso
  const manejarConfirmarTraspaso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioTransferirId || !nuevoResponsableId) {
      notificar.error("Campos requeridos", "Selecciona el colaborador y el nuevo responsable.");
      return;
    }

    setGuardandoTraspaso(true);
    try {
      const res = await accionEjecutarTraspaso({
        usuarioTransferidoId: usuarioTransferirId,
        responsableNuevoId: nuevoResponsableId,
        tipoMovimiento,
        motivo: motivoTraspaso.trim() || undefined,
      });

      if (res.exito) {
        notificar.exito("Traspaso completado", "La relación jerárquica y el equipo han sido actualizados.");
        setModalTraspasoAbierto(false);
        setUsuarioTransferirId("");
        setNuevoResponsableId("");
        setMotivoTraspaso("");

        // Recargar auditoría
        const resAudit = await accionListarAuditoriaTraspasos();
        if (resAudit.exito && resAudit.registros) {
          setAuditorias(resAudit.registros);
        }
      } else {
        notificar.error("Error al transferir", res.error || "No se pudo realizar el traspaso.");
      }
    } catch {
      notificar.error("Error", "Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setGuardandoTraspaso(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* 1. CABECERA CON BOTÓN DE TRASPASOS ADMINISTRATIVOS */}
      {/* ==================================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb] shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-700" />
            Estructura Organizacional y Jerarquía
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Organigrama comercial multinivel: Gerentes ➔ Coordinadores ➔ Asesores inmobiliarios
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalTraspasoAbierto(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Traspaso entre Equipos</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. ÁRBOL ORGANIZACIONAL (ORGANIGRAMA VISUAL) */}
      {/* ==================================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb] shadow-2xs space-y-4">
        <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 block">
          Árbol de Mandos y Equipos Comerciales
        </span>

        {organigrama.gerentes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl space-y-2">
            <Users className="h-8 w-8 mx-auto text-gray-300" />
            <p className="font-bold text-gray-700 text-xs">Sin estructura registrada</p>
            <p className="text-[11px] text-gray-400">
              Registra gerentes y coordinadores en la pestaña de Expedientes para visualizar el organigrama.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {organigrama.gerentes.map((gerente) => {
              const expandido = gerentesExpandidos[gerente.id] !== false;
              const totalCoordinadores = gerente.coordinadores?.length || 0;
              const totalAsesores =
                gerente.coordinadores?.reduce(
                  (acc, c) => acc + (c.asesores?.length || 0),
                  0
                ) || 0;

              return (
                <div
                  key={gerente.id}
                  className="border border-[#e5e7eb] rounded-2xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Nivel 1: Gerente */}
                  <div
                    onClick={() =>
                      setGerentesExpandidos((prev) => ({
                        ...prev,
                        [gerente.id]: !expandido,
                      }))
                    }
                    className="p-4 bg-gray-900 text-white flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-xs shrink-0">
                        {gerente.nombre_completo.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm">{gerente.nombre_completo}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                            Gerente Comercial
                          </span>
                        </div>
                        <span className="text-xs text-gray-300 block mt-0.5">
                          {gerente.correo_electronico} • {gerente.telefono || "Sin teléfono"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-300">
                        {totalCoordinadores} coordinadores • {totalAsesores} asesores
                      </span>
                      {expandido ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Nivel 2: Coordinadores bajo este Gerente */}
                  {expandido && (
                    <div className="p-4 bg-[#fafbfc] space-y-3">
                      {totalCoordinadores === 0 ? (
                        <p className="text-xs text-gray-400 italic p-3 text-center">
                          Este gerente no tiene coordinadores asignados aún.
                        </p>
                      ) : (
                        gerente.coordinadores?.map((coordinador) => {
                          const coordExpandido =
                            coordinadoresExpandidos[coordinador.id] !== false;
                          const cantAsesores = coordinador.asesores?.length || 0;

                          return (
                            <div
                              key={coordinador.id}
                              className="border border-[#e5e7eb] rounded-xl bg-white overflow-hidden shadow-2xs ml-4"
                            >
                              <div
                                onClick={() =>
                                  setCoordinadoresExpandidos((prev) => ({
                                    ...prev,
                                    [coordinador.id]: !coordExpandido,
                                  }))
                                }
                                className="p-3 bg-blue-50/70 border-b border-blue-100/80 flex items-center justify-between cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                                    {coordinador.nombre_completo.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-blue-950">
                                        {coordinador.nombre_completo}
                                      </span>
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 uppercase">
                                        Coordinador
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-blue-700/80 block">
                                      {coordinador.correo_electronico}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-blue-800">
                                    {cantAsesores} asesores en equipo
                                  </span>
                                  {coordExpandido ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                                  )}
                                </div>
                              </div>

                              {/* Nivel 3: Asesores del Coordinador */}
                              {coordExpandido && (
                                <div className="p-3 divide-y divide-gray-100">
                                  {cantAsesores === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2 text-center">
                                      Sin asesores asignados a esta coordinación.
                                    </p>
                                  ) : (
                                    coordinador.asesores?.map((asesor) => (
                                      <div
                                        key={asesor.id}
                                        className="py-2.5 flex items-center justify-between ml-3 text-xs"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                                            {asesor.nombre_completo.charAt(0)}
                                          </div>
                                          <div>
                                            <span className="font-bold text-gray-900 block leading-tight">
                                              {asesor.nombre_completo}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                              {asesor.correo_electronico}
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                          Asesor Inmobiliario
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 3. BITÁCORA DE AUDITORÍA DE TRASPASOS (HISTORIAL INMUTABLE) */}
      {/* ==================================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb] shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-500" />
              Historial de Auditoría de Traspasos
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              Registro inmutable de reorganizaciones de personal y transferencias de mandos
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Colaborador Transferido</th>
                <th className="py-2.5 px-3">Responsable Anterior</th>
                <th className="py-2.5 px-3">Nuevo Responsable</th>
                <th className="py-2.5 px-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditorias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 italic">
                    No se han registrado traspasos de personal en esta organización.
                  </td>
                </tr>
              ) : (
                auditorias.map((a) => {
                  const fechaStr = new Date(a.fecha_movimiento).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={a.id} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                        {fechaStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            a.tipo_movimiento === "traspaso_coordinador"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          )}
                        >
                          {a.tipo_movimiento === "traspaso_coordinador"
                            ? "Coordinador"
                            : "Asesor"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {a.usuario_transferido?.nombre_completo || "Colaborador"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {a.responsable_anterior?.nombre_completo || "Sin anterior"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {a.responsable_nuevo?.nombre_completo || "Nuevo responsable"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 italic max-w-xs truncate">
                        {a.motivo || "Reorganización"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MODAL DE TRASPASOS ENTRE EQUIPOS */}
      {/* ==================================================================== */}
      {modalTraspasoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-900 text-white rounded-xl">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    Traspaso Administrativo de Personal
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Reorganización jerárquica con auditoría inmutable
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalTraspasoAbierto(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={manejarConfirmarTraspaso} className="space-y-3.5 text-xs">
              {/* Tipo de movimiento */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tipo de Traspaso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoMovimiento("traspaso_asesor");
                      setUsuarioTransferirId("");
                      setNuevoResponsableId("");
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer",
                      tipoMovimiento === "traspaso_asesor"
                        ? "bg-gray-900 text-white border-gray-900 shadow-2xs"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    Traspaso de Asesor
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoMovimiento("traspaso_coordinador");
                      setUsuarioTransferirId("");
                      setNuevoResponsableId("");
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer",
                      tipoMovimiento === "traspaso_coordinador"
                        ? "bg-gray-900 text-white border-gray-900 shadow-2xs"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    Traspaso de Coordinador
                  </button>
                </div>
              </div>

              {/* Colaborador a transferir */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  {tipoMovimiento === "traspaso_asesor"
                    ? "Seleccionar Asesor a Transferir"
                    : "Seleccionar Coordinador a Transferir"}
                </label>
                <select
                  value={usuarioTransferirId}
                  onChange={(e) => setUsuarioTransferirId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                >
                  <option value="">-- Seleccionar colaborador --</option>
                  {tipoMovimiento === "traspaso_asesor"
                    ? todosLosAsesores.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_completo} ({a.correo_electronico})
                        </option>
                      ))
                    : todosLosCoordinadores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_completo} ({c.correo_electronico})
                        </option>
                      ))}
                </select>
              </div>

              {/* Nuevo Responsable */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  {tipoMovimiento === "traspaso_asesor"
                    ? "Nuevo Coordinador Responsable"
                    : "Nuevo Gerente Responsable"}
                </label>
                <select
                  value={nuevoResponsableId}
                  onChange={(e) => setNuevoResponsableId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                >
                  <option value="">-- Seleccionar nuevo mando --</option>
                  {tipoMovimiento === "traspaso_asesor"
                    ? todosLosCoordinadores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_completo} (Coordinador)
                        </option>
                      ))
                    : organigrama.gerentes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombre_completo} (Gerente Comercial)
                        </option>
                      ))}
                </select>
              </div>

              {/* Motivo de la transferencia */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Motivo o Justificación del Movimiento
                </label>
                <textarea
                  rows={2}
                  value={motivoTraspaso}
                  onChange={(e) => setMotivoTraspaso(e.target.value)}
                  placeholder="Ej. Rebalanceo de cartera comercial, nuevo desarrollo asignado..."
                  className="w-full p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTraspasoAbierto(false)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTraspaso}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {guardandoTraspaso ? "Procesando..." : "Confirmar Traspaso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
