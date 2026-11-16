// ==============================================================================
// IRIS by WYLEN — BARRA LATERAL DE NAVEGACIÓN (DISEÑO EDITORIAL ALTA GAMA)
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Contact,
  Kanban,
  Calendar,
  FolderGit2,
  FileSignature,
  BarChart3,
  Settings,
  Share2,
  LogOut,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";

const elementosNavegacion = [
  { nombre: "Dashboard", href: "/panel-control", icono: LayoutDashboard },
  { nombre: "Bandeja Omnicanal", href: "/bandeja", icono: Inbox, badge: "SLA" },
  { nombre: "Prospectos", href: "/prospectos", icono: Users },
  { nombre: "Marketing y Leads", href: "/marketing", icono: Share2 },
  { nombre: "Contactos", href: "/contactos", icono: Contact },
  { nombre: "Oportunidades", href: "/oportunidades", icono: Kanban },
  { nombre: "Actividades", href: "/actividades", icono: Calendar },
  { nombre: "Recursos", href: "/recursos", icono: FolderGit2 },
  { nombre: "Contratos", href: "/contratos", icono: FileSignature },
  { nombre: "Analítica", href: "/analitica", icono: BarChart3 },
  { nombre: "Configuración", href: "/configuracion", icono: Settings },
];

export function BarraLateral({
  nombreOrganizacion = "Inmobiliaria Horizonte WYLEN",
  rolUsuario = "Administrador de Organización",
}: {
  nombreOrganizacion?: string;
  rolUsuario?: string;
}) {
  const rutaActual = usePathname();
  const router = useRouter();

  const manejarCerrarSesion = async () => {
    try {
      const supabase = crearClienteSupabaseNavegador();
      await supabase.auth.signOut();
      router.push("/iniciar-sesion");
      router.refresh();
    } catch (err) {
      console.error("Error al salir:", err);
    }
  };

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-[#e5e7eb] flex flex-col h-screen sticky top-0 select-none">
      {/* 1. Logotipo y Marca de IRIS (Exacto al estilo del screenshot, alineado a h-16) */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-[#e5e7eb]">
        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black/5 p-0.5 border border-black/10 shrink-0">
          <Image
            src="/isotipo-iris.jpg"
            alt="Isotipo IRIS"
            fill
            className="object-cover rounded-full"
            priority
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-gray-900">IRIS</span>
            <span className="text-[10px] font-semibold text-gray-400">v1.0</span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium truncate leading-tight">
            {nombreOrganizacion}
          </span>
        </div>
      </div>

      {/* 2. Menú de Navegación Principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {elementosNavegacion.map((item) => {
          const Icono = item.icono;
          const estaActivo =
            rutaActual === item.href || (item.href !== "/panel-control" && rutaActual.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl transition-all group font-medium",
                estaActivo
                  ? "bg-[#eceef1] text-gray-900 font-bold shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icono
                  className={cn(
                    "h-4 w-4 transition-colors shrink-0",
                    estaActivo ? "text-gray-900" : "text-gray-400 group-hover:text-gray-800"
                  )}
                />
                <span>{item.nombre}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    estaActivo
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Tarjeta de Estado Operativo (Inspirada en el Checador ZK de la referencia) */}
      <div className="p-3 border-t border-[#e5e7eb] space-y-2 pb-4">
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-semibold text-gray-800 block leading-tight">
              SLA Omnicanal
            </span>
            <span className="text-[11px] text-gray-400 font-normal block mt-0.5">
              WhatsApp Cloud · En espera
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="En espera de asignación" />
        </div>

        {/* 4. Botón Cerrar Sesión */}
        <button
          onClick={manejarCerrarSesion}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
