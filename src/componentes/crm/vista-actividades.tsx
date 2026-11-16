// ==============================================================================
// IRIS by WYLEN — VISTA DE ACTIVIDADES Y SEGUIMIENTOS
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import {
  Calendar,
  Plus,
  Phone,
  Video,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
} from "lucide-react";
import type { Actividad, TipoActividad, PrioridadActividad } from "@/tipos/crm";
import { crearActividadAccion } from "@/acciones/crm";

export function VistaActividades({ actividadesIniciales = [] }: { actividadesIniciales: Actividad[] }) {
  const [actividades, setActividades] = React.useState<Actividad[]>(actividadesIniciales);
  const [mostrarModal, setMostrarModal] = React.useState(false);
  const [tipo, setTipo] = React.useState<TipoActividad>("llamada");
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [prioridad, setPrioridad] = React.useState<PrioridadActividad>("media");
  const [fechaVencimiento, setFechaVencimiento] = React.useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [cargando, setCargando] = React.useState(false);

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const respuesta = await crearActividadAccion({
      tipoActividad: tipo,
      titulo,
      descripcion,
      prioridad,
      fechaVencimiento: new Date(fechaVencimiento).toISOString(),
      usuarioResponsableId: "11111111-1111-1111-1111-111111111111", // Contexto usuario
    });

    setCargando(false);

    if (respuesta.exito && respuesta.actividad) {
      setActividades([respuesta.actividad, ...actividades]);
      setMostrarModal(false);
      setTitulo("");
      setDescripcion("");
    } else {
      alert(respuesta.error || "Error al programar actividad.");
    }
  };

  const formatearFecha = (cadena: string) => {
    try {
      return new Date(cadena).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return cadena;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--azul-apagado)]">
            Operaciones y Agenda
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Actividades y Seguimiento Comercial
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Llamadas, citas de demostración, reuniones y tareas programadas por el equipo comercial.
          </p>
        </div>

        <Boton variante="primario" tamano="sm" onClick={() => setMostrarModal(true)}>
          <Plus className="h-4 w-4" />
          <span>Programar Actividad</span>
        </Boton>
      </div>

      {/* Modal para programar actividad */}
      {mostrarModal && (
        <Tarjeta className="border-[var(--azul-apagado)] bg-[var(--surface-hover)]/30 animate-in fade-in duration-200">
          <CabeceraTarjeta>
            <TituloTarjeta>Programar Nueva Actividad</TituloTarjeta>
            <DescripcionTarjeta>Defina el tipo de interacción, fecha límite y responsable.</DescripcionTarjeta>
          </CabeceraTarjeta>
          <ContenidoTarjeta>
            <form onSubmit={manejarCrear} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-[var(--muted)]">Tipo</label>
                  <select
                    className="h-10 px-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)]"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoActividad)}
                  >
                    <option value="llamada">Llamada Telefónica</option>
                    <option value="reunion">Reunión Virtual (Meet)</option>
                    <option value="visita">Visita a Desarrollo</option>
                    <option value="tarea">Tarea Interna</option>
                    <option value="whatsapp">Seguimiento WhatsApp</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-[var(--muted)]">Prioridad</label>
                  <select
                    className="h-10 px-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)]"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as PrioridadActividad)}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <CampoTexto
                  etiqueta="Fecha y Hora de Vencimiento *"
                  type="datetime-local"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  required
                />
              </div>

              <CampoTexto
                etiqueta="Título de la Actividad *"
                placeholder="Ej. Llamada para revisión de cotización de Villa Riviera"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />

              <CampoTexto
                etiqueta="Descripción o Puntos a Tratar"
                placeholder="Detalle objetivos del contacto o dudas técnicas del cliente..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Programar
                </Boton>
              </div>
            </form>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* Lista de Actividades */}
      <div className="space-y-4">
        {actividades.length === 0 ? (
          <Tarjeta className="p-12 text-center text-xs text-[var(--muted)]">
            No hay actividades pendientes en la agenda comercial.
          </Tarjeta>
        ) : (
          actividades.map((act) => (
            <Tarjeta key={act.id} className="hover:border-[var(--azul-apagado)]/40 transition-colors">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface-hover)] text-[var(--azul-apagado-hover)] border border-[var(--border)] shrink-0">
                    {act.tipo_actividad === "llamada" && <Phone className="h-5 w-5" />}
                    {act.tipo_actividad === "reunion" && <Video className="h-5 w-5" />}
                    {act.tipo_actividad === "tarea" && <CheckSquare className="h-5 w-5" />}
                    {act.tipo_actividad === "visita" && <Calendar className="h-5 w-5" />}
                    {act.tipo_actividad === "whatsapp" && <Clock className="h-5 w-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">{act.titulo}</h4>
                      <PlacaEstado
                        variante={
                          act.prioridad === "urgente" || act.prioridad === "alta"
                            ? "destructivo"
                            : act.prioridad === "media"
                            ? "advertencia"
                            : "neutro"
                        }
                        tamano="sm"
                      >
                        {act.prioridad}
                      </PlacaEstado>
                    </div>

                    {act.descripcion && <p className="text-xs text-[var(--muted)]">{act.descripcion}</p>}

                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-[var(--azul-apagado)]" />
                        Vence: {formatearFecha(act.fecha_vencimiento)}
                      </span>
                      {act.prospecto && <span>• Prospecto: {act.prospecto.nombre}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <PlacaEstado variante="neutro" tamano="sm">
                    {act.estado}
                  </PlacaEstado>
                </div>
              </div>
            </Tarjeta>
          ))
        )}
      </div>
    </div>
  );
}
