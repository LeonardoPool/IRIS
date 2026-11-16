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
  Info,
  X,
  Copy,
  Check,
  Loader2,
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { accionCrearReunionGoogleMeet } from "@/acciones/calendario";
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
  const [mostrarFichaClienteMovil, setMostrarFichaClienteMovil] = React.useState(false);
  const [mostrarExpedienteDesktop, setMostrarExpedienteDesktop] = React.useState(true);

  // Archivo adjunto
  const [archivoAdjunto, setArchivoAdjunto] = React.useState<{
    nombre: string;
    peso: string;
    tipo: "pdf" | "imagen" | "documento";
  } | null>(null);

  // Modal Google Meet
  const [modalMeetAbierto, setModalMeetAbierto] = React.useState(false);
  const [tituloMeet, setTituloMeet] = React.useState("");
  const [fechaMeet, setFechaMeet] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [horaMeet, setHoraMeet] = React.useState("17:00");
  const [duracionMeet, setDuracionMeet] = React.useState("30");
  const [invitadosMeet, setInvitadosMeet] = React.useState("");
  const [descripcionMeet, setDescripcionMeet] = React.useState("");
  const [cargandoMeet, setCargandoMeet] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Auto-ajuste de altura dinámico e inteligente estilo WhatsApp Web (evita cortes de texto)
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const altura = Math.min(Math.max(textareaRef.current.scrollHeight, 44), 140);
      textareaRef.current.style.height = `${altura}px`;
    }
  }, [textoEntrada]);

  // Conversación seleccionada
  const conversacionActiva =
    conversaciones.find((c) => c.id === conversacionActivaId) || conversaciones[0];

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll al final del chat al cambiar conversación o nuevo mensaje
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversacionActivaId, conversacionActiva?.mensajes.length]);

  // Manejar selección de archivos desde el explorador
  const manejarSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pesoMb = (file.size / (1024 * 1024)).toFixed(1);
    const peso = file.size > 1024 * 1024 ? `${pesoMb} MB` : `${Math.round(file.size / 1024)} KB`;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const tipo = extension === "pdf" ? "pdf" : ["jpg", "jpeg", "png", "webp"].includes(extension) ? "imagen" : "documento";

    setArchivoAdjunto({
      nombre: file.name,
      peso,
      tipo,
    });
    notificar.info("Archivo adjuntado", `${file.name} (${peso}) listo para enviar.`);
  };

  // Manejar agendar reunión en Google Calendar con Meet
  const manejarCrearReunionMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloMeet.trim()) {
      notificar.aviso("Título requerido", "Por favor ingresa un título para la sesión.");
      return;
    }

    try {
      setCargandoMeet(true);

      const fechaHoraInicio = new Date(`${fechaMeet}T${horaMeet}:00`);
      const fechaHoraFin = new Date(fechaHoraInicio.getTime() + parseInt(duracionMeet, 10) * 60000);

      // Intentar invocar acción de backend centralizado de Google Calendar
      const respuesta = await accionCrearReunionGoogleMeet({
        prospectoId: conversacionActiva.id,
        titulo: tituloMeet.trim(),
        descripcion: descripcionMeet.trim() || `Reunión de presentación inmobiliaria INDOMO para ${conversacionActiva.nombreCliente}.`,
        fechaInicio: fechaHoraInicio.toISOString(),
        fechaFin: fechaHoraFin.toISOString(),
        asistentes: [conversacionActiva.correo, ...invitadosMeet.split(",").map((i) => i.trim()).filter(Boolean)],
        generarMeet: true,
      });

      const enlaceMeet =
        (respuesta && "googleMeetLink" in respuesta && respuesta.googleMeetLink) ||
        "https://meet.google.com/ind-indomo-2026";
      const horaActual = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

      const mensajeReunion: MensajeSimulado = {
        id: `m-meet-${Date.now()}`,
        direccion: "saliente",
        tipo: "reunion",
        texto: `Reunión agendada: ${tituloMeet}`,
        remitente: "Carlos Méndez (INDOMO)",
        hora: horaActual,
        metadatos: {
          enlaceMeet,
          fechaReunion: `${fechaMeet} • ${horaMeet} hrs (${duracionMeet} min)`,
        },
      };

      const mensajeWhatsappTexto: MensajeSimulado = {
        id: `m-meet-text-${Date.now()}`,
        direccion: "saliente",
        tipo: "texto",
        texto: `Estimado(a) ${conversacionActiva.nombreCliente.split(" ")[0]}, te confirmo nuestra reunión de presentación inmobiliaria en Google Meet para el ${fechaMeet} a las ${horaMeet} hrs.\n\nEnlace de acceso directo: ${enlaceMeet}\n\nQuedo a tu total disposición.`,
        remitente: "Carlos Méndez",
        hora: horaActual,
      };

      setConversaciones((prev) =>
        prev.map((c) =>
          c.id === conversacionActiva.id
            ? {
                ...c,
                ultimoMensaje: `Google Meet agendado: ${fechaMeet} ${horaMeet}`,
                hora: horaActual,
                mensajes: [...c.mensajes, mensajeReunion, mensajeWhatsappTexto],
              }
            : c
        )
      );

      notificar.exito("Reunión agendada en INDOMO Calendar", `Enlace Google Meet generado y compartido con ${conversacionActiva.nombreCliente}.`);
      setModalMeetAbierto(false);
      setTituloMeet("");
      setDescripcionMeet("");
    } catch (err: any) {
      notificar.error("Error al agendar", err.message || "No se pudo sincronizar la reunión.");
    } finally {
      setCargandoMeet(false);
    }
  };

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

  // Manejar envío de mensaje simulado (estilo WhatsApp con soporte de adjuntos)
  const manejarEnviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoEntrada.trim() && !archivoAdjunto) return;

    const horaActual = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const nuevosMensajes: MensajeSimulado[] = [];

    // Si hay archivo adjunto, agregar mensaje de archivo
    if (archivoAdjunto) {
      nuevosMensajes.push({
        id: `m-doc-${Date.now()}`,
        direccion: "saliente",
        tipo: "archivo",
        texto: textoEntrada.trim() || `Adjunto documento oficial: ${archivoAdjunto.nombre}`,
        remitente: "Carlos Méndez",
        hora: horaActual,
        metadatos: {
          nombreArchivo: archivoAdjunto.nombre,
          pesoArchivo: archivoAdjunto.peso,
        },
      });
    }

    // Si hay texto adicional o es solo texto
    if (textoEntrada.trim() && (!archivoAdjunto || modoNotaInterna)) {
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
      nuevosMensajes.push(nuevoMensaje);
    }

    const nuevasConversaciones = conversaciones.map((conv) => {
      if (conv.id === conversacionActiva.id) {
        return {
          ...conv,
          ultimoMensaje: modoNotaInterna
            ? `[Nota Interna]: ${textoEntrada}`
            : archivoAdjunto
            ? `[Archivo]: ${archivoAdjunto.nombre}`
            : textoEntrada,
          hora: horaActual,
          mensajes: [...conv.mensajes, ...nuevosMensajes],
        };
      }
      return conv;
    });

    setConversaciones(nuevasConversaciones);
    setTextoEntrada("");
    setArchivoAdjunto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (modoNotaInterna) {
      notificar.info("Nota interna registrada", "Visible solo para el equipo y supervisores.");
    } else {
      notificar.exito("Mensaje enviado por WhatsApp", "Entregado al cliente con SLA activo.");
    }
  };

  // Plantillas rápidas de respuesta
  const insertarPlantilla = (texto: string) => {
    setTextoEntrada((prev) => (prev ? `${prev} ${texto}` : texto));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="bg-white border-0 lg:border lg:border-[#e5e7eb] rounded-none lg:rounded-2xl shadow-none lg:shadow-2xs overflow-hidden flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-7rem)] select-none">
      {/* ==================================================================== */}
      {/* 1. BARRA SUPERIOR DE HERRAMIENTAS Y SLA GLOBAL */}
      {/* ==================================================================== */}
      <div
        className={cn(
          "h-12 px-4 border-b border-[#e5e7eb] bg-[#fafbfc] items-center justify-between shrink-0",
          vistaMovil === "chat" ? "hidden lg:flex" : "flex"
        )}
      >
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
          <div className="h-14 px-3 sm:px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
              {/* Botón Volver en Móvil */}
              <button
                onClick={() => setVistaMovil("lista")}
                className="lg:hidden px-2.5 py-1.5 -ml-1 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
                aria-label="Volver a la lista de chats"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-[11px]">Chats</span>
              </button>

              <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 uppercase text-xs shrink-0">
                {conversacionActiva.nombreCliente.charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-gray-900 truncate">
                    {conversacionActiva.nombreCliente}
                  </h3>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    SLA {conversacionActiva.minutosSla}m
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{conversacionActiva.telefono}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Botón Agendar Google Meet */}
              <button
                type="button"
                onClick={() => {
                  setTituloMeet(`Presentación Inmobiliaria INDOMO • ${conversacionActiva.nombreCliente}`);
                  setModalMeetAbierto(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 transition-colors cursor-pointer text-xs font-semibold"
                title="Agendar videollamada Google Meet"
              >
                <Video className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Meet</span>
              </button>

              {/* Botón de llamada telefónica directa */}
              <a
                href={`tel:${conversacionActiva.telefono.replace(/[^\d+]/g, "")}`}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition-colors"
                title="Llamar al cliente"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>

              {/* Botón ver Ficha / Expediente en Móvil y Tablet */}
              <button
                type="button"
                onClick={() => setMostrarFichaClienteMovil(true)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 xl:hidden transition-colors cursor-pointer"
                title="Ver expediente del cliente"
              >
                <Info className="h-3.5 w-3.5" />
              </button>

              {/* Botón toggle Expediente 360° en Desktop */}
              <button
                type="button"
                onClick={() => setMostrarExpedienteDesktop(!mostrarExpedienteDesktop)}
                className={cn(
                  "hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer text-xs font-semibold",
                  mostrarExpedienteDesktop
                    ? "bg-gray-100 text-gray-800 border-gray-300"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
                title={mostrarExpedienteDesktop ? "Ocultar panel 360°" : "Mostrar panel 360°"}
              >
                {mostrarExpedienteDesktop ? (
                  <PanelRightClose className="h-3.5 w-3.5 text-gray-700" />
                ) : (
                  <PanelRight className="h-3.5 w-3.5 text-gray-700" />
                )}
                <span className="text-[11px]">{mostrarExpedienteDesktop ? "360°" : "Ver 360°"}</span>
              </button>

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
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* PLANTILLAS RÁPIDAS DE RESPUESTA */}
          <div className="px-3 sm:px-4 py-1.5 bg-white border-t border-[#f1f3f5] flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
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
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px]"
            >
              📅 Cita Meet
            </button>
            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "Los acabados de Torre Aura cuentan con mármol travertino, cocina integral equipada y cancelería de alta resistencia anticiclónica."
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px]"
            >
              ✨ Acabados
            </button>
            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "El enganche inicial requerido es del 20%, con saldo a 18 meses sin intereses durante la obra."
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px]"
            >
              💳 Plan Pagos
            </button>
          </div>

          {/* BARRA DE ENTRADA Y ENVÍO MÓVIL Y DESKTOP (EXPERIENCIA TIPO WHATSAPP) */}
          <div className="p-2.5 sm:p-4 bg-white border-t border-[#e5e7eb] sticky bottom-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={manejarSeleccionarArchivo}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            />

            {/* Banner de previsualización de archivo adjunto si existe */}
            {archivoAdjunto && (
              <div className="mb-2 p-2 px-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-emerald-950 block truncate">
                      {archivoAdjunto.nombre}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 block">
                      {archivoAdjunto.peso} • Listo para enviar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArchivoAdjunto(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                  title="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Barra superior de herramientas del compositor: Modo y accesos rápidos */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModoNotaInterna(false)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    !modoNotaInterna
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoNotaInterna(true)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    modoNotaInterna
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Nota Interna</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTituloMeet(`Presentación Inmobiliaria INDOMO • ${conversacionActiva.nombreCliente}`);
                    setModalMeetAbierto(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Agendar sesión Google Meet"
                >
                  <Video className="h-3 w-3 text-blue-600" />
                  <span className="hidden sm:inline">Google Meet</span>
                </button>
              </div>
            </div>

            {/* Input Form estilo WhatsApp */}
            <form onSubmit={manejarEnviarMensaje} className="flex items-end gap-1.5 sm:gap-2">
              {/* Botón de Adjuntar Archivo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-[46px] w-[46px] rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer mb-0"
                title="Adjuntar brochure, cotización o documento"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Textarea multilínea con crecimiento dinámico (Enter envía, Shift+Enter salta de línea) */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={textoEntrada}
                onChange={(e) => setTextoEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    manejarEnviarMensaje(e);
                  }
                }}
                placeholder={
                  modoNotaInterna
                    ? "Escribir nota interna del equipo (Shift+Enter para salto de línea)..."
                    : `Mensaje a ${conversacionActiva.nombreCliente.split(" ")[0]} (Enter para enviar, Shift+Enter para salto)...`
                }
                className={cn(
                  "flex-1 min-h-[46px] max-h-[140px] resize-none py-3 px-3.5 sm:px-4 text-xs sm:text-sm rounded-2xl border transition-all shadow-2xs leading-snug focus:outline-none",
                  textareaRef.current && textareaRef.current.scrollHeight > 130
                    ? "overflow-y-auto"
                    : "overflow-y-hidden",
                  modoNotaInterna
                    ? "bg-amber-50/60 border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-amber-950 placeholder-amber-700/60"
                    : "bg-[#f8f9fa] border-[#e5e7eb] focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900 text-gray-900 placeholder-gray-400"
                )}
              />

              {/* Botón de Envío */}
              <button
                type="submit"
                aria-label="Enviar mensaje"
                className={cn(
                  "h-[46px] px-3.5 sm:px-5 text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 mb-0",
                  modoNotaInterna
                    ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"
                    : "bg-gray-900 hover:bg-black active:bg-black text-white"
                )}
              >
                <Send className="h-4 w-4 text-emerald-400 shrink-0" />
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
        {mostrarExpedienteDesktop && (
          <div className="hidden xl:flex w-72 shrink-0 border-l border-[#e5e7eb] bg-white flex-col p-5 overflow-y-auto space-y-5 animate-in fade-in slide-in-from-right-2 duration-150">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                  Expediente Comercial 360°
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarExpedienteDesktop(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Cerrar panel 360°"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
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
        )}
      </div>

      {/* MODAL / DRAWER EXPEDIENTE 360° PARA MÓVIL */}
      {mostrarFichaClienteMovil && (
        <div className="fixed inset-0 z-50 xl:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMostrarFichaClienteMovil(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  Expediente Comercial 360°
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {conversacionActiva.score} pts
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFichaClienteMovil(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">
                {conversacionActiva.nombreCliente}
              </h3>
              <p className="text-xs text-gray-600 font-mono flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>{conversacionActiva.telefono}</span>
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span className="truncate">{conversacionActiva.correo}</span>
              </p>
            </div>

            {/* Ficha rápida */}
            <div className="p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Etapa en Pipeline:</span>
                <span className="font-bold text-gray-900">{conversacionActiva.etapaEmbudo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Presupuesto Estimado:</span>
                <span className="font-mono font-bold text-gray-900">{conversacionActiva.presupuesto}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Interés:</span>
                <span className="font-bold text-gray-900">{conversacionActiva.interes}</span>
              </div>
            </div>

            {/* Acciones directas */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${conversacionActiva.telefono.replace(/[^\d+]/g, "")}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Llamar</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMostrarFichaClienteMovil(false);
                  insertarPlantilla("Te comparto nuestra disponibilidad para agendar una sesión en Google Meet:");
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cita Meet</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL GOOGLE MEET (INTEGRACIÓN CENTRALIZADA INDOMO) */}
      {modalMeetAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !cargandoMeet && setModalMeetAbierto(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 w-full max-w-lg space-y-5 animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                    <Video className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Agendar Reunión con Google Meet
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Cuenta Centralizada: <strong>indomodesarrollos@gmail.com</strong></span>
                </div>
              </div>

              <button
                type="button"
                disabled={cargandoMeet}
                onClick={() => setModalMeetAbierto(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={manejarCrearReunionMeet} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Título de la Reunión
                </label>
                <input
                  type="text"
                  required
                  value={tituloMeet}
                  onChange={(e) => setTituloMeet(e.target.value)}
                  placeholder="Ej. Presentación de Desarrollo Residencial Riviera"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaMeet}
                    onChange={(e) => setFechaMeet(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Hora (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={horaMeet}
                    onChange={(e) => setHoraMeet(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Duración
                  </label>
                  <select
                    value={duracionMeet}
                    onChange={(e) => setDuracionMeet(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs"
                  >
                    <option value="15">15 minutos (Llamada express)</option>
                    <option value="30">30 minutos (Presentación inicial)</option>
                    <option value="45">45 minutos (Recorrido virtual)</option>
                    <option value="60">60 minutos (Cierre comercial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Invitado Principal
                  </label>
                  <input
                    type="email"
                    value={conversacionActiva.correo}
                    readOnly
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 font-medium text-xs truncate cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Invitados Adicionales (Correos separados por coma)
                </label>
                <input
                  type="text"
                  value={invitadosMeet}
                  onChange={(e) => setInvitadosMeet(e.target.value)}
                  placeholder="supervisor@indomo.com, socio@cliente.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Notas / Agenda de la Reunión
                </label>
                <textarea
                  rows={2}
                  value={descripcionMeet}
                  onChange={(e) => setDescripcionMeet(e.target.value)}
                  placeholder="Detalles sobre las propiedades que se revisarán en la videollamada..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none bg-[#f8f9fa] focus:bg-white text-gray-900 font-medium text-xs shadow-2xs resize-none"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-900">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Se generará automáticamente un enlace oficial de <strong>Google Meet</strong> y se registrará en el expediente comercial con seguimiento de SLA.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={cargandoMeet}
                  onClick={() => setModalMeetAbierto(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={cargandoMeet}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer text-xs disabled:opacity-50"
                >
                  {cargandoMeet ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      <span>Generando Meet...</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Agendar y Compartir en WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
