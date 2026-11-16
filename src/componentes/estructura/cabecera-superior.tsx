// ==============================================================================
// IRIS by WYLEN — CABECERA SUPERIOR DEL PANEL (DISEÑO EXACTO A LA REFERENCIA)
// ==============================================================================

"use client";

import * as React from "react";
import { User, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";

export function CabeceraSuperior({
  nombreUsuario = "Administración",
  correoUsuario = "admin@iris.wylen.com",
  nombreRol = "Operador",
  nombreOrganizacion = "Inmobiliaria Horizonte WYLEN",
}: {
  nombreUsuario?: string;
  correoUsuario?: string;
  nombreRol?: string;
  nombreOrganizacion?: string;
}) {
  const rutaActual = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);

  const titulosRutas: Record<string, string> = {
    "/panel-control": "Panel de Control",
    "/bandeja": "Bandeja Omnicanal",
    "/prospectos": "Gestión de Prospectos",
    "/marketing": "Marketing y Formularios",
    "/contactos": "Directorio de Contactos",
    "/oportunidades": "Pipeline Comercial",
    "/actividades": "Agenda y Actividades",
    "/recursos": "Biblioteca de Recursos",
    "/contratos": "Contratos DocuSign",
    "/analitica": "Inteligencia Comercial",
    "/configuracion": "Configuración del Sistema",
  };

  const tituloActual = titulosRutas[rutaActual] || "Panel de Control";

  const manejarCerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      const supabase = crearClienteSupabaseNavegador();
      await supabase.auth.signOut();
      router.push("/iniciar-sesion");
      router.refresh();
    } catch (err) {
      console.error("Error al salir:", err);
      setCerrandoSesion(false);
    }
  };

  return (
    <header className="h-16 px-8 border-b border-[#e5e7eb] bg-white flex items-center justify-between sticky top-0 z-10 select-none">
      {/* 1. Contexto actual / Breadcrumb: Título · Nombre Organización */}
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-bold text-gray-900 tracking-tight">{tituloActual}</span>
        <span className="text-xs text-gray-400 font-normal">·</span>
        <span className="text-xs text-gray-400 font-normal truncate max-w-sm">{nombreOrganizacion}</span>
      </div>

      {/* 2. Área de Usuario y Botón Salir (Exacto a la imagen de referencia) */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#f1f3f5] border border-[#e5e7eb] flex items-center justify-center text-gray-500">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-gray-900 leading-tight">
              {nombreUsuario}
            </span>
            <span className="text-[10px] text-gray-400 font-medium leading-tight">
              {nombreRol}
            </span>
          </div>
        </div>

        {/* Botón Salir */}
        <button
          onClick={manejarCerrarSesion}
          disabled={cerrandoSesion}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer pl-3 border-l border-[#e5e7eb]"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{cerrandoSesion ? "Saliendo..." : "Salir"}</span>
        </button>
      </div>
    </header>
  );
}
