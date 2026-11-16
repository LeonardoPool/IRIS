// ==============================================================================
// IRIS by WYLEN — VISTA CLIENTE DE EQUIPOS Y ROLES
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Users, Shield, Plus, CheckCircle2, UserCheck, AlertCircle } from "lucide-react";
import { esquemaCrearEquipo } from "@/librerias/validaciones/identidad";

interface EquipoDemo {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  lider: string;
  totalMiembros: number;
}

export function VistaEquipos({ equiposIniciales }: { equiposIniciales?: EquipoDemo[] }) {
  const [equipos, setEquipos] = React.useState<EquipoDemo[]>(
    equiposIniciales || [
      {
        id: "e1",
        nombre: "Ventas Residencial Riviera",
        descripcion: "Equipo especializado en desarrollos turísticos y residenciales de alto valor.",
        color: "#7185A5",
        lider: "Carlos Méndez",
        totalMiembros: 4,
      },
      {
        id: "e2",
        nombre: "Atención Digital Inmediata",
        descripcion: "Respuesta de primer contacto en WhatsApp Business y campañas Meta Lead Ads.",
        color: "#17191D",
        lider: "Mariana Silva",
        totalMiembros: 6,
      },
    ]
  );

  const [mostrarModal, setMostrarModal] = React.useState(false);
  const [nombreEquipo, setNombreEquipo] = React.useState("");
  const [descripcionEquipo, setDescripcionEquipo] = React.useState("");
  const [colorEquipo, setColorEquipo] = React.useState("#7185A5");
  const [errorFormulario, setErrorFormulario] = React.useState<string | null>(null);

  const rolesSistema = [
    {
      codigo: "administrador_organizacion",
      nombre: "Administrador de Organización",
      descripcion: "Acceso total a configuración, miembros, facturación, auditoría y métricas.",
      total: 1,
    },
    {
      codigo: "gerente_ventas",
      nombre: "Gerente Comercial",
      descripcion: "Supervisión de equipos, reasignación de prospectos y metas de embudo.",
      total: 2,
    },
    {
      codigo: "supervisor_atencion",
      nombre: "Supervisor de Atención y SLA",
      descripcion: "Monitoreo de tiempos de respuesta, reasignación y auditoría de conversaciones.",
      total: 2,
    },
    {
      codigo: "agente_ventas",
      nombre: "Agente Comercial",
      descripcion: "Atención directa de prospectos, clientes y oportunidades asignadas.",
      total: 8,
    },
  ];

  const manejarCrearEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFormulario(null);

    const resultado = esquemaCrearEquipo.safeParse({
      nombre: nombreEquipo,
      descripcion: descripcionEquipo || null,
      color: colorEquipo,
    });

    if (!resultado.success) {
      const primerError = resultado.error.issues?.[0]?.message || "Datos del equipo inválidos.";
      setErrorFormulario(primerError);
      return;
    }

    const nuevo: EquipoDemo = {
      id: `e-${Date.now()}`,
      nombre: nombreEquipo,
      descripcion: descripcionEquipo || "Equipo comercial de nueva creación.",
      color: colorEquipo,
      lider: "Asignación Pendiente",
      totalMiembros: 1,
    };

    setEquipos([...equipos, nuevo]);
    setNombreEquipo("");
    setDescripcionEquipo("");
    setMostrarModal(false);
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--azul-apagado)]">
            Estructura Organizacional
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Equipos Comerciales y Roles
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Defina células de atención, líderes de equipo y facultades de acceso granulares (RBAC).
          </p>
        </div>

        <Boton variante="primario" tamano="sm" onClick={() => setMostrarModal(true)}>
          <Plus className="h-4 w-4" />
          <span>Crear Nuevo Equipo</span>
        </Boton>
      </div>

      {/* Formulario Modal de Creación de Equipo */}
      {mostrarModal && (
        <Tarjeta className="border-[var(--azul-apagado)] bg-[var(--surface-hover)]/30 animate-in fade-in duration-200">
          <CabeceraTarjeta>
            <TituloTarjeta>Nuevo Equipo Comercial</TituloTarjeta>
            <DescripcionTarjeta>Ingrese los datos para registrar una nueva célula operativa.</DescripcionTarjeta>
          </CabeceraTarjeta>
          <ContenidoTarjeta>
            <form onSubmit={manejarCrearEquipo} className="space-y-4">
              {errorFormulario && (
                <div className="p-3 bg-[var(--destructive-background)] border border-[var(--destructive-border)] rounded-[var(--radius-md)] flex items-center gap-2 text-xs text-[var(--destructive)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorFormulario}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Nombre del Equipo"
                  placeholder="Ej. Ventas Corporativas Bajío"
                  value={nombreEquipo}
                  onChange={(e) => setNombreEquipo(e.target.value)}
                  required
                />
                <CampoTexto
                  etiqueta="Color Distintivo (Hex)"
                  type="text"
                  placeholder="#7185A5"
                  value={colorEquipo}
                  onChange={(e) => setColorEquipo(e.target.value)}
                />
              </div>
              <CampoTexto
                etiqueta="Descripción del Enfoque Comercial"
                placeholder="Breve resumen del objetivo o desarrollo que atiende este equipo..."
                value={descripcionEquipo}
                onChange={(e) => setDescripcionEquipo(e.target.value)}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="acento" tamano="sm">
                  Guardar Equipo
                </Boton>
              </div>
            </form>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* Listado de Equipos */}
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--azul-apagado)]" />
          <span>Equipos Activos ({equipos.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {equipos.map((eq) => (
            <Tarjeta key={eq.id} className="hover:border-[var(--azul-apagado)]/50 transition-colors">
              <CabeceraTarjeta className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: eq.color }} />
                  <div>
                    <TituloTarjeta>{eq.nombre}</TituloTarjeta>
                    <span className="text-[11px] text-[var(--muted)]">Líder: {eq.lider}</span>
                  </div>
                </div>
                <PlacaEstado variante="neutro" tamano="sm">
                  {eq.totalMiembros} {eq.totalMiembros === 1 ? "miembro" : "miembros"}
                </PlacaEstado>
              </CabeceraTarjeta>
              <ContenidoTarjeta>
                <p className="text-xs text-[var(--muted)]">{eq.descripcion}</p>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">Enrutamiento automático:</span>
                  <span className="font-semibold text-[var(--success)] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Habilitado
                  </span>
                </div>
              </ContenidoTarjeta>
            </Tarjeta>
          ))}
        </div>
      </div>

      {/* Matriz de Roles y Control de Acceso (RBAC) */}
      <div className="pt-6 border-t border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--azul-apagado)]" />
          <span>Roles del Sistema y Permisos Asignados (RBAC)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rolesSistema.map((rol) => (
            <Tarjeta key={rol.codigo} className="bg-[var(--surface-hover)]/40">
              <ContenidoTarjeta className="space-y-2.5 p-5">
                <div className="flex items-center justify-between">
                  <PlacaEstado variante="acento" tamano="sm">
                    {rol.total} asignados
                  </PlacaEstado>
                  <UserCheck className="h-4 w-4 text-[var(--muted)]" />
                </div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">{rol.nombre}</h4>
                <p className="text-xs text-[var(--muted)] leading-relaxed">{rol.descripcion}</p>
              </ContenidoTarjeta>
            </Tarjeta>
          ))}
        </div>
      </div>
    </div>
  );
}
