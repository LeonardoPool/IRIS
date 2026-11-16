// ==============================================================================
// IRIS by WYLEN — BANDEJA OMNICANAL UNIFICADA (INBOX WORKSPACE)
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { Avatar } from "@/componentes/ui/avatar";
import {
  Inbox,
  Send,
  MessageSquare,
  Lock,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  UserPlus,
  RefreshCw,
  Search,
  MessageCircle,
} from "lucide-react";
import type { Conversacion, Mensaje } from "@/tipos/omnicanal";
import type { Usuario } from "@/tipos/identidad";
import {
  enviarMensajeSalienteAccion,
  agregarNotaInternaAccion,
  asignarConversacionAccion,
  obtenerMensajesConversacionAccion,
} from "@/acciones/comunicacion";

export function VistaBandeja({
  conversacionesIniciales = [],
  agentesDisponibles = [],
  usuarioActualId,
}: {
  conversacionesIniciales: Conversacion[];
  agentesDisponibles: Usuario[];
  usuarioActualId: string;
}) {
  const [conversaciones, setConversaciones] = React.useState<Conversacion[]>(conversacionesIniciales);
  const [clasificacion, setClasificacion] = React.useState<
    "todas" | "no_asignadas" | "mis_conversaciones" | "prioritarias" | "cerradas"
  >("todas");
  const [conversacionActiva, setConversacionActiva] = React.useState<Conversacion | null>(
    conversacionesIniciales[0] || null
  );
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = React.useState(false);
  const [textoMensaje, setTextoMensaje] = React.useState("");
  const [modoNotaInterna, setModoNotaInterna] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  // Modal de Reasignación
  const [mostrarModalAsignar, setMostrarModalAsignar] = React.useState(false);
  const [nuevoAgenteId, setNuevoAgenteId] = React.useState(agentesDisponibles[0]?.id || "");
  const [motivoReasignacion, setMotivoReasignacion] = React.useState("");
  const [cargandoAsignacion, setCargandoAsignacion] = React.useState(false);

  // Cargar mensajes al cambiar de conversación activa
  React.useEffect(() => {
    if (!conversacionActiva) return;

    let cancelado = false;
    setCargandoMensajes(true);

    obtenerMensajesConversacionAccion(conversacionActiva.id).then((res) => {
      if (!cancelado && res.exito) {
        setMensajes(res.mensajes);
        setCargandoMensajes(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [conversacionActiva]);

  // Filtrar conversaciones por pestaña
  const conversacionesFiltradas = conversaciones.filter((c) => {
    if (clasificacion === "no_asignadas") return !c.agente_asignado_actual_id && c.estado !== "cerrada";
    if (clasificacion === "mis_conversaciones")
      return c.agente_asignado_actual_id === usuarioActualId && c.estado !== "cerrada";
    if (clasificacion === "prioritarias")
      return (c.prioridad === "alta" || c.prioridad === "urgente") && c.estado !== "cerrada";
    if (clasificacion === "cerradas") return c.estado === "cerrada";
    return c.estado !== "cerrada";
  });

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversacionActiva || !textoMensaje.trim()) return;

    setEnviando(true);
    const texto = textoMensaje.trim();

    if (modoNotaInterna) {
      const res = await agregarNotaInternaAccion(conversacionActiva.id, texto);
      if (res.exito && res.nota) {
        setMensajes([...mensajes, res.nota]);
        setTextoMensaje("");
      } else {
        alert(res.error || "Error al agregar nota interna.");
      }
    } else {
      const res = await enviarMensajeSalienteAccion(conversacionActiva.id, texto);
      if (res.exito && res.mensaje) {
        setMensajes([...mensajes, res.mensaje]);
        setTextoMensaje("");
        // Actualizar último mensaje en lista
        setConversaciones(
          conversaciones.map((c) =>
            c.id === conversacionActiva.id
              ? {
                  ...c,
                  ultimo_mensaje_texto: texto,
                  registro_sla: c.registro_sla
                    ? { ...c.registro_sla, es_primera_respuesta_completada: true, estado_sla: "cumplido" }
                    : null,
                }
              : c
          )
        );
      } else {
        alert(res.error || "Error al enviar mensaje.");
      }
    }

    setEnviando(false);
  };

  const manejarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversacionActiva) return;

    setCargandoAsignacion(true);
    const res = await asignarConversacionAccion(conversacionActiva.id, nuevoAgenteId, motivoReasignacion);
    setCargandoAsignacion(false);

    if (res.exito) {
      const agente = agentesDisponibles.find((a) => a.id === nuevoAgenteId);
      setConversaciones(
        conversaciones.map((c) =>
          c.id === conversacionActiva.id
            ? { ...c, agente_asignado_actual_id: nuevoAgenteId, agente_asignado_actual: agente }
            : c
        )
      );
      setConversacionActiva({
        ...conversacionActiva,
        agente_asignado_actual_id: nuevoAgenteId,
        agente_asignado_actual: agente,
      });
      setMostrarModalAsignar(false);
      setMotivoReasignacion("");
    } else {
      alert(res.error || "Error al asignar conversación.");
    }
  };

  const formatearHora = (cadena: string) => {
    try {
      return new Date(cadena).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-7xl mx-auto border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface)] overflow-hidden shadow-xs select-none">
      {/* 1. NAVEGACIÓN SUPERIOR DE BANDEJA */}
      <div className="h-12 border-b border-[var(--border)] bg-[var(--surface-hover)]/40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "todas", nombre: "Todas" },
            { id: "no_asignadas", nombre: "No Asignadas" },
            { id: "mis_conversaciones", nombre: "Asignadas a Mí" },
            { id: "prioritarias", nombre: "Prioritarias" },
            { id: "cerradas", nombre: "Cerradas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setClasificacion(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors whitespace-nowrap cursor-pointer ${
                clasificacion === tab.id
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {tab.nombre}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock className="h-4 w-4 text-[var(--azul-apagado)]" />
          <span>SLA Objetivo: 10 min</span>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMNA 1: LISTADO DE CONVERSACIONES */}
        <div className="w-80 border-r border-[var(--border)] flex flex-col bg-[var(--surface)]">
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[var(--muted-light)] absolute left-3 top-2.5" />
              <input
                className="h-8 w-full pl-8 pr-3 text-xs bg-[var(--surface-hover)]/60 border border-[var(--border)] rounded-[var(--radius-md)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-1 focus:ring-[var(--azul-apagado)]"
                placeholder="Buscar conversación..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {conversacionesFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted)]">No hay conversaciones en esta vista.</div>
            ) : (
              conversacionesFiltradas.map((c) => {
                const estaSeleccionada = conversacionActiva?.id === c.id;
                const sla = c.registro_sla;

                return (
                  <div
                    key={c.id}
                    onClick={() => setConversacionActiva(c)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      estaSeleccionada ? "bg-[var(--azul-tenue)]/50 border-l-2 border-l-[var(--azul-apagado)]" : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                        {c.nombre_remoto_cliente || c.identificador_remoto_cliente}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] shrink-0">
                        {formatearHora(c.fecha_ultimo_mensaje)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--muted)] truncate mb-2">{c.ultimo_mensaje_texto}</p>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="inline-flex items-center gap-1 text-[var(--azul-apagado-hover)] font-medium">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </span>

                      {/* Indicador de SLA */}
                      {sla && !sla.es_primera_respuesta_completada && (
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            sla.estado_sla === "violado"
                              ? "bg-[var(--destructive-background)] text-[var(--destructive)]"
                              : sla.estado_sla === "en_alerta"
                              ? "bg-[var(--warning-background)] text-[var(--warning)]"
                              : "bg-[var(--success-background)] text-[var(--success)]"
                          }`}
                        >
                          SLA {sla.minutos_restantes ? `${sla.minutos_restantes}m` : "10m"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA 2: ÁREA DE CHAT Y MENSAJERÍA */}
        <div className="flex-1 flex flex-col bg-[var(--background)]">
          {conversacionActiva ? (
            <>
              {/* Cabecera de Conversación Activa */}
              <div className="h-14 px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar nombre={conversacionActiva.nombre_remoto_cliente || "C"} tamano="sm" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--foreground)]">
                      {conversacionActiva.nombre_remoto_cliente || conversacionActiva.identificador_remoto_cliente}
                    </h3>
                    <span className="text-[10px] text-[var(--muted)]">
                      {conversacionActiva.identificador_remoto_cliente} • WhatsApp Business
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Boton
                    variante="borde"
                    tamano="sm"
                    className="h-8 text-xs"
                    onClick={() => setMostrarModalAsignar(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>
                      {conversacionActiva.agente_asignado_actual?.nombre_completo || "Asignar Agente"}
                    </span>
                  </Boton>
                </div>
              </div>

              {/* Flujo de Mensajes */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {cargandoMensajes ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)]">Cargando historial de mensajes...</div>
                ) : mensajes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)]">
                    Inicie la conversación con el cliente respondiendo a continuación.
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const esSaliente = m.direccion === "saliente";
                    const esInterna = m.direccion === "interna" || m.tipo_contenido === "nota_interna";

                    if (esInterna) {
                      return (
                        <div
                          key={m.id}
                          className="mx-auto max-w-lg p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-[var(--radius-md)] text-xs text-amber-900 dark:text-amber-200 space-y-1 shadow-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <Lock className="h-3 w-3 text-amber-600" />
                              Nota Interna • {m.remitente_usuario?.nombre_completo || "Agente"}
                            </span>
                            <span className="text-amber-700/70">{formatearHora(m.fecha_creacion)}</span>
                          </div>
                          <p>{m.contenido_texto}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${esSaliente ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-[var(--radius-lg)] text-xs shadow-xs ${
                            esSaliente
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)] rounded-br-xs"
                              : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-bl-xs"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.contenido_texto}</p>
                          <div
                            className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                              esSaliente ? "text-white/70" : "text-[var(--muted)]"
                            }`}
                          >
                            <span>{formatearHora(m.fecha_creacion)}</span>
                            {esSaliente && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Barra de Entrada de Mensaje */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
                {/* Selector de Modo: Mensaje Saliente o Nota Interna */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setModoNotaInterna(false)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                      !modoNotaInterna
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    Mensaje a Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoNotaInterna(true)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      modoNotaInterna
                        ? "bg-amber-600 text-white"
                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    <span>Nota Interna</span>
                  </button>
                </div>

                <form onSubmit={manejarEnvio} className="flex items-center gap-2">
                  <input
                    value={textoMensaje}
                    onChange={(e) => setTextoMensaje(e.target.value)}
                    placeholder={
                      modoNotaInterna
                        ? "Escriba una nota privada visible solo para el equipo comercial..."
                        : "Escriba su respuesta al cliente por WhatsApp..."
                    }
                    className="flex-1 h-10 px-4 text-xs bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-1 focus:ring-[var(--azul-apagado)] text-[var(--foreground)]"
                  />
                  <Boton
                    type="submit"
                    variante={modoNotaInterna ? "acento" : "primario"}
                    tamano="md"
                    cargando={enviando}
                    className="h-10 px-4"
                  >
                    <Send className="h-4 w-4" />
                    <span>{modoNotaInterna ? "Guardar Nota" : "Enviar"}</span>
                  </Boton>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted)]">
              Seleccione una conversación para comenzar a responder.
            </div>
          )}
        </div>

        {/* COLUMNA 3: PANEL DE CONTEXTO CRM DEL CLIENTE (Sección 10.2) */}
        {conversacionActiva && (
          <div className="w-72 border-l border-[var(--border)] bg-[var(--surface)] p-5 overflow-y-auto space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                Contexto Comercial 360°
              </h4>
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-sm text-[var(--foreground)]">
                  {conversacionActiva.nombre_remoto_cliente || "Prospecto Sin Nombre"}
                </div>
                <div className="text-[var(--muted)] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[var(--azul-apagado)]" />
                  <span>{conversacionActiva.identificador_remoto_cliente}</span>
                </div>
              </div>
            </div>

            {/* Canal de Captación */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Adquisición y Origen
              </span>
              <div className="text-xs">
                <p className="font-medium text-[var(--foreground)]">WhatsApp Business Cloud</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Captura directa de mensajería</p>
              </div>
            </div>

            {/* Estado de SLA */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Auditoría de SLA
              </span>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-hover)] border border-[var(--border)] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Objetivo:</span>
                  <span className="font-semibold">10 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Estado:</span>
                  <PlacaEstado
                    variante={
                      conversacionActiva.registro_sla?.estado_sla === "violado"
                        ? "destructivo"
                        : conversacionActiva.registro_sla?.estado_sla === "cumplido"
                        ? "exito"
                        : "advertencia"
                    }
                    tamano="sm"
                  >
                    {conversacionActiva.registro_sla?.estado_sla || "a_tiempo"}
                  </PlacaEstado>
                </div>
              </div>
            </div>

            {/* Agente Asignado */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Titularidad Actual
              </span>
              <div className="flex items-center gap-2.5 text-xs">
                <Avatar
                  nombre={conversacionActiva.agente_asignado_actual?.nombre_completo || "A"}
                  tamano="sm"
                />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {conversacionActiva.agente_asignado_actual?.nombre_completo || "Sin Asignar"}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">Responsable activo</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ASIGNACIÓN / REASIGNACIÓN CON MOTIVO OBLIGATORIO */}
      {mostrarModalAsignar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <Tarjeta className="max-w-md w-full animate-in zoom-in-95 duration-150">
            <CabeceraTarjeta>
              <TituloTarjeta>Asignar o Transferir Conversación</TituloTarjeta>
              <DescripcionTarjeta>
                El cambio quedará registrado en la bitácora inmutable de auditoría.
              </DescripcionTarjeta>
            </CabeceraTarjeta>
            <ContenidoTarjeta>
              <form onSubmit={manejarAsignacion} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Nuevo Agente Responsable *</label>
                  <select
                    value={nuevoAgenteId}
                    onChange={(e) => setNuevoAgenteId(e.target.value)}
                    className="h-10 px-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)]"
                  >
                    {agentesDisponibles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre_completo} ({a.correo_electronico})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Motivo de Asignación / Transferencia *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Especifique la razón de transferencia (ej. Especialista en Lotes Riviera)..."
                    value={motivoReasignacion}
                    onChange={(e) => setMotivoReasignacion(e.target.value)}
                    className="p-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--azul-apagado)]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setMostrarModalAsignar(false)}>
                    Cancelar
                  </Boton>
                  <Boton type="submit" variante="primario" tamano="sm" cargando={cargandoAsignacion}>
                    Confirmar Asignación
                  </Boton>
                </div>
              </form>
            </ContenidoTarjeta>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
