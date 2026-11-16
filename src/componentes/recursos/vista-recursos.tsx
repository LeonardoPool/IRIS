// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL DE RECURSOS DIGITALES Y RESPUESTAS RÁPIDAS
// ==============================================================================

"use client";

import * as React from "react";
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
} from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import type { RespuestaRapida, ArchivoDigital } from "@/tipos/recursos";
import { accionCrearRespuestaRapida, accionEliminarRespuestaRapida } from "@/acciones/recursos";
import { notificar } from "@/librerias/notificaciones/sileo";

interface PropiedadesVistaRecursos {
  respuestasIniciales: RespuestaRapida[];
  archivosIniciales: ArchivoDigital[];
}

export function VistaRecursos({ respuestasIniciales, archivosIniciales }: PropiedadesVistaRecursos) {
  const [pestaña, setPestaña] = React.useState<"respuestas" | "archivos">("respuestas");
  const [respuestas, setRespuestas] = React.useState<RespuestaRapida[]>(respuestasIniciales);
  const [archivos] = React.useState<ArchivoDigital[]>(archivosIniciales);
  const [busqueda, setBusqueda] = React.useState("");
  const [modalAbierto, setModalAbierto] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);

  // Formulario nueva respuesta
  const [nuevaRespuesta, setNuevaRespuesta] = React.useState({
    titulo: "",
    atajo: "",
    categoria: "seguimiento",
    contenido: "",
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

  const copiarTexto = (texto: string, titulo: string) => {
    navigator.clipboard.writeText(texto);
    notificar.exito("Copiado al portapapeles", `Respuesta rápida "${titulo}" lista para pegar.`);
  };

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await accionCrearRespuestaRapida(nuevaRespuesta);
      if (res.exito && res.respuesta) {
        setRespuestas([res.respuesta, ...respuestas]);
        setModalAbierto(false);
        setNuevaRespuesta({ titulo: "", atajo: "", categoria: "seguimiento", contenido: "" });
        notificar.exito("Respuesta rápida creada", `El atajo ${res.respuesta.atajo} ya está activo.`);
      }
    } catch (err: any) {
      notificar.error("Error al guardar", err.message);
    } finally {
      setCargando(false);
    }
  };

  const manejarEliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar la respuesta rápida "${titulo}"?`)) return;
    try {
      await accionEliminarRespuestaRapida(id);
      setRespuestas(respuestas.filter((r) => r.id !== id));
      notificar.aviso("Respuesta eliminada", `La plantilla "${titulo}" fue removida.`);
    } catch (err: any) {
      notificar.error("Error al eliminar", err.message);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Cabecera Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#7185a5] uppercase">
            PRODUCTIVIDAD COMERCIAL
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Recursos y Biblioteca Digital
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Respuestas rápidas para acelerar conversaciones y repositorio oficial de activos digitales compartibles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pestaña === "respuestas" && (
            <Boton
              variante="primario"
              tamano="sm"
              onClick={() => setModalAbierto(true)}
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
            onClick={() => setPestaña("respuestas")}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              pestaña === "respuestas"
                ? "bg-[var(--surface-active)] text-[var(--foreground)] font-bold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Respuestas Rápidas ({respuestas.length})</span>
          </button>
          <button
            onClick={() => setPestaña("archivos")}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              pestaña === "archivos"
                ? "bg-[var(--surface-active)] text-[var(--foreground)] font-bold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Archivos Digitales ({archivos.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o atajo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* PESTAÑA: RESPUESTAS RÁPIDAS */}
      {pestaña === "respuestas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {respuestasFiltradas.map((r) => (
            <Tarjeta key={r.id} className="p-5 flex flex-col justify-between hover:border-gray-400 transition-all">
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

                <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
                  <span>Usado {r.contador_uso} veces</span>
                  <span className="italic text-[10px]">Variables: {"{{nombre}}"}, {"{{agente}}"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between mt-3">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => copiarTexto(r.contenido, r.titulo)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar Plantilla
                </Boton>

                <button
                  onClick={() => manejarEliminar(r.id, r.titulo)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Eliminar plantilla"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {/* PESTAÑA: ARCHIVOS DIGITALES */}
      {pestaña === "archivos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {archivosFiltrados.map((a) => (
            <Tarjeta key={a.id} className="p-5 flex flex-col justify-between hover:border-gray-400 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-[var(--surface-active)] text-[#17191d] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {a.tipo_archivo}
                  </div>
                  <PlacaEstado variante={a.es_publico ? "exito" : "neutro"}>
                    {a.es_publico ? "Público" : "Privado"}
                  </PlacaEstado>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--foreground)] line-clamp-1">{a.nombre}</h3>
                  <span className="text-[11px] text-[var(--muted)] block mt-0.5">{a.categoria}</span>
                </div>

                <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                  {a.descripcion || "Documento digital homologado por la organización."}
                </p>

                <div className="text-[11px] text-[var(--muted)] pt-1">
                  {(a.tamano_bytes / 1024 / 1024).toFixed(1)} MB • {a.contador_descargas} descargas
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between mt-3">
                <Boton
                  variante="borde"
                  tamano="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(a.url_descarga);
                    notificar.exito("Enlace copiado", `URL de ${a.nombre} copiada.`);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar Enlace
                </Boton>

                <a
                  href={a.url_descarga}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </a>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {/* MODAL CREAR RESPUESTA RÁPIDA */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">Nueva Respuesta Rápida</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={manejarCrear} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold block text-[var(--foreground)]">Título Descriptivo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Confirmación de Cita Presencial"
                  value={nuevaRespuesta.titulo}
                  onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, titulo: e.target.value })}
                  className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Atajo de teclado</label>
                  <input
                    type="text"
                    required
                    placeholder="/cita"
                    value={nuevaRespuesta.atajo}
                    onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, atajo: e.target.value })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)] font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block text-[var(--foreground)]">Categoría</label>
                  <select
                    value={nuevaRespuesta.categoria}
                    onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, categoria: e.target.value as any })}
                    className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                  >
                    <option value="saludo">Saludo Inicial</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="propiedad">Ficha de Propiedad</option>
                    <option value="cierre">Cierre y Contrato</option>
                    <option value="soporte">Soporte y Dudas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-[var(--foreground)]">Contenido del Mensaje</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Hola {{nombre_contacto}}, te comparto los detalles solicitados..."
                  value={nuevaRespuesta.contenido}
                  onChange={(e) => setNuevaRespuesta({ ...nuevaRespuesta, contenido: e.target.value })}
                  className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)] leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Boton type="button" variante="secundario" tamano="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Guardar Plantilla
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
