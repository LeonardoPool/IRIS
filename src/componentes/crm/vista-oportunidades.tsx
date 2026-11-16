// ==============================================================================
// IRIS by WYLEN — VISTA KANBAN DE OPORTUNIDADES Y EMBUDO DE VENTAS
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import type { Oportunidad, EmbudoVenta, Contacto } from "@/tipos/crm";
import { moverEtapaOportunidadAccion } from "@/acciones/crm";

export function VistaOportunidades({
  embudo,
  oportunidadesIniciales = [],
  contactos = [],
}: {
  embudo: EmbudoVenta | null;
  oportunidadesIniciales: Oportunidad[];
  contactos: Contacto[];
}) {
  const [oportunidades, setOportunidades] = React.useState<Oportunidad[]>(oportunidadesIniciales);
  const [etapas, setEtapas] = React.useState(embudo?.etapas || []);
  const [cargandoMover, setCargandoMover] = React.useState<string | null>(null);

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(cantidad);
  };

  const moverEtapa = async (oportunidadId: string, etapaNuevaId: string) => {
    setCargandoMover(oportunidadId);

    const respuesta = await moverEtapaOportunidadAccion({
      oportunidadId,
      etapaNuevaId,
      notas: "Transición manual desde el tablero Kanban.",
    });

    setCargandoMover(null);

    if (respuesta.exito) {
      setOportunidades(
        oportunidades.map((op) => {
          if (op.id === oportunidadId) {
            const etapaDestino = etapas.find((e) => e.id === etapaNuevaId);
            return {
              ...op,
              etapa_id: etapaNuevaId,
              etapa: etapaDestino as any,
              estado: etapaDestino?.es_etapa_ganada
                ? "ganada"
                : etapaDestino?.es_etapa_perdida
                ? "perdida"
                : "abierta",
            };
          }
          return op;
        })
      );
    } else {
      alert(respuesta.error || "Error al mover etapa de la oportunidad.");
    }
  };

  // Valor total de la cartera activa
  const valorTotalCartera = oportunidades
    .filter((op) => op.estado === "abierta")
    .reduce((acc, curr) => acc + (Number(curr.valor_estimado) || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--azul-apagado)]">
              Pipeline Comercial
            </span>
            <PlacaEstado variante="acento" tamano="sm">
              {formatearMoneda(valorTotalCartera)} en Cartera Activa
            </PlacaEstado>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            {embudo?.nombre || "Embudo de Ventas"}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Monitoree el ciclo de cierre, etapas de maduración y atribución comercial de cada negociación.
          </p>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-6">
        {etapas.map((etapa, indice) => {
          const oportunidadesEtapa = oportunidades.filter((op) => op.etapa_id === etapa.id);
          const totalEtapa = oportunidadesEtapa.reduce(
            (acc, curr) => acc + (Number(curr.valor_estimado) || 0),
            0
          );

          const etapaAnterior = indice > 0 ? etapas[indice - 1] : null;
          const etapaSiguiente = indice < etapas.length - 1 ? etapas[indice + 1] : null;

          return (
            <div
              key={etapa.id}
              className="bg-[var(--surface-hover)]/60 border border-[var(--border)] rounded-[var(--radius-lg)] p-3 flex flex-col min-w-[240px] max-h-[80vh]"
            >
              {/* Cabecera de Columna */}
              <div className="pb-3 border-b border-[var(--border)] mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: etapa.color || "#7185A5" }}
                    />
                    <h3 className="text-xs font-bold text-[var(--foreground)] truncate">{etapa.nombre}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                    {oportunidadesEtapa.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mt-1.5">
                  <span>{etapa.probabilidad_cierre}% prob.</span>
                  <span className="font-semibold text-[var(--foreground)]">{formatearMoneda(totalEtapa)}</span>
                </div>
              </div>

              {/* Lista de Tarjetas de Oportunidad */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {oportunidadesEtapa.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[var(--muted-light)] italic border border-dashed border-[var(--border)] rounded-[var(--radius-md)]">
                    Sin operaciones
                  </div>
                ) : (
                  oportunidadesEtapa.map((op) => (
                    <Tarjeta
                      key={op.id}
                      className="bg-[var(--surface)] border border-[var(--border)] shadow-xs hover:border-[var(--azul-apagado)] transition-colors"
                    >
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-semibold text-[var(--foreground)] leading-snug line-clamp-2">
                            {op.titulo}
                          </h4>
                        </div>

                        <div className="text-[11px] text-[var(--muted)] space-y-1">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-[var(--azul-apagado)]" />
                            <span className="truncate">{op.contacto?.nombre} {op.contacto?.apellidos || ""}</span>
                          </div>
                          {op.desarrollo_propiedad && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <Building className="h-3 w-3 text-[var(--muted-light)]" />
                              <span className="truncate">{op.desarrollo_propiedad}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--foreground)]">
                            {formatearMoneda(Number(op.valor_estimado))}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] uppercase font-mono">{op.moneda}</span>
                        </div>

                        {/* Controles de avance entre etapas */}
                        <div className="flex items-center justify-between pt-1">
                          {etapaAnterior ? (
                            <button
                              onClick={() => moverEtapa(op.id, etapaAnterior.id)}
                              disabled={cargandoMover === op.id}
                              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] cursor-pointer"
                              title={`Retroceder a: ${etapaAnterior.nombre}`}
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span />
                          )}

                          {etapaSiguiente ? (
                            <button
                              onClick={() => moverEtapa(op.id, etapaSiguiente.id)}
                              disabled={cargandoMover === op.id}
                              className="p-1 rounded text-[var(--muted)] hover:text-[var(--azul-apagado)] hover:bg-[var(--surface-hover)] cursor-pointer"
                              title={`Avanzar a: ${etapaSiguiente.nombre}`}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-[var(--success)] font-medium flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Cerrado
                            </span>
                          )}
                        </div>
                      </div>
                    </Tarjeta>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
