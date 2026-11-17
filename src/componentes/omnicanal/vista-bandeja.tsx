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
  Menu,
  Layers,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { accionCrearReunionGoogleMeet } from "@/acciones/calendario";
import { accionListarSpeeches, accionEjecutarPasoSpeech } from "@/acciones/speeches";
import { useVisualViewport } from "@/librerias/hooks/use-visual-viewport";
import type { Conversacion, Mensaje } from "@/tipos/omnicanal";
import type { Usuario } from "@/tipos/identidad";
import type { SpeechComercial } from "@/tipos/speeches";

// Tipos ampliados para simulación de flujos enriquecidos y speeches comerciales
interface MensajeSimulado {
  id: string;
  direccion: "entrante" | "saliente" | "interna" | "sistema";
  tipo: "texto" | "archivo" | "reunion" | "bot" | "imagen";
  texto: string;
  remitente: string;
  hora: string;
  metadatos?: {
    nombreArchivo?: string;
    pesoArchivo?: string;
    enlaceMeet?: string;
    fechaReunion?: string;
    autorNota?: string;
    urlImagen?: string;
    speechId?: string;
    speechNombre?: string;
    pasoOrden?: number;
    totalPasos?: number;
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
  // Sincronización en tiempo real del viewport visible móvil (iOS / Android)
  const { altura: alturaViewport, tecladoAbierto, alturaTeclado } = useVisualViewport();

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

  // Speeches Comerciales Multimedia
  const [modalSpeechesAbierto, setModalSpeechesAbierto] = React.useState(false);
  const [speechesDisponibles, setSpeechesDisponibles] = React.useState<SpeechComercial[]>([]);
  const [busquedaSpeech, setBusquedaSpeech] = React.useState("");
  const [filtroDesarrolloSpeech, setFiltroDesarrolloSpeech] = React.useState("todos");
  const [speechSeleccionado, setSpeechSeleccionado] = React.useState<SpeechComercial | null>(null);

  // Estado del proceso de transmisión secuencial
  const [transmisionEnProgreso, setTransmisionEnProgreso] = React.useState(false);
  const [progresoTransmision, setProgresoTransmision] = React.useState<{
    pasoActual: number;
    totalPasos: number;
    estado: "enviando" | "pausado" | "completado" | "error";
    error?: string;
    ejecucionId?: string;
  } | null>(null);

  // Cargar catálogo de speeches al montar
  React.useEffect(() => {
    accionListarSpeeches()
      .then((res) => {
        if (res.exito && res.speeches) {
          setSpeechesDisponibles(res.speeches);
        }
      })
      .catch((_) => {});
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mensajesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const cercaDelFondoRef = React.useRef<boolean>(true);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-ajuste de altura dinámico e inteligente estilo WhatsApp Web (evita cortes de texto)
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const altura = Math.min(Math.max(textareaRef.current.scrollHeight, 42), 120);
      textareaRef.current.style.height = `${altura}px`;
    }
  }, [textoEntrada]);

  // Conversación seleccionada
  const conversacionActiva =
    conversaciones.find((c) => c.id === conversacionActivaId) || conversaciones[0];

  // Detector de posición de scroll en el historial
  const manejarScrollHistorial = () => {
    const el = mensajesContainerRef.current;
    if (!el) return;
    const distancia = el.scrollHeight - el.scrollTop - el.clientHeight;
    cercaDelFondoRef.current = distancia < 100;
  };

  // Auto-scroll al final del chat al cambiar conversación o nuevo mensaje si no está leyendo arriba
  React.useEffect(() => {
    if (cercaDelFondoRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversacionActivaId, conversacionActiva?.mensajes.length]);

  // Al abrir el teclado virtual móvil, ajustar suavemente para mantener visible el último mensaje
  React.useEffect(() => {
    if (tecladoAbierto) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [tecladoAbierto]);

  // Manejador del envío secuencial paso a paso de un speech comercial
  const manejarEnviarSpeechSecuencial = async (speech: SpeechComercial) => {
    if (!speech.elementos || speech.elementos.length === 0) {
      notificar.aviso("Speech vacío", "Este speech no contiene elementos para enviar.");
      return;
    }

    setTransmisionEnProgreso(true);
    const total = speech.elementos.length;
    setProgresoTransmision({
      pasoActual: 1,
      totalPasos: total,
      estado: "enviando",
    });

    let idEjecucion: string | undefined = undefined;

    for (let i = 0; i < total; i++) {
      const elemento = speech.elementos[i];
      const pasoNum = i + 1;

      setProgresoTransmision({
        pasoActual: pasoNum,
        totalPasos: total,
        estado: "enviando",
        ejecucionId: idEjecucion,
      });

      try {
        const resultado = await accionEjecutarPasoSpeech({
          conversacionId: conversacionActiva.id,
          speechId: speech.id,
          pasoOrden: pasoNum,
          ejecucionId: idEjecucion,
        });

        if (!resultado.exito) {
          setProgresoTransmision({
            pasoActual: pasoNum,
            totalPasos: total,
            estado: "error",
            error: resultado.error || `Fallo en el paso ${pasoNum}.`,
            ejecucionId: idEjecucion,
          });
          notificar.error("Error al transmitir speech", resultado.error || "Fallo en el paso.");
          return;
        }

        // Agregar mensaje en tiempo real al feed de la conversación
        const nuevoMensajeLocal: MensajeSimulado = {
          id: resultado.mensajeLocalId || `msg-sp-${Date.now()}-${pasoNum}`,
          direccion: "saliente",
          tipo: elemento.tipo === "texto" ? "texto" : "imagen",
          texto: elemento.contenido_texto || "",
          remitente: "Carlos Méndez (Asesor)",
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          metadatos: {
            urlImagen: elemento.url_imagen || undefined,
            nombreArchivo: elemento.nombre_archivo || undefined,
            speechId: speech.id,
            speechNombre: speech.nombre,
            pasoOrden: pasoNum,
            totalPasos: total,
          },
        };

        setConversaciones((prev) =>
          prev.map((c) => {
            if (c.id === conversacionActiva.id) {
              return {
                ...c,
                ultimoMensaje: elemento.contenido_texto || `[Foto: ${speech.desarrollo_inmueble}]`,
                hora: "Ahora",
                mensajes: [...c.mensajes, nuevoMensajeLocal],
              };
            }
            return c;
          })
        );

        // Retardo natural entre impactos (700ms) para garantizar orden y experiencia fluida
        if (i < total - 1) {
          await new Promise((r) => setTimeout(r, 700));
        }
      } catch (err: any) {
        setProgresoTransmision({
          pasoActual: pasoNum,
          totalPasos: total,
          estado: "error",
          error: err.message,
          ejecucionId: idEjecucion,
        });
        notificar.error("Error en la transmisión", err.message);
        return;
      }
    }

    setProgresoTransmision({
      pasoActual: total,
      totalPasos: total,
      estado: "completado",
      ejecucionId: idEjecucion,
    });
    notificar.exito(
      "Speech enviado con éxito",
      `Se transmitieron los ${total} impactos comerciales a ${conversacionActiva.nombreCliente}.`
    );

    setTimeout(() => {
      setTransmisionEnProgreso(false);
      setModalSpeechesAbierto(false);
      setSpeechSeleccionado(null);
      setProgresoTransmision(null);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1200);
  };

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
    <div
      className="bg-white border-0 lg:border lg:border-[#e5e7eb] rounded-none lg:rounded-2xl shadow-none lg:shadow-2xs overflow-hidden flex flex-col h-[var(--visual-viewport-height,100dvh)] lg:h-[calc(100dvh-7rem)] select-none"
      style={{
        height: "var(--visual-viewport-height, 100dvh)",
        maxHeight: "var(--visual-viewport-height, 100dvh)",
      }}
    >
      {/* ==================================================================== */}
      {/* 1. CABECERA MÓVIL EXCLUSIVA (Lista de Conversaciones) */}
      {/* ==================================================================== */}
      <div
        className={cn(
          "h-14 px-3.5 border-b border-[#e5e7eb] bg-white flex lg:hidden items-center justify-between shrink-0 select-none",
          vistaMovil === "chat" ? "hidden" : "flex"
        )}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("iris:abrir-menu-movil"))}
            className="p-2 -ml-1 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-900 tracking-tight">Bandeja Omnicanal</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold text-[10px]">
            <Clock className="h-3 w-3 text-emerald-600" />
            <span>SLA 2.8m</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BARRA DE FILTROS Y SLA GLOBAL */}
      {/* ==================================================================== */}
      <div
        className={cn(
          "h-11 px-3 sm:px-4 border-b border-[#e5e7eb] bg-[#fafbfc] items-center justify-between shrink-0",
          vistaMovil === "chat" ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setFiltroTab("todas")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0",
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
              "px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0",
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
              "px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0",
              filtroTab === "no_asignadas"
                ? "bg-[#eceef1] text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            Sin Asignar (Cola)
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
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
            "flex-1 flex flex-col bg-[#f7f8fa] min-w-0 h-full overflow-hidden relative",
            vistaMovil === "lista" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Cabecera del Chat Activo — Fijada de forma permanente en la parte superior sin scroll */}
          <div className="h-14 px-3 sm:px-6 border-b border-[#e5e7eb] bg-white flex items-center justify-between shrink-0 sticky top-0 z-20 select-none">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
              {/* Botón Volver a la Lista en Móvil */}
              <button
                type="button"
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

          {/* HISTORIAL Y FLUJO DE MENSAJES (Scroll independiente y protegido con overscroll-contain) */}
          <div
            ref={mensajesContainerRef}
            onScroll={manejarScrollHistorial}
            className="flex-1 p-3 sm:p-6 overflow-y-auto overscroll-contain space-y-3.5 min-h-0"
          >
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

              // 5. Mensaje de Imagen o Speech Comercial Multimedia
              if (m.tipo === "imagen" || m.metadatos?.urlImagen) {
                return (
                  <div key={m.id} className="flex flex-col items-end my-2">
                    <div className="max-w-xs sm:max-w-sm bg-gray-900 text-white rounded-2xl p-2.5 shadow-xs text-xs space-y-2 border border-gray-800 animate-in fade-in slide-in-from-bottom-1 duration-150">
                      <div className="rounded-xl overflow-hidden bg-black/20 max-h-60 border border-white/5">
                        <img
                          src={m.metadatos?.urlImagen || ""}
                          alt="Imagen enviada de speech"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                      {m.texto && (
                        <p className="leading-relaxed px-1 text-gray-100">{m.texto}</p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-0.5 border-t border-white/10">
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          {m.metadatos?.speechNombre
                            ? `${m.metadatos.speechNombre} (${m.metadatos.pasoOrden}/${m.metadatos.totalPasos})`
                            : "WhatsApp Media"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span>{m.hora}</span>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 6. Mensajes Normales de Texto (Entrantes y Salientes)
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
                        "text-[10px] mt-1.5 flex items-center justify-between gap-1 font-medium",
                        esSaliente ? "text-gray-400" : "text-gray-400"
                      )}
                    >
                      {m.metadatos?.speechNombre ? (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          Paso {m.metadatos.pasoOrden}/{m.metadatos.totalPasos}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1">
                        <span>{m.hora}</span>
                        {esSaliente && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* PLANTILLAS RÁPIDAS Y ACCESOS A SPEECHES */}
          <div
            className={cn(
              "px-3 sm:px-4 bg-white border-t border-[#f1f3f5] flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none shrink-0 select-none",
              tecladoAbierto ? "py-1" : "py-1.5"
            )}
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Respuestas:
            </span>

            {/* Acceso Directo al Speech SOLHÁ */}
            <button
              type="button"
              onClick={() => {
                const solha =
                  speechesDisponibles.find((s) => s.desarrollo_inmueble.includes("SOLHÁ")) ||
                  speechesDisponibles[0];
                if (solha) {
                  setSpeechSeleccionado(solha);
                  setModalSpeechesAbierto(true);
                } else {
                  setModalSpeechesAbierto(true);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 whitespace-nowrap transition-colors cursor-pointer font-bold text-[11px] shrink-0 flex items-center gap-1"
            >
              <Layers className="h-3 w-3 text-emerald-600" />
              📑 Speech SOLHÁ
            </button>

            <button
              type="button"
              onClick={() =>
                insertarPlantilla(
                  "Con gusto, te comparto nuestra disponibilidad de agenda para coordinar una llamada de 15 minutos:"
                )
              }
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px] shrink-0"
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
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px] shrink-0"
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
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px] shrink-0"
            >
              💳 Plan Pagos
            </button>
          </div>

          {/* BARRA DE ENTRADA Y ENVÍO MÓVIL Y DESKTOP (EXPERIENCIA TIPO WHATSAPP NATIVO) */}
          <div
            className={cn(
              "bg-white border-t border-[#e5e7eb] shrink-0 z-20 transition-[padding] duration-150 select-none",
              tecladoAbierto
                ? "p-2 pb-2"
                : "p-2.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            )}
          >
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
            <div className={cn("flex items-center justify-between", tecladoAbierto ? "mb-1.5" : "mb-2")}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setModoNotaInterna(false)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    !modoNotaInterna
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <MessageCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoNotaInterna(true)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    modoNotaInterna
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Nota Interna</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Botón Speeches Comerciales */}
                <button
                  type="button"
                  onClick={() => {
                    setSpeechSeleccionado(null);
                    setModalSpeechesAbierto(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Seleccionar y transmitir speech comercial multimedia"
                >
                  <Layers className="h-3 w-3 text-emerald-600" />
                  <span>Speeches</span>
                </button>

                {/* Botón Google Meet */}
                <button
                  type="button"
                  onClick={() => {
                    setTituloMeet(`Presentación Inmobiliaria INDOMO • ${conversacionActiva.nombreCliente}`);
                    setModalMeetAbierto(true);
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/60 transition-colors flex items-center gap-1 cursor-pointer"
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
                className="h-[42px] w-[42px] rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer mb-0"
                title="Adjuntar brochure, cotización o documento"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Textarea multilínea con crecimiento dinámico (Fuente 16px para evitar auto-zoom en iOS Safari) */}
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
                    ? "Escribir nota interna del equipo..."
                    : `Mensaje a ${conversacionActiva.nombreCliente.split(" ")[0]}...`
                }
                style={{
                  fontSize: "16px", // Previene auto-zoom forzado de Safari iOS
                  touchAction: "manipulation",
                }}
                className={cn(
                  "flex-1 min-h-[42px] max-h-[120px] resize-none py-2.5 px-3.5 sm:px-4 text-[16px] sm:text-sm rounded-2xl border transition-all shadow-2xs leading-snug focus:outline-none",
                  textareaRef.current && textareaRef.current.scrollHeight > 110
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
                  "h-[42px] px-3.5 sm:px-5 text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 mb-0",
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

      {/* ==================================================================== */}
      {/* MODAL / DRAWER: SELECTOR Y TRANSMISIÓN DE SPEECHES COMERCIALES */}
      {/* ==================================================================== */}
      {modalSpeechesAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden relative">
            {/* Cabecera del modal */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#fafbfc] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-gray-900 truncate">
                      {speechSeleccionado ? "Revisión Previa del Speech" : "Speeches Comerciales Multimedia"}
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      <Check className="h-3 w-3" /> Ventana 24h Activa
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    Destinatario: <strong className="text-gray-900">{conversacionActiva.nombreCliente}</strong> ({conversacionActiva.telefono})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {speechSeleccionado && !transmisionEnProgreso && (
                  <button
                    type="button"
                    onClick={() => setSpeechSeleccionado(null)}
                    className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer mr-1"
                  >
                    ← Volver
                  </button>
                )}
                <button
                  type="button"
                  disabled={transmisionEnProgreso}
                  onClick={() => {
                    setModalSpeechesAbierto(false);
                    setSpeechSeleccionado(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* VISTA 1: LISTADO Y SELECTOR DE SPEECHES */}
            {!speechSeleccionado && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Buscador y Filtros */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar speech por nombre o desarrollo..."
                      value={busquedaSpeech}
                      onChange={(e) => setBusquedaSpeech(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-xl bg-[#f8f9fa] focus:bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  <select
                    value={filtroDesarrolloSpeech}
                    onChange={(e) => setFiltroDesarrolloSpeech(e.target.value)}
                    className="h-8 px-2.5 text-xs border border-gray-200 rounded-xl bg-[#f8f9fa] text-gray-700 focus:outline-none"
                  >
                    <option value="todos">Todos los proyectos</option>
                    {Array.from(new Set(speechesDisponibles.map((s) => s.desarrollo_inmueble))).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarjetas de Speeches Disponibles */}
                <div className="space-y-3">
                  {speechesDisponibles
                    .filter((s) => {
                      const matchTexto =
                        s.nombre.toLowerCase().includes(busquedaSpeech.toLowerCase()) ||
                        s.desarrollo_inmueble.toLowerCase().includes(busquedaSpeech.toLowerCase());
                      const matchDesarrollo =
                        filtroDesarrolloSpeech === "todos" || s.desarrollo_inmueble === filtroDesarrolloSpeech;
                      return matchTexto && matchDesarrollo;
                    })
                    .map((sp) => {
                      const totalPasos = sp.elementos?.length || 0;
                      const fotosCount = (sp.elementos || []).filter((e) => e.tipo !== "texto").length;

                      return (
                        <div
                          key={sp.id}
                          className="p-4 bg-white border border-gray-200 hover:border-gray-400 rounded-2xl shadow-2xs transition-all space-y-2.5 text-left group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                <Building className="h-3 w-3" />
                                {sp.desarrollo_inmueble}
                              </span>
                              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 mt-1 leading-snug">
                                {sp.nombre}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSpeechSeleccionado(sp)}
                              className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                            >
                              <span>Revisar y Enviar</span>
                              <Send className="h-3 w-3 text-emerald-400" />
                            </button>
                          </div>

                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {sp.descripcion || "Secuencia argumental estructurada para WhatsApp."}
                          </p>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 text-gray-500">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 flex items-center gap-1">
                                <Layers className="h-3 w-3 text-emerald-600" />
                                {totalPasos} impactos ordenados
                              </span>
                              <span>·</span>
                              <span>{fotosCount} fotografías/renders</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{sp.contador_envios} envíos previos</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* VISTA 2: PREVISUALIZACIÓN Y TRANSMISIÓN DEL SPEECH SELECCIONADO */}
            {speechSeleccionado && (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#efeae2]">
                {/* Banner de información de cumplimiento */}
                <div className="bg-white/95 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-gray-700 font-semibold text-[11px]">
                      Secuencia para: <strong>{speechSeleccionado.desarrollo_inmueble}</strong> ({speechSeleccionado.elementos?.length || 0} pasos)
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Meta WhatsApp Cloud API</span>
                </div>

                {/* Feed de vista previa de los mensajes en orden */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#d4cdc4_1px,transparent_1px)] [background-size:16px_16px]">
                  {(speechSeleccionado.elementos || []).map((el, i) => (
                    <div key={el.id || i} className="flex flex-col items-end my-1">
                      <div className="max-w-[85%] bg-[#d9fdd3] rounded-2xl p-2.5 text-xs shadow-xs space-y-1.5 border border-[#c2eec0]">
                        {el.url_imagen && (
                          <div className="rounded-xl overflow-hidden bg-black/10 border border-black/5 max-h-48">
                            <img
                              src={el.url_imagen}
                              alt={`Paso ${i + 1}`}
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}
                        {el.contenido_texto && (
                          <p className="text-gray-900 text-xs px-1 pt-0.5 leading-relaxed whitespace-pre-wrap">
                            {el.contenido_texto}
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-1.5 text-[9px] text-gray-500 pr-1">
                          <span className="font-bold text-emerald-800">Impacto {i + 1} de {speechSeleccionado.elementos?.length}</span>
                          <span>·</span>
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Panel inferior de control y transmisión */}
                <div className="p-4 bg-white border-t border-gray-200 shrink-0 space-y-3">
                  {transmisionEnProgreso && progresoTransmision && (
                    <div className="space-y-2 bg-emerald-50 p-3 rounded-2xl border border-emerald-200/80 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          Transmitiendo a WhatsApp: Paso {progresoTransmision.pasoActual} de {progresoTransmision.totalPasos}...
                        </span>
                        <span>
                          {Math.round((progresoTransmision.pasoActual / progresoTransmision.totalPasos) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-emerald-200/60 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                          style={{
                            width: `${(progresoTransmision.pasoActual / progresoTransmision.totalPasos) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-emerald-800 block">
                        Entregando mensajes e imágenes secuenciales con intervalo seguro para evitar saturación en el móvil del cliente.
                      </span>
                    </div>
                  )}

                  {progresoTransmision?.estado === "error" && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-900">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <span>{progresoTransmision.error || "Ocurrió un error en la transmisión."}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => manejarEnviarSpeechSecuencial(speechSeleccionado)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700 cursor-pointer"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}

                  {!transmisionEnProgreso && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        <span>Se enviarán <strong>{speechSeleccionado.elementos?.length} mensajes</strong> en orden estricto.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSpeechSeleccionado(null)}
                          className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => manejarEnviarSpeechSecuencial(speechSeleccionado)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Confirmar y Enviar a WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
