// ==============================================================================
// IRIS by WYLEN — PÁGINA DE INICIO DE SESIÓN MULTICREDENCIAL
// ==============================================================================
// Soporte de acceso dual:
// 1. Asesores: Correo Electrónico O CURP + PIN de 4 dígitos
// 2. Administradores: Correo + Contraseña Maestra
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { esquemaInicioSesion, type DatosInicioSesion } from "@/librerias/validaciones/identidad";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";
import { accionAutenticarConPin } from "@/acciones/identidad";
import { useRouter } from "next/navigation";
import { cn } from "@/librerias/utilidades/cn";

export default function PaginaIniciarSesion() {
  const router = useRouter();

  // Modo de acceso: "asesor" (PIN / CURP) vs "admin" (Contraseña)
  const [modoAcceso, setModoAcceso] = React.useState<"asesor" | "admin">("asesor");

  // Estados modo Asesor (CURP / Correo + PIN)
  const [identificadorAsesor, setIdentificadorAsesor] = React.useState("");
  const [pinAsesor, setPinAsesor] = React.useState("");
  const [mostrarPin, setMostrarPin] = React.useState(false);

  // Estados modo Admin (Correo + Clave)
  const [datosFormulario, setDatosFormulario] = React.useState<DatosInicioSesion>({
    correoElectronico: "admin@iris.wylen.com",
    clave: "IrisAdmin2026!",
  });

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

  // Manejo de Inicio de Sesión de Asesor (CURP / Correo + PIN)
  const manejarEnvioAsesor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorServidor(null);

    if (!identificadorAsesor.trim()) {
      setErrorServidor("Por favor ingrese su Correo Electrónico o su CURP.");
      return;
    }

    if (pinAsesor.trim().length !== 4) {
      setErrorServidor("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    setCargando(true);
    try {
      const res = await accionAutenticarConPin({
        identificador: identificadorAsesor.trim(),
        pin: pinAsesor.trim(),
      });

      if (!res.exito || !res.correo || !res.clave) {
        setErrorServidor(res.error || "Credenciales de asesor no válidas.");
        setCargando(false);
        return;
      }

      // Autenticar la sesión en el navegador con Supabase
      const supabase = crearClienteSupabaseNavegador();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: res.correo,
        password: res.clave,
      });

      if (error) {
        setErrorServidor(`Error de sesión: ${error.message}`);
        setCargando(false);
        return;
      }

      if (data.session) {
        // Asesores ingresan directamente a la bandeja omnicanal de leads
        router.push("/bandeja");
        router.refresh();
      }
    } catch {
      setErrorServidor("Ocurrió un error inesperado al conectar con el servicio de autenticación.");
      setCargando(false);
    }
  };

  // Manejo de Inicio de Sesión Administrativo (Correo + Contraseña)
  const manejarEnvioAdmin = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorServidor(null);
    setErrores({});

    const resultadoValidacion = esquemaInicioSesion.safeParse(datosFormulario);
    if (!resultadoValidacion.success) {
      const mapeoErrores: Record<string, string> = {};
      const problemas = resultadoValidacion.error.issues || [];
      problemas.forEach((err) => {
        if (err.path[0]) {
          mapeoErrores[err.path[0].toString()] = err.message;
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
        setErrorServidor(
          error.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifique su correo o contraseña."
            : error.message
        );
        setCargando(false);
        return;
      }

      if (data.session) {
        // Administradores acceden al panel de control general
        router.push("/panel-control");
        router.refresh();
      }
    } catch {
      setErrorServidor("Ocurrió un error inesperado al conectar con el servicio de autenticación.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#ffffff] text-[#17191d] select-none">
      {/* =========================================================================
          COLUMNA IZQUIERDA: VIDEO DINÁMICO DE PEXELS API + ENGINEERING THAT INSPIRES
         ========================================================================= */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-8 lg:p-12 overflow-hidden bg-black text-white">
        <video
          ref={videoRef}
          src={urlVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => {
            if (urlVideo !== "/video-estrellas.mp4") {
              console.warn("[Video] Error al cargar URL remota de Pexels, alternando a video local.");
              setUrlVideo("/video-estrellas.mp4");
            }
          }}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none transition-opacity duration-1000"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white/10 backdrop-blur-md p-1 border border-white/20">
            <Image
              src="/isotipo-iris.jpg"
              alt="Isotipo IRIS"
              fill
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white uppercase">IRIS</span>
            <span className="text-[10px] tracking-widest text-white/70 uppercase font-medium">POR WYLEN</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl my-auto">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            ENGINEERING THAT INSPIRES.
          </h1>
          <p className="mt-3 text-sm text-white/70 tracking-wide font-normal">
            Plataforma Omnicanal y CRM Inmobiliario de Alto Rendimiento.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40 tracking-wider uppercase font-medium">
          <span>Every relationship, understood.</span>
          <span className="text-[10px] text-white/30">Video vía Pexels API</span>
        </div>
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: FORMULARIO MULTICREDENCIAL
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
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17191d]">
                Portal de Acceso
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Selecciona tu método de autenticación comercial o administrativa.
              </p>
            </div>
          </div>

          {/* ACCESO RÁPIDO DEDICADO PARA ASESORES */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/70 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-950">¿Eres Asesor de Ventas?</span>
            </div>
            <Link
              href="/portal-asesor"
              className="font-extrabold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 hover:underline text-xs"
            >
              <span>Abrir Portal Directo</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* SELECTOR DE MODO DE ACCESO (ASESORES VS ADMINISTRACIÓN) */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setModoAcceso("asesor");
                setErrorServidor(null);
              }}
              className={cn(
                "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                modoAcceso === "asesor"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
              <span>Portal Asesor (PIN)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModoAcceso("admin");
                setErrorServidor(null);
              }}
              className={cn(
                "py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                modoAcceso === "admin"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-gray-700" />
              <span>Administración</span>
            </button>
          </div>

          {/* Alerta de error del servidor */}
          {errorServidor && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorServidor}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODO 1: ACCESO ASESOR CON CORREO O CURP + PIN DE 4 DÍGITOS */}
          {/* ================================================================= */}
          {modoAcceso === "asesor" && (
            <form className="space-y-4 animate-in fade-in duration-200" onSubmit={manejarEnvioAsesor}>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  Correo Electrónico o CURP Oficial
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CURP (18 dígitos) o tu correo"
                    value={identificadorAsesor}
                    onChange={(e) => setIdentificadorAsesor(e.target.value)}
                    disabled={cargando}
                    className="w-full h-11 pl-10 pr-3.5 text-xs bg-gray-50/70 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors uppercase font-mono font-semibold"
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Puedes ingresar con tu CURP registrado o tu correo institucional.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 block">
                    PIN Numérico (4 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarPin(!mostrarPin)}
                    className="text-[11px] text-gray-500 hover:text-gray-900 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    {mostrarPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{mostrarPin ? "Ocultar" : "Mostrar"}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={mostrarPin ? "text" : "password"}
                    required
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d{4}"
                    placeholder="••••"
                    value={pinAsesor}
                    onChange={(e) => setPinAsesor(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    disabled={cargando}
                    className="w-full h-11 pl-10 pr-3.5 text-center text-lg font-mono font-extrabold tracking-widest bg-gray-50/70 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full h-12 bg-gray-900 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-black active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {cargando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando PIN de asesor...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Portal de Asesor</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* MODO 2: ACCESO ADMINISTRATIVO (CORREO + CONTRASEÑA) */}
          {/* ================================================================= */}
          {modoAcceso === "admin" && (
            <form className="space-y-4 animate-in fade-in duration-200" onSubmit={manejarEnvioAdmin}>
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
                <label className="text-xs font-bold text-gray-700 block">
                  Contraseña Maestra
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar como Administrador</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Garantías de seguridad */}
          <div className="pt-2 space-y-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Autenticación directa de asesores con PIN o CURP</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Control perimetral por Geocerca en sede de ventas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
