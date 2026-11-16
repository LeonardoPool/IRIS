// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL DE MARKETING Y PRODUCTIVIDAD
// ==============================================================================
// Formularios Web Institucionales, Meta Lead Ads y Google Calendar / Meet
// ==============================================================================

"use client";

import * as React from "react";
import {
  Globe,
  Share2,
  Calendar,
  Code2,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Video,
  Activity,
  UserCheck,
  Filter,
} from "lucide-react";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import type { FormularioWeb, IntegracionMarketing, RegistroCapturaLead, ConexionCalendario } from "@/tipos/marketing";
import {
  accionCrearFormularioWeb,
  accionEliminarFormularioWeb,
  accionDesconectarCalendario,
} from "@/acciones/marketing";

interface PropiedadesVistaMarketing {
  formulariosIniciales: FormularioWeb[];
  integracionesIniciales: IntegracionMarketing[];
  capturasIniciales: RegistroCapturaLead[];
  conexionCalendario: ConexionCalendario | null;
  organizacionId: string;
}

export function VistaMarketing({
  formulariosIniciales,
  integracionesIniciales,
  capturasIniciales,
  conexionCalendario,
}: PropiedadesVistaMarketing) {
  const [pestañaActiva, setPestañaActiva] = React.useState<"formularios" | "meta" | "calendario" | "auditoria">(
    "formularios"
  );

  // Estados locales
  const [formularios, setFormularios] = React.useState<FormularioWeb[]>(formulariosIniciales);
  const [formularioParaCodigo, setFormularioParaCodigo] = React.useState<FormularioWeb | null>(null);
  const [modalCrearAbierto, setModalCrearAbierto] = React.useState(false);
  const [copiadoClave, setCopiadoClave] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);

  // Formulario nuevo
  const [nuevoForm, setNuevoForm] = React.useState({
    nombre: "",
    slug: "",
    descripcion: "",
    mensaje_exito: "¡Gracias por contactarnos! Un asesor te atenderá de inmediato.",
    campos_habilitados: ["nombre", "correo_electronico", "telefono", "mensaje"],
  });

  const totalEnvios = formularios.reduce((acumulado, f) => acumulado + (f.contador_envios || 0), 0);

  const manejarCrearFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await accionCrearFormularioWeb({
        nombre: nuevoForm.nombre,
        slug: nuevoForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        descripcion: nuevoForm.descripcion,
        mensaje_exito: nuevoForm.mensaje_exito,
        campos_habilitados: nuevoForm.campos_habilitados,
        permitir_dominios: ["*"],
        estado: "activo",
      });
      if (res.exito && res.formulario) {
        setFormularios([res.formulario, ...formularios]);
        setModalCrearAbierto(false);
        setNuevoForm({
          nombre: "",
          slug: "",
          descripcion: "",
          mensaje_exito: "¡Gracias por contactarnos! Un asesor te atenderá de inmediato.",
          campos_habilitados: ["nombre", "correo_electronico", "telefono", "mensaje"],
        });
      }
    } catch (err: any) {
      alert(`Error al crear formulario: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const manejarEliminarFormulario = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este formulario web?")) return;
    try {
      await accionEliminarFormularioWeb(id);
      setFormularios(formularios.filter((f) => f.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoClave(true);
    setTimeout(() => setCopiadoClave(false), 2000);
  };

  return (
    <div className="space-y-8 select-none">
      {/* Cabecera Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#7185a5] uppercase">
            FASE 4 — INTEGRACIONES
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Marketing y Productividad
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Captura automatizada de prospectos, formularios institucionales y sincronización de agenda comercial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Boton
            variante="primario"
            tamano="sm"
            onClick={() => setModalCrearAbierto(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Formulario Web
          </Boton>
        </div>
      </div>

      {/* Tarjetas de Métricas de Ingesta */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tarjeta className="p-5 border-l-4 border-l-[#17191d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Formularios Activos</span>
            <Globe className="h-4 w-4 text-[var(--muted)]" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {formularios.filter((f) => f.estado === "activo").length}
          </div>
          <span className="text-[11px] text-[var(--muted)]">Listos para incrustar</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-[#7185a5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Leads Capturados</span>
            <Activity className="h-4 w-4 text-[#7185a5]" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {totalEnvios}
          </div>
          <span className="text-[11px] text-[var(--muted)]">Trazabilidad con UTMs</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Meta Lead Ads</span>
            <Share2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 text-lg font-bold tracking-tight text-[var(--foreground)]">
            {integracionesIniciales.some((i) => i.proveedor === "meta_lead_ads" && i.estado === "activo")
              ? "Conectado"
              : "Verificado"}
          </div>
          <span className="text-[11px] text-[var(--muted)]">Webhook activo</span>
        </Tarjeta>

        <Tarjeta className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Google Calendar</span>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-lg font-bold tracking-tight text-[var(--foreground)] truncate">
            {conexionCalendario ? "Vinculado" : "No conectado"}
          </div>
          <span className="text-[11px] text-[var(--muted)]">
            {conexionCalendario ? conexionCalendario.email_calendario : "Meet habilitado"}
          </span>
        </Tarjeta>
      </div>

      {/* Pestañas de Navegación de Sección */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium">
        <button
          onClick={() => setPestañaActiva("formularios")}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            pestañaActiva === "formularios"
              ? "bg-[var(--surface-raised)] text-[var(--foreground)] font-bold shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Formularios Web Embebibles
        </button>
        <button
          onClick={() => setPestañaActiva("meta")}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            pestañaActiva === "meta"
              ? "bg-[var(--surface-raised)] text-[var(--foreground)] font-bold shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Meta Lead Ads
        </button>
        <button
          onClick={() => setPestañaActiva("calendario")}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            pestañaActiva === "calendario"
              ? "bg-[var(--surface-raised)] text-[var(--foreground)] font-bold shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Google Calendar y Meet
        </button>
        <button
          onClick={() => setPestañaActiva("auditoria")}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            pestañaActiva === "auditoria"
              ? "bg-[var(--surface-raised)] text-[var(--foreground)] font-bold shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Registro de Capturas ({capturasIniciales.length})
        </button>
      </div>

      {/* =======================================================================
          PESTAÑA 1: FORMULARIOS WEB EMBEBIBLES
         ======================================================================= */}
      {pestañaActiva === "formularios" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formularios.map((form) => (
              <Tarjeta key={form.id} className="flex flex-col justify-between hover:border-gray-400 transition-all">
                <ContenidoTarjeta className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--foreground)]">{form.nombre}</h3>
                      <p className="text-xs text-[var(--muted)] font-mono mt-0.5">/{form.slug}</p>
                    </div>
                    <PlacaEstado variante={form.estado === "activo" ? "exito" : "neutro"}>
                      {form.estado === "activo" ? "Activo" : "Inactivo"}
                    </PlacaEstado>
                  </div>

                  <p className="text-xs text-[var(--muted)] line-clamp-2">
                    {form.descripcion || "Formulario institucional de captación directa."}
                  </p>

                  <div className="bg-[var(--surface-subtle)] p-2.5 rounded-md border border-[var(--border-subtle)] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--muted)]">Envíos registrados:</span>
                      <span className="font-bold text-[var(--foreground)]">{form.contador_envios || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--muted)]">Campos:</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {form.campos_habilitados?.length || 4} campos
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setFormularioParaCodigo(form)}
                    >
                      <Code2 className="h-3.5 w-3.5 mr-1" />
                      Código Embebido
                    </Boton>
                    <button
                      onClick={() => manejarEliminarFormulario(form.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar formulario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </ContenidoTarjeta>
              </Tarjeta>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          PESTAÑA 2: META LEAD ADS (CONFIGURACIÓN)
         ======================================================================= */}
      {pestañaActiva === "meta" && (
        <Tarjeta className="max-w-3xl">
          <CabeceraTarjeta>
            <TituloTarjeta>Configuración de Meta Lead Ads (Facebook e Instagram)</TituloTarjeta>
            <p className="text-xs text-[var(--muted)] mt-1">
              Conecta los formularios instantáneos de tus campañas pagadas para ingresar los leads en tiempo real con su campaña correspondiente.
            </p>
          </CabeceraTarjeta>
          <ContenidoTarjeta className="space-y-6 pt-2">
            <div className="bg-blue-50/50 border border-blue-200/60 p-4 rounded-lg flex items-start gap-3">
              <Share2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-blue-900">
                <span className="font-semibold block">Endpoint de Webhook activo</span>
                <p className="leading-relaxed">
                  Configura esta URL en el panel de <strong>Meta for Developers &gt; Webhooks &gt; Page &gt; leadgen</strong>:
                </p>
                <div className="bg-white/80 border border-blue-300 font-mono p-2 rounded text-[11px] flex items-center justify-between mt-2 select-all">
                  <span>http://localhost:3000/api/webhooks/meta-lead-ads</span>
                  <button
                    onClick={() => copiarAlPortapapeles("http://localhost:3000/api/webhooks/meta-lead-ads")}
                    className="text-blue-700 hover:text-blue-900 cursor-pointer ml-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <span className="font-semibold text-[var(--foreground)] block">Token de Verificación (Verify Token)</span>
                <p className="font-mono text-[11px] text-[var(--muted)] select-all">iris_meta_verify_token_2026</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <span className="font-semibold text-[var(--foreground)] block">Firma Criptográfica</span>
                <p className="text-[11px] text-[var(--muted)]">HMAC SHA-256 (Cabecera X-Hub-Signature-256)</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Atribución de campaña: Ad ID, AdSet ID, Campaign ID</span>
              <PlacaEstado variante="exito">Webhook Operativo</PlacaEstado>
            </div>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* =======================================================================
          PESTAÑA 3: GOOGLE CALENDAR Y GOOGLE MEET
         ======================================================================= */}
      {pestañaActiva === "calendario" && (
        <Tarjeta className="max-w-2xl">
          <CabeceraTarjeta>
            <TituloTarjeta>Sincronización de Agenda Comercial</TituloTarjeta>
            <p className="text-xs text-[var(--muted)] mt-1">
              Conecta tu cuenta de Google para agendar reuniones desde la ficha de cada prospecto con generación automática de sala Google Meet.
            </p>
          </CabeceraTarjeta>
          <ContenidoTarjeta className="space-y-6 pt-2">
            {conexionCalendario ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      G
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-950 block">Google Calendar Vinculado</span>
                      <span className="text-xs text-emerald-800">{conexionCalendario.email_calendario}</span>
                    </div>
                  </div>
                  <PlacaEstado variante="exito">Activo</PlacaEstado>
                </div>

                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <span>Enlaces automáticos de Google Meet habilitados en cada cita comercial.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Renovación silenciosa de credencial mediante Refresh Token OAuth 2.0.</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                  <Boton
                    variante="destructivo"
                    tamano="sm"
                    onClick={async () => {
                      if (confirm("¿Deseas desvincular tu Google Calendar?")) {
                        await accionDesconectarCalendario();
                        window.location.reload();
                      }
                    }}
                  >
                    Desvincular Calendario
                  </Boton>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-6">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Vincular con Google Calendar</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Permite que IRIS inserte citas directamente en tu calendario y envíe invitaciones a tus clientes.
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href="/api/oauth/google/autorizar"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#17191d] text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors"
                  >
                    <span>Conectar con Google</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* =======================================================================
          PESTAÑA 4: REGISTRO DE CAPTURAS FORENSE
         ======================================================================= */}
      {pestañaActiva === "auditoria" && (
        <Tarjeta>
          <CabeceraTarjeta>
            <TituloTarjeta>Bitácora de Prospectos Capturados</TituloTarjeta>
            <p className="text-xs text-[var(--muted)] mt-1">
              Registro inmutable de leads recibidos desde fuentes digitales con IP, datos crudos y trazabilidad.
            </p>
          </CabeceraTarjeta>
          <ContenidoTarjeta className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--muted)] font-semibold">
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Prospecto</th>
                    <th className="py-3 px-4">Campaña / Origen</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">IP Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {capturasIniciales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[var(--muted)]">
                        No hay registros de capturas aún.
                      </td>
                    </tr>
                  ) : (
                    capturasIniciales.map((cap) => (
                      <tr key={cap.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted)]">
                          {new Date(cap.fecha_creacion).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium uppercase tracking-wider text-[11px]">
                          {cap.proveedor.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                          {cap.prospecto?.nombre || cap.datos_crudos?.nombre || "Sin nombre"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted)]">
                          {cap.metadatos_campana?.utm_campaign || "Orgánico / Directo"}
                        </td>
                        <td className="py-3 px-4">
                          <PlacaEstado
                            variante={
                              cap.estado_procesamiento === "exitoso"
                                ? "exito"
                                : cap.estado_procesamiento === "descartado_spam"
                                ? "destructivo"
                                : "advertencia"
                            }
                          >
                            {cap.estado_procesamiento}
                          </PlacaEstado>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted)]">
                          {cap.ip_origen || "Localhost / Proxy"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* =======================================================================
          MODAL: CÓDIGO EMBEBIDO PARA SITIO WEB
         ======================================================================= */}
      {formularioParaCodigo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Código Embebido: {formularioParaCodigo.nombre}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Copia y pega este fragmento en cualquier sitio web, WordPress, Webflow o landing page.
                </p>
              </div>
              <button
                onClick={() => setFormularioParaCodigo(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                <span>Fragmento HTML + JavaScript Autocontenido:</span>
                <button
                  onClick={() => {
                    const codigo = `<!-- FORMULARIO INSTITUCIONAL IRIS BY WYLEN -->
<form id="iris-form-${formularioParaCodigo.slug}" style="display:flex;flex-direction:column;gap:12px;max-width:400px;font-family:sans-serif;">
  <input type="text" name="nombre" placeholder="Nombre completo" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <input type="email" name="correoElectronico" placeholder="Correo electrónico" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <input type="tel" name="telefono" placeholder="Teléfono / WhatsApp" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <textarea name="mensaje" placeholder="¿En qué podemos ayudarte?" rows="3" style="padding:10px;border:1px solid #ccc;border-radius:6px;"></textarea>
  <!-- Trampa anti-spam oculta -->
  <input type="text" name="_trampa_honeypot" style="display:none;" tabindex="-1" autocomplete="off" />
  <button type="submit" style="padding:12px;background:#17191d;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Enviar Mensaje</button>
  <div id="iris-mensaje-${formularioParaCodigo.slug}" style="font-size:12px;display:none;"></div>
</form>

<script>
  document.getElementById("iris-form-${formularioParaCodigo.slug}").addEventListener("submit", async function(e) {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Enviando...";
    try {
      const res = await fetch("http://localhost:3000/api/formularios/captura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claveApi: "${formularioParaCodigo.clave_api_publica}",
          nombre: f.nombre.value,
          correoElectronico: f.correoElectronico.value,
          telefono: f.telefono.value,
          mensaje: f.mensaje.value,
          _trampa_honeypot: f._trampa_honeypot.value
        })
      });
      const d = await res.json();
      const msg = document.getElementById("iris-mensaje-${formularioParaCodigo.slug}");
      msg.style.display = "block";
      msg.innerText = d.mensaje || "¡Mensaje recibido con éxito!";
      msg.style.color = d.exito ? "#16a34a" : "#dc2626";
      if (d.exito) f.reset();
    } catch(err) {
      alert("Error al enviar mensaje");
    } finally {
      btn.disabled = false;
      btn.innerText = "Enviar Mensaje";
    }
  });
</script>`;
                    copiarAlPortapapeles(codigo);
                  }}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 cursor-pointer font-semibold"
                >
                  {copiadoClave ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiadoClave ? "¡Copiado!" : "Copiar Código"}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={10}
                className="w-full font-mono text-[11px] p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--foreground)] focus:outline-none"
                value={`<!-- FORMULARIO INSTITUCIONAL IRIS BY WYLEN -->
<form id="iris-form-${formularioParaCodigo.slug}" style="display:flex;flex-direction:column;gap:12px;max-width:400px;font-family:sans-serif;">
  <input type="text" name="nombre" placeholder="Nombre completo" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <input type="email" name="correoElectronico" placeholder="Correo electrónico" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <input type="tel" name="telefono" placeholder="Teléfono / WhatsApp" required style="padding:10px;border:1px solid #ccc;border-radius:6px;" />
  <textarea name="mensaje" placeholder="¿En qué podemos ayudarte?" rows="3" style="padding:10px;border:1px solid #ccc;border-radius:6px;"></textarea>
  <!-- Trampa anti-spam oculta -->
  <input type="text" name="_trampa_honeypot" style="display:none;" tabindex="-1" autocomplete="off" />
  <button type="submit" style="padding:12px;background:#17191d;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Enviar Mensaje</button>
  <div id="iris-mensaje-${formularioParaCodigo.slug}" style="font-size:12px;display:none;"></div>
</form>

<script>
  document.getElementById("iris-form-${formularioParaCodigo.slug}").addEventListener("submit", async function(e) {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Enviando...";
    try {
      const res = await fetch("http://localhost:3000/api/formularios/captura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claveApi: "${formularioParaCodigo.clave_api_publica}",
          nombre: f.nombre.value,
          correoElectronico: f.correoElectronico.value,
          telefono: f.telefono.value,
          mensaje: f.mensaje.value,
          _trampa_honeypot: f._trampa_honeypot.value
        })
      });
      const d = await res.json();
      const msg = document.getElementById("iris-mensaje-${formularioParaCodigo.slug}");
      msg.style.display = "block";
      msg.innerText = d.mensaje || "¡Mensaje recibido con éxito!";
      msg.style.color = d.exito ? "#16a34a" : "#dc2626";
      if (d.exito) f.reset();
    } catch(err) {
      alert("Error al enviar mensaje");
    } finally {
      btn.disabled = false;
      btn.innerText = "Enviar Mensaje";
    }
  });
</script>`}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
              <Boton variante="secundario" tamano="sm" onClick={() => setFormularioParaCodigo(null)}>
                Cerrar
              </Boton>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: CREAR FORMULARIO WEB
         ======================================================================= */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">Nuevo Formulario Web</h3>
              <button
                onClick={() => setModalCrearAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={manejarCrearFormulario} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)] block">Nombre del Formulario</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Formulario Landing Residencial Riviera"
                  value={nuevoForm.nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNuevoForm({
                      ...nuevoForm,
                      nombre: val,
                      slug: val.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                    });
                  }}
                  className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)] block">Slug de Identificación (URL)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. contacto-riviera"
                  value={nuevoForm.slug}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, slug: e.target.value })}
                  className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)] font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)] block">Mensaje de Agradecimiento</label>
                <input
                  type="text"
                  required
                  value={nuevoForm.mensaje_exito}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, mensaje_exito: e.target.value })}
                  className="w-full h-9 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)] block">Descripción Interna</label>
                <textarea
                  rows={2}
                  placeholder="Propósito del formulario para el equipo comercial"
                  value={nuevoForm.descripcion}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, descripcion: e.target.value })}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <Boton
                  type="button"
                  variante="secundario"
                  tamano="sm"
                  onClick={() => setModalCrearAbierto(false)}
                >
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Crear Formulario
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
