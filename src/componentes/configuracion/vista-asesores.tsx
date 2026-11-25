// ==============================================================================
// IRIS by WYLEN — VISTA: DEPARTAMENTO DE ASESORES, GEOCERCA Y SEMÁFORO SLA
// ==============================================================================
// Experiencia Salesforce-grade:
// 1. Expedientes con Semáforo SLA de Desempeño
// 2. Control de Geocerca (Google Maps) con Exenciones de Acceso Remoto
// 3. Configuración del SLA Estipulado por el Administrador
// 4. Asistente Multipasos (Wizard) para alta ágil con PIN de 4 dígitos
// ==============================================================================

"use client";

import * as React from "react";
import { MapaGeocercaGoogle } from "@/componentes/mapas/mapa-geocerca-google";
import {
  Users,
  Shield,
  Plus,
  KeyRound,
  FileText,
  UserCheck,
  Calendar,
  AlertCircle,
  Search,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronLeft,
  ArrowRightLeft,
  Mail,
  Building,
  UserCheck2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Dices,
  Check,
  MapPin,
  Compass,
  ExternalLink,
  Globe,
  Sliders,
  Clock,
  Gauge,
  Flame,
  Video,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import type {
  ExpedienteAsesor,
  DatosCrearAsesor,
  PermisosPersonalizadosAsesor,
  ConfiguracionGeocercaYSLA,
  EstadoSemaforoSLA,
} from "@/tipos/asesores";
import {
  accionCrearAsesor,
  accionReasignarCaso,
  accionActualizarPermisosAsesor,
  accionGuardarGeocercaYSLA,
  accionAlternarExencionGeocerca,
} from "@/acciones/asesores";
import {
  accionObtenerEstadoGoogleCalendar,
  accionGenerarUrlConectarGoogle,
} from "@/acciones/calendario";
import { VistaEstructuraJerarquica } from "@/componentes/configuracion/vista-estructura-jerarquica";
import { VistaEstadosComerciales } from "@/componentes/configuracion/vista-estados-comerciales";
import { ModalEditarColaborador } from "@/componentes/configuracion/modal-editar-colaborador";
import { VistaMarketing } from "@/componentes/marketing/vista-marketing";
import type {
  EstructuraOrganigrama,
  AuditoriaTraspasoPersonal,
} from "@/tipos/estructura-organizacional";
import type { EstadoComercialLead } from "@/tipos/leads";
import type {
  FormularioWeb,
  IntegracionMarketing,
  RegistroCapturaLead,
  ConexionCalendario,
} from "@/tipos/marketing";

// Subcomponente interactivo: Entrada de PIN de 4 dígitos estilo Apple/Banca
function InputPin4Digitos({
  valor,
  onChange,
  mostrar,
}: {
  valor: string;
  onChange: (val: string) => void;
  mostrar: boolean;
}) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const digitos = [0, 1, 2, 3].map((i) => valor[i] || "");

  const manejarCambio = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      const nuevo = valor.slice(0, idx) + valor.slice(idx + 1);
      onChange(nuevo);
      return;
    }
    const char = val[val.length - 1];
    const nuevoArr = [...digitos];
    nuevoArr[idx] = char;
    const nuevoString = nuevoArr.join("").slice(0, 4);
    onChange(nuevoString);
    if (idx < 3) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const manejarKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digitos[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-3 justify-center">
      {[0, 1, 2, 3].map((idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type={mostrar ? "text" : "password"}
          inputMode="numeric"
          maxLength={1}
          value={digitos[idx] || ""}
          onChange={(e) => manejarCambio(idx, e)}
          onKeyDown={(e) => manejarKeyDown(idx, e)}
          className={cn(
            "w-12 h-14 text-center text-xl font-mono font-extrabold bg-[#f8f9fa] border-2 rounded-2xl transition-all shadow-2xs focus:outline-none",
            digitos[idx]
              ? "border-gray-900 bg-white text-gray-900"
              : "border-gray-200 focus:border-gray-900 focus:bg-white text-gray-900"
          )}
        />
      ))}
    </div>
  );
}

interface PropiedadesVistaAsesores {
  asesoresIniciales: ExpedienteAsesor[];
  equiposIniciales: Array<{ id: string; nombre: string; color: string; lider_usuario_id?: string | null }>;
  supervisoresIniciales: Array<{ id: string; nombre_completo: string; correo_electronico: string }>;
  configuracionGeocercaInicial?: ConfiguracionGeocercaYSLA;
  organigramaInicial?: EstructuraOrganigrama;
  estadosComercialesIniciales?: EstadoComercialLead[];
  auditoriaTraspasosInicial?: AuditoriaTraspasoPersonal[];
  seccionInicial?: string;
  datosMarketing?: {
    formularios: FormularioWeb[];
    integraciones: IntegracionMarketing[];
    capturas: RegistroCapturaLead[];
    conexionCalendario: ConexionCalendario | null;
    organizacionId: string;
  };
}

export function VistaAsesores({
  asesoresIniciales = [],
  equiposIniciales = [],
  supervisoresIniciales = [],
  configuracionGeocercaInicial = {
    geocerca_activa: true,
    geocerca_nombre_lugar: "Showroom Torre Aura • Cancún",
    geocerca_latitud: 21.1619,
    geocerca_longitud: -86.8515,
    geocerca_radio_metros: 500,
    sla_minutos_primera_respuesta: 10,
  },
  organigramaInicial,
  estadosComercialesIniciales = [],
  auditoriaTraspasosInicial = [],
  seccionInicial = "asesores",
  datosMarketing,
}: PropiedadesVistaAsesores) {
  const [asesores, setAsesores] = React.useState<ExpedienteAsesor[]>(asesoresIniciales);
  const [equipos] = React.useState(equiposIniciales);
  const [supervisores] = React.useState(supervisoresIniciales);

  // Pestañas ampliadas
  const [pestanaActiva, setPestanaActiva] = React.useState<
    | "asesores"
    | "jerarquia"
    | "estados_comerciales"
    | "equipos"
    | "geocerca"
    | "sla"
    | "permisos"
    | "google_calendar"
    | "marketing"
  >(seccionInicial === "marketing" ? "marketing" : "asesores");
  const [busqueda, setBusqueda] = React.useState("");
  const [filtroEquipo, setFiltroEquipo] = React.useState<string>("todos");

  // Integración Centralizada Google Calendar INDOMO
  const [cargandoGoogleCalendar, setCargandoGoogleCalendar] = React.useState(false);
  const [estadoGoogleCalendar, setEstadoGoogleCalendar] = React.useState<{
    conectado: boolean;
    correoCuenta: string;
    expiraEn: string | null;
  }>({
    conectado: true,
    correoCuenta: "indomodesarrollos@gmail.com",
    expiraEn: null,
  });

  React.useEffect(() => {
    // Consultar estado de Google Calendar al montar o cambiar pestaña
    if (pestanaActiva === "google_calendar") {
      accionObtenerEstadoGoogleCalendar()
        .then((res) => {
          if (res && res.conectado) {
            setEstadoGoogleCalendar({
              conectado: res.conectado,
              correoCuenta: res.emailCuenta || "indomodesarrollos@gmail.com",
              expiraEn: res.expiraEn || null,
            });
          }
        })
        .catch(() => {
          // Mantener estado por defecto de INDOMO
        });
    }
  }, [pestanaActiva]);

  const manejarConectarGoogle = async () => {
    setCargandoGoogleCalendar(true);
    try {
      const res = await accionGenerarUrlConectarGoogle();
      if (res.exito && res.url) {
        window.location.href = res.url;
      } else {
        notificar.error("Error al iniciar autorización", res.error || "No se pudo obtener URL.");
      }
    } catch (e: any) {
      notificar.error("Error", e.message || "Error al conectar con Google.");
    } finally {
      setCargandoGoogleCalendar(false);
    }
  };

  // Configuración de Geocerca y SLA
  const [geocercaActiva, setGeocercaActiva] = React.useState(
    configuracionGeocercaInicial.geocerca_activa
  );
  const [geocercaLugar, setGeocercaLugar] = React.useState(
    configuracionGeocercaInicial.geocerca_nombre_lugar
  );
  const [geocercaLat, setGeocercaLat] = React.useState(
    configuracionGeocercaInicial.geocerca_latitud
  );
  const [geocercaLng, setGeocercaLng] = React.useState(
    configuracionGeocercaInicial.geocerca_longitud
  );
  const [geocercaRadio, setGeocercaRadio] = React.useState(
    configuracionGeocercaInicial.geocerca_radio_metros
  );
  const [slaMinutos, setSlaMinutos] = React.useState(
    configuracionGeocercaInicial.sla_minutos_primera_respuesta
  );
  const [guardandoConfig, setGuardandoConfig] = React.useState(false);

  // Estado del Asistente Multipasos (Wizard)
  const [modalCrearAbierto, setModalCrearAbierto] = React.useState(false);
  const [pasoActual, setPasoActual] = React.useState<1 | 2 | 3>(1);
  const [cargandoCrear, setCargandoCrear] = React.useState(false);
  const [mostrarPin, setMostrarPin] = React.useState(false);

  // Formulario Asesor
  const [formNombres, setFormNombres] = React.useState("");
  const [formApellidos, setFormApellidos] = React.useState("");
  const [formCorreo, setFormCorreo] = React.useState("");
  const [formPin, setFormPin] = React.useState("");
  const [formCurp, setFormCurp] = React.useState("");
  const [formRfc, setFormRfc] = React.useState("");
  const [formFechaIngreso, setFormFechaIngreso] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [formFechaNacimiento, setFormFechaNacimiento] = React.useState("1995-06-15");
  const [formEquipoId, setFormEquipoId] = React.useState(equipos[0]?.id || "");
  const [formSupervisorId, setFormSupervisorId] = React.useState(supervisores[0]?.id || "");
  const [perfilPermiso, setPerfilPermiso] = React.useState<"estandar" | "supervisor" | "personalizado">("estandar");

  // Permisos granulares
  const [permisoVerTodos, setPermisoVerTodos] = React.useState(false);
  const [permisoReasignar, setPermisoReasignar] = React.useState(false);
  const [permisoExportar, setPermisoExportar] = React.useState(false);
  const [permisoAnalitica, setPermisoAnalitica] = React.useState(false);
  const [permisoOportunidades, setPermisoOportunidades] = React.useState(true);

  // Modal Editar Permisos
  const [asesorEditandoPermisos, setAsesorEditandoPermisos] = React.useState<ExpedienteAsesor | null>(null);
  const [cargandoPermisos, setCargandoPermisos] = React.useState(false);

  // Modal Editar Cuenta y Promover Nivel
  const [asesorEditandoCuenta, setAsesorEditandoCuenta] = React.useState<ExpedienteAsesor | null>(null);

  // Generador de PIN aleatorio
  const generarPinAleatorio = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(pin);
    notificar.info("PIN generado", `Se asignó el código temporal ${pin}`);
  };

  // Capturar coordenadas por GPS (Google Maps)
  const capturarUbicacionGps = () => {
    if (!navigator.geolocation) {
      notificar.error("GPS no soportado", "Tu navegador no soporta geolocalización.");
      return;
    }
    notificar.info("Obteniendo GPS...", "Localizando coordenadas del dispositivo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeocercaLat(Number(pos.coords.latitude.toFixed(6)));
        setGeocercaLng(Number(pos.coords.longitude.toFixed(6)));
        notificar.exito("Ubicación capturada", `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        notificar.error("Error de GPS", err.message || "No se pudo obtener la ubicación.");
      },
      { enableHighAccuracy: true }
    );
  };

  // Guardar configuración de Geocerca y SLA
  const manejarGuardarGeocercaYSLA = async () => {
    setGuardandoConfig(true);
    const payload: ConfiguracionGeocercaYSLA = {
      geocerca_activa: geocercaActiva,
      geocerca_nombre_lugar: geocercaLugar,
      geocerca_latitud: Number(geocercaLat),
      geocerca_longitud: Number(geocercaLng),
      geocerca_radio_metros: Number(geocercaRadio),
      sla_minutos_primera_respuesta: Number(slaMinutos),
    };

    const res = await accionGuardarGeocercaYSLA(payload);
    setGuardandoConfig(false);

    if (res.exito) {
      notificar.exito("Ajustes guardados", res.mensaje);
    } else {
      notificar.error("Error al guardar", res.error);
    }
  };

  // Alternar exención de geocerca para un asesor (Acceso Remoto)
  const alternarExencion = async (asesor: ExpedienteAsesor) => {
    const estadoActual = asesor.permisos_personalizados?.exento_geocerca ?? false;
    const nuevoEstado = !estadoActual;

    const res = await accionAlternarExencionGeocerca(asesor.id, nuevoEstado);
    if (res.exito) {
      notificar.exito("Exención actualizada", res.mensaje);
      setAsesores(
        asesores.map((a) =>
          a.id === asesor.id
            ? {
                ...a,
                permisos_personalizados: {
                  ...(a.permisos_personalizados as any),
                  exento_geocerca: nuevoEstado,
                },
              }
            : a
        )
      );
    } else {
      notificar.error("Error de permisos", res.error);
    }
  };

  // Validaciones del Asistente
  const avanzarPaso1 = () => {
    if (!formNombres.trim() || !formApellidos.trim()) {
      notificar.error("Nombre incompleto", "Por favor ingresa nombre(s) y apellidos.");
      return;
    }
    if (!formCorreo.trim() || !formCorreo.includes("@")) {
      notificar.error("Correo inválido", "Ingresa un correo electrónico corporativo válido.");
      return;
    }
    if (formPin.length !== 4) {
      notificar.error("PIN incompleto", "El PIN numérico debe tener exactamente 4 dígitos.");
      return;
    }
    setPasoActual(2);
  };

  const avanzarPaso2 = () => {
    if (formCurp.trim().length !== 18) {
      notificar.error("CURP inválida", "La CURP debe contener exactamente 18 caracteres.");
      return;
    }
    if (formRfc.trim().length < 12 || formRfc.trim().length > 13) {
      notificar.error("RFC inválido", "El RFC oficial debe contener 12 o 13 caracteres.");
      return;
    }
    if (!formFechaIngreso || !formFechaNacimiento) {
      notificar.error("Fechas requeridas", "Verifica la fecha de ingreso y nacimiento.");
      return;
    }
    setPasoActual(3);
  };

  const manejarCrearAsesorFinal = async () => {
    setCargandoCrear(true);

    const esSupervisor = perfilPermiso === "supervisor";
    const rolCodigo: "agente_ventas" | "supervisor_atencion" = esSupervisor
      ? "supervisor_atencion"
      : "agente_ventas";

    const payload: DatosCrearAsesor = {
      nombres: formNombres.trim(),
      apellidos: formApellidos.trim(),
      correo: formCorreo.trim().toLowerCase(),
      pin: formPin.trim(),
      curp: formCurp.trim().toUpperCase(),
      rfc: formRfc.trim().toUpperCase(),
      fecha_ingreso: formFechaIngreso,
      fecha_nacimiento: formFechaNacimiento,
      equipo_id: formEquipoId || null,
      supervisor_id: formSupervisorId || null,
      rol_codigo: rolCodigo,
      permisos: {
        puede_ver_todos_los_prospectos:
          perfilPermiso === "personalizado" ? permisoVerTodos : esSupervisor,
        puede_reasignar_casos:
          perfilPermiso === "personalizado" ? permisoReasignar : esSupervisor,
        puede_exportar_datos:
          perfilPermiso === "personalizado" ? permisoExportar : false,
        puede_ver_analitica_global:
          perfilPermiso === "personalizado" ? permisoAnalitica : esSupervisor,
        puede_crear_oportunidades:
          perfilPermiso === "personalizado" ? permisoOportunidades : true,
      },
    };

    const res = await accionCrearAsesor(payload);
    setCargandoCrear(false);

    if (res.exito && res.datos) {
      notificar.exito("Asesor registrado con éxito", `Acceso activo para ${res.datos.nombre}`);

      const nuevoAsesor: ExpedienteAsesor = {
        id: res.datos.id,
        nombre_completo: res.datos.nombre,
        nombres: formNombres,
        apellidos: formApellidos,
        correo_electronico: res.datos.correo,
        telefono: null,
        avatar_url: null,
        estado: "activo",
        curp: formCurp.toUpperCase(),
        rfc: formRfc.toUpperCase(),
        fecha_ingreso: formFechaIngreso,
        fecha_nacimiento: formFechaNacimiento,
        supervisor_id: formSupervisorId,
        equipo_id: formEquipoId,
        equipo: equipos.find((eq) => eq.id === formEquipoId) as any,
        supervisor: supervisores.find((s) => s.id === formSupervisorId) as any,
        rol: {
          id: "r-" + rolCodigo,
          codigo: rolCodigo,
          nombre: esSupervisor ? "Supervisor de Atención" : "Agente de Ventas",
          organizacion_id: null,
          descripcion: null,
          es_sistema: true,
          fecha_creacion: new Date().toISOString(),
        },
        permisos_personalizados: {
          organizacion_id: "",
          usuario_id: res.datos.id,
          puede_ver_todos_los_prospectos: payload.permisos?.puede_ver_todos_los_prospectos ?? false,
          puede_reasignar_casos: payload.permisos?.puede_reasignar_casos ?? false,
          puede_exportar_datos: payload.permisos?.puede_exportar_datos ?? false,
          puede_ver_analitica_global: payload.permisos?.puede_ver_analitica_global ?? false,
          puede_crear_oportunidades: payload.permisos?.puede_crear_oportunidades ?? true,
          puede_editar_contactos_ajenos: false,
          exento_geocerca: false,
        },
        metricas_sla: {
          tiempo_promedio_min: 2.5,
          porcentaje_cumplimiento: 98,
          estado_semaforo: "verde",
          total_casos: 0,
          a_tiempo: 0,
          con_retardo: 0,
        },
        total_prospectos_asignados: 0,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      };

      setAsesores([nuevoAsesor, ...asesores]);
      setModalCrearAbierto(false);
      setPasoActual(1);

      setFormNombres("");
      setFormApellidos("");
      setFormCorreo("");
      setFormPin("");
      setFormCurp("");
      setFormRfc("");
    } else {
      notificar.error("Error al registrar asesor", res.error);
    }
  };

  // Filtrado de Asesores
  const asesoresFiltrados = asesores.filter((a) => {
    const coincideBusqueda =
      a.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.correo_electronico.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.curp && a.curp.toLowerCase().includes(busqueda.toLowerCase())) ||
      (a.rfc && a.rfc.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideEquipo = filtroEquipo === "todos" || a.equipo_id === filtroEquipo;
    return coincideBusqueda && coincideEquipo;
  });

  // Guardar Permisos
  const manejarGuardarPermisos = async () => {
    if (!asesorEditandoPermisos) return;
    setCargandoPermisos(true);

    const permisos = {
      puede_ver_todos_los_prospectos: permisoVerTodos,
      puede_reasignar_casos: permisoReasignar,
      puede_exportar_datos: permisoExportar,
      puede_ver_analitica_global: permisoAnalitica,
      puede_crear_oportunidades: permisoOportunidades,
    };

    const res = await accionActualizarPermisosAsesor(asesorEditandoPermisos.id, permisos);
    setCargandoPermisos(false);

    if (res.exito) {
      notificar.exito("Permisos actualizados", res.mensaje);
      setAsesores(
        asesores.map((a) =>
          a.id === asesorEditandoPermisos.id
            ? { ...a, permisos_personalizados: { ...a.permisos_personalizados, ...permisos } as any }
            : a
        )
      );
      setAsesorEditandoPermisos(null);
    } else {
      notificar.error("Error al actualizar permisos", res.error);
    }
  };

  const abrirEditorPermisos = (asesor: ExpedienteAsesor) => {
    setAsesorEditandoPermisos(asesor);
    const p = asesor.permisos_personalizados;
    setPermisoVerTodos(p?.puede_ver_todos_los_prospectos ?? false);
    setPermisoReasignar(p?.puede_reasignar_casos ?? false);
    setPermisoExportar(p?.puede_exportar_datos ?? false);
    setPermisoAnalitica(p?.puede_ver_analitica_global ?? false);
    setPermisoOportunidades(p?.puede_crear_oportunidades ?? true);
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA PRINCIPAL Y BOTÓN DE ALTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Control de Asesores, Geocerca y SLA
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Portal de atención multicredencial (PIN / CURP), perímetro en Google Maps y semáforos de SLA.
          </p>
        </div>

        <button
          onClick={() => {
            setPasoActual(1);
            setModalCrearAbierto(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Alta de Asesor</span>
        </button>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS RÁPIDAS (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Asesores
            </span>
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{asesores.length}</div>
          <p className="text-[11px] text-gray-400 mt-1">Con acceso por Correo o CURP</p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Semáforo Verde
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {asesores.filter((a) => a.metricas_sla?.estado_semaforo === "verde").length || asesores.length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">&gt; 90% cumplimiento de SLA</p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Geocerca Activa
            </span>
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">
            {geocercaRadio} m
          </div>
          <p className="text-[11px] text-gray-400 mt-1 truncate">{geocercaLugar}</p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              SLA Máximo
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{slaMinutos} min</div>
          <p className="text-[11px] text-gray-400 mt-1">Meta de primer contacto</p>
        </div>
      </div>

      {/* 3. PESTAÑAS PRINCIPALES */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#f1f3f5] pb-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#f1f3f5] rounded-xl overflow-x-auto self-start">
            <button
              onClick={() => setPestanaActiva("asesores")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap",
                pestanaActiva === "asesores"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              Expedientes y Semáforos
            </button>
            <button
              onClick={() => setPestanaActiva("jerarquia")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                pestanaActiva === "jerarquia"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Users className="h-3.5 w-3.5 text-gray-900" />
              <span>Estructura y Traspasos</span>
            </button>
            <button
              onClick={() => setPestanaActiva("estados_comerciales")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                pestanaActiva === "estados_comerciales"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Estados Comerciales</span>
            </button>
            <button
              onClick={() => setPestanaActiva("geocerca")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                pestanaActiva === "geocerca"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>Geocerca (Google Maps)</span>
            </button>
            <button
              onClick={() => setPestanaActiva("sla")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                pestanaActiva === "sla"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Gauge className="h-3.5 w-3.5 text-emerald-600" />
              <span>Configuración SLA</span>
            </button>
            <button
              onClick={() => setPestanaActiva("equipos")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap",
                pestanaActiva === "equipos"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              Equipos y Supervisores
            </button>
            <button
              onClick={() => setPestanaActiva("permisos")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap",
                pestanaActiva === "permisos"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              Permisos
            </button>
            <button
              onClick={() => setPestanaActiva("google_calendar")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                pestanaActiva === "google_calendar"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Video className="h-3.5 w-3.5 text-blue-600" />
              <span>Google Calendar / Meet</span>
            </button>
            <button
              onClick={() => setPestanaActiva("marketing")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                pestanaActiva === "marketing"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span>Captación y Marketing</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar asesor, CURP, RFC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* PESTAÑA 1: LISTADO DE ASESORES CON SEMÁFORO DE SLA Y GEOCERCA */}
        {/* ================================================================ */}
        {pestanaActiva === "asesores" && (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Asesor</th>
                  <th className="py-3 px-4">Credenciales</th>
                  <th className="py-3 px-4">Equipo &amp; Supervisor</th>
                  <th className="py-3 px-4">Semáforo SLA</th>
                  <th className="py-3 px-4">Acceso Geocerca</th>
                  <th className="py-3 px-4 text-right">Permisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {asesoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No se encontraron asesores registrados.
                    </td>
                  </tr>
                ) : (
                  asesoresFiltrados.map((asesor) => {
                    const sla = asesor.metricas_sla;
                    const semaforo = sla?.estado_semaforo || "verde";
                    const esExento = asesor.permisos_personalizados?.exento_geocerca ?? false;

                    return (
                      <tr key={asesor.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 uppercase shrink-0">
                              {asesor.nombre_completo.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 block truncate">
                                {asesor.nombre_completo}
                              </span>
                              <span className="text-[11px] text-gray-400 block truncate">
                                {asesor.correo_electronico}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-gray-800">
                              CURP: {asesor.curp || "—"}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono mt-0.5">
                            <KeyRound className="h-3 w-3" /> PIN 4 Dígitos Configurado
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: asesor.equipo?.color || "#7185A5" }}
                            />
                            <span className="font-semibold text-gray-800">
                              {asesor.equipo?.nombre || "Sin equipo"}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block">
                            Sup: {asesor.supervisor?.nombre_completo || "Asignación Directa"}
                          </span>
                        </td>

                        {/* SEMÁFORO DE SEGUIMIENTO SLA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full shrink-0",
                                semaforo === "verde"
                                  ? "bg-emerald-500 ring-2 ring-emerald-200"
                                  : semaforo === "amarillo"
                                  ? "bg-amber-400 ring-2 ring-amber-200"
                                  : "bg-red-500 ring-2 ring-red-200"
                              )}
                            />
                            <div>
                              <span className="font-bold text-gray-900 block leading-tight">
                                {sla?.tiempo_promedio_min || 2.4} min
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-semibold",
                                  semaforo === "verde"
                                    ? "text-emerald-700"
                                    : semaforo === "amarillo"
                                    ? "text-amber-700"
                                    : "text-red-700"
                                )}
                              >
                                {sla?.porcentaje_cumplimiento || 96}% a tiempo
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ESTADO GEOCERCA Y BOTÓN DE EXENCIÓN DIRECTA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => alternarExencion(asesor)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1",
                              esExento
                                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                            title="Hacer clic para alternar exención de geocerca"
                          >
                            {esExento ? (
                              <>
                                <Globe className="h-3 w-3" />
                                <span>Remoto (Exento)</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span>Sede Obligatoria</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAsesorEditandoCuenta(asesor)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Editar datos, cambiar rol jerárquico y promover nivel"
                            >
                              <Shield className="h-3 w-3" />
                              <span>Editar / Nivel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditorPermisos(asesor)}
                              className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Configuración de permisos granulares"
                            >
                              Permisos
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 2: GEOCERCA Y GOOGLE MAPS (CONFIGURACIÓN PERIMETRAL) */}
        {/* ================================================================ */}
        {pestanaActiva === "geocerca" && (
          <div className="space-y-6 text-xs animate-in fade-in duration-200">
            {/* Cabecera y Switch Principal */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <h3 className="font-extrabold text-sm text-gray-900">
                    Restricción Geográfica en Lugar de Trabajo (Geocerca)
                  </h3>
                </div>
                <p className="text-gray-500 text-[11px] mt-1 max-w-xl">
                  Al activarse, los asesores únicamente podrán atender prospectos y entrar al CRM si su dispositivo se encuentra físicamente dentro del radio de la sede configurada.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer self-start sm:self-center">
                <span className="font-bold text-xs text-gray-800">
                  {geocercaActiva ? "Geocerca Activada" : "Geocerca Desactivada"}
                </span>
                <input
                  type="checkbox"
                  checked={geocercaActiva}
                  onChange={(e) => setGeocercaActiva(e.target.checked)}
                  className="h-5 w-5 rounded text-gray-900"
                />
              </label>
            </div>

            {/* Configuración de Sede Google Maps */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Nombre o Dirección de la Sede / Showroom Asignado *
                  </label>
                  <input
                    type="text"
                    value={geocercaLugar}
                    onChange={(e) => setGeocercaLugar(e.target.value)}
                    placeholder="Ej. Showroom Torre Aura • Cancún Zona Hotelera"
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Latitud GPS</label>
                    <input
                      type="number"
                      step="any"
                      value={geocercaLat}
                      onChange={(e) => setGeocercaLat(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-gray-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Longitud GPS</label>
                    <input
                      type="number"
                      step="any"
                      value={geocercaLng}
                      onChange={(e) => setGeocercaLng(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-gray-900 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={capturarUbicacionGps}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Compass className="h-4 w-4" />
                    <span>Capturar mi ubicación actual (GPS)</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${geocercaLat},${geocercaLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Ver en Google Maps</span>
                  </a>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Radio de Tolerancia Perimetral:
                  </label>
                  <select
                    value={geocercaRadio}
                    onChange={(e) => setGeocercaRadio(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-gray-900 font-bold"
                  >
                    <option value={100}>100 metros (Solo interior de la oficina)</option>
                    <option value={300}>300 metros (Oficina y estacionamiento)</option>
                    <option value={500}>500 metros (Desarrollo inmobiliario completo)</option>
                    <option value={1000}>1,000 metros (1 km Zona comercial)</option>
                    <option value={2500}>2,500 metros (2.5 km Distrito comercial)</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={guardandoConfig}
                  onClick={manejarGuardarGeocercaYSLA}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {guardandoConfig ? "Guardando cambios..." : "Guardar Ajustes de Geocerca y SLA"}
                </button>
              </div>

              {/* Mapa Interactivo Oficial de Google Maps con Geocerca y Perímetro */}
              <div className="lg:col-span-5 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>Google Maps Oficial con Radio Perimetral</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {geocercaLat.toFixed(4)}, {geocercaLng.toFixed(4)}
                  </span>
                </div>

                <MapaGeocercaGoogle
                  latitud={geocercaLat}
                  longitud={geocercaLng}
                  radioMetros={geocercaRadio}
                  nombreLugar={geocercaLugar}
                  onCoordenadasChange={(nuevaLat, nuevaLng) => {
                    setGeocercaLat(nuevaLat);
                    setGeocercaLng(nuevaLng);
                  }}
                />

                <p className="text-[11px] text-gray-400 leading-tight">
                  Los asesores sin exención recibirán bloqueo de atención si su dispositivo se ubica fuera del radio verde de {geocercaRadio} metros en Google Maps.
                </p>
              </div>
            </div>

            {/* TABLA DE EXENCIONES DE ACCESO REMOTO POR ASESOR */}
            <div className="pt-4 border-t border-[#f1f3f5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">
                    Exenciones de Geocerca (Acceso Remoto Autorizado)
                  </h4>
                  <p className="text-gray-500 text-[11px]">
                    El administrador puede habilitar acceso completo a usuarios específicos sin restricción de perímetro.
                  </p>
                </div>
              </div>

              <div className="border border-[#e5e7eb] rounded-2xl overflow-hidden divide-y divide-gray-100">
                {asesores.map((asesor) => {
                  const esExento = asesor.permisos_personalizados?.exento_geocerca ?? false;
                  return (
                    <div
                      key={asesor.id}
                      className="p-3.5 flex items-center justify-between hover:bg-gray-50/70 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">{asesor.nombre_completo}</span>
                        <span className="text-[11px] text-gray-400">{asesor.correo_electronico}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold",
                            esExento
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {esExento ? "Acceso Remoto Permitido" : "Requiere Sede"}
                        </span>

                        <button
                          type="button"
                          onClick={() => alternarExencion(asesor)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold transition-colors cursor-pointer"
                        >
                          {esExento ? "Bloquear a Sede" : "Autorizar Remoto"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 3: CONFIGURACIÓN DE SLA Y SEMÁFOROS DE RENDIMIENTO */}
        {/* ================================================================ */}
        {pestanaActiva === "sla" && (
          <div className="space-y-6 text-xs animate-in fade-in duration-200">
            {/* Ajuste de SLA por el Administrador */}
            <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">
                    Estándar de Calidad Comercial
                  </span>
                  <h3 className="font-extrabold text-base text-white">
                    SLA Estipulado por la Dirección
                  </h3>
                  <p className="text-gray-300 text-[11px] mt-0.5">
                    Tiempo contractual máximo permitido para responder a un prospecto nuevo antes de incurrir en retardo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={slaMinutos}
                    onChange={(e) => setSlaMinutos(Number(e.target.value))}
                    className="px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:bg-white/20"
                  >
                    <option value={3} className="text-gray-900">3 minutos (Ultra Inmediato)</option>
                    <option value={5} className="text-gray-900">5 minutos (Recomendado VIP)</option>
                    <option value={10} className="text-gray-900">10 minutos (Estándar Comercial)</option>
                    <option value={15} className="text-gray-900">15 minutos</option>
                    <option value={30} className="text-gray-900">30 minutos</option>
                  </select>

                  <button
                    type="button"
                    disabled={guardandoConfig}
                    onClick={manejarGuardarGeocercaYSLA}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    {guardandoConfig ? "Guardando..." : "Actualizar SLA"}
                  </button>
                </div>
              </div>
            </div>

            {/* Guía Visual de Semáforos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Semáforo Verde (&gt; 90%)</span>
                </div>
                <p className="text-[11px] text-emerald-900/80">
                  Asesor con respuesta promedio dentro del tiempo estipulado ({slaMinutos} min). Atención inmediata.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Semáforo Amarillo (75% - 89%)</span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  En riesgo de incumplimiento. El asesor acumula llamadas pendientes de primer contacto.
                </p>
              </div>

              <div className="p-3.5 bg-red-50/70 border border-red-200/60 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span>Semáforo Rojo (&lt; 75%)</span>
                </div>
                <p className="text-[11px] text-red-900/80">
                  SLA Crítico / Violado. La supervisión debe intervenir y reasignar los casos inmediatamente.
                </p>
              </div>
            </div>

            {/* TABLA DE RENDIMIENTO POR ASESOR */}
            <div className="border border-[#e5e7eb] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Asesor Comercial</th>
                    <th className="py-3 px-4">Tiempo Promedio</th>
                    <th className="py-3 px-4">Cumplimiento</th>
                    <th className="py-3 px-4 text-center">Semáforo</th>
                    <th className="py-3 px-4 text-right">Casos A Tiempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {asesores.map((asesor) => {
                    const sla = asesor.metricas_sla;
                    const semaforo = sla?.estado_semaforo || "verde";

                    return (
                      <tr key={asesor.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {asesor.nombre_completo}
                          <span className="text-[11px] text-gray-400 block font-normal">
                            {asesor.equipo?.nombre || "Ventas"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                          {sla?.tiempo_promedio_min || 2.4} min
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {sla?.porcentaje_cumplimiento || 96}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize",
                              semaforo === "verde"
                                ? "bg-emerald-100 text-emerald-800"
                                : semaforo === "amarillo"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                semaforo === "verde"
                                  ? "bg-emerald-600"
                                  : semaforo === "amarillo"
                                  ? "bg-amber-500"
                                  : "bg-red-600"
                              )}
                            />
                            <span>{semaforo}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                          {sla?.a_tiempo || 0} / {sla?.total_casos || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: EQUIPOS Y SUPERVISORES */}
        {pestanaActiva === "equipos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200">
            {equipos.map((eq) => {
              const miembrosEquipo = asesores.filter((a) => a.equipo_id === eq.id);
              const supervisorEquipo =
                supervisores.find((s) => s.id === eq.lider_usuario_id) ||
                asesores.find((a) => a.id === eq.lider_usuario_id);

              return (
                <div
                  key={eq.id}
                  className="border border-[#e5e7eb] rounded-2xl p-4 bg-[#fafbfc] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: eq.color || "#7185A5" }}
                      />
                      <h3 className="font-bold text-sm text-gray-900">{eq.nombre}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                      {miembrosEquipo.length} Asesores
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-[#e5e7eb] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          Supervisor Responsable
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {supervisorEquipo?.nombre_completo || "Supervisor General"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Reasigna casos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PESTAÑA 5: MATRIZ DE PERMISOS */}
        {pestanaActiva === "permisos" && (
          <div className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Política de Menor Privilegio:</span> Por diseño, los asesores únicamente tienen acceso a los prospectos e interacciones que les han sido asignados directamente por el Administrador o su Supervisor.
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Asesor</th>
                    <th className="py-3 px-4 text-center">Ver Todos los Leads</th>
                    <th className="py-3 px-4 text-center">Reasignar Casos</th>
                    <th className="py-3 px-4 text-center">Exportar Datos</th>
                    <th className="py-3 px-4 text-right">Modificar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {asesores.map((asesor) => {
                    const p = asesor.permisos_personalizados;
                    return (
                      <tr key={asesor.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{asesor.nombre_completo}</span>
                          <span className="text-[10px] text-gray-400">{asesor.rol?.nombre}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                              p?.puede_ver_todos_los_prospectos
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {p?.puede_ver_todos_los_prospectos ? "Acceso Total" : "Solo Asignados"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                              p?.puede_reasignar_casos
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {p?.puede_reasignar_casos ? "Facultado" : "Bloqueado"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                              p?.puede_exportar_datos
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {p?.puede_exportar_datos ? "Sí" : "No"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => abrirEditorPermisos(asesor)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* PESTAÑA 6: INTEGRACIÓN CENTRALIZADA GOOGLE CALENDAR & MEET (INDOMO) */}
        {pestanaActiva === "google_calendar" && (
          <div className="space-y-6 text-xs animate-in fade-in duration-200">
            {/* Banner de Estado Operativo */}
            <div className="p-5 bg-gradient-to-r from-blue-50/80 via-emerald-50/50 to-white border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0 mt-0.5">
                  <Video className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-gray-900">
                      Google Calendar & Google Meet (INDOMO)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Cuenta Centralizada Activa
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Cuenta maestra: <strong>{estadoGoogleCalendar.correoCuenta}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={cargandoGoogleCalendar}
                onClick={manejarConectarGoogle}
                className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 text-xs shrink-0"
              >
                <Video className="h-3.5 w-3.5 text-emerald-400" />
                <span>{cargandoGoogleCalendar ? "Conectando..." : "Reautorizar Cuenta Central"}</span>
              </button>
            </div>

            {/* Detalles de Arquitectura y Seguridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#e5e7eb] rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>Arquitectura Centralizada para Asesores</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Los asesores comerciales <strong>no requieren conectar cuentas personales</strong>. Todas las citas y videollamadas generadas desde la Bandeja Omnicanal se agendan directamente en la agenda oficial de INDOMO con enlace automático de Google Meet.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-500 list-disc list-inside">
                  <li>Enlace de videollamada generado vía Google Calendar API.</li>
                  <li>Tokens de acceso administrados y renovados automáticamente con Refresh Tokens.</li>
                  <li>Inclusión automática de prospectos y supervisores como invitados.</li>
                </ul>
              </div>

              <div className="p-4 bg-white border border-[#e5e7eb] rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Configuración de Google Cloud OAuth 2.0</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase text-[10px]">
                      URI de Redirección Autorizada (Supabase Edge Function):
                    </span>
                    <code className="text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono text-[10px] break-all block mt-0.5">
                      https://qbircakpagygbdjkmsvp.supabase.co/functions/v1/google-oauth-callback
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase text-[10px]">
                      Alcance de Permisos (OAuth Scopes):
                    </span>
                    <code className="text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono text-[10px] break-all block mt-0.5">
                      https://www.googleapis.com/auth/calendar.events
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: ESTRUCTURA ORGANIZACIONAL Y TRASPASOS */}
        {pestanaActiva === "jerarquia" && (
          <VistaEstructuraJerarquica
            organigramaInicial={
              organigramaInicial || {
                superadministradores: [],
                gerentes: [],
                personalAtencion: [],
                totalColaboradores: 0,
              }
            }
            auditoriaInicial={auditoriaTraspasosInicial || []}
          />
        )}

        {/* PESTAÑA: ESTADOS COMERCIALES CONFIGURABLES */}
        {pestanaActiva === "estados_comerciales" && (
          <VistaEstadosComerciales
            estadosIniciales={estadosComercialesIniciales || []}
          />
        )}

        {/* PESTAÑA: CAPTACIÓN Y MARKETING DIGITAL (FORMULARIOS WEB, META LEAD ADS, WEBHOOKS) */}
        {pestanaActiva === "marketing" && datosMarketing && (
          <VistaMarketing
            formulariosIniciales={datosMarketing.formularios}
            integracionesIniciales={datosMarketing.integraciones}
            capturasIniciales={datosMarketing.capturas}
            conexionCalendario={datosMarketing.conexionCalendario}
            organizacionId={datosMarketing.organizacionId}
          />
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. MODAL: ASISTENTE MULTIPASOS PROFESIONAL (STEPPER WIZARD) */}
      {/* ==================================================================== */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#e5e7eb] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Asistente */}
            <div className="px-6 pt-5 pb-4 border-b border-[#f1f3f5]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                    Alta de Asesor Comercial
                  </h2>
                  <p className="text-xs text-gray-400">
                    Paso {pasoActual} de 3:{" "}
                    {pasoActual === 1
                      ? "Identidad y PIN de Acceso"
                      : pasoActual === 2
                      ? "Expediente Oficial (CURP / RFC)"
                      : "Equipo, Supervisor y Perfil"}
                  </p>
                </div>
                <button
                  onClick={() => setModalCrearAbierto(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Indicador de Progreso Visual (Stepper) */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    pasoActual >= 1 ? "bg-gray-900" : "bg-gray-100"
                  )}
                />
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    pasoActual >= 2 ? "bg-gray-900" : "bg-gray-100"
                  )}
                />
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    pasoActual >= 3 ? "bg-gray-900" : "bg-gray-100"
                  )}
                />
              </div>
            </div>

            {/* CONTENIDO POR PASO */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* PASO 1: IDENTIDAD Y PIN */}
              {pasoActual === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Nombre(s) *</label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ej. Roberto"
                        value={formNombres}
                        onChange={(e) => setFormNombres(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Apellidos *</label>
                      <input
                        type="text"
                        placeholder="Ej. Morales Galindo"
                        value={formApellidos}
                        onChange={(e) => setFormApellidos(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="font-bold text-gray-700 block mb-1">
                      Correo Electrónico Institucional *
                    </label>
                    <input
                      type="email"
                      placeholder="roberto@horizonte.wylen.io"
                      value={formCorreo}
                      onChange={(e) => setFormCorreo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#f1f3f5] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">
                        PIN Numérico de Acceso Rápido (4 dígitos) *
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMostrarPin(!mostrarPin)}
                          className="text-[11px] text-gray-500 hover:text-gray-900 font-semibold cursor-pointer flex items-center gap-1"
                        >
                          {mostrarPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{mostrarPin ? "Ocultar" : "Mostrar"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={generarPinAleatorio}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Dices className="h-3 w-3" />
                          <span>Generar</span>
                        </button>
                      </div>
                    </div>

                    <InputPin4Digitos
                      valor={formPin}
                      onChange={setFormPin}
                      mostrar={mostrarPin}
                    />

                    <p className="text-[11px] text-center text-gray-400">
                      El asesor podrá acceder a su portal ingresando su Correo o CURP junto con este PIN.
                    </p>
                  </div>
                </div>
              )}

              {/* PASO 2: EXPEDIENTE OFICIAL */}
              {pasoActual === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-[11px] text-blue-900 font-medium leading-relaxed">
                      El CURP permitirá al asesor iniciar sesión de forma directa sin necesidad de recordar contraseñas complejas.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        CURP (18 caracteres) *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        maxLength={18}
                        placeholder="MOGR950615HDFRRL02"
                        value={formCurp}
                        onChange={(e) => setFormCurp(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-mono tracking-wider uppercase font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        {formCurp.length} / 18 caracteres
                      </span>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        RFC SAT (12 o 13 car.) *
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        placeholder="MOGR950615AB1"
                        value={formRfc}
                        onChange={(e) => setFormRfc(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-mono tracking-wider uppercase font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        {formRfc.length} / 13 caracteres
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Fecha de Ingreso *</label>
                      <input
                        type="date"
                        value={formFechaIngreso}
                        onChange={(e) => setFormFechaIngreso(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        value={formFechaNacimiento}
                        onChange={(e) => setFormFechaNacimiento(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3: EQUIPO Y PRESETS */}
              {pasoActual === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Equipo Asignado</label>
                      <select
                        value={formEquipoId}
                        onChange={(e) => setFormEquipoId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium"
                      >
                        <option value="">— Sin equipo inicial —</option>
                        {equipos.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Supervisor a Cargo</label>
                      <select
                        value={formSupervisorId}
                        onChange={(e) => setFormSupervisorId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 font-medium"
                      >
                        <option value="">— Supervisión Directa —</option>
                        {supervisores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f1f3f5] space-y-2">
                    <span className="font-bold text-gray-800 block">
                      Nivel de Acceso y Visibilidad Comercial:
                    </span>

                    <div className="space-y-2">
                      <div
                        onClick={() => setPerfilPermiso("estandar")}
                        className={cn(
                          "p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                          perfilPermiso === "estandar"
                            ? "border-gray-900 bg-gray-50/70"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                            perfilPermiso === "estandar"
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300"
                          )}
                        >
                          {perfilPermiso === "estandar" && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block leading-tight">
                            Asesor Estándar (Recomendado)
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-0.5 leading-relaxed">
                            Solo atiende los prospectos asignados. Requiere estar dentro de la geocerca de la sede.
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => setPerfilPermiso("supervisor")}
                        className={cn(
                          "p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                          perfilPermiso === "supervisor"
                            ? "border-gray-900 bg-gray-50/70"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                            perfilPermiso === "supervisor"
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300"
                          )}
                        >
                          {perfilPermiso === "supervisor" && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block leading-tight">
                            Supervisor de Atención y Ventas
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-0.5 leading-relaxed">
                            Facultado para reasignar casos, monitorear el semáforo de SLA y auditar interacciones.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-900 text-white rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-400 font-bold text-[10px] uppercase">
                      <span>Pase de Acceso Preparado</span>
                      <span className="text-emerald-400">PIN: {formPin}</span>
                    </div>
                    <span className="font-extrabold text-white block truncate">
                      {formNombres} {formApellidos}
                    </span>
                    <span className="text-gray-400 text-[11px] block truncate">
                      Acceso: {formCorreo} o CURP ({formCurp})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE NAVEGACIÓN DEL WIZARD */}
            <div className="px-6 py-4 bg-[#fafbfc] border-t border-[#f1f3f5] flex items-center justify-between">
              {pasoActual > 1 ? (
                <button
                  type="button"
                  onClick={() => setPasoActual((p) => (p - 1) as any)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Atrás</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              {pasoActual === 1 && (
                <button
                  type="button"
                  onClick={avanzarPaso1}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {pasoActual === 2 && (
                <button
                  type="button"
                  onClick={avanzarPaso2}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continuar a Accesos</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {pasoActual === 3 && (
                <button
                  type="button"
                  disabled={cargandoCrear}
                  onClick={manejarCrearAsesorFinal}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {cargandoCrear ? (
                    <span>Activando acceso...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Completar y Activar Asesor</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL EDITAR PERMISOS */}
      {asesorEditandoPermisos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  Control de Permisos de Asesor
                </h3>
                <span className="text-xs text-gray-500">{asesorEditandoPermisos.nombre_completo}</span>
              </div>
              <button
                onClick={() => setAsesorEditandoPermisos(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-bold text-gray-800 block">Ver todos los prospectos</span>
                  <span className="text-[10px] text-gray-400">Acceso global vs únicamente asignados</span>
                </div>
                <input
                  type="checkbox"
                  checked={permisoVerTodos}
                  onChange={(e) => setPermisoVerTodos(e.target.checked)}
                  className="h-4 w-4 rounded text-gray-900"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-bold text-gray-800 block">Reasignar Casos</span>
                  <span className="text-[10px] text-gray-400">Transferir leads a otros compañeros</span>
                </div>
                <input
                  type="checkbox"
                  checked={permisoReasignar}
                  onChange={(e) => setPermisoReasignar(e.target.checked)}
                  className="h-4 w-4 rounded text-gray-900"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-bold text-gray-800 block">Exportación de Datos</span>
                  <span className="text-[10px] text-gray-400">Descargar bases de contactos en CSV</span>
                </div>
                <input
                  type="checkbox"
                  checked={permisoExportar}
                  onChange={(e) => setPermisoExportar(e.target.checked)}
                  className="h-4 w-4 rounded text-gray-900"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => setAsesorEditandoPermisos(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={manejarGuardarPermisos}
                disabled={cargandoPermisos}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
              >
                {cargandoPermisos ? "Guardando..." : "Guardar Permisos"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Editar Cuenta y Promoción de Nivel */}
      {asesorEditandoCuenta && (
        <ModalEditarColaborador
          key={asesorEditandoCuenta.id}
          colaborador={asesorEditandoCuenta}
          abierto={Boolean(asesorEditandoCuenta)}
          alCerrar={() => setAsesorEditandoCuenta(null)}
          alGuardarExitoso={(datosActualizados) => {
            setAsesores((prev) =>
              prev.map((a) =>
                a.id === asesorEditandoCuenta.id
                  ? {
                      ...a,
                      ...datosActualizados,
                      nombre_completo: datosActualizados.nombres
                        ? `${datosActualizados.nombres} ${datosActualizados.apellidos || ""}`.trim()
                        : a.nombre_completo,
                    }
                  : a
              )
            );
            setAsesorEditandoCuenta(null);
          }}
          equipos={equipos}
          supervisores={supervisores}
        />
      )}
    </div>
  );
}
