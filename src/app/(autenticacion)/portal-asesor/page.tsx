// ==============================================================================
// IRIS by WYLEN — PORTAL DEDICADO DE ASESORES Y ATENCIÓN COMERCIAL
// ==============================================================================
// URL Directa: /portal-asesor (y /asesores)
// Acceso 100% móvil y desktop mediante Correo o CURP + PIN de 4 dígitos.
// Sin menús ni opciones de administrador: directo a la bandeja omnicanal.
// ==============================================================================

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  KeyRound,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  MapPin,
  CheckCircle2,
  Smartphone,
  MessageSquare,
} from "lucide-react";
import { accionAutenticarConPin } from "@/acciones/identidad";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";
import { cn } from "@/librerias/utilidades/cn";

export default function PaginaPortalAsesor() {
  const router = useRouter();

  const [identificador, setIdentificador] = React.useState("");
  const [pin, setPin] = React.useState(["", "", "", ""]);
  const [mostrarPin, setMostrarPin] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);
  const [errorMensaje, setErrorMensaje] = React.useState<string | null>(null);
  const [ubicacionGps, setUbicacionGps] = React.useState<{ lat: number; lng: number } | null>(null);
  const [estadoGps, setEstadoGps] = React.useState<"validando" | "ok" | "no_disponible">("validando");

  const inputsPinRef = React.useRef<(HTMLInputElement | null)[]>([]);

  // Capturar coordenadas GPS para geocerca opcional
  React.useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacionGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setEstadoGps("ok");
        },
        () => {
          setEstadoGps("no_disponible");
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      setEstadoGps("no_disponible");
    }
  }, []);

  // Manejo de dígitos del PIN
  const manejarCambioDigitoPin = (indice: number, valor: string) => {
    const soloNumeros = valor.replace(/\D/g, "");
    const nuevoPin = [...pin];

    if (soloNumeros.length > 1) {
      // Si el usuario pegó el PIN completo
      const digitos = soloNumeros.slice(0, 4).split("");
      for (let i = 0; i < 4; i++) {
        nuevoPin[i] = digitos[i] || "";
      }
      setPin(nuevoPin);
      const siguienteFoco = Math.min(digitos.length, 3);
      inputsPinRef.current[siguienteFoco]?.focus();
      return;
    }

    nuevoPin[indice] = soloNumeros.slice(-1);
    setPin(nuevoPin);

    // Avanzar al siguiente input
    if (soloNumeros && indice < 3) {
      inputsPinRef.current[indice + 1]?.focus();
    }
  };

  const manejarTeclaPin = (indice: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[indice] && indice > 0) {
      inputsPinRef.current[indice - 1]?.focus();
    }
  };

  const pinCompleto = pin.join("");

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMensaje(null);

    const idLimpio = identificador.trim();
    if (!idLimpio) {
      setErrorMensaje("Por favor ingresa tu Correo Electrónico o tu CURP de 18 caracteres.");
      return;
    }

    if (pinCompleto.length !== 4) {
      setErrorMensaje("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    setCargando(true);
    try {
      const res = await accionAutenticarConPin({
        identificador: idLimpio,
        pin: pinCompleto,
      });

      if (!res.exito || !res.correo || !res.clave) {
        setErrorMensaje(res.error || "Credenciales incorrectas. Verifica tu correo/CURP y PIN.");
        setCargando(false);
        return;
      }

      // Conectar sesión de Supabase en el navegador
      const supabase = crearClienteSupabaseNavegador();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: res.correo,
        password: res.clave,
      });

      if (error) {
        setErrorMensaje(`Error al autenticar: ${error.message}`);
        setCargando(false);
        return;
      }

      if (data.session) {
        // Redirigir DIRECTAMENTE a la bandeja de atención para asesores
        router.push("/bandeja");
        router.refresh();
      }
    } catch {
      setErrorMensaje("Ocurrió un error inesperado al conectar con el servidor.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col justify-between text-gray-900 font-sans selection:bg-gray-200">
      {/* Barra Superior con Marca */}
      <header className="h-16 px-4 sm:px-8 border-b border-[#e5e7eb] bg-white flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black/5 p-0.5 border border-black/10 shrink-0">
            <Image
              src="/isotipo-iris.jpg"
              alt="Isotipo IRIS"
              fill
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-gray-900">IRIS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Portal Asesores
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium block truncate max-w-[180px] sm:max-w-xs">
              Atención Omnicanal y CRM Inmobiliario
            </span>
          </div>
        </div>

        <Link
          href="/iniciar-sesion"
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors hidden sm:inline-block"
        >
          Acceso Administrador →
        </Link>
      </header>

      {/* Contenido Principal / Formulario Central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Encabezado */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gray-900 text-white mb-3 shadow-xs">
              <Smartphone className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Estación de Trabajo Asesor
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Ingresa con tu correo o CURP y tu PIN de 4 dígitos para atender leads de WhatsApp y Meta Ads.
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMensaje && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{errorMensaje}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={manejarEnvio} className="space-y-4">
            {/* Campo Identificador */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Correo Electrónico o CURP
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="ej. asesor@empresa.com o POLL030330..."
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 placeholder-gray-400 transition-colors"
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Puedes escribir tu correo corporativo o los 18 caracteres de tu CURP oficial.
              </span>
            </div>

            {/* Campo PIN (4 Cajas Numéricas) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-gray-500" />
                  <span>PIN Personal de 4 Dígitos</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarPin(!mostrarPin)}
                  className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                >
                  {mostrarPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{mostrarPin ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsPinRef.current[idx] = el;
                    }}
                    type={mostrarPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pin[idx]}
                    onChange={(e) => manejarCambioDigitoPin(idx, e.target.value)}
                    onKeyDown={(e) => manejarTeclaPin(idx, e)}
                    className="h-13 w-full text-center text-xl font-mono font-extrabold bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 shadow-2xs transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Indicador de Geocerca / GPS */}
            <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] truncate">
                  {estadoGps === "ok"
                    ? "Ubicación detectada (Geocerca activa)"
                    : "Acceso seguro verificado por servidor"}
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            </div>

            {/* Botón de Entrada */}
            <button
              type="submit"
              disabled={cargando || !identificador.trim() || pinCompleto.length !== 4}
              className={cn(
                "w-full h-12 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-white shadow-sm mt-2",
                cargando || !identificador.trim() || pinCompleto.length !== 4
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-black active:scale-[0.99]"
              )}
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span>Ingresar a mi Bandeja de Leads</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Pie de Ayuda */}
          <div className="mt-6 pt-4 border-t border-[#f1f3f5] text-center space-y-2">
            <p className="text-[11px] text-gray-400">
              ¿Olvidaste tu PIN? Solicita a tu supervisor o administrador que reasigne tu clave temporal desde el panel de configuración.
            </p>
            <div className="pt-1">
              <Link
                href="/iniciar-sesion"
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Acceso Administrativo (Correo y Contraseña) →</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Pie de Página */}
      <footer className="h-14 px-4 border-t border-[#e5e7eb] bg-white flex items-center justify-center text-[11px] text-gray-400">
        <span>IRIS by WYLEN • Plataforma Operativa Omnicanal v1.0</span>
      </footer>
    </div>
  );
}
