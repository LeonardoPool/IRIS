// ==============================================================================
// IRIS by WYLEN — FICHA UNIFICADA DEL CLIENTE 360° (GAVETA LATERAL REUTILIZABLE)
// ==============================================================================
// Puede abrirse desde Clientes, Bandeja Omnicanal, Mi Trabajo y Oportunidades.
// Consulta los modelos existentes sin duplicar tablas ni inventar registros.
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  Phone,
  Mail,
  Building2,
  UserCheck,
  MessageSquare,
  Calculator,
  Calendar,
  FileSignature,
  History,
  Layers,
  Clock,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { accionObtenerFichaUnificadaCliente } from "@/acciones/ficha-cliente";
import type { DatosFichaUnificadaCliente } from "@/servicios/ficha-cliente";

export interface SolicitudAbrirFichaCliente {
  prospectoId?: string | null;
  contactoId?: string | null;
  oportunidadId?: string | null;
  conversacionId?: string | null;
  nombreRespaldo?: string;
  telefono?: string | null;
  correo?: string | null;
}

interface PropiedadesFichaUnificadaCliente {
  solicitud: SolicitudAbrirFichaCliente | null;
  alCerrar: () => void;
}

function formatearMoneda(monto: number, moneda: string = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda === "USD" ? "USD" : "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(monto) ? monto : 0);
}

export function FichaUnificadaCliente({
  solicitud,
  alCerrar,
}: PropiedadesFichaUnificadaCliente) {
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ficha, setFicha] = React.useState<DatosFichaUnificadaCliente | null>(null);
  const [pestana, setPestana] = React.useState<
    "resumen" | "conversaciones" | "cotizaciones" | "contratos" | "historial"
  >("resumen");
  const [expandida, setExpandida] = React.useState(false);

  React.useEffect(() => {
    if (!solicitud) {
      setFicha(null);
      return;
    }

    let activo = true;
    setCargando(true);
    setError(null);
    setPestana("resumen");

    accionObtenerFichaUnificadaCliente({
      prospectoId: solicitud.prospectoId,
      contactoId: solicitud.contactoId,
      oportunidadId: solicitud.oportunidadId,
      conversacionId: solicitud.conversacionId,
      correo: solicitud.correo,
      telefono: solicitud.telefono,
    })
      .then((res) => {
        if (!activo) return;
        if (!res.exito) {
          setError(res.mensaje || "No se pudo cargar el expediente 360°.");
        } else {
          setFicha(res.ficha ?? null);
        }
      })
      .catch(() => {
        if (activo) setError("Error de conexión al consultar la ficha del cliente.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [solicitud]);

  if (!solicitud) return null;

  const nombreMostrar = ficha?.identidad.nombre || solicitud.nombreRespaldo || "Expediente 360°";
  const telefonoMostrar = ficha?.identidad.telefono || solicitud.telefono;
  const correoMostrar = ficha?.identidad.correo || solicitud.correo;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={alCerrar}
      />

      <aside
        className={cn(
          "relative z-10 flex h-full w-full flex-col bg-white shadow-2xl border-l border-neutral-200 transition-all duration-200",
          expandida ? "max-w-4xl" : "max-w-xl"
        )}
      >
        {/* CABECERA */}
        <header className="border-b border-neutral-200 bg-neutral-50/70 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Ficha 360°
                </span>
                {ficha?.identidad.estado && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                    {ficha.identidad.estado}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 truncate text-lg font-bold text-neutral-900">
                {nombreMostrar}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                {telefonoMostrar && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    {telefonoMostrar}
                  </span>
                )}
                {correoMostrar && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    {correoMostrar}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-neutral-400" />
                  Responsable:{" "}
                  <strong className="text-neutral-800">
                    {ficha?.identidad.responsableActualNombre || "Sin asignar"}
                  </strong>
                </span>
                {ficha?.identidad.desarrolloInteres && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                    Interés:{" "}
                    <strong className="text-neutral-800">
                      {ficha.identidad.desarrolloInteres}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setExpandida((prev) => !prev)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 cursor-pointer"
                title={expandida ? "Vista compacta" : "Expandir gaveta"}
              >
                {expandida ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={alCerrar}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 cursor-pointer"
                aria-label="Cerrar ficha del cliente"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/bandeja"
              onClick={alCerrar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ir a Bandeja
            </Link>
            <Link
              href="/cotizador"
              onClick={alCerrar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              <Calculator className="h-3.5 w-3.5" />
              Cotizar / Apartar
            </Link>
            <Link
              href="/mi-trabajo?vista=agenda"
              onClick={alCerrar}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <Calendar className="h-3.5 w-3.5" />
              Agendar Seguimiento
            </Link>
          </div>
        </header>

        {/* PESTAÑAS INTERNAS (5) */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-4 pt-2">
          {[
            { id: "resumen", label: "Resumen e Intereses", icono: Layers },
            { id: "conversaciones", label: "Conversaciones y Seguimiento", icono: MessageSquare },
            { id: "cotizaciones", label: "Cotizaciones y Apartados", icono: Calculator },
            { id: "contratos", label: "Documentos y Contratos", icono: FileSignature },
            { id: "historial", label: "Historial y Atribución", icono: History },
          ].map((tab) => {
            const Icono = tab.icono;
            const activa = pestana === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPestana(tab.id as typeof pestana)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                  activa
                    ? "border-neutral-900 text-neutral-900 font-semibold"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                )}
              >
                <Icono className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE LA PESTAÑA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-neutral-500">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mb-2" />
              <span>Consultando expediente unificado en tiempo real...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
              {error}
            </div>
          ) : !ficha ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-neutral-500">
              No se encontró información registrada para este expediente.
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: RESUMEN E INTERESES INMOBILIARIOS */}
              {pestana === "resumen" && (
                <div className="space-y-5">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Intereses Inmobiliarios ({ficha.interesesInmobiliarios.length})
                    </h3>
                    {ficha.interesesInmobiliarios.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        {ficha.identidad.desarrolloInteres
                          ? `Interés registrado en: ${ficha.identidad.desarrolloInteres}`
                          : "Sin intereses comerciales detallados aún."}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.interesesInmobiliarios.map((int) => (
                          <div
                            key={int.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-neutral-900">
                                {int.desarrolloNombre}
                              </span>
                              {int.unidadClave && (
                                <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                                  {int.unidadClave}
                                </span>
                              )}
                              {int.notas && (
                                <p className="mt-1 text-[11px] text-neutral-500">{int.notas}</p>
                              )}
                            </div>
                            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-700">
                              {int.estadoInteres}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Oportunidades Comerciales ({ficha.oportunidades.length})
                    </h3>
                    {ficha.oportunidades.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        Este cliente aún no tiene oportunidades de negociación abiertas.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.oportunidades.map((op) => (
                          <div
                            key={op.id}
                            className="rounded-lg border border-neutral-200 bg-white p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-neutral-900">{op.titulo}</span>
                              <span className="font-mono font-bold text-neutral-900">
                                {formatearMoneda(op.valorEstimado, op.moneda)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                              <span>
                                Etapa: <strong className="text-neutral-700">{op.etapaNombre}</strong>
                              </span>
                              {op.loteUnidad && <span>Unidad: {op.loteUnidad}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* PESTAÑA 2: CONVERSACIONES Y SEGUIMIENTO */}
              {pestana === "conversaciones" && (
                <div className="space-y-5">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Conversaciones Omnicanal ({ficha.conversaciones.length})
                    </h3>
                    {ficha.conversaciones.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        No hay hilos de conversación vinculados a este cliente.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.conversaciones.map((conv) => (
                          <div
                            key={conv.id}
                            className="rounded-lg border border-neutral-200 bg-white p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-neutral-900">{conv.canal}</span>
                              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase text-neutral-700">
                                {conv.estado}
                              </span>
                            </div>
                            {conv.ultimoMensaje && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-neutral-600">
                                “{conv.ultimoMensaje}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Actividades y Seguimientos ({ficha.actividades.length})
                    </h3>
                    {ficha.actividades.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        Sin actividades programadas para este cliente.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.actividades.map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-neutral-900">{act.titulo}</span>
                              <span className="ml-2 text-[11px] uppercase text-neutral-500">
                                {act.tipoActividad}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                              <Clock className="h-3 w-3" />
                              {act.estado}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* PESTAÑA 3: COTIZACIONES Y APARTADOS */}
              {pestana === "cotizaciones" && (
                <div className="space-y-5">
                  <section>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Cotizaciones Emitidas ({ficha.cotizaciones.length})
                      </h3>
                      <Link
                        href="/cotizador"
                        onClick={alCerrar}
                        className="text-xs font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
                      >
                        Nueva Cotización <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    {ficha.cotizaciones.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        Aún no existen cotizaciones vinculadas.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.cotizaciones.map((cot) => (
                          <div
                            key={cot.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs"
                          >
                            <div>
                              <span className="font-mono font-semibold text-neutral-900">
                                {cot.folio}
                              </span>
                              <p className="text-[11px] text-neutral-500">
                                Mensualidad: {formatearMoneda(cot.mensualidadOrdinaria, cot.moneda)} ·{" "}
                                {cot.plazoMeses} meses
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-neutral-900 block">
                                {formatearMoneda(cot.precioNetoFinal, cot.moneda)}
                              </span>
                              <span className="text-[10px] uppercase text-neutral-500">
                                {cot.estado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Apartados de Unidades ({ficha.apartados.length})
                    </h3>
                    {ficha.apartados.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                        Sin apartados registrados para este cliente.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.apartados.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs"
                          >
                            <div>
                              <span className="font-mono font-semibold text-neutral-900">
                                {apt.folioApartado}
                              </span>
                              {apt.unidadClave && (
                                <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                                  {apt.unidadClave}
                                </span>
                              )}
                              <p className="mt-0.5 text-[11px] text-neutral-600">
                                Vence: {new Date(apt.fechaVencimiento).toLocaleDateString("es-MX")}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-neutral-900 block">
                                {formatearMoneda(apt.montoApartado, apt.moneda)}
                              </span>
                              <span className="text-[10px] uppercase text-amber-800 font-semibold">
                                {apt.estadoApartado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* PESTAÑA 4: DOCUMENTOS Y CONTRATOS DOCUSIGN */}
              {pestana === "contratos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Contratos y Sobres DocuSign ({ficha.contratos.length})
                    </h3>
                    <Link
                      href="/clientes?vista=contratos"
                      onClick={alCerrar}
                      className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                    >
                      <FileSignature className="h-3.5 w-3.5" />
                      Gestionar Contratos
                    </Link>
                  </div>

                  {ficha.contratos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-500">
                      No hay contratos emitidos para este cliente todavía. Puedes generar uno desde{" "}
                      <strong>Clientes → Contratos</strong>.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ficha.contratos.map((con) => (
                        <div
                          key={con.id}
                          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs"
                        >
                          <div>
                            <span className="font-mono font-semibold text-neutral-900">
                              {con.folio}
                            </span>
                            <p className="font-medium text-neutral-800">{con.titulo}</p>
                            <span className="text-[11px] text-neutral-500">{con.tipoContrato}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-neutral-900 block">
                              {formatearMoneda(con.montoTotal, con.moneda)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {con.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 5: HISTORIAL Y ATRIBUCIÓN COMERCIAL */}
              {pestana === "historial" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs space-y-2">
                    <h3 className="font-semibold text-neutral-900">Atribución Comercial</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-neutral-500 block">Responsable Inicial</span>
                        <strong className="text-neutral-900">
                          {ficha.identidad.responsableInicialNombre ||
                            ficha.identidad.responsableActualNombre ||
                            "No registrado"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Responsable Actual</span>
                        <strong className="text-neutral-900">
                          {ficha.identidad.responsableActualNombre || "Sin asignar"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Bitácora Cronológica
                    </h3>
                    {ficha.historialCambios.length === 0 ? (
                      <p className="mt-2 text-xs text-neutral-500">Sin eventos registrados.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {ficha.historialCambios.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-neutral-900">{h.tipo}</span>
                              <p className="text-neutral-600">{h.descripcion}</p>
                            </div>
                            <span className="text-[11px] text-neutral-400">
                              {new Date(h.fecha).toLocaleDateString("es-MX")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
