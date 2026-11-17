// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL DE RECURSOS DIGITALES Y SPEECHES COMERCIALES
// ==============================================================================

"use client";

import * as React from "react";
import Image from "next/image";
import {
  MessageSquare,
  FileText,
  Plus,
  Copy,
  Trash2,
  Download,
  FolderGit2,
  Sparkles,
  ExternalLink,
  Search,
  Layers,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Eye,
  CopyPlus,
  X,
  Image as ImageIcon,
  Building,
  Check,
  Send,
  Smartphone,
  Info,
  Calendar,
} from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import type { RespuestaRapida, ArchivoDigital } from "@/tipos/recursos";
import type { SpeechComercial, ElementoSpeech, TipoElementoSpeech } from "@/tipos/speeches";
import { accionCrearRespuestaRapida, accionEliminarRespuestaRapida } from "@/acciones/recursos";
import {
  accionCrearSpeech,
  accionActualizarSpeech,
  accionEliminarSpeech,
  accionDuplicarSpeech,
} from "@/acciones/speeches";
import { notificar } from "@/librerias/notificaciones/sileo";
import { cn } from "@/librerias/utilidades/cn";

interface PropiedadesVistaRecursos {
  respuestasIniciales: RespuestaRapida[];
  archivosIniciales: ArchivoDigital[];
  speechesIniciales?: SpeechComercial[];
}

export function VistaRecursos({
  respuestasIniciales,
  archivosIniciales,
  speechesIniciales = [],
}: PropiedadesVistaRecursos) {
  const [pestaña, setPestaña] = React.useState<"speeches" | "respuestas" | "archivos">("speeches");
  const [speeches, setSpeeches] = React.useState<SpeechComercial[]>(speechesIniciales);
  const [respuestas, setRespuestas] = React.useState<RespuestaRapida[]>(respuestasIniciales);
  const [archivos] = React.useState<ArchivoDigital[]>(archivosIniciales);
  const [busqueda, setBusqueda] = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  // Filtro por desarrollo en Speeches
  const [filtroDesarrollo, setFiltroDesarrollo] = React.useState<string>("todos");

  // Modal Respuestas Rápidas
  const [modalRespuestaAbierto, setModalRespuestaAbierto] = React.useState(false);
  const [nuevaRespuesta, setNuevaRespuesta] = React.useState({
    titulo: "",
    atajo: "",
    categoria: "seguimiento",
    contenido: "",
  });

  // Modal Editor de Speech
  const [modalEditorSpeechAbierto, setModalEditorSpeechAbierto] = React.useState(false);
  const [speechEnEdicion, setSpeechEnEdicion] = React.useState<SpeechComercial | null>(null);
  const [formularioSpeech, setFormularioSpeech] = React.useState<{
    nombre: string;
    desarrollo_inmueble: string;
    descripcion: string;
    elementos: Array<{
      id?: string;
      tipo: TipoElementoSpeech;
      contenido_texto: string;
      url_imagen: string;
      nombre_archivo: string;
    }>;
  }>({
    nombre: "",
    desarrollo_inmueble: "",
    descripcion: "",
    elementos: [],
  });

  // Modal Vista Previa de Secuencia WhatsApp
  const [speechPrevisualizar, setSpeechPrevisualizar] = React.useState<SpeechComercial | null>(null);

  // Desarrollos únicos disponibles
  const desarrollosUnicos = React.useMemo(() => {
    const sets = new Set<string>();
    speeches.forEach((s) => {
      if (s.desarrollo_inmueble) sets.add(s.desarrollo_inmueble);
    });
    return Array.from(sets);
  }, [speeches]);

  // Filtrado de speeches
  const speechesFiltrados = speeches.filter((s) => {
    const coincideTexto =
      s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (s.descripcion || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      s.desarrollo_inmueble.toLowerCase().includes(busqueda.toLowerCase());

    const coincideDesarrollo =
      filtroDesarrollo === "todos" || s.desarrollo_inmueble === filtroDesarrollo;

    return coincideTexto && coincideDesarrollo;
  });

  const respuestasFiltradas = respuestas.filter(
    (r) =>
      r.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.atajo.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.contenido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const archivosFiltrados = archivos.filter(
    (a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Abrir editor para nuevo speech
  const abrirCrearSpeech = () => {
    setSpeechEnEdicion(null);
    setFormularioSpeech({
      nombre: "",
      desarrollo_inmueble: desarrollosUnicos[0] || "SOLHÁ - Lotes Campestres",
      descripcion: "",
      elementos: [
        {
          tipo: "imagen_con_texto",
          contenido_texto: "¡Hola! Un gusto saludarte. Te comparto la presentación oficial de nuestro desarrollo.",
          url_imagen: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "presentacion-asesor.jpg",
        },
        {
          tipo: "texto",
          contenido_texto: "Este proyecto cuenta con lotes de 350 m² con certeza jurídica y financiamiento directo a 24 meses sin intereses.",
          url_imagen: "",
          nombre_archivo: "",
        },
      ],
    });
    setModalEditorSpeechAbierto(true);
  };

  // Abrir editor para modificar speech existente
  const abrirEditarSpeech = (sp: SpeechComercial) => {
    setSpeechEnEdicion(sp);
    setFormularioSpeech({
      nombre: sp.nombre,
      desarrollo_inmueble: sp.desarrollo_inmueble,
      descripcion: sp.descripcion || "",
      elementos: (sp.elementos || []).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        contenido_texto: e.contenido_texto || "",
        url_imagen: e.url_imagen || "",
        nombre_archivo: e.nombre_archivo || "",
      })),
    });
    setModalEditorSpeechAbierto(true);
  };

  // Guardar Speech (Crear o Actualizar)
  const manejarGuardarSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioSpeech.nombre.trim()) {
      notificar.aviso("Nombre requerido", "Ingresa un título para el speech comercial.");
      return;
    }
    if (!formularioSpeech.desarrollo_inmueble.trim()) {
      notificar.aviso("Desarrollo requerido", "Asocia el speech a un desarrollo o producto inmobiliario.");
      return;
    }
    if (formularioSpeech.elementos.length === 0) {
      notificar.aviso("Secuencia vacía", "Agrega al menos un bloque de mensaje o imagen a la secuencia.");
      return;
    }

    try {
      setCargando(true);
      if (speechEnEdicion) {
        // Actualizar
        const res = await accionActualizarSpeech(speechEnEdicion.id, {
          nombre: formularioSpeech.nombre,
          desarrollo_inmueble: formularioSpeech.desarrollo_inmueble,
          descripcion: formularioSpeech.descripcion,
          elementos: formularioSpeech.elementos,
        });
        if (res.exito && res.speech) {
          setSpeeches(speeches.map((s) => (s.id === speechEnEdicion.id ? res.speech : s)));
          setModalEditorSpeechAbierto(false);
          notificar.exito("Speech actualizado", `"${res.speech.nombre}" se guardó correctamente.`);
        }
      } else {
        // Crear nuevo
        const res = await accionCrearSpeech({
          nombre: formularioSpeech.nombre,
          desarrollo_inmueble: formularioSpeech.desarrollo_inmueble,
          descripcion: formularioSpeech.descripcion,
          activo: true,
          elementos: formularioSpeech.elementos,
        });
        if (res.exito && res.speech) {
          setSpeeches([res.speech, ...speeches]);
          setModalEditorSpeechAbierto(false);
          notificar.exito("Speech creado", `"${res.speech.nombre}" ya está disponible en la bandeja.`);
        }
      }
    } catch (err: any) {
      notificar.error("Error al guardar speech", err.message);
    } finally {
      setCargando(false);
    }
  };

  // Duplicar Speech
  const manejarDuplicarSpeech = async (id: string, nombre: string) => {
    try {
      setCargando(true);
      const res = await accionDuplicarSpeech(id);
      if (res.exito && res.speech) {
        setSpeeches([res.speech, ...speeches]);
        notificar.exito("Speech duplicado", `Se creó la copia de "${nombre}".`);
      }
    } catch (err: any) {
      notificar.error("Error al duplicar", err.message);
    } finally {
      setCargando(false);
    }
  };

  // Eliminar Speech
  const manejarEliminarSpeech = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el speech comercial "${nombre}"?`)) return;
    try {
      setCargando(true);
      await accionEliminarSpeech(id);
      setSpeeches(speeches.filter((s) => s.id !== id));
      notificar.aviso("Speech eliminado", `"${nombre}" fue removido.`);
    } catch (err: any) {
      notificar.error("Error al eliminar", err.message);
    } finally {
      setCargando(false);
    }
  };

  // Activar / Desactivar Speech
  const manejarAlternarActivo = async (sp: SpeechComercial) => {
    const nuevoEstado = !sp.activo;
    try {
      const res = await accionActualizarSpeech(sp.id, { activo: nuevoEstado });
      if (res.exito && res.speech) {
        setSpeeches(speeches.map((s) => (s.id === sp.id ? res.speech : s)));
        notificar.info("Estado actualizado", `Speech ${nuevoEstado ? "activado" : "pausado"}.`);
      }
    } catch (err: any) {
      notificar.error("Error al actualizar estado", err.message);
    }
  };

  // Mover bloque arriba/abajo en el editor
  const moverElemento = (indice: number, direccion: "arriba" | "abajo") => {
    const nuevos = [...formularioSpeech.elementos];
    const destino = direccion === "arriba" ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= nuevos.length) return;
    const temp = nuevos[indice];
    nuevos[indice] = nuevos[destino];
    nuevos[destino] = temp;
    setFormularioSpeech({ ...formularioSpeech, elementos: nuevos });
  };

  // Eliminar bloque en el editor
  const eliminarElemento = (indice: number) => {
    const nuevos = formularioSpeech.elementos.filter((_, i) => i !== indice);
    setFormularioSpeech({ ...formularioSpeech, elementos: nuevos });
  };

  // Agregar nuevo bloque al editor
  const agregarElemento = (tipo: TipoElementoSpeech) => {
    const nuevo = {
      tipo,
      contenido_texto: tipo === "texto" ? "Nuevo mensaje explicativo para el cliente..." : "Descripción de la imagen o plano...",
      url_imagen:
        tipo !== "texto"
          ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop"
          : "",
      nombre_archivo: tipo !== "texto" ? "recurso-inmobiliario.jpg" : "",
    };
    setFormularioSpeech({
      ...formularioSpeech,
      elementos: [...formularioSpeech.elementos, nuevo],
    });
  };

  return (
    <div className="space-y-8 select-none">
      {/* Cabecera Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#7185a5] uppercase flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            PRODUCTIVIDAD Y SPEECHES COMERCIALES
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Plantillas y Speeches Multimedia
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Secuencias progresivas de texto e imágenes para WhatsApp, respuestas rápidas y activos oficiales para asesores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pestaña === "speeches" && (
            <Boton
              variante="primario"
              tamano="sm"
              onClick={abrirCrearSpeech}
              className="bg-gray-900 hover:bg-black text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Speech Comercial
            </Boton>
          )}

          {pestaña === "respuestas" && (
            <Boton
              variante="primario"
              tamano="sm"
              onClick={() => setModalRespuestaAbierto(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nueva Respuesta Rápida
            </Boton>
          )}
        </div>
      </div>

      {/* Selector de Pestañas y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-xs font-medium overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          <button
            onClick={() => setPestaña("speeches")}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap",
              pestaña === "speeches"
                ? "bg-gray-900 text-white font-bold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Speeches Comerciales ({speeches.length})</span>
          </button>
          <button
            onClick={() => setPestaña("respuestas")}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap",
              pestaña === "respuestas"
                ? "bg-gray-900 text-white font-bold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span>Respuestas Rápidas ({respuestas.length})</span>
          </button>
          <button
            onClick={() => setPestaña("archivos")}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap",
              pestaña === "archivos"
                ? "bg-gray-900 text-white font-bold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <FolderGit2 className="h-4 w-4 text-purple-400" />
            <span>Archivos Digitales ({archivos.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {pestaña === "speeches" && desarrollosUnicos.length > 0 && (
            <select
              value={filtroDesarrollo}
              onChange={(e) => setFiltroDesarrollo(e.target.value)}
              className="h-8 px-2.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="todos">Todos los desarrollos</option>
              {desarrollosUnicos.map((des) => (
                <option key={des} value={des}>
                  {des}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o contenido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. PESTAÑA: SPEECHES COMERCIALES MULTIMEDIA */}
      {/* ==================================================================== */}
      {pestaña === "speeches" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {speechesFiltrados.map((sp) => {
              const totalElementos = sp.elementos?.length || 0;
              const imagenesCount = (sp.elementos || []).filter((e) => e.tipo !== "texto").length;
              const textosCount = (sp.elementos || []).filter((e) => e.tipo === "texto").length;

              return (
                <Tarjeta
                  key={sp.id}
                  className="p-5 flex flex-col justify-between hover:border-gray-400 transition-all border border-[#e5e7eb] rounded-2xl bg-white shadow-2xs relative overflow-hidden group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Building className="h-3 w-3" />
                          {sp.desarrollo_inmueble}
                        </span>
                        <h3 className="text-sm font-extrabold text-gray-900 mt-1 leading-snug">
                          {sp.nombre}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => manejarAlternarActivo(sp)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors shrink-0",
                          sp.activo
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                        title={sp.activo ? "Speech activo (click para pausar)" : "Speech pausado (click para activar)"}
                      >
                        {sp.activo ? "Activo" : "Pausado"}
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {sp.descripcion || "Sin descripción interna."}
                    </p>

                    {/* Resumen de estructura multimedia */}
                    <div className="bg-[#f8f9fa] p-3 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-800">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          {totalElementos} impactos
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] text-gray-500">
                          {imagenesCount} fotos, {textosCount} textos
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {sp.contador_envios} envíos
                      </span>
                    </div>

                    {/* Previsualización miniatura de los primeros 3 pasos */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {(sp.elementos || []).slice(0, 4).map((el, i) => (
                        <div
                          key={el.id || i}
                          className="h-10 w-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0 relative"
                        >
                          {el.url_imagen ? (
                            <img
                              src={el.url_imagen}
                              alt={`Paso ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="absolute bottom-0 right-0 px-1 text-[8px] font-bold bg-black/60 text-white rounded-tl">
                            {i + 1}
                          </span>
                        </div>
                      ))}
                      {totalElementos > 4 && (
                        <div className="h-10 w-10 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-50">
                          +{totalElementos - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones del Speech */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setSpeechPrevisualizar(sp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-gray-600" />
                      <span>Ver Secuencia</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditarSpeech(sp)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer text-xs font-semibold"
                        title="Editar speech"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => manejarDuplicarSpeech(sp.id, sp.nombre)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Duplicar speech"
                      >
                        <CopyPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => manejarEliminarSpeech(sp.id, sp.nombre)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar speech"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Tarjeta>
              );
            })}
          </div>

          {speechesFiltrados.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-white p-8">
              <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-700">No se encontraron speeches comerciales</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Crea tu primera secuencia estructurada de WhatsApp combinando textos, renders y planos de ubicación.
              </p>
              <Boton
                variante="primario"
                tamano="sm"
                onClick={abrirCrearSpeech}
                className="mt-4 bg-gray-900 hover:bg-black text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Crear Speech Comercial
              </Boton>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PESTAÑA: RESPUESTAS RÁPIDAS (EXISTENTE) */}
      {/* ==================================================================== */}
      {pestaña === "respuestas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {respuestasFiltradas.map((r) => (
            <Tarjeta key={r.id} className="p-5 flex flex-col justify-between hover:border-gray-400 transition-all border border-[#e5e7eb] rounded-2xl bg-white shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{r.titulo}</h3>
                    <span className="font-mono text-xs font-semibold text-[#7185a5]">{r.atajo}</span>
                  </div>
                  <PlacaEstado variante="acento">{r.categoria}</PlacaEstado>
                </div>

                <p className="text-xs text-[var(--foreground)] bg-[var(--surface-subtle)] p-3 rounded-lg border border-[var(--border-subtle)] leading-relaxed font-sans select-text">
                  {r.contenido}
                </p>

                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Utilizada {r.contador_uso} veces</span>
                  <span className="font-mono text-[10px]">Actualizada recientemente</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
                <Boton
                  variante="borde"
                  tamano="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(r.contenido);
                    notificar.exito("Copiado al portapapeles", `Respuesta "${r.titulo}" lista para pegar.`);
                  }}
                  className="text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar
                </Boton>
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar la respuesta rápida "${r.titulo}"?`)) return;
                    await accionEliminarRespuestaRapida(r.id);
                    setRespuestas(respuestas.filter((item) => item.id !== r.id));
                    notificar.aviso("Respuesta eliminada", `La plantilla "${r.titulo}" fue removida.`);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Boton>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PESTAÑA: ARCHIVOS DIGITALES (EXISTENTE) */}
      {/* ==================================================================== */}
      {pestaña === "archivos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {archivosFiltrados.map((a) => (
            <Tarjeta key={a.id} className="p-5 flex flex-col justify-between hover:border-gray-400 transition-all border border-[#e5e7eb] rounded-2xl bg-white shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-gray-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#7185a5] uppercase tracking-wider block">
                        {a.categoria}
                      </span>
                      <h3 className="text-xs font-bold text-[var(--foreground)] truncate max-w-[180px]">
                        {a.nombre}
                      </h3>
                    </div>
                  </div>
                  <PlacaEstado variante={a.es_publico ? "exito" : "advertencia"}>
                    {a.es_publico ? "Público" : "Interno"}
                  </PlacaEstado>
                </div>

                <p className="text-xs text-[var(--muted)] line-clamp-2">{a.descripcion}</p>

                <div className="bg-[var(--surface-subtle)] p-2 rounded-lg text-[10px] flex justify-between text-[var(--muted)]">
                  <span>{(a.tamano_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  <span>{a.contador_descargas} descargas</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] mt-4">
                <a
                  href={a.url_descarga}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Vista previa
                </a>
                <Boton
                  variante="borde"
                  tamano="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(a.url_descarga);
                    notificar.exito("Enlace copiado", "Enlace de descarga listo para enviar al cliente.");
                  }}
                  className="text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar Link
                </Boton>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. MODAL: EDITOR DE SPEECH COMERCIAL MULTIMEDIA */}
      {/* ==================================================================== */}
      {modalEditorSpeechAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Cabecera del modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#fafbfc] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">
                    {speechEnEdicion ? "Editar Speech Comercial" : "Nuevo Speech Comercial Multimedia"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Define la secuencia progresiva de mensajes e imágenes que se enviarán al cliente por WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditorSpeechAbierto(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido scrolleable del editor */}
            <form onSubmit={manejarGuardarSpeech} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Metadatos Generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#f8f9fa] rounded-2xl border border-gray-200/80">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Nombre del Speech *
                  </label>
                  <input
                    type="text"
                    required
                    value={formularioSpeech.nombre}
                    onChange={(e) => setFormularioSpeech({ ...formularioSpeech, nombre: e.target.value })}
                    placeholder="ej. Presentación Inicial SOLHÁ (Lotes de Inversión)"
                    className="w-full h-9 px-3 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Desarrollo / Inmueble Vinculado *
                  </label>
                  <input
                    type="text"
                    required
                    value={formularioSpeech.desarrollo_inmueble}
                    onChange={(e) =>
                      setFormularioSpeech({ ...formularioSpeech, desarrollo_inmueble: e.target.value })
                    }
                    placeholder="ej. SOLHÁ - Lotes Campestres"
                    className="w-full h-9 px-3 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Descripción u Objetivo Comercial (Interno)
                  </label>
                  <input
                    type="text"
                    value={formularioSpeech.descripcion}
                    onChange={(e) =>
                      setFormularioSpeech({ ...formularioSpeech, descripcion: e.target.value })
                    }
                    placeholder="ej. Secuencia de 10 impactos para nuevos leads de pauta publicitaria en Meta Ads."
                    className="w-full h-9 px-3 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Constructor de Bloques Secuenciales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                      Secuencia Ordenada de Mensajes ({formularioSpeech.elementos.length} pasos)
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      (Se transmitirán en este orden estricto)
                    </span>
                  </div>

                  {/* Botones rápidos para agregar bloques */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => agregarElemento("texto")}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      + Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => agregarElemento("imagen_con_texto")}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      + Foto con Pie
                    </button>
                    <button
                      type="button"
                      onClick={() => agregarElemento("imagen")}
                      className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      + Foto Sola
                    </button>
                  </div>
                </div>

                {/* Lista de bloques editables */}
                <div className="space-y-3">
                  {formularioSpeech.elementos.map((elem, idx) => (
                    <div
                      key={elem.id || idx}
                      className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3 relative group transition-all hover:border-gray-300"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-gray-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            Paso {idx + 1}:
                          </span>
                          <select
                            value={elem.tipo}
                            onChange={(e) => {
                              const nuevos = [...formularioSpeech.elementos];
                              nuevos[idx].tipo = e.target.value as TipoElementoSpeech;
                              setFormularioSpeech({ ...formularioSpeech, elementos: nuevos });
                            }}
                            className="h-7 px-2 text-[11px] font-bold border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
                          >
                            <option value="texto">Mensaje de Texto</option>
                            <option value="imagen_con_texto">Imagen con Descripción (Caption)</option>
                            <option value="imagen">Imagen / Fotografía Sola</option>
                          </select>
                        </div>

                        {/* Botones de orden y eliminación */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moverElemento(idx, "arriba")}
                            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                            title="Mover arriba"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formularioSpeech.elementos.length - 1}
                            onClick={() => moverElemento(idx, "abajo")}
                            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                            title="Mover abajo"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarElemento(idx)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 cursor-pointer ml-1"
                            title="Eliminar este bloque"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Campos del bloque: Imagen si aplica */}
                      {elem.tipo !== "texto" && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                          <div className="h-24 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 relative flex items-center justify-center shrink-0">
                            {elem.url_imagen ? (
                              <img
                                src={elem.url_imagen}
                                alt="Previsualización"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-2">
                                <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                <span className="text-[10px] text-gray-400 block">Sin imagen</span>
                              </div>
                            )}
                          </div>

                          <div className="sm:col-span-3 space-y-2">
                            <label className="text-[11px] font-bold text-gray-600 block">
                              URL del Recurso / Fotografía (o Storage)
                            </label>
                            <input
                              type="url"
                              value={elem.url_imagen}
                              onChange={(e) => {
                                const nuevos = [...formularioSpeech.elementos];
                                nuevos[idx].url_imagen = e.target.value;
                                setFormularioSpeech({ ...formularioSpeech, elementos: nuevos });
                              }}
                              placeholder="https://ejemplo.com/fotos/render.jpg"
                              className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-gray-900"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>Sustituye la imagen sin reconstruir la secuencia.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Campos del bloque: Texto o Caption */}
                      {elem.tipo !== "imagen" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-600 block">
                            {elem.tipo === "imagen_con_texto" ? "Pie de Foto (Caption) de WhatsApp" : "Contenido del Mensaje"}
                          </label>
                          <textarea
                            rows={elem.tipo === "texto" ? 3 : 2}
                            value={elem.contenido_texto}
                            onChange={(e) => {
                              const nuevos = [...formularioSpeech.elementos];
                              nuevos[idx].contenido_texto = e.target.value;
                              setFormularioSpeech({ ...formularioSpeech, elementos: nuevos });
                            }}
                            placeholder="Escribe el texto persuasivo que recibirá el prospecto..."
                            className="w-full p-2.5 text-xs border border-gray-300 rounded-xl bg-[#fafbfc] focus:bg-white focus:outline-none focus:border-gray-900 leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción del formulario */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalEditorSpeechAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <Boton
                  type="submit"
                  variante="primario"
                  tamano="sm"
                  disabled={cargando}
                  className="bg-gray-900 hover:bg-black text-white px-5"
                >
                  {cargando ? "Guardando..." : speechEnEdicion ? "Guardar Cambios" : "Crear Speech Comercial"}
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. MODAL: VISTA PREVIA DE SECUENCIA TIPO WHATSAPP */}
      {/* ==================================================================== */}
      {speechPrevisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#efeae2] rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl border border-gray-300 overflow-hidden relative">
            {/* Cabecera simulada de WhatsApp */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs">
                  IN
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>{speechPrevisualizar.desarrollo_inmueble}</span>
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  </h3>
                  <span className="text-[10px] text-white/80 block">
                    Secuencia oficial de {speechPrevisualizar.elementos?.length || 0} impactos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpeechPrevisualizar(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulación del feed de chat de WhatsApp */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[radial-gradient(#d4cdc4_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="text-center my-1">
                <span className="bg-white/90 text-gray-500 text-[10px] font-semibold px-3 py-1 rounded-full shadow-2xs border border-black/5">
                  VISTA PREVIA DEL SPEECH COMERCIAL
                </span>
              </div>

              {(speechPrevisualizar.elementos || []).map((el, index) => {
                const horaSimulada = `10:${String(15 + index).padStart(2, "0")} AM`;

                if (el.tipo === "imagen" || el.tipo === "imagen_con_texto") {
                  return (
                    <div key={el.id || index} className="flex flex-col items-end my-1">
                      <div className="max-w-[85%] bg-[#d9fdd3] rounded-2xl p-2 text-xs shadow-xs space-y-1.5 border border-[#c2eec0]">
                        <div className="rounded-xl overflow-hidden bg-black/10 border border-black/5">
                          <img
                            src={el.url_imagen || ""}
                            alt={`Impacto ${index + 1}`}
                            className="w-full h-44 object-cover"
                          />
                        </div>
                        {el.contenido_texto && (
                          <p className="text-gray-900 text-xs px-1 pt-0.5 leading-relaxed">
                            {el.contenido_texto}
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-gray-500 pr-1">
                          <span className="font-bold text-emerald-800">Paso {index + 1}</span>
                          <span>·</span>
                          <span>{horaSimulada}</span>
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={el.id || index} className="flex flex-col items-end my-1">
                    <div className="max-w-[85%] bg-[#d9fdd3] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs border border-[#c2eec0] space-y-1">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{el.contenido_texto}</p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-gray-500">
                        <span className="font-bold text-emerald-800">Paso {index + 1}</span>
                        <span>·</span>
                        <span>{horaSimulada}</span>
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie del modal */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-500 font-medium">
                {speechPrevisualizar.elementos?.length} mensajes ordenados
              </span>
              <button
                type="button"
                onClick={() => setSpeechPrevisualizar(null)}
                className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. MODAL: NUEVA RESPUESTA RÁPIDA (EXISTENTE) */}
      {/* ==================================================================== */}
      {modalRespuestaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Nueva Respuesta Rápida</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setCargando(true);
                  const res = await accionCrearRespuestaRapida(nuevaRespuesta);
                  if (res.exito && res.respuesta) {
                    setRespuestas([res.respuesta, ...respuestas]);
                    setModalRespuestaAbierto(false);
                    setNuevaRespuesta({ titulo: "", atajo: "", categoria: "seguimiento", contenido: "" });
                    notificar.exito("Respuesta creada", `Atajo ${res.respuesta.atajo} registrado.`);
                  }
                } catch (err: any) {
                  notificar.error("Error al guardar", err.message);
                } finally {
                  setCargando(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Título de la respuesta</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Confirmación de Cita"
                  value={nuevaRespuesta.titulo}
                  onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, titulo: e.target.value })}
                  className="w-full text-xs h-9 px-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Atajo (ej. /cita)</label>
                  <input
                    type="text"
                    required
                    placeholder="/cita"
                    value={nuevaRespuesta.atajo}
                    onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, atajo: e.target.value })}
                    className="w-full text-xs h-9 px-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Categoría</label>
                  <select
                    value={nuevaRespuesta.categoria}
                    onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, categoria: e.target.value })}
                    className="w-full text-xs h-9 px-3 border border-gray-300 rounded-lg focus:outline-none"
                  >
                    <option value="saludo">Saludo</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="propiedad">Propiedad</option>
                    <option value="cierre">Cierre</option>
                    <option value="soporte">Soporte</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Contenido del Mensaje</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe el texto de la plantilla. Puedes usar {{nombre_contacto}}..."
                  value={nuevaRespuesta.contenido}
                  onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, contenido: e.target.value })}
                  className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRespuestaAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <Boton type="submit" variante="primario" tamano="sm" disabled={cargando}>
                  {cargando ? "Guardando..." : "Guardar Respuesta"}
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
