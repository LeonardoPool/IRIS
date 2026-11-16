// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL DE CONTRATOS (DOCUSIGN ESIGNATURE)
// ==============================================================================

"use client";

import * as React from "react";
import {
  FileSignature,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import type { Contrato } from "@/tipos/contratos";
import { accionCrearContrato, accionEnviarDocuSign } from "@/acciones/contratos";
import { notificar } from "@/librerias/notificaciones/sileo";

interface PropiedadesVistaContratos {
  contratosIniciales: Contrato[];
}

export function VistaContratos({ contratosIniciales }: PropiedadesVistaContratos) {
  const [contratos, setContratos] = React.useState<Contrato[]>(contratosIniciales);
  const [filtroEstado, setFiltroEstado] = React.useState<string>("todos");
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);

  const [nuevoContrato, setNuevoContrato] = React.useState({
    titulo: "",
    tipo_contrato: "promesa_compraventa",
    cliente_nombre: "",
    cliente_correo: "",
    agente_cierre: "Leonardo Pool",
    monto_total: 3500000,
  });

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
      monto
    );
  };

  const contratosFiltrados = contratos.filter((c) => {
    const coincideEstado = filtroEstado === "todos" || c.estado === filtroEstado;
    const coincideBusqueda =
      c.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const totalValor = contratos.reduce((acc, c) => acc + c.monto_total, 0);
  const totalFirmados = contratos.filter((c) => c.estado === "firmado").length;
  const totalEnFirma = contratos.filter((c) => c.estado === "enviado_firma").length;

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await accionCrearContrato(nuevoContrato);
      if (res.exito && res.contrato) {
        setContratos([res.contrato, ...contratos]);
        setModalCrear(false);
        notificar.exito("Contrato redactado", `Folio ${res.contrato.folio} generado con éxito.`);
      }
    } catch (err: any) {
      notificar.error("Error al crear contrato", err.message);
    } finally {
      setCargando(false);
    }
  };

  const manejarEnviarDocuSign = async (id: string, folio: string) => {
    try {
      const res = await accionEnviarDocuSign(id);
      if (res.exito && res.contrato) {
        setContratos(contratos.map((c) => (c.id === id ? res.contrato : c)));
        notificar.exito("Sobre emitido en DocuSign", `Invitaciones enviadas para el folio ${folio}.`);
      }
    } catch (err: any) {
      notificar.error("Error DocuSign", err.message);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Cabecera Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#7185a5] uppercase">
            FORMALIZACIÓN CONTRACTUAL
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Contratos y DocuSign eSignature
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Emisión de sobres electrónicos con validez legal, certificados de finalización y seguimiento en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Boton variante="primario" tamano="sm" onClick={() => setModalCrear(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Contrato
          </Boton>
        </div>
      </div>

      {/* Métricas de Cartera Contractual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tarjeta className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Contratos Firmados</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">{totalFirmados}</div>
          <span className="text-[11px] text-[var(--muted)]">Con certificado de finalización</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">En Proceso de Firma</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">{totalEnFirma}</div>
          <span className="text-[11px] text-[var(--muted)]">Esperando firma de clientes</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-[#17191d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Valor en Cartera</span>
            <FileSignature className="h-4 w-4 text-[var(--muted)]" />
          </div>
          <div className="mt-3 text-xl font-bold tracking-tight text-[var(--foreground)]">
            {formatearMoneda(totalValor)}
          </div>
          <span className="text-[11px] text-[var(--muted)]">Volumen total gestionado</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Integración DocuSign</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 text-sm font-bold text-blue-900">REST API v2.1</div>
          <span className="text-[11px] text-[var(--muted)]">JWT Grant habilitado</span>
        </Tarjeta>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-xs font-medium overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {["todos", "firmado", "enviado_firma", "borrador"].map((est) => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer whitespace-nowrap ${
                filtroEstado === est
                  ? "bg-[var(--surface-active)] text-[var(--foreground)] font-bold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {est === "todos" ? "Todos los Contratos" : est.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente o título..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Tabla de Contratos */}
      <Tarjeta>
        <ContenidoTarjeta className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--muted)] font-semibold">
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Título del Contrato</th>
                  <th className="py-3 px-4">Cliente / Comprador</th>
                  <th className="py-3 px-4">Monto</th>
                  <th className="py-3 px-4">Agente</th>
                  <th className="py-3 px-4">Estado DocuSign</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {contratosFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[11px] text-[var(--foreground)]">
                      {c.folio}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--foreground)]">
                      {c.titulo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[var(--foreground)]">{c.cliente_nombre}</div>
                      <div className="text-[11px] text-[var(--muted)] font-mono">{c.cliente_correo}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[var(--foreground)]">
                      {formatearMoneda(c.monto_total)}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted)]">{c.agente_cierre}</td>
                    <td className="py-3.5 px-4">
                      <PlacaEstado
                        variante={
                          c.estado === "firmado"
                            ? "exito"
                            : c.estado === "enviado_firma"
                            ? "advertencia"
                            : "neutro"
                        }
                      >
                        {c.estado === "firmado"
                          ? "Firmado Digitalmente"
                          : c.estado === "enviado_firma"
                          ? "Esperando Firma"
                          : "Borrador"}
                      </PlacaEstado>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.estado === "borrador" ? (
                        <Boton
                          variante="primario"
                          tamano="sm"
                          onClick={() => manejarEnviarDocuSign(c.id, c.folio)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Enviar a Firma
                        </Boton>
                      ) : (
                        <Boton
                          variante="borde"
                          tamano="sm"
                          onClick={() => {
                            if (c.url_documento) {
                              window.open(c.url_documento, "_blank");
                            } else {
                              notificar.info("Sobre en proceso", `ID de Sobre: ${c.docusign_envelope_id}`);
                            }
                          }}
                        >
                          <FileCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Ver Documento
                        </Boton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContenidoTarjeta>
      </Tarjeta>

      {/* MODAL CREAR CONTRATO */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">Nuevo Contrato Comercial</h3>
              <button onClick={() => setModalCrear(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={manejarCrear} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold block text-[var(--foreground)]">Título del Contrato</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Promesa de Compraventa Depto 301"
                  value={nuevoContrato.titulo}
                  onChange={(e) => setNuevoContrato({ ...nuevoContrato, titulo: e.target.value })}
                  className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mariana Torres"
                    value={nuevoContrato.cliente_nombre}
                    onChange={(e) => setNuevoContrato({ ...nuevoContrato, cliente_nombre: e.target.value })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Correo de Notificación</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    value={nuevoContrato.cliente_correo}
                    onChange={(e) => setNuevoContrato({ ...nuevoContrato, cliente_correo: e.target.value })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Tipo de Contrato</label>
                  <select
                    value={nuevoContrato.tipo_contrato}
                    onChange={(e) => setNuevoContrato({ ...nuevoContrato, tipo_contrato: e.target.value as any })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                  >
                    <option value="promesa_compraventa">Promesa de Compraventa</option>
                    <option value="arrendamiento_residencial">Arrendamiento Residencial</option>
                    <option value="comision_mercantil">Comisión Mercantil</option>
                    <option value="adendum_modificatorio">Adéndum Modificatorio</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Monto de Operación (MXN)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={nuevoContrato.monto_total}
                    onChange={(e) => setNuevoContrato({ ...nuevoContrato, monto_total: Number(e.target.value) })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Boton type="button" variante="secundario" tamano="sm" onClick={() => setModalCrear(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Crear Contrato
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
