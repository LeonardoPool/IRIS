// ==============================================================================
// IRIS by WYLEN — VISTA INTERACTIVA DE PROSPECTOS (LEADS)
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowRightCircle,
  Phone,
  Mail,
  Building,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import type { Prospecto, OrigenProspecto, EmbudoVenta } from "@/tipos/crm";
import { crearProspectoAccion, convertirProspectoAccion } from "@/acciones/crm";

export function VistaProspectos({
  prospectosIniciales = [],
  origenes = [],
  embudoPredeterminado = null,
}: {
  prospectosIniciales: Prospecto[];
  origenes: OrigenProspecto[];
  embudoPredeterminado: EmbudoVenta | null;
}) {
  const [prospectos, setProspectos] = React.useState<Prospecto[]>(prospectosIniciales);
  const [filtroEstado, setFiltroEstado] = React.useState<string>("todos");
  const [busqueda, setBusqueda] = React.useState("");
  const [mostrarModalCrear, setMostrarModalCrear] = React.useState(false);
  const [prospectoAConvertir, setProspectoAConvertir] = React.useState<Prospecto | null>(null);

  // Estados de formulario de creación
  const [nombre, setNombre] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [empresa, setEmpresa] = React.useState("");
  const [desarrollo, setDesarrollo] = React.useState("");
  const [origenId, setOrigenId] = React.useState(origenes[0]?.id || "");
  const [puntuacion, setPuntuacion] = React.useState(20);
  const [cargando, setCargando] = React.useState(false);
  const [mensajeExito, setMensajeExito] = React.useState<string | null>(null);

  // Estados de conversión
  const [tituloOportunidad, setTituloOportunidad] = React.useState("");
  const [valorEstimado, setValorEstimado] = React.useState(2500000);
  const [cargandoConversion, setCargandoConversion] = React.useState(false);

  // Filtrado
  const prospectosFiltrados = prospectos.filter((p) => {
    const coincideEstado = filtroEstado === "todos" || p.estado === filtroEstado;
    const coincideBusqueda =
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.correo_electronico?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.telefono?.includes(busqueda);
    return coincideEstado && coincideBusqueda;
  });

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensajeExito(null);

    const respuesta = await crearProspectoAccion({
      nombre,
      correoElectronico: correo,
      telefono,
      empresaNombre: empresa,
      desarrolloInteres: desarrollo,
      origenId,
      puntuacion: Number(puntuacion),
    });

    setCargando(false);

    if (respuesta.exito && respuesta.prospecto) {
      setProspectos([respuesta.prospecto, ...prospectos]);
      setMostrarModalCrear(false);
      setNombre("");
      setCorreo("");
      setTelefono("");
      setEmpresa("");
      setDesarrollo("");
      setMensajeExito("Prospecto registrado exitosamente.");
    } else {
      alert(respuesta.error || "Error al registrar prospecto.");
    }
  };

  const manejarConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectoAConvertir || !embudoPredeterminado) return;

    setCargandoConversion(true);
    const primeraEtapa = embudoPredeterminado.etapas?.[0]?.id;

    if (!primeraEtapa) {
      alert("No se encontró una etapa inicial en el embudo comercial.");
      setCargandoConversion(false);
      return;
    }

    const respuesta = await convertirProspectoAccion({
      prospectoId: prospectoAConvertir.id,
      crearEmpresa: Boolean(prospectoAConvertir.empresa_nombre),
      empresaNombre: prospectoAConvertir.empresa_nombre || undefined,
      crearOportunidad: true,
      tituloOportunidad: tituloOportunidad || `Venta - ${prospectoAConvertir.nombre}`,
      valorEstimado: Number(valorEstimado),
      moneda: "MXN",
      embudoId: embudoPredeterminado.id,
      etapaId: primeraEtapa,
      agenteAsignadoId: "11111111-1111-1111-1111-111111111111", // ID demo o contexto
    });

    setCargandoConversion(false);

    if (respuesta.exito) {
      setProspectos(
        prospectos.map((p) => (p.id === prospectoAConvertir.id ? { ...p, estado: "convertido" } : p))
      );
      setProspectoAConvertir(null);
      setMensajeExito("¡Prospecto convertido en Contacto y Oportunidad exitosamente!");
    } else {
      alert(respuesta.error || "Error al convertir prospecto.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--azul-apagado)]">
            Atracción y Captura
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Gestión de Prospectos (Leads)
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Capture, califique y convierta prospectos preservando la trazabilidad de su canal de origen.
          </p>
        </div>

        <Boton variante="primario" tamano="sm" onClick={() => setMostrarModalCrear(true)}>
          <Plus className="h-4 w-4" />
          <span>Nuevo Prospecto</span>
        </Boton>
      </div>

      {mensajeExito && (
        <div className="p-4 bg-[var(--success-background)] border border-[var(--success-border)] rounded-[var(--radius-md)] flex items-center gap-2.5 text-xs text-[var(--success)] font-medium animate-in fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Modal / Formulario de Creación */}
      {mostrarModalCrear && (
        <Tarjeta className="border-[var(--azul-apagado)] bg-[var(--surface-hover)]/30 animate-in fade-in duration-200">
          <CabeceraTarjeta>
            <TituloTarjeta>Registrar Nuevo Prospecto</TituloTarjeta>
            <DescripcionTarjeta>Ingrese los datos de contacto y canal de adquisición del prospecto.</DescripcionTarjeta>
          </CabeceraTarjeta>
          <ContenidoTarjeta>
            <form onSubmit={manejarCrear} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Nombre Completo *"
                  placeholder="Ej. Roberto Morales"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
                <CampoTexto
                  etiqueta="Teléfono Principal (WhatsApp)"
                  placeholder="+52 998 123 4567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Correo Electrónico"
                  type="email"
                  placeholder="roberto.morales@empresa.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
                <CampoTexto
                  etiqueta="Empresa (Opcional)"
                  placeholder="Ej. Grupo Hotelero Maya"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Desarrollo o Propiedad de Interés"
                  placeholder="Ej. Villa Paraíso Riviera Lote 14"
                  value={desarrollo}
                  onChange={(e) => setDesarrollo(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                    Canal de Origen *
                  </label>
                  <select
                    className="h-10 px-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)]"
                    value={origenId}
                    onChange={(e) => setOrigenId(e.target.value)}
                  >
                    {origenes.map((orig) => (
                      <option key={orig.id} value={orig.id}>
                        {orig.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setMostrarModalCrear(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Guardar Prospecto
                </Boton>
              </div>
            </form>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* Modal de Conversión */}
      {prospectoAConvertir && (
        <Tarjeta className="border-[var(--success-border)] bg-[var(--success-background)]/20 animate-in fade-in duration-200">
          <CabeceraTarjeta>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--success)]" />
              <TituloTarjeta>Convertir Prospecto a Oportunidad Comercial</TituloTarjeta>
            </div>
            <DescripcionTarjeta>
              Se creará un registro de Contacto unificado y se abrirá una Oportunidad en el Embudo de Ventas.
            </DescripcionTarjeta>
          </CabeceraTarjeta>
          <ContenidoTarjeta>
            <form onSubmit={manejarConversion} className="space-y-4">
              <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-xs space-y-1">
                <p><strong>Prospecto:</strong> {prospectoAConvertir.nombre}</p>
                <p><strong>Contacto:</strong> {prospectoAConvertir.telefono || prospectoAConvertir.correo_electronico || "Sin contacto"}</p>
                {prospectoAConvertir.desarrollo_interes && (
                  <p><strong>Interés:</strong> {prospectoAConvertir.desarrollo_interes}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Título de la Oportunidad *"
                  placeholder={`Venta - ${prospectoAConvertir.nombre}`}
                  value={tituloOportunidad}
                  onChange={(e) => setTituloOportunidad(e.target.value)}
                  required
                />
                <CampoTexto
                  etiqueta="Valor Estimado ($ MXN) *"
                  type="number"
                  placeholder="2500000"
                  value={valorEstimado.toString()}
                  onChange={(e) => setValorEstimado(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setProspectoAConvertir(null)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="acento" tamano="sm" cargando={cargandoConversion}>
                  Confirmar Conversión
                </Boton>
              </div>
            </form>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="h-4 w-4 text-[var(--muted-light)] absolute left-3.5 top-3" />
          <input
            className="h-10 w-full pl-9 pr-4 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-1 focus:ring-[var(--azul-apagado)]"
            placeholder="Buscar por nombre, correo o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["todos", "nuevo", "contactado", "calificado", "convertido"].map((est) => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 text-xs rounded-[var(--radius-sm)] font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                filtroEstado === est
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Listado de Prospectos */}
      <Tarjeta>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Prospecto</th>
                <th className="py-3 px-4 font-semibold">Canal de Origen</th>
                <th className="py-3 px-4 font-semibold">Interés / Desarrollo</th>
                <th className="py-3 px-4 font-semibold">Puntuación</th>
                <th className="py-3 px-4 font-semibold">Estado</th>
                <th className="py-3 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--foreground)]">
              {prospectosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--muted)]">
                    No se encontraron prospectos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                prospectosFiltrados.map((prospecto) => (
                  <tr key={prospecto.id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm">{prospecto.nombre}</div>
                      <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                        {prospecto.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {prospecto.telefono}
                          </span>
                        )}
                        {prospecto.correo_electronico && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {prospecto.correo_electronico}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--azul-tenue)] text-[var(--azul-apagado-hover)]">
                        {prospecto.origen?.nombre || "Canal Digital"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted)]">
                      {prospecto.desarrollo_interes || "General"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <span className={prospecto.puntuacion >= 50 ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                        {prospecto.puntuacion} pts
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <PlacaEstado
                        variante={
                          prospecto.estado === "convertido"
                            ? "exito"
                            : prospecto.estado === "calificado"
                            ? "acento"
                            : prospecto.estado === "nuevo"
                            ? "advertencia"
                            : "neutro"
                        }
                        tamano="sm"
                      >
                        {prospecto.estado}
                      </PlacaEstado>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {prospecto.estado !== "convertido" ? (
                        <Boton
                          variante="borde"
                          tamano="sm"
                          onClick={() => {
                            setProspectoAConvertir(prospecto);
                            setTituloOportunidad(`Oportunidad - ${prospecto.nombre}`);
                          }}
                          className="text-[11px] h-7 px-2.5"
                        >
                          <span>Convertir</span>
                          <ArrowRightCircle className="h-3.5 w-3.5 text-[var(--azul-apagado)]" />
                        </Boton>
                      ) : (
                        <span className="text-[11px] text-[var(--success)] font-medium">Convertido</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
