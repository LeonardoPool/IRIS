// ==============================================================================
// IRIS by WYLEN — BANDEJA OMNICANAL UNIFICADA (CHAT MAQUETADO CON FLUJOS E INTERACCIONES)
// ==============================================================================

"use client";

import * as React from "react";
import Image from "next/image";
import {
  Send,
  MessageSquare,
  Lock,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  UserPlus,
  Search,
  MessageCircle,
  FileText,
  Calendar,
  Video,
  ExternalLink,
  Bot,
  UserCheck,
  ArrowLeft,
  Paperclip,
  Sparkles,
  Download,
  ShieldAlert,
  SlidersHorizontal,
  MapPin,
  DollarSign,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import type { Conversacion, Mensaje } from "@/tipos/omnicanal";
import type { Usuario } from "@/tipos/identidad";

// Tipos ampliados para simulación de flujos enriquecidos
interface MensajeSimulado {
  id: string;
  direccion: "entrante" | "saliente" | "interna" | "sistema";
  tipo: "texto" | "archivo" | "reunion" | "bot";
  texto: string;
  remitente: string;
  hora: string;
  metadatos?: {
    nombreArchivo?: string;
    pesoArchivo?: string;
    enlaceMeet?: string;
    fechaReunion?: string;
    autorNota?: string;
  };
}

interface ConversacionSimulada {
  id: string;
  nombreCliente: string;
  telefono: string;
  correo: string;
  ultimoMensaje: string;
  hora: string;
  noLeidos: number;
  canal: "whatsapp" | "meta" | "web";
  estadoSla: "cumplido" | "en_alerta" | "violado";
  minutosSla: number;
  interes: string;
  presupuesto: string;
  etapaEmbudo: string;
  score: number;
  asesorAsignado: string;
  mensajes: MensajeSimulado[];
}

const CONVERSACIONES_MOCK: ConversacionSimulada[] = [
  {
    id: "conv-1",
    nombreCliente: "Arq. Sofía Villaseñor",
    telefono: "+52 (998) 234-8890",
    correo: "sofia.villasenor@estudio-arq.mx",
    ultimoMensaje: "Excelente, me gustaría coordinar una videollamada por Google Meet mañana a las 5pm.",
    hora: "10:52 AM",
    noLeidos: 1,
    canal: "whatsapp",
    estadoSla: "cumplido",
    minutosSla: 2,
    interes: "Torre Aura • Penthouse PH-15",
    presupuesto: "$8,500,000 MXN",
    etapaEmbudo: "En Negociación",
    score: 88,
    asesorAsignado: "Carlos Méndez (Asesor Comercial)",
    mensajes: [
      {
        id: "m-1",
        direccion: "entrante",
        tipo: "texto",
        texto: "¡Hola! Vi su anuncio en Instagram sobre el Penthouse en Torre Aura. ¿Sigue disponible para entrega inmediata y qué facilidades de financiamiento manejan?",
        remitente: "Arq. Sofía Villaseñor",
        hora: "10:42 AM",
      },
      {
        id: "m-2",
        direccion: "sistema",
        tipo: "bot",
        texto: "¡Hola Sofía! Gracias por comunicarte con Inmobiliaria Horizonte WYLEN. Hemos canalizado tu solicitud con un Asesor Patrimonial asignado. Tiempo estimado de respuesta: menos de 3 minutos. (SLA Activado: 10m).",
        remitente: "IRIS Bot Automatizado",
        hora: "10:43 AM",
      },
      {
        id: "m-3",
        direccion: "saliente",
        tipo: "texto",
        texto: "Hola Arq. Sofía, un gusto saludarte. Soy Carlos Méndez, Asesor Comercial de Horizonte WYLEN. Sí, contamos con dos unidades exclusivas disponibles en los niveles 14 y 15 con vista panorámica a la laguna y entrega inmediata. ¿Te gustaría conocer el brochure con acabados y plano arquitectónico?",
        remitente: "Carlos Méndez",
        hora: "10:45 AM",
      },
      {
        id: "m-4",
        direccion: "entrante",
        tipo: "texto",
        texto: "Sí por favor, me interesa mucho ver los acabados y el plano de distribución del nivel 15.",
        remitente: "Arq. Sofía Villaseñor",
        hora: "10:47 AM",
      },
      {
        id: "m-5",
        direccion: "saliente",
        tipo: "archivo",
        texto: "Te comparto el expediente comercial con planos de 3 recámaras, terraza privada de 65m² y la lista de precios preferencial:",
        remitente: "Carlos Méndez",
        hora: "10:48 AM",
        metadatos: {
          nombreArchivo: "Brochure_Ejecutivo_Torre_Aura_PH15.pdf",
          pesoArchivo: "14.2 MB",
        },
      },
      {
        id: "m-6",
        direccion: "interna",
        tipo: "texto",
        texto: "Cliente calificada con solvencia alta. Si confirma la reunión virtual, aplicar promoción de $150,000 MXN en gastos notariales autorizada por Dirección Comercial.",
        remitente: "Carlos Méndez",
        hora: "10:50 AM",
        metadatos: {
          autorNota: "Carlos Méndez (Supervisor / Asesor)",
        },
      },
      {
        id: "m-7",
        direccion: "saliente",
        tipo: "reunion",
        texto: "Propuesta de Presentación Virtual de Proyecto:",
        remitente: "Carlos Méndez",
        hora: "10:51 AM",
        metadatos: {
          fechaReunion: "Mañana Martes · 5:00 PM (Hora CDMX)",
          enlaceMeet: "https://meet.google.com/iri-scom-wyl",
        },
      },
      {
        id: "m-8",
        direccion: "entrante",
        tipo: "texto",
        texto: "Excelente, me gustaría coordinar una videollamada por Google Meet mañana a las 5pm para revisar los números con mi esposo.",
        remitente: "Arq. Sofía Villaseñor",
        hora: "10:52 AM",
      },
    ],
  },
  {
    id: "conv-2",
    nombreCliente: "Lic. Mateo Echeverría",
    telefono: "+52 (55) 4190-2210",
    correo: "mateo.echeverria@corporativo.com",
    ultimoMensaje: "¿Tienen facilidades de pago a 24 meses sin intereses con escrituración inmediata?",
    hora: "09:30 AM",
    noLeidos: 0,
    canal: "whatsapp",
    estadoSla: "cumplido",
    minutosSla: 4,
    interes: "Residencial Riviera • Lote 14 (750 m²)",
    presupuesto: "$4,200,000 MXN",
    etapaEmbudo: "Calificado",
    score: 74,
    asesorAsignado: "Mariana Silva",
    mensajes: [
      {
        id: "m-201",
        direccion: "entrante",
        tipo: "texto",
        texto: "Buenos días, busco un lote residencial de más de 600m² para construir casa de campo.",
        remitente: "Lic. Mateo Echeverría",
        hora: "09:20 AM",
      },
      {
        id: "m-202",
        direccion: "saliente",
        tipo: "texto",
        texto: "Buen día Lic. Mateo, con gusto. En Residencial Riviera tenemos disponible el Lote 14 de 750m² con vista a lago artificial.",
        remitente: "Mariana Silva",
        hora: "09:24 AM",
      },
      {
        id: "m-203",
        direccion: "entrante",
        tipo: "texto",
        texto: "¿Tienen facilidades de pago a 24 meses sin intereses con escrituración inmediata?",
        remitente: "Lic. Mateo Echeverría",
        hora: "09:30 AM",
      },
    ],
  },
  {
    id: "conv-3",
    nombreCliente: "Dra. Valentina Montes",
    telefono: "+52 (999) 712-4455",
    correo: "v.montes@clinica-dental.com",
    ultimoMensaje: "Hola, vi su anuncio sobre las villas frente a la playa con alberca privada.",
    hora: "08:15 AM",
    noLeidos: 1,
    canal: "meta",
    estadoSla: "en_alerta",
    minutosSla: 8,
    interes: "Villa Maya Cancún • Modelo Caribe",
    presupuesto: "$12,000,000 MXN",
    etapaEmbudo: "Nuevo Lead",
    score: 92,
    asesorAsignado: "Sin Asignar (En Cola)",
    mensajes: [
      {
        id: "m-301",
        direccion: "entrante",
        tipo: "texto",
        texto: "Hola, vi su anuncio sobre las villas frente a la playa con alberca privada.",
        remitente: "Dra. Valentina Montes",
        hora: "08:15 AM",
      },
      {
        id: "m-302",
        direccion: "sistema",
        tipo: "bot",
        texto: "¡Bienvenida Dra. Valentina! En breve un asesor especializado en desarrollos de playa se pondrá en contacto.",
        remitente: "IRIS Bot",
        hora: "08:16 AM",
      },
    ],
  },
];

export function VistaBandeja({
  conversacionesIniciales = [],
  agentesDisponibles = [],
  usuarioActualId,
}: {
  conversacionesIniciales?: Conversacion[];
  agentesDisponibles?: Usuario[];
  usuarioActualId?: string;
}) {
  // Lista de conversaciones enriquecidas para demostración operativa
  const [conversaciones, setConversaciones] = React.useState<ConversacionSimulada[]>(CONVERSACIONES_MOCK);
  const [conversacionActivaId, setConversacionActivaId] = React.useState<string>(CONVERSACIONES_MOCK[0].id);
  const [filtroTab, setFiltroTab] = React.useState<"todas" | "no_asignadas" | "prioritarias">("todas");
  const [busqueda, setBusqueda] = React.useState("");

  // Vista en móvil: "lista" o "chat"
  const [vistaMovil, setVistaMovil] = React.useState<"lista" | "chat">("chat");

  // Entrada de mensaje y modo
  const [textoEntrada, setTextoEntrada] = React.useState("");
  const [modoNotaInterna, setModoNotaInterna] = React.useState(false);

  // Conversación seleccionada
  const conversacionActiva =
    conversaciones.find((c) => c.id === conversacionActivaId) || conversaciones[0];

  // Filtrado
  const conversacionesFiltradas = conversaciones.filter((c) => {
    const coincideBusqueda =
      c.nombreCliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda) ||
      c.interes.toLowerCase().includes(busqueda.toLowerCase());

    if (filtroTab === "no_asignadas") {
      return coincideBusqueda && c.asesorAsignado.includes("Sin Asignar");
    }
    if (filtroTab === "prioritarias") {
      return coincideBusqueda && c.score >= 80;
    }
    return coincideBusqueda;
  });

  // Manejar envío de mensaje simulado
  const manejarEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoEntrada.trim()) return;

    const horaActual = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

    const nuevoMensaje: MensajeSimulado = modoNotaInterna
      ? {
          id: `m-nota-${Date.now()}`,
          direccion: "interna",
          tipo: "texto",
          texto: textoEntrada.trim(),
          remitente: "Administración IRIS",
          hora: horaActual,
          metadatos: {
            autorNota: "Administración / Supervisión (Privada)",
          },
        }
      : {
          id: `m-out-${Date.now()}`,
          direccion: "saliente",
          tipo: "texto",
          texto: textoEntrada.trim(),
          remitente: "Carlos Méndez",
          hora: horaActual,
        };

    const nuevasConversaciones = conversaciones.map((conv) => {
      if (conv.id === conversacionActiva.id) {
        return {
          ...conv,
          ultimoMensaje: modoNotaInterna ? `[Nota Interna]: ${textoEntrada}` : textoEntrada,
          hora: horaActual,
          mensajes: [...conv.mensajes, nuevoMensaje],
        };
      }
      return conv;
    });

    setConversaciones(nuevasConversaciones);
    setTextoEntrada("");

    if (modoNotaInterna) {
      notificar.info("Nota interna registrada", "Visible solo para el equipo y supervisores.");
    } else {
      notificar.exito("Mensaje enviado por WhatsApp", "Entregado al cliente con SLA activo.");
    }
  };

  // Plantillas rápidas de respuesta
  const insertarPlantilla = (texto: string) => {
    setTextoEntrada(texto);
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-8.5rem)] select-none">
      {/* ==================================================================== */}
      {/* 1. BARRA SUPERIOR DE HERRAMIENTAS Y SLA GLOBAL */}
      {/* ==================================================================== */}
      <div className="h-13 px-4 border-b border-[#e5e7eb] bg-[#fafbfc] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setFiltroTab("todas")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
              filtroTab === "todas"
                ? "bg-[#eceef1] text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            Todas ({conversaciones.length})
          </button>
          <button
            onClick={() => setFiltroTab("prioritarias")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
              filtroTab === "prioritarias"
                ? "bg-[#eceef1] text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            Prioridad Alta (Score &gt; 80)
          </button>
          <button
            onClick={() => setFiltroTab("no_asignadas")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
              filtroTab === "no_asignadas"
                ? "bg-[#eceef1] text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            Sin Asignar (Cola)
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-semibold text-[11px]">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>SLA Objetivo: &lt; 10 min · Promedio: 2.8 min</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. ESPACIO DE TRABAJO (3 COLUMNAS RESPONSIVAS) */}
      {/* ==================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================================================================ */}
        {/* COLUMNA 1: LISTADO DE BANDEJA (Conversaciones activas) */}
        {/* ================================================================ */}
        <div
          className={cn(
            "w-full lg:w-80 shrink-0 border-r border-[#e5e7eb] flex flex-col bg-white",
            vistaMovil === "chat" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Buscador */}
          <div className="p-3 border-b border-[#f1f3f5]">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente, teléfono, desarrollo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Lista de Chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {conversacionesFiltradas.map((c) => {
              const estaActiva = c.id === conversacionActiva.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setConversacionActivaId(c.id);
                    setVistaMovil("chat");
                  }}
                  className={cn(
                    "p-3.5 cursor-pointer transition-colors relative text-left",
                    estaActiva
                      ? "bg-[#f4f5f7] border-l-3 border-l-gray-900"
                      : "hover:bg-gray-50/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {c.nombreCliente}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">{c.hora}</span>
                  </div>

                  <p className="text-xs text-gray-500 truncate mb-2 leading-relaxed">
                    {c.ultimoMensaje}
                  </p>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600">
                        {c.score} pts
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold",
                          c.estadoSla === "cumplido"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        )}
                      >
                        SLA {c.minutosSla}m
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* COLUMNA 2: ÁREA DE CHAT EN VIVO Y LÍNEA DE TIEMPO INTERACTIVA */}
        {/* ================================================================ */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-[#f7f8fa]",
            vistaMovil === "lista" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Cabecera del Chat Activo */}
          <div className="h-14 px-4 sm:px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Botón Volver en Móvil */}
              <button
                onClick={() => setVistaMovil("lista")}
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Volver a la lista"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 uppercase text-xs shrink-0">
                {conversacionActiva.nombreCliente.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-gray-900">
                    {conversacionActiva.nombreCliente}
                  </h3>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    En Negociación
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 block font-mono">
                  {conversacionActiva.telefono} · WhatsApp Business Cloud
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                <UserCheck className="h-3.5 w-3.5 text-gray-700" />
                <span>{conversacionActiva.asesorAsignado.split(" ")[0]} {conversacionActiva.asesorAsignado.split(" ")[1]}</span>
              </span>
            </div>
          </div>

          {/* HISTORIAL Y FLUJO DE MENSAJES */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Aviso de Cifrado y Cumplimiento SLA */}
            <div className="text-center my-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-white border border-[#e5e7eb] text-gray-500 shadow-2xs">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>Conversación protegida con cifrado oficial Meta WhatsApp Cloud API</span>
              </span>
            </div>

            {conversacionActiva.mensajes.map((m) => {
              // 1. Mensaje Automático del Bot
              if (m.tipo === "bot") {
                return (
                  <div key={m.id} className="max-w-md mx-auto my-2">
                    <div className="bg-[#f0f4ff] border border-blue-200/80 rounded-xl p-3 text-xs text-blue-950 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-blue-700">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" /> {m.remitente}
                        </span>
                        <span>{m.hora}</span>
                      </div>
                      <p className="leading-relaxed">{m.texto}</p>
                    </div>
                  </div>
                );
              }

              // 2. Nota Interna Privada de Supervisión
              if (m.direccion === "interna") {
                return (
                  <div key={m.id} className="max-w-lg mx-auto my-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-amber-800">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Nota Interna del Equipo (Invisible al cliente)</span>
                        </span>
                        <span>{m.hora}</span>
                      </div>
                      <p className="leading-relaxed font-medium">{m.texto}</p>
                      <span className="text-[10px] text-amber-700/80 block mt-1">
                        Autor: {m.metadatos?.autorNota}
                      </span>
                    </div>
                  </div>
                );
              }

              // 3. Tarjeta de Reunión Google Meet
              if (m.tipo === "reunion") {
                return (
                  <div key={m.id} className="flex flex-col items-end my-2">
                    <div className="max-w-sm bg-white border border-gray-200 rounded-2xl p-4 shadow-xs text-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          <Video className="h-4 w-4 text-emerald-600" />
                          <span>Videollamada Google Meet</span>
                        </span>
                        <span className="text-[10px] text-gray-400">{m.hora}</span>
                      </div>
                      <p className="text-gray-600">{m.texto}</p>
                      <div className="bg-[#f8f9fa] p-2.5 rounded-xl border border-gray-200/80 space-y-1">
                        <span className="text-[11px] font-bold text-gray-900 block flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          {m.metadatos?.fechaReunion}
                        </span>
                        <a
                          href={m.metadatos?.enlaceMeet}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-0.5"
                        >
                          <span>Unirse a la videollamada</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400">
                        <span>Enviado</span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                );
              }

              // 4. Mensaje con Archivo Adjunto (Brochure PDF)
              if (m.tipo === "archivo") {
                return (
                  <div key={m.id} className="flex flex-col items-end my-2">
                    <div className="max-w-sm bg-gray-900 text-white rounded-2xl p-4 shadow-xs text-xs space-y-2.5">
                      <p className="leading-relaxed">{m.texto}</p>
                      <div className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-xl flex items-center justify-between cursor-pointer border border-white/10">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-xs block truncate text-white">
                              {m.metadatos?.nombreArchivo}
                            </span>
                            <span className="text-[10px] text-gray-300 block">
                              {m.metadatos?.pesoArchivo} • Documento PDF
                            </span>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-300 shrink-0" />
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400">
                        <span>{m.hora}</span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                );
              }

              // 5. Mensajes Normales de Texto (Entrantes y Salientes)
              const esSaliente = m.direccion === "saliente";
              return (
                <div
                  key={m.id}
                  className={cn("flex flex-col my-1", esSaliente ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-md p-3.5 rounded-2xl text-xs shadow-2xs leading-relaxed",
                      esSaliente
                        ? "bg-gray-900 text-white rounded-br-xs"
                        : "bg-white text-gray-900 border border-[#e5e7eb] rounded-bl-xs"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.texto}</p>
                    <div
                      className={cn(
                        "text-[10px] mt-1.5 flex items-center justify-end gap-1 font-medium",
                        esSaliente ? "text-gray-400" : "text-gray-400"
                      )}
                    >
                      <span>{m.hora}</span>
                      {esSaliente && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PLANTILLAS RÁPIDAS DE RESPUESTA */}
          <div className="px-4 py-2 bg-white border-t border-[#f1f3f5] flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Respuestas:
            </span>
            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "Con gusto, te comparto nuestra disponibilidad de agenda para coordinar una llamada de 15 minutos:"
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium"
            >
              📅 Proponer Cita Meet
            </button>
            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "Los acabados de Torre Aura cuentan con mármol travertino, cocina integral equipada y cancelería de alta resistencia anticiclónica."
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium"
            >
              ✨ Memoria de Acabados
            </button>
            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "El enganche inicial requerido es del 20%, con saldo a 18 meses sin intereses durante la obra."
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium"
            >
              💳 Plan de Pagos
            </button>
          </div>

          {/* BARRA DE ENTRADA Y ENVÍO */}
          <div className="p-3 sm:p-4 bg-white border-t border-[#e5e7eb]">
            {/* Toggle de Modo: WhatsApp vs Nota Interna */}
            <div className="flex items-center gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setModoNotaInterna(false)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  !modoNotaInterna
                    ? "bg-gray-900 text-white shadow-xs"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Mensaje al Cliente (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => setModoNotaInterna(true)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  modoNotaInterna
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Nota Interna (Supervisión)</span>
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={manejarEnviarMensaje} className="flex items-center gap-2">
              <input
                type="text"
                value={textoEntrada}
                onChange={(e) => setTextoEntrada(e.target.value)}
                placeholder={
                  modoNotaInterna
                    ? "Escribir nota privada para el equipo comercial y supervisores..."
                    : `Responder a ${conversacionActiva.nombreCliente} por WhatsApp Cloud...`
                }
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none transition-all",
                  modoNotaInterna
                    ? "bg-amber-50/50 border-amber-300 focus:border-amber-600 text-amber-950 placeholder-amber-700/60"
                    : "bg-[#f8f9fa] border-[#e5e7eb] focus:border-gray-900 focus:bg-white text-gray-900 placeholder-gray-400"
                )}
              />

              <button
                type="submit"
                className={cn(
                  "px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0",
                  modoNotaInterna
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-gray-900 hover:bg-black text-white"
                )}
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {modoNotaInterna ? "Guardar Nota" : "Enviar"}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* ================================================================ */}
        {/* COLUMNA 3: EXPEDIENTE Y CONTEXTO 360° DEL CLIENTE (DESKTOP) */}
        {/* ================================================================ */}
        <div className="hidden xl:flex w-72 shrink-0 border-l border-[#e5e7eb] bg-white flex-col p-5 overflow-y-auto space-y-5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2">
              Expediente Comercial 360°
            </span>
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-gray-900">
                {conversacionActiva.nombreCliente}
              </h4>
              <p className="text-xs text-gray-500 font-mono">{conversacionActiva.telefono}</p>
              <p className="text-xs text-gray-500 truncate">{conversacionActiva.correo}</p>
            </div>
          </div>

          {/* Ficha de Calificación */}
          <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Puntuación:</span>
              <span className="font-extrabold text-emerald-600">{conversacionActiva.score} / 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Etapa:</span>
              <span className="font-bold text-gray-900">{conversacionActiva.etapaEmbudo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Presupuesto:</span>
              <span className="font-mono font-bold text-gray-900">{conversacionActiva.presupuesto}</span>
            </div>
          </div>

          {/* Desarrollo de Interés */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Inmueble Solicitado
            </span>
            <div className="flex items-start gap-2 p-2.5 border border-gray-200 rounded-xl bg-gray-50/50">
              <Building className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-gray-900 block leading-tight">
                  {conversacionActiva.interes}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Entrega inmediata · Zona Hotelera
                </span>
              </div>
            </div>
          </div>

          {/* Titularidad y Asesor a Cargo */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Asignación Comercial
            </span>
            <div className="p-2.5 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-gray-800 truncate">
                  {conversacionActiva.asesorAsignado}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block">
                Supervisado por: Carlos Méndez (Líder Ventas)
              </span>
            </div>
          </div>

          {/* Auditoría SLA de Respuesta */}
          <div className="space-y-1.5 text-xs pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Métricas SLA Omnicanal
            </span>
            <div className="space-y-1 text-gray-600 text-[11px]">
              <div className="flex justify-between">
                <span>Tiempo de primer contacto:</span>
                <span className="font-bold text-emerald-600">2.1 min</span>
              </div>
              <div className="flex justify-between">
                <span>Límite contractual:</span>
                <span className="font-mono">10.0 min</span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="font-bold text-emerald-600 uppercase text-[10px]">Cumplido</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
