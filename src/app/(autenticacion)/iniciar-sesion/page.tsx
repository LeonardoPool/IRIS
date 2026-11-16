// ==============================================================================
// IRIS by WYLEN — PÁGINA DE INICIO DE SESIÓN ADMINISTRATIVO
// ==============================================================================
// Portal de acceso exclusivo para Directores y Administradores de Sistema.
// Asesores y supervisores disponen de su portal dedicado en: /portal-asesor
// Video dinámico de estrellas obtenido mediante la API de Pexels
// ==============================================================================

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { esquemaInicioSesion, type DatosInicioSesion } from "@/librerias/validaciones/identidad";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";
import { useRouter } from "next/navigation";
import { cn } from "@/librerias/utilidades/cn";

export default function PaginaIniciarSesion() {
  const router = useRouter();

  // Credenciales administrativas
  const [datosFormulario, setDatosFormulario] = React.useState<DatosInicioSesion>({
    correoElectronico: "admin@iris.wylen.com",
    clave: "IrisAdmin2026!",
  });

  const [mostrarClave, setMostrarClave] = React.useState(false);
  const [errores, setErrores] = React.useState<Record<string, string>>({});
  const [errorServidor, setErrorServidor] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);

  // Estado del video dinámico de Pexels API
  const [urlVideo, setUrlVideo] = React.useState<string>("/video-estrellas.mp4");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn("[Video] Reproducción automática en espera de interacción:", err);
      });
    }
  }, [urlVideo]);

  React.useEffect(() => {
    let cancelado = false;
    async function cargarVideoPexels() {
      try {
        const respuesta = await fetch("/api/medios/video-estrellas");
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (!cancelado && datos.exito && datos.urlVideo) {
          setUrlVideo(datos.urlVideo);
        }
      } catch (err) {
        console.warn("[Pexels] Usando video local de respaldo:", err);
      }
    }
    cargarVideoPexels();
    return () => {
      cancelado = true;
    };
  }, []);

  // Manejo de Inicio de Sesión Administrativo (Correo + Contraseña)
  const manejarEnvioAdmin = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorServidor(null);
    setErrores({});

    const resultadoValidacion = esquemaInicioSesion.safeParse(datosFormulario);
    if (!resultadoValidacion.success) {
      const mapeoErrores: Record<string, string> = {};
      const problemas = resultadoValidacion.error.issues || [];
      problemas.forEach((problema) => {
        const campo = problema.path[0];
        if (typeof campo === "string") {
          mapeoErrores[campo] = problema.message;
        }
      });
      setErrores(mapeoErrores);
      return;
    }

    setCargando(true);

    try {
      const supabase = crearClienteSupabaseNavegador();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: datosFormulario.correoElectronico,
        password: datosFormulario.clave,
      });

      if (error) {
        setErrorServidor(`Credenciales no válidas: ${error.message}`);
        setCargando(false);
        return;
      }

      if (data.session) {
        router.push("/panel-control");
        router.refresh();
      }
    } catch {
      setErrorServidor("Ocurrió un error inesperado al conectar con el servidor.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#ffffff] selection:bg-gray-200">
      {/* =========================================================================
          COLUMNA IZQUIERDA: HERO CORPORATIVO CON VIDEO DE FONDO
         ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 bg-black flex-col justify-between p-12 overflow-hidden select-none">
        <video
          ref={videoRef}
          src={urlVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-white/10 p-0.5 border border-white/20">
            <Image
              src="/isotipo-iris.jpg"
              alt="Isotipo IRIS"
              fill
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-white">IRIS</span>
            <span className="text-[10px] tracking-wider text-white/70 uppercase">POR WYLEN</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-4">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-none uppercase">
            ENGINEERING THAT INSPIRES.
          </h1>
          <p className="text-sm text-white/80 font-normal leading-relaxed max-w-md">
            Plataforma Omnicanal y CRM Inmobiliario de Alto Rendimiento.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40 tracking-wider uppercase font-medium">
          <span>Every relationship, understood.</span>
          <span className="text-[10px] text-white/30">Video vía Pexels API</span>
        </div>
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: FORMULARIO ADMINISTRATIVO LIMPIO Y PROFESIONAL
         ========================================================================= */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-28 bg-[#ffffff]">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Cabecera con Isotipo y Marca */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black/5 p-1 border border-black/10">
                <Image
                  src="/isotipo-iris.jpg"
                  alt="Isotipo IRIS"
                  fill
                  className="object-cover rounded-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-[#17191d]">IRIS</span>
                <span className="text-[10px] tracking-wider text-gray-500 uppercase">por WYLEN</span>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 uppercase tracking-wider mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-700" />
                <span>Acceso Administrativo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17191d]">
                Portal de Administración
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Ingresa con tus credenciales maestras de directivo o administrador.
              </p>
            </div>
          </div>

          {/* Alerta de error del servidor */}
          {errorServidor && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorServidor}</span>
            </div>
          )}

          {/* Formulario Administrativo */}
          <form className="space-y-4" onSubmit={manejarEnvioAdmin}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Correo Electrónico de Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@iris.wylen.com"
                  value={datosFormulario.correoElectronico}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, correoElectronico: e.target.value })
                  }
                  disabled={cargando}
                  className="w-full h-11 pl-10 pr-3.5 text-xs bg-gray-50/70 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                />
              </div>
              {errores.correoElectronico && (
                <p className="text-[11px] text-red-600 font-medium">{errores.correoElectronico}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 block">
                  Contraseña Maestra
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarClave(!mostrarClave)}
                  className="text-[11px] text-gray-400 hover:text-gray-700 font-medium cursor-pointer flex items-center gap-1"
                >
                  {mostrarClave ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{mostrarClave ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={mostrarClave ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={datosFormulario.clave}
                  onChange={(e) =>
                    setDatosFormulario({ ...datosFormulario, clave: e.target.value })
                  }
                  disabled={cargando}
                  className="w-full h-11 pl-10 pr-3.5 text-xs bg-gray-50/70 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                />
              </div>
              {errores.clave && (
                <p className="text-[11px] text-red-600 font-medium">{errores.clave}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-12 bg-gray-900 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-black active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Autenticando como Administrador...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la Administración</span>
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          {/* ENLACE DISCRETO Y EXCLUSIVO AL PORTAL DE ASESORES */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-gray-900 block truncate text-[11px]">
                  ¿Eres Asesor o Supervisor?
                </span>
                <span className="text-[10px] text-gray-400 block truncate">
                  Ingreso directo con tu PIN o CURP
                </span>
              </div>
            </div>
            <Link
              href="/portal-asesor"
              className="font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 hover:underline text-xs shrink-0"
            >
              <span>Abrir Portal</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Garantías de seguridad para Administradores */}
          <div className="pt-2 space-y-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Cifrado TLS 1.3 de grado bancario y sesiones aisladas</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Control de inquilinos y auditoría de accesos activa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
