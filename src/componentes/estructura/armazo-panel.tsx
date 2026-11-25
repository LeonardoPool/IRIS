// ==============================================================================
// IRIS by WYLEN — ARMAZÓN RESPONSIVO INTEGRAL DEL PANEL (DESKTOP + MÓVIL PWA)
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
  CalendarCheck2,
  FolderGit2,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  PanelLeftClose,
  PanelLeft,
  Building2,
  Calculator,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { crearClienteSupabaseNavegador } from "@/librerias/supabase/cliente";
import type { RolJerarquicoIRIS } from "@/librerias/seguridad/navegacion-rol";

interface ElementoNav {
  nombre: string;
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  badge?: string;
  rolesPermitidos?: RolJerarquicoIRIS[];
  permisoRequerido?: string;
}

const ELEMENTOS_NAVEGACION_CANONICOS: ElementoNav[] = [
  { nombre: "Inicio", href: "/panel-control", icono: LayoutDashboard },
  { nombre: "Bandeja", href: "/bandeja", icono: Inbox, badge: "SLA" },
  { nombre: "Mi Trabajo", href: "/mi-trabajo", icono: CalendarCheck2 },
  { nombre: "Clientes", href: "/clientes", icono: Users },
  { nombre: "Desarrollos", href: "/desarrollos", icono: Building2, badge: "SVG" },
  {
    nombre: "Cotizador",
    href: "/cotizador",
    icono: Calculator,
    rolesPermitidos: ["superadministrador", "gerente", "coordinador", "asesor"],
  },
  { nombre: "Recursos", href: "/recursos", icono: FolderGit2 },
  {
    nombre: "Administración",
    href: "/configuracion",
    icono: Settings,
    rolesPermitidos: ["superadministrador", "gerente"],
    permisoRequerido: "configuracion:administrar",
  },
];

const titulosRutas: Record<string, string> = {
  "/panel-control": "Inicio — Resumen Operativo",
  "/bandeja": "Bandeja Omnicanal",
  "/mi-trabajo": "Mi Trabajo — Seguimiento y Agenda",
  "/clientes": "Clientes — Cartera Comercial 360°",
  "/desarrollos": "Desarrollos, Inventario y Planos SVG",
  "/cotizador": "Cotizador Inmobiliario y Apartados",
  "/recursos": "Recursos Digitales y Speeches",
  "/configuracion": "Administración y Configuración",
  // Compatibilidad con rutas heredadas
  "/prospectos": "Clientes — Prospectos",
  "/pool-leads": "Clientes — Pool de Leads",
  "/contactos": "Clientes — Contactos",
  "/oportunidades": "Clientes — Oportunidades",
  "/contratos": "Clientes — Contratos DocuSign",
  "/seguimiento": "Mi Trabajo — Seguimiento Kanban",
  "/actividades": "Mi Trabajo — Agenda y Actividades",
  "/analitica": "Inicio — Analítica Comercial",
  "/marketing": "Administración — Captación y Marketing",
};

interface PropiedadesArmazon {
  children: React.ReactNode;
  nombreOrganizacion?: string;
  nombreUsuario?: string;
  correoUsuario?: string;
  nombreRol?: string;
  rolJerarquico?: RolJerarquicoIRIS;
  permisos?: string[];
}

export function ArmazonPanel({
  children,
  nombreOrganizacion = "Inmobiliaria Horizonte WYLEN",
  nombreUsuario = "Administración",
  correoUsuario = "admin@iris.wylen.com",
  nombreRol = "Operador",
  rolJerarquico = "asesor",
  permisos = [],
}: PropiedadesArmazon) {
  const rutaActual = usePathname();
  const router = useRouter();
  const [menuMovilAbierto, setMenuMovilAbierto] = React.useState(false);
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);
  const [sidebarColapsado, setSidebarColapsado] = React.useState(false);

  const elementosNavegacion = React.useMemo(() => {
    return ELEMENTOS_NAVEGACION_CANONICOS.filter((item) => {
      if (!item.rolesPermitidos && !item.permisoRequerido) return true;
      const cumpleRol = item.rolesPermitidos
        ? item.rolesPermitidos.includes(rolJerarquico)
        : false;
      const cumplePermiso = item.permisoRequerido
        ? permisos.includes(item.permisoRequerido) || permisos.includes("organizacion:administrar")
        : false;

      if (item.href === "/cotizador") {
        return cumpleRol || permisos.includes("oportunidades:gestionar");
      }
      return cumpleRol || cumplePermiso;
    });
  }, [rolJerarquico, permisos]);

  React.useEffect(() => {
    try {
      const guardado = localStorage.getItem("iris_sidebar_colapsado");
      if (guardado !== null) {
        setSidebarColapsado(guardado === "true");
      }
    } catch (_) {}
  }, []);

  const alternarSidebar = () => {
    setSidebarColapsado((prev) => {
      const nuevo = !prev;
      try {
        localStorage.setItem("iris_sidebar_colapsado", String(nuevo));
      } catch (_) {}
      return nuevo;
    });
  };

  const esRutaBandeja = rutaActual.startsWith("/bandeja");

  React.useEffect(() => {
    const manejarAbrirMenu = () => setMenuMovilAbierto(true);
    window.addEventListener("iris:abrir-menu-movil", manejarAbrirMenu);
    return () => window.removeEventListener("iris:abrir-menu-movil", manejarAbrirMenu);
  }, []);

  React.useEffect(() => {
    setMenuMovilAbierto(false);
  }, [rutaActual]);

  const tituloActual = titulosRutas[rutaActual] || "Inicio — Resumen Operativo";

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
    <div
      className={cn(
        "flex bg-[#f7f8fa] text-gray-900 font-sans selection:bg-gray-200",
        esRutaBandeja
          ? "h-[100dvh] max-h-[var(--visual-viewport-height,100dvh)] overflow-hidden"
          : "min-h-screen"
      )}
    >
      {/* 1. BARRA LATERAL DESKTOP */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 bg-white border-r border-[#e5e7eb] flex-col h-screen sticky top-0 select-none z-20 transition-all duration-300 ease-in-out",
          sidebarColapsado ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center border-b border-[#e5e7eb] transition-all",
            sidebarColapsado ? "px-3 justify-center" : "px-5 justify-between"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black/5 p-0.5 border border-black/10 shrink-0">
              <Image
                src="/isotipo-iris.jpg"
                alt="Isotipo IRIS"
                fill
                className="object-cover rounded-full"
                priority
              />
            </div>
            {!sidebarColapsado && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold tracking-tight text-gray-900">IRIS</span>
                  <span className="text-[10px] font-semibold text-gray-400">v2.0</span>
                </div>
                <span className="text-[11px] text-gray-500 font-medium truncate leading-tight">
                  {nombreOrganizacion}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={alternarSidebar}
            className={cn(
              "p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0",
              sidebarColapsado && "hidden"
            )}
            title="Colapsar barra lateral"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegación principal">
          {elementosNavegacion.map((item) => {
            const Icono = item.icono;
            const estaActivo =
              rutaActual === item.href ||
              (item.href !== "/panel-control" && rutaActual.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarColapsado ? item.nombre : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all group font-medium relative",
                  sidebarColapsado
                    ? "justify-center h-10 w-10 mx-auto"
                    : "justify-between px-3.5 py-2.5 text-xs",
                  estaActivo
                    ? "bg-[#eceef1] text-gray-900 font-bold shadow-2xs"
                    : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
                )}
              >
                <div className={cn("flex items-center", !sidebarColapsado && "gap-3")}>
                  <Icono
                    className={cn(
                      "h-4 w-4 transition-colors shrink-0",
                      estaActivo ? "text-gray-900" : "text-gray-400 group-hover:text-gray-800"
                    )}
                  />
                  {!sidebarColapsado && <span>{item.nombre}</span>}
                </div>
                {item.badge &&
                  (sidebarColapsado ? (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  ) : (
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
                  ))}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#e5e7eb] space-y-2 pb-4">
          {!sidebarColapsado ? (
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between shadow-2xs">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold text-gray-800 block leading-tight">
                  SLA Omnicanal
                </span>
                <span className="text-[11px] text-gray-400 font-normal block mt-0.5">
                  WhatsApp Cloud · Activo
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Servicio activo" />
            </div>
          ) : (
            <div className="flex justify-center py-1" title="SLA Omnicanal: WhatsApp Cloud Activo">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          )}

          <button
            onClick={manejarCerrarSesion}
            disabled={cerrandoSesion}
            title={sidebarColapsado ? "Cerrar sesión" : undefined}
            className={cn(
              "flex items-center text-xs font-semibold text-gray-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer",
              sidebarColapsado ? "justify-center h-10 w-10 mx-auto" : "w-full gap-2 px-3 py-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarColapsado && <span>{cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}</span>}
          </button>
        </div>
      </aside>

      {/* 2. CAJÓN DESLIZANTE MÓVIL */}
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuMovilAbierto(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#e5e7eb]">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-black/5 p-0.5 border border-black/10 shrink-0">
                  <Image
                    src="/isotipo-iris.jpg"
                    alt="Isotipo IRIS"
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-gray-900">IRIS</span>
                    <span className="text-[10px] font-semibold text-gray-400">PWA</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium block truncate max-w-[130px]">
                    {nombreOrganizacion}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMenuMovilAbierto(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {elementosNavegacion.map((item) => {
                const Icono = item.icono;
                const estaActivo =
                  rutaActual === item.href ||
                  (item.href !== "/panel-control" && rutaActual.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuMovilAbierto(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-3 text-xs rounded-xl transition-all group font-medium",
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
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#e5e7eb] space-y-2">
              <div className="flex items-center gap-2.5 px-2 py-1">
                <div className="h-8 w-8 rounded-full bg-[#f1f3f5] border border-[#e5e7eb] flex items-center justify-center text-gray-500 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-gray-900 block truncate">{nombreUsuario}</span>
                  <span className="text-[10px] text-gray-400 font-medium block truncate">{nombreRol}</span>
                </div>
              </div>

              <button
                onClick={manejarCerrarSesion}
                disabled={cerrandoSesion}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTENEDOR PRINCIPAL */}
      <div className={cn("flex-1 flex flex-col min-w-0", esRutaBandeja && "h-full overflow-hidden")}>
        <header
          className={cn(
            "h-16 px-4 sm:px-6 lg:px-8 border-b border-[#e5e7eb] bg-white items-center justify-between sticky top-0 z-10 select-none shrink-0",
            esRutaBandeja ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMenuMovilAbierto(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={alternarSidebar}
              className="hidden lg:flex p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title={sidebarColapsado ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {sidebarColapsado ? (
                <PanelLeft className="h-4 w-4 text-gray-700" />
              ) : (
                <PanelLeftClose className="h-4 w-4 text-gray-700" />
              )}
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 tracking-tight truncate">
                {tituloActual}
              </span>
              <span className="text-xs text-gray-300 font-normal hidden sm:inline">·</span>
              <span className="text-xs text-gray-400 font-normal truncate max-w-[120px] sm:max-w-xs hidden sm:inline">
                {nombreOrganizacion}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#f1f3f5] border border-[#e5e7eb] flex items-center justify-center text-gray-500 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[130px]">
                  {nombreUsuario}
                </span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">
                  {nombreRol}
                </span>
              </div>
            </div>

            <button
              onClick={manejarCerrarSesion}
              disabled={cerrandoSesion}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer pl-3 border-l border-[#e5e7eb]"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{cerrandoSesion ? "..." : "Salir"}</span>
            </button>
          </div>
        </header>

        <main
          className={cn(
            "flex-1",
            esRutaBandeja
              ? "p-0 lg:p-6 overflow-hidden"
              : "p-3 sm:p-5 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8 overflow-y-auto"
          )}
        >
          {children}
        </main>

        {/* 4. BARRA DE NAVEGACIÓN INFERIOR MÓVIL (PWA) */}
        {!esRutaBandeja && (
          <nav className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-md border-t border-[#e5e7eb] flex lg:hidden items-center justify-around px-2 z-30 select-none shadow-lg">
            <Link
              href="/panel-control"
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                rutaActual === "/panel-control" ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] mt-1 font-medium">Inicio</span>
            </Link>

            <Link
              href="/bandeja"
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative",
                rutaActual.startsWith("/bandeja") ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <Inbox className="h-4 w-4" />
              <span className="text-[10px] mt-1 font-medium">Bandeja</span>
              <span className="absolute top-1.5 right-1/4 h-2 w-2 rounded-full bg-emerald-500" />
            </Link>

            <Link
              href="/mi-trabajo"
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                rutaActual.startsWith("/mi-trabajo") ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <CalendarCheck2 className="h-4 w-4" />
              <span className="text-[10px] mt-1 font-medium">Trabajo</span>
            </Link>

            <Link
              href="/clientes"
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-colors",
                rutaActual.startsWith("/clientes") ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px] mt-1 font-medium">Clientes</span>
            </Link>

            <button
              onClick={() => setMenuMovilAbierto(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Menu className="h-4 w-4" />
              <span className="text-[10px] mt-1 font-medium">Más</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
