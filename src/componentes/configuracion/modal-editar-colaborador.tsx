// ==============================================================================
// IRIS by WYLEN — MODAL: EDICIÓN DE CUENTA Y PROMOCIÓN DE NIVEL JERÁRQUICO
// ==============================================================================

"use client";

import * as React from "react";
import {
  User,
  Shield,
  KeyRound,
  FileText,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Users,
  Award,
  Crown,
  Headphones,
  Check,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import { accionEditarCuentaColaborador } from "@/acciones/asesores";
import type { ExpedienteAsesor, DatosEditarColaborador } from "@/tipos/asesores";

interface PropiedadesModalEditarColaborador {
  colaborador: ExpedienteAsesor;
  abierto: boolean;
  alCerrar: () => void;
  alGuardarExitoso: (datosActualizados: Partial<ExpedienteAsesor>) => void;
  equipos: Array<{ id: string; nombre: string; color: string }>;
  supervisores: Array<{ id: string; nombre_completo: string }>;
}

export function ModalEditarColaborador({
  colaborador,
  abierto,
  alCerrar,
  alGuardarExitoso,
  equipos,
  supervisores,
}: PropiedadesModalEditarColaborador) {
  // Pestañas internas del modal
  const [seccionActiva, setSeccionActiva] = React.useState<"perfil" | "nivel" | "permisos">("perfil");
  const [guardando, setGuardando] = React.useState(false);

  // Formulario Perfil
  const [nombres, setNombres] = React.useState(
    colaborador.nombres || colaborador.nombre_completo.split(" ")[0] || ""
  );
  const [apellidos, setApellidos] = React.useState(
    colaborador.apellidos || colaborador.nombre_completo.split(" ").slice(1).join(" ") || ""
  );
  const [correo, setCorreo] = React.useState(colaborador.correo_electronico || "");
  const [telefono, setTelefono] = React.useState(colaborador.telefono || "");
  const [curp, setCurp] = React.useState(colaborador.curp || "");
  const [rfc, setRfc] = React.useState(colaborador.rfc || "");
  const [estado, setEstado] = React.useState<"activo" | "inactivo" | "bloqueado">(
    colaborador.estado || "activo"
  );

  // Formulario Nivel Jerárquico (Tipo de Cuenta)
  const rolInicial =
    (colaborador.rol_jerarquico as any) ||
    (colaborador.rol?.codigo === "supervisor_atencion"
      ? "coordinador"
      : colaborador.rol?.codigo === "gerente_ventas"
      ? "gerente"
      : colaborador.rol?.codigo === "administrador_organizacion"
      ? "superadministrador"
      : "asesor");

  const [rolJerarquico, setRolJerarquico] = React.useState<
    "asesor" | "coordinador" | "gerente" | "atencion_cliente" | "superadministrador"
  >(rolInicial);

  const [equipoId, setEquipoId] = React.useState(colaborador.equipo_id || "");
  const [responsableDirectoId, setResponsableDirectoId] = React.useState(
    colaborador.responsable_directo_id || colaborador.supervisor_id || ""
  );

  // Permisos granulares
  const [permisoVerTodos, setPermisoVerTodos] = React.useState(
    colaborador.permisos_personalizados?.puede_ver_todos_los_prospectos ?? false
  );
  const [permisoReasignar, setPermisoReasignar] = React.useState(
    colaborador.permisos_personalizados?.puede_reasignar_casos ?? false
  );
  const [permisoExportar, setPermisoExportar] = React.useState(
    colaborador.permisos_personalizados?.puede_exportar_datos ?? false
  );
  const [permisoAnalitica, setPermisoAnalitica] = React.useState(
    colaborador.permisos_personalizados?.puede_ver_analitica_global ?? false
  );
  const [permisoOportunidades, setPermisoOportunidades] = React.useState(
    colaborador.permisos_personalizados?.puede_crear_oportunidades ?? true
  );

  if (!abierto) return null;

  const esPromocion = rolJerarquico !== rolInicial;

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres.trim() || !correo.trim()) {
      notificar.error("Datos incompletos", "El nombre y el correo electrónico son obligatorios.");
      return;
    }

    setGuardando(true);
    try {
      const payload: DatosEditarColaborador = {
        usuarioId: colaborador.id,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        curp: curp.trim().toUpperCase() || null,
        rfc: rfc.trim().toUpperCase() || null,
        estado,
        rolJerarquico,
        responsableDirectoId: responsableDirectoId || null,
        equipoId: equipoId || null,
        permisos: {
          puede_ver_todos_los_prospectos: permisoVerTodos,
          puede_reasignar_casos: permisoReasignar,
          puede_exportar_datos: permisoExportar,
          puede_ver_analitica_global: permisoAnalitica,
          puede_crear_oportunidades: permisoOportunidades,
        },
      };

      const res = await accionEditarCuentaColaborador(payload);
      if (res.exito) {
        notificar.exito(
          esPromocion ? "¡Colaborador Promovido!" : "Cuenta actualizada",
          esPromocion
            ? `Se ha cambiado el tipo de cuenta a "${rolJerarquico.toUpperCase()}".`
            : "Los datos de la cuenta se actualizaron con éxito."
        );

        alGuardarExitoso({
          nombre_completo: `${nombres.trim()} ${apellidos.trim()}`,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          correo_electronico: correo.trim().toLowerCase(),
          telefono: telefono.trim() || null,
          curp: curp.trim().toUpperCase() || null,
          rfc: rfc.trim().toUpperCase() || null,
          estado,
          rol_jerarquico: rolJerarquico,
          responsable_directo_id: responsableDirectoId || null,
          equipo_id: equipoId || null,
        });

        alCerrar();
      } else {
        notificar.error("Error al actualizar", res.error || "No se pudo actualizar la cuenta.");
      }
    } catch {
      notificar.error("Error", "Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
              {colaborador.nombre_completo.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900">
                  {colaborador.nombre_completo}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase">
                  {rolInicial}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Edición de cuenta y gestión de nivel jerárquico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={alCerrar}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f1f3f5] rounded-xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setSeccionActiva("perfil")}
            className={cn(
              "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
              seccionActiva === "perfil"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Perfil y Contacto</span>
          </button>

          <button
            type="button"
            onClick={() => setSeccionActiva("nivel")}
            className={cn(
              "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
              seccionActiva === "nivel"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900",
              esPromocion && "text-emerald-700"
            )}
          >
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span>Nivel y Rol</span>
            {esPromocion && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSeccionActiva("permisos")}
            className={cn(
              "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
              seccionActiva === "permisos"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Permisos</span>
          </button>
        </div>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={manejarGuardar} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* ================================================================ */}
          {/* SECCIÓN 1: PERFIL Y CONTACTO */}
          {/* ================================================================ */}
          {seccionActiva === "perfil" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Teléfono Móvil</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+52 998 000 0000"
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">CURP Oficial</label>
                  <input
                    type="text"
                    maxLength={18}
                    value={curp}
                    onChange={(e) => setCurp(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">RFC SAT</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Estado de la Cuenta</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["activo", "inactivo", "bloqueado"] as const).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setEstado(est)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer",
                        estado === est
                          ? est === "activo"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300"
                            : est === "inactivo"
                            ? "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300"
                            : "bg-red-50 text-red-800 border-red-300 ring-1 ring-red-300"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECCIÓN 2: TIPO DE CUENTA Y NIVEL JERÁRQUICO (PROMOCIÓN) */}
          {/* ================================================================ */}
          {seccionActiva === "nivel" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-bold text-gray-800 block mb-1.5 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Nivel Jerárquico (Tipo de Cuenta):
                </label>

                <div className="space-y-2">
                  {/* Rol 1: Asesor Inmobiliario */}
                  <div
                    onClick={() => setRolJerarquico("asesor")}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      rolJerarquico === "asesor"
                        ? "border-gray-900 bg-gray-50/70"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                        rolJerarquico === "asesor"
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300"
                      )}
                    >
                      {rolJerarquico === "asesor" && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-gray-900 block leading-tight">
                        Asesor Inmobiliario
                      </span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Atención directa de prospectos asignados, chat de WhatsApp y agenda de citas.
                      </span>
                    </div>
                  </div>

                  {/* Rol 2: Coordinador / Supervisor */}
                  <div
                    onClick={() => setRolJerarquico("coordinador")}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      rolJerarquico === "coordinador"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                        rolJerarquico === "coordinador"
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300"
                      )}
                    >
                      {rolJerarquico === "coordinador" && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-gray-900 block leading-tight">
                          Coordinador / Supervisor
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                          Mando Medio
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Supervisa un equipo de asesores, monitorea semáforo de SLA y reasigna conversaciones.
                      </span>
                    </div>
                  </div>

                  {/* Rol 3: Gerente Comercial */}
                  <div
                    onClick={() => setRolJerarquico("gerente")}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      rolJerarquico === "gerente"
                        ? "border-purple-600 bg-purple-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                        rolJerarquico === "gerente"
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-gray-300"
                      )}
                    >
                      {rolJerarquico === "gerente" && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-gray-900 block leading-tight">
                          Gerente Comercial
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                          Alta Dirección
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Dirige a múltiples coordinadores y asesores, realiza traspasos de personal y supervisa metas.
                      </span>
                    </div>
                  </div>

                  {/* Rol 4: Personal de Atención al Cliente */}
                  <div
                    onClick={() => setRolJerarquico("atencion_cliente")}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      rolJerarquico === "atencion_cliente"
                        ? "border-amber-600 bg-amber-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                        rolJerarquico === "atencion_cliente"
                          ? "border-amber-600 bg-amber-600 text-white"
                          : "border-gray-300"
                      )}
                    >
                      {rolJerarquico === "atencion_cliente" && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-gray-900 block leading-tight">
                        Personal de Atención al Cliente
                      </span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Mesa de ayuda y primer contacto sin atarse a la jerarquía piramidal de ventas.
                      </span>
                    </div>
                  </div>

                  {/* Rol 5: Superadministrador */}
                  <div
                    onClick={() => setRolJerarquico("superadministrador")}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      rolJerarquico === "superadministrador"
                        ? "border-rose-600 bg-rose-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0",
                        rolJerarquico === "superadministrador"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-gray-300"
                      )}
                    >
                      {rolJerarquico === "superadministrador" && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-gray-900 block leading-tight">
                          Superadministrador
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                          Acceso Global
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Control total sobre todas las organizaciones, colaboradores, traspasos y configuración del sistema.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asignación de equipo y responsable directo */}
              <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Equipo Comercial</label>
                  <select
                    value={equipoId}
                    onChange={(e) => setEquipoId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                  >
                    <option value="">— Sin equipo asignado —</option>
                    {equipos.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    {rolJerarquico === "coordinador"
                      ? "Gerente Responsable"
                      : "Coordinador a Cargo"}
                  </label>
                  <select
                    value={responsableDirectoId}
                    onChange={(e) => setResponsableDirectoId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl text-xs text-gray-900 font-semibold focus:outline-none focus:border-gray-900"
                  >
                    <option value="">— Asignación Directa General —</option>
                    {supervisores
                      .filter((s) => s.id !== colaborador.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre_completo}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECCIÓN 3: PERMISOS GRANULARES */}
          {/* ================================================================ */}
          {seccionActiva === "permisos" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <span className="text-gray-500 text-[11px] block">
                Ajusta las facultades individuales de acceso y seguridad para esta cuenta:
              </span>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisoVerTodos}
                    onChange={(e) => setPermisoVerTodos(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Ver todos los prospectos de la inmobiliaria
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Permite consultar la cartera global sin limitarse a su asignación personal.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisoReasignar}
                    onChange={(e) => setPermisoReasignar(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Reasignar y transferir casos entre colaboradores
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Facultad para redistribuir conversaciones y prospectos hacia otros asesores.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisoAnalitica}
                    onChange={(e) => setPermisoAnalitica(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Acceso a métricas globales y analítica de desempeño
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Visualizar reportes de SLA, tiempos de respuesta y cierre de toda la organización.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisoExportar}
                    onChange={(e) => setPermisoExportar(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Exportación de datos y expedientes a Excel / CSV
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Descarga de bases de datos de prospectos y reportes auditados.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={alCerrar}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {guardando
                ? "Guardando..."
                : esPromocion
                ? "Guardar y Promover Nivel"
                : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
