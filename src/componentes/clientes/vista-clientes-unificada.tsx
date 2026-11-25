// ==============================================================================
// IRIS by WYLEN — SECCIÓN UNIFICADA: CLIENTES (/clientes)
// ==============================================================================
// Integra en una sola experiencia por pestañas:
// 1. Resumen (Indicadores de cartera, captación y acceso rápido a Ficha 360°)
// 2. Prospectos (Alternador entre Gestión Tradicional y Pool de Leads)
// 3. Contactos (Directorio de clientes calificados)
// 4. Oportunidades (Pipeline Kanban de negociaciones)
// 5. Contratos (Vista global DocuSign para roles autorizados)
// ==============================================================================

"use client";

import * as React from "react";
import {
  Users,
  Contact,
  Kanban,
  FileSignature,
  LayoutGrid,
  Flame,
  ListFilter,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { VistaProspectos } from "@/componentes/crm/vista-prospectos";
import { VistaPoolLeads } from "@/componentes/leads/vista-pool-leads";
import { VistaContactos } from "@/componentes/crm/vista-contactos";
import { VistaOportunidades } from "@/componentes/crm/vista-oportunidades";
import { VistaContratos } from "@/componentes/contratos/vista-contratos";
import {
  FichaUnificadaCliente,
  type SolicitudAbrirFichaCliente,
} from "@/componentes/clientes/ficha-unificada-cliente";
import type { Prospecto, Contacto, Oportunidad, EmbudoVenta, OrigenProspecto } from "@/tipos/crm";
import type { ExpedienteAsesor } from "@/tipos/asesores";
import type { ResultadoPaginadoPoolLeads, EstadoComercialLead } from "@/tipos/leads";
import type { Contrato } from "@/tipos/contratos";

export type PestanaClientes = "resumen" | "prospectos" | "contactos" | "oportunidades" | "contratos";

interface PropiedadesVistaClientesUnificada {
  pestanaInicial: PestanaClientes;
  modoProspectosInicial: "gestion" | "pool";
  puedeVerContratosGlobales: boolean;
  puedeVerPoolLeads: boolean;
  prospectos: Prospecto[];
  origenes: OrigenProspecto[];
  embudo: EmbudoVenta | null;
  asesores: ExpedienteAsesor[];
  resultadoPool: ResultadoPaginadoPoolLeads;
  estadosComerciales: EstadoComercialLead[];
  categoriasPool: string[];
  contactos: Contacto[];
  oportunidades: Oportunidad[];
  contratos: Contrato[];
}

export function VistaClientesUnificada({
  pestanaInicial,
  modoProspectosInicial,
  puedeVerContratosGlobales,
  puedeVerPoolLeads,
  prospectos,
  origenes,
  embudo,
  asesores,
  resultadoPool,
  estadosComerciales,
  categoriasPool,
  contactos,
  oportunidades,
  contratos,
}: PropiedadesVistaClientesUnificada) {
  const [pestana, setPestana] = React.useState<PestanaClientes>(pestanaInicial);
  const [modoProspectos, setModoProspectos] = React.useState<"gestion" | "pool">(
    modoProspectosInicial
  );
  const [fichaSolicitud, setFichaSolicitud] = React.useState<SolicitudAbrirFichaCliente | null>(
    null
  );

  const valorCarteraAbierta = React.useMemo(
    () =>
      oportunidades
        .filter((o) => o.estado === "abierta")
        .reduce((acc, o) => acc + (Number(o.valor_estimado) || 0), 0),
    [oportunidades]
  );

  const formatearMoneda = (monto: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(monto);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera y Navegación Interna */}
      <div className="border-b border-neutral-200 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Ciclo Comercial Integrado
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Clientes y Cartera Comercial
            </h1>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center gap-1" aria-label="Vistas de Clientes">
          {[
            { id: "resumen", label: "Resumen", icono: LayoutGrid },
            { id: "prospectos", label: `Prospectos (${prospectos.length})`, icono: Users },
            { id: "contactos", label: `Contactos (${contactos.length})`, icono: Contact },
            { id: "oportunidades", label: `Oportunidades (${oportunidades.length})`, icono: Kanban },
            ...(puedeVerContratosGlobales
              ? [{ id: "contratos", label: `Contratos (${contratos.length})`, icono: FileSignature }]
              : []),
          ].map((item) => {
            const Icono = item.icono;
            const activa = pestana === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPestana(item.id as PestanaClientes)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
                  activa
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <Icono className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* PESTAÑA 1: RESUMEN EJECUTIVO Y ACCESO RÁPIDO A FICHA 360° */}
      {pestana === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Prospectos Activos</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{prospectos.length}</p>
              <button
                type="button"
                onClick={() => setPestana("prospectos")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
              >
                Ver prospectos <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Contactos Calificados</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{contactos.length}</p>
              <button
                type="button"
                onClick={() => setPestana("contactos")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
              >
                Abrir directorio <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Cartera en Negociación</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {formatearMoneda(valorCarteraAbierta)}
              </p>
              <button
                type="button"
                onClick={() => setPestana("oportunidades")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
              >
                Ver pipeline <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Leads en Pool Central</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{resultadoPool.totalRegistros}</p>
              {puedeVerPoolLeads && (
                <button
                  type="button"
                  onClick={() => {
                    setModoProspectos("pool");
                    setPestana("prospectos");
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  Explorar Pool <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabla rápida de cartera reciente con botón directo a Ficha 360° */}
          <section className="rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Acceso Rápido — Expediente Unificado 360°
                </h2>
                <p className="text-xs text-neutral-500">
                  Consulta intereses inmobiliarios, conversaciones, cotizaciones, apartados y
                  contratos de cualquier cliente sin salir de esta vista.
                </p>
              </div>
            </div>

            {prospectos.length === 0 && contactos.length === 0 ? (
              <div className="p-10 text-center text-xs text-neutral-500">
                Aún no hay registros comerciales en esta organización.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Cliente / Prospecto</th>
                      <th className="px-5 py-3 font-medium">Contacto</th>
                      <th className="px-5 py-3 font-medium">Desarrollo de Interés</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 text-right font-medium">Expediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {prospectos.slice(0, 10).map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/70">
                        <td className="px-5 py-3 font-semibold text-neutral-900">{p.nombre}</td>
                        <td className="px-5 py-3 text-neutral-600">
                          {p.telefono || p.correo_electronico || "—"}
                        </td>
                        <td className="px-5 py-3 text-neutral-700">
                          {p.desarrollo_interes || "Por definir"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium uppercase text-neutral-700">
                            {p.estado}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setFichaSolicitud({
                                prospectoId: p.id,
                                contactoId: p.contacto_convertido_id,
                                nombreRespaldo: p.nombre,
                                telefono: p.telefono,
                                correo: p.correo_electronico,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Abrir Ficha 360°
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* PESTAÑA 2: PROSPECTOS (GESTIÓN + POOL DE LEADS) */}
      {pestana === "prospectos" && (
        <div className="space-y-4">
          {puedeVerPoolLeads && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <span className="text-xs font-medium text-neutral-600">
                Modo de visualización de prospectos:
              </span>
              <div className="inline-flex rounded-lg bg-neutral-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setModoProspectos("gestion")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold cursor-pointer",
                    modoProspectos === "gestion"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Gestión y Conversión
                </button>
                <button
                  type="button"
                  onClick={() => setModoProspectos("pool")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold cursor-pointer",
                    modoProspectos === "pool"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  <Flame className="h-3.5 w-3.5 text-amber-600" />
                  Pool de Leads Multiplataforma
                </button>
              </div>
            </div>
          )}

          {modoProspectos === "pool" && puedeVerPoolLeads ? (
            <VistaPoolLeads
              resultadoInicial={resultadoPool}
              estadosComerciales={estadosComerciales}
              asesoresDisponibles={asesores}
              categoriasDisponibles={categoriasPool}
            />
          ) : (
            <VistaProspectos
              prospectosIniciales={prospectos}
              origenes={origenes}
              embudoPredeterminado={embudo}
              asesoresDisponibles={asesores}
            />
          )}
        </div>
      )}

      {/* PESTAÑA 3: CONTACTOS */}
      {pestana === "contactos" && (
        <div className="space-y-4">
          {contactos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs">
              <span className="text-neutral-600">
                Consulta el expediente unificado de un contacto:
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const seleccionado = contactos.find((c) => c.id === e.target.value);
                  if (seleccionado) {
                    setFichaSolicitud({
                      contactoId: seleccionado.id,
                      prospectoId: seleccionado.prospecto_origen_id,
                      nombreRespaldo: `${seleccionado.nombre} ${seleccionado.apellidos || ""}`.trim(),
                      telefono: seleccionado.telefono_principal,
                      correo: seleccionado.correo_principal,
                    });
                  }
                }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900"
              >
                <option value="">Seleccionar contacto para abrir Ficha 360°...</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellidos || ""} ({c.correo_principal || c.telefono_principal || "Sin dato"})
                  </option>
                ))}
              </select>
            </div>
          )}
          <VistaContactos contactosIniciales={contactos} />
        </div>
      )}

      {/* PESTAÑA 4: OPORTUNIDADES */}
      {pestana === "oportunidades" && (
        <div className="space-y-4">
          {oportunidades.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs">
              <span className="text-neutral-600">
                Inspeccionar expediente 360° desde una oportunidad:
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const op = oportunidades.find((o) => o.id === e.target.value);
                  if (op) {
                    setFichaSolicitud({
                      oportunidadId: op.id,
                      contactoId: op.contacto_id,
                      nombreRespaldo: op.titulo,
                    });
                  }
                }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900"
              >
                <option value="">Abrir Ficha 360° de oportunidad...</option>
                {oportunidades.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.titulo} — {formatearMoneda(Number(op.valor_estimado || 0))}
                  </option>
                ))}
              </select>
            </div>
          )}
          <VistaOportunidades
            embudo={embudo}
            oportunidadesIniciales={oportunidades}
            contactos={contactos}
          />
        </div>
      )}

      {/* PESTAÑA 5: CONTRATOS GLOBALES (AUTORIZADO POR ROL/PERMISO) */}
      {pestana === "contratos" && puedeVerContratosGlobales && (
        <VistaContratos contratosIniciales={contratos} />
      )}

      {/* GAVETA DE FICHA UNIFICADA 360° */}
      <FichaUnificadaCliente
        solicitud={fichaSolicitud}
        alCerrar={() => setFichaSolicitud(null)}
      />
    </div>
  );
}
