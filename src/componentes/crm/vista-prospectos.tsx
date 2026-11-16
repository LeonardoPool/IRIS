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
  ArrowRightLeft,
  UserCheck,
  X,
} from "lucide-react";
import type { Prospecto, OrigenProspecto, EmbudoVenta } from "@/tipos/crm";
import type { ExpedienteAsesor } from "@/tipos/asesores";
import { crearProspectoAccion, convertirProspectoAccion } from "@/acciones/crm";
import { accionReasignarCaso } from "@/acciones/asesores";
import { notificar } from "@/librerias/notificaciones/sileo";

export function VistaProspectos({
  prospectosIniciales = [],
  origenes = [],
  embudoPredeterminado = null,
  asesoresDisponibles = [],
}: {
  prospectosIniciales: Prospecto[];
  origenes: OrigenProspecto[];
  embudoPredeterminado: EmbudoVenta | null;
  asesoresDisponibles?: ExpedienteAsesor[];
}) {
  const [prospectos, setProspectos] = React.useState<Prospecto[]>(prospectosIniciales);
  const [filtroEstado, setFiltroEstado] = React.useState<string>("todos");
  const [busqueda, setBusqueda] = React.useState("");
  const [mostrarModalCrear, setMostrarModalCrear] = React.useState(false);
  const [prospectoAConvertir, setProspectoAConvertir] = React.useState<Prospecto | null>(null);

  // Estados para reasignación por supervisores
  const [prospectoAReasignar, setProspectoAReasignar] = React.useState<Prospecto | null>(null);
  const [asesorDestinoId, setAsesorDestinoId] = React.useState<string>(asesoresDisponibles[0]?.id || "");
  const [motivoReasignacion, setMotivoReasignacion] = React.useState("");
  const [cargandoReasignacion, setCargandoReasignacion] = React.useState(false);

  // Estados de formulario de creación
  const [nombre, setNombre] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [empresa, setEmpresa] = React.useState("");
  const [desarrollo, setDesarrollo] = React.useState("");
  const [origenId, setOrigenId] = React.useState(origenes[0]?.id || "");
  const [puntuacion, setPuntuacion] = React.useState(20);
  const [cargando, setCargando] = React.useState(false);

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
      notificar.exito("Prospecto registrado", `${respuesta.prospecto.nombre} añadido al pipeline.`);
    } else {
      notificar.error("Error al registrar", respuesta.error || "No se pudo registrar el prospecto.");
    }
  };

  const manejarConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectoAConvertir || !embudoPredeterminado) return;

    setCargandoConversion(true);
    const primeraEtapa = embudoPredeterminado.etapas?.[0]?.id;

    if (!primeraEtapa) {
      notificar.aviso("Configuración requerida", "No se encontró una etapa inicial en el embudo comercial.");
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
      etapaInicialId: primeraEtapa,
    });

    setCargandoConversion(false);

    if (respuesta.exito) {
      setProspectos(
        prospectos.map((p) => (p.id === prospectoAConvertir.id ? { ...p, estado: "convertido" } : p))
      );
      setProspectoAConvertir(null);
      notificar.exito("Conversión exitosa", "El prospecto se convirtió a contacto y oportunidad comercial.");
    } else {
      notificar.error("Error al convertir", respuesta.error || "No se pudo completar la conversión.");
    }
  };

  const manejarReasignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectoAReasignar || !asesorDestinoId) {
      notificar.aviso("Selección requerida", "Debe elegir un asesor destino.");
      return;
    }

    setCargandoReasignacion(true);

    const respuesta = await accionReasignarCaso({
      tipo_caso: "prospecto",
      caso_id: prospectoAReasignar.id,
      nuevo_asesor_id: asesorDestinoId,
      motivo: motivoReasignacion,
    });

    setCargandoReasignacion(false);

    if (respuesta.exito) {
      const asesorDestino = asesoresDisponibles.find((a) => a.id === asesorDestinoId);
      setProspectos(
        prospectos.map((p) =>
          p.id === prospectoAReasignar.id
            ? { ...p, agente_asignado_id: asesorDestinoId, agente_asignado: asesorDestino as any }
            : p
        )
      );
      notificar.exito("Caso Reasignado", respuesta.mensaje);
      setProspectoAReasignar(null);
      setMotivoReasignacion("");
    } else {
      notificar.error("Error al reasignar", respuesta.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera y botón principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Gestión de Prospectos (Leads)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Calificación, distribución supervisada y avance en el embudo comercial.
          </p>
        </div>

        <button
          onClick={() => setMostrarModalCrear(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Prospecto</span>
        </button>
      </div>

      {/* 2. Tarjeta con filtros y tabla */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Barra de Búsqueda y Filtros de Estado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f3f5] pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["todos", "nuevo", "contactado", "calificado", "convertido", "descalificado"].map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  filtroEstado === est
                    ? "bg-[#eceef1] text-gray-900 font-bold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Prospecto</th>
                <th className="py-3 px-4">Canal / Origen</th>
                <th className="py-3 px-4">Desarrollo</th>
                <th className="py-3 px-4">Puntuación</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Supervisión / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prospectosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No hay prospectos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                prospectosFiltrados.map((prospecto) => (
                  <tr key={prospecto.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{prospecto.nombre}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
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

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {prospecto.origen?.nombre || "Canal Digital"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {prospecto.desarrollo_interes || "General"}
                    </td>

                    <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      <span className={prospecto.puntuacion >= 50 ? "text-emerald-600 font-bold" : "text-gray-400"}>
                        {prospecto.puntuacion} pts
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
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

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Botón de reasignación supervisada */}
                        <button
                          onClick={() => {
                            setProspectoAReasignar(prospecto);
                            setAsesorDestinoId(asesoresDisponibles[0]?.id || "");
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Reasignar a otro asesor (Supervisión)"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 text-gray-500" />
                          <span>Reasignar</span>
                        </button>

                        {/* Botón convertir */}
                        {prospecto.estado !== "convertido" ? (
                          <button
                            onClick={() => {
                              setProspectoAConvertir(prospecto);
                              setTituloOportunidad(`Oportunidad - ${prospecto.nombre}`);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-gray-900 bg-[#eceef1] hover:bg-gray-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Convertir</span>
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold">Convertido</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL: REASIGNACIÓN DE CASO (SUPERVISIÓN) */}
      {prospectoAReasignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-gray-800" />
                <h3 className="font-extrabold text-sm text-gray-900">
                  Reasignación Supervisada de Caso
                </h3>
              </div>
              <button
                onClick={() => setProspectoAReasignar(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Transfiera la atención del prospecto <strong className="text-gray-800">{prospectoAReasignar.nombre}</strong> a otro asesor del equipo comercial.
            </p>

            <form onSubmit={manejarReasignacion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nuevo Asesor Asignado *
                </label>
                <select
                  required
                  value={asesorDestinoId}
                  onChange={(e) => setAsesorDestinoId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                >
                  <option value="">— Seleccionar Asesor —</option>
                  {asesoresDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre_completo} {a.equipo ? `(${a.equipo.nombre})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Motivo de Reasignación (Auditoría Interna)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. Reasignado por saturación de cartera o especialización de zona..."
                  value={motivoReasignacion}
                  onChange={(e) => setMotivoReasignacion(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setProspectoAReasignar(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoReasignacion}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
                >
                  {cargandoReasignacion ? "Reasignando..." : "Confirmar Reasignación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: CREAR PROSPECTO */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Nuevo Prospecto Comercial</h3>
              <button
                onClick={() => setMostrarModalCrear(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={manejarCrear} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Sánchez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="roberto@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+52 998 123 4567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Empresa / Razón Social</label>
                  <input
                    type="text"
                    placeholder="Inversiones del Golfo"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Desarrollo de Interés</label>
                  <input
                    type="text"
                    placeholder="Torre Mirador Fase II"
                    value={desarrollo}
                    onChange={(e) => setDesarrollo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
                >
                  {cargando ? "Registrando..." : "Guardar Prospecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: CONVERTIR PROSPECTO */}
      {prospectoAConvertir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Convertir a Oportunidad</h3>
              <button
                onClick={() => setProspectoAConvertir(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={manejarConversion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  value={tituloOportunidad}
                  onChange={(e) => setTituloOportunidad(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Valor Estimado ($ MXN) *</label>
                <input
                  type="number"
                  required
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setProspectoAConvertir(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoConversion}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
                >
                  {cargandoConversion ? "Convirtiendo..." : "Completar Conversión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
