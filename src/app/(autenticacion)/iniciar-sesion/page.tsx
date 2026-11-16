// ==============================================================================
// IRIS by WYLEN — PÁGINA DE INICIO DE SESIÓN
// ==============================================================================
// Video dinámico de estrellas obtenido mediante la API de Pexels
// ==============================================================================

"use client";

import * as React from "react";
import Image from "next/image";
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { esquemaInicioSesion, type DatosInicioSesion } from "@/librerias/validaciones/identidad";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";
import { useRouter } from "next/navigation";

export default function PaginaIniciarSesion() {
  const router = useRouter();
  const [datosFormulario, setDatosFormulario] = React.useState<DatosInicioSesion>({
    correoElectronico: "",
    clave: "",
  });
  const [errores, setErrores] = React.useState<Record<string, string>>({});
  const [errorServidor, setErrorServidor] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);

  // Estado del video dinámico de Pexels API
  const [urlVideo, setUrlVideo] = React.useState<string>("/video-estrellas.mp4");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Asegurar reproducción automática silenciada en carga y cambio de fuente
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn("[Video] Reproducción automática en espera de interacción:", err);
      });
    }
  }, [urlVideo]);

  // Consulta a la API de Pexels para obtener el video de estrellas dinámico
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

  const manejarEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorServidor(null);
    setErrores({});

    // Validación con Zod
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
        {/* Video en loop de estrellas provisto dinámicamente por la API de Pexels */}
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

        {/* Capa de viñeta oscura para contraste editorial */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />

        {/* Marca superior izquierda */}
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

        {/* Mensaje central icónico de Wylen */}
        <div className="relative z-10 max-w-xl my-auto">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            ENGINEERING THAT INSPIRES.
          </h1>
          <p className="mt-3 text-sm text-white/70 tracking-wide font-normal">
            Un ecosistema de WYLEN.
          </p>
        </div>

        {/* Pie de foto / sutil */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40 tracking-wider uppercase font-medium">
          <span>Every relationship, understood.</span>
          <span className="text-[10px] text-white/30">Video vía Pexels API</span>
        </div>
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: FORMULARIO LIMPIO DE INICIO DE SESIÓN
         ========================================================================= */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-28 bg-[#ffffff]">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Cabecera con Isotipo y Marca */}
          <div className="space-y-4">
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
              <h2 className="text-3xl font-bold tracking-tight text-[#17191d]">
                Iniciar sesión
              </h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Ingresa tus credenciales para acceder a la plataforma comercial de Servicio Inmobiliario Horizonte.
              </p>
            </div>
          </div>

          {/* Alerta de error del servidor */}
          {errorServidor && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorServidor}</span>
            </div>
          )}

          {/* Formulario */}
          <form className="space-y-5" onSubmit={manejarEnvio}>
            {/* Campo: Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block">
                Correo electrónico
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
                  className="w-full h-11 pl-10 pr-3.5 text-sm bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                />
              </div>
              {errores.correoElectronico && (
                <p className="text-[11px] text-red-600 font-medium">{errores.correoElectronico}</p>
              )}
            </div>

            {/* Campo: Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block">
                Contraseña
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
                  className="w-full h-11 pl-10 pr-3.5 text-sm bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                />
              </div>
              {errores.clave && (
                <p className="text-[11px] text-red-600 font-medium">{errores.clave}</p>
              )}
            </div>

            {/* Botón Principal de Acceso */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full h-12 bg-[#17191d] text-white rounded-lg text-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:bg-black active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la plataforma</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Garantías y sellos de seguridad */}
          <div className="pt-2 space-y-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Conexión cifrada de extremo a extremo</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Sesiones protegidas con expiración automática</span>
            </div>
          </div>

          {/* Nota al pie */}
          <p className="text-[11px] text-gray-400 pt-4 leading-normal">
            Acceso exclusivo para personal comercial y administrativo de Servicio Inmobiliario Horizonte.
          </p>
        </div>
      </div>
    </div>
  );
}
