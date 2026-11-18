// ==============================================================================
// IRIS by WYLEN — SERVICIO: ESTRUCTURA ORGANIZACIONAL Y TRASPASOS DE PERSONAL
// ==============================================================================

import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type {
  UsuarioJerarquico,
  RolJerarquico,
  EstructuraOrganigrama,
  AuditoriaTraspasoPersonal,
  DatosTraspasoPersonal,
} from "@/tipos/estructura-organizacional";

export class ServicioEstructuraOrganizacional {
  /**
   * Obtiene la estructura jerárquica completa de la organización:
   * Gerentes -> Coordinadores -> Asesores, más personal de atención y superadmins.
   */
  async obtenerOrganigrama(organizacionId: string): Promise<EstructuraOrganigrama> {
    const supabase = crearClienteSupabaseAdministrador();

    // 1. Obtener todos los usuarios de la organización
    const { data: miembros, error } = await supabase
      .from("membresias")
      .select(`
        usuario_id,
        rol:roles (
          id,
          codigo,
          nombre
        ),
        usuario:usuarios (
          id,
          nombre_completo,
          correo_electronico,
          telefono,
          avatar_url,
          estado,
          rol_jerarquico,
          responsable_directo_id,
          equipo_id,
          fecha_creacion
        )
      `)
      .eq("organizacion_id", organizacionId)
      .neq("estado", "suspendido");

    if (error || !miembros) {
      console.error("[Organigrama] Error al consultar miembros:", error);
      return {
        superadministradores: [],
        gerentes: [],
        personalAtencion: [],
        totalColaboradores: 0,
      };
    }

    // 2. Extraer usuarios enriquecidos
    const todosUsuarios: UsuarioJerarquico[] = miembros
      .map((m: any) => {
        if (!m.usuario) return null;
        return {
          id: m.usuario.id,
          nombre_completo: m.usuario.nombre_completo,
          correo_electronico: m.usuario.correo_electronico,
          telefono: m.usuario.telefono,
          avatar_url: m.usuario.avatar_url,
          rol_jerarquico: (m.usuario.rol_jerarquico as RolJerarquico) || "asesor",
          estado: m.usuario.estado || "activo",
          responsable_directo_id: m.usuario.responsable_directo_id,
          equipo_id: m.usuario.equipo_id,
          fecha_creacion: m.usuario.fecha_creacion,
        };
      })
      .filter(Boolean) as UsuarioJerarquico[];

    // 3. Agrupar por niveles
    const asesores = todosUsuarios.filter((u) => u.rol_jerarquico === "asesor");
    const coordinadores = todosUsuarios.filter((u) => u.rol_jerarquico === "coordinador");
    const gerentes = todosUsuarios.filter((u) => u.rol_jerarquico === "gerente");
    const superadmins = todosUsuarios.filter((u) => u.rol_jerarquico === "superadministrador");
    const atencion = todosUsuarios.filter((u) => u.rol_jerarquico === "atencion_cliente");

    // 4. Anidar asesores dentro de sus coordinadores
    coordinadores.forEach((coord) => {
      coord.asesores = asesores.filter((a) => a.responsable_directo_id === coord.id);
    });

    // 5. Anidar coordinadores dentro de sus gerentes
    gerentes.forEach((ger) => {
      ger.coordinadores = coordinadores.filter((c) => c.responsable_directo_id === ger.id);
    });

    return {
      superadministradores: superadmins,
      gerentes,
      personalAtencion: atencion,
      totalColaboradores: todosUsuarios.length,
    };
  }

  /**
   * Ejecuta un traspaso administrativo de personal con auditoría inmutable
   */
  async ejecutarTraspasoPersonal(
    datos: DatosTraspasoPersonal,
    organizacionId: string,
    usuarioOperadorId: string
  ): Promise<{ exito: boolean; error?: string; registroAuditoriaId?: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    // 1. Validar permisos del operador (Un coordinador no puede hacer traspasos)
    const { data: usuarioOperador } = await supabase
      .from("usuarios")
      .select("id, rol_jerarquico")
      .eq("id", usuarioOperadorId)
      .single();

    if (
      !usuarioOperador ||
      (usuarioOperador.rol_jerarquico !== "gerente" &&
        usuarioOperador.rol_jerarquico !== "superadministrador")
    ) {
      return {
        exito: false,
        error:
          "Permiso denegado: únicamente los Gerentes y Superadministradores están autorizados para realizar traspasos de personal.",
      };
    }

    // 2. Obtener datos del usuario a transferir
    const { data: transferido, error: errTransferido } = await supabase
      .from("usuarios")
      .select("id, nombre_completo, rol_jerarquico, responsable_directo_id")
      .eq("id", datos.usuarioTransferidoId)
      .single();

    if (errTransferido || !transferido) {
      return { exito: false, error: "El usuario a transferir no existe o no fue encontrado." };
    }

    // 3. Validar nuevo responsable según el tipo de movimiento
    const { data: nuevoResponsable, error: errNuevo } = await supabase
      .from("usuarios")
      .select("id, nombre_completo, rol_jerarquico")
      .eq("id", datos.responsableNuevoId)
      .single();

    if (errNuevo || !nuevoResponsable) {
      return { exito: false, error: "El nuevo responsable asignado no existe." };
    }

    if (datos.tipoMovimiento === "traspaso_coordinador") {
      if (transferido.rol_jerarquico !== "coordinador") {
        return {
          exito: false,
          error: "El usuario seleccionado no tiene rol de Coordinador.",
        };
      }
      if (nuevoResponsable.rol_jerarquico !== "gerente") {
        return {
          exito: false,
          error: "Un Coordinador solo puede ser transferido a otro Gerente.",
        };
      }
    } else if (datos.tipoMovimiento === "traspaso_asesor") {
      if (transferido.rol_jerarquico !== "asesor") {
        return {
          exito: false,
          error: "El usuario seleccionado no tiene rol de Asesor.",
        };
      }
      if (nuevoResponsable.rol_jerarquico !== "coordinador") {
        return {
          exito: false,
          error: "Un Asesor solo puede ser transferido a otro Coordinador.",
        };
      }
    }

    // 4. Actualizar responsable directo del usuario transferido
    // (Nota: Si es coordinador, sus asesores conservan su relación jerárquica con él)
    const { error: errUpdate } = await supabase
      .from("usuarios")
      .update({
        responsable_directo_id: datos.responsableNuevoId,
      })
      .eq("id", datos.usuarioTransferidoId);

    if (errUpdate) {
      return { exito: false, error: `Error al actualizar jerarquía: ${errUpdate.message}` };
    }

    // 5. Registrar en bitácora forense de auditoría
    const { data: audit, error: errAudit } = await supabase
      .from("auditoria_traspasos_personal")
      .insert({
        organizacion_id: organizacionId,
        usuario_responsable_movimiento_id: usuarioOperadorId,
        usuario_transferido_id: datos.usuarioTransferidoId,
        responsable_anterior_id: transferido.responsable_directo_id,
        responsable_nuevo_id: datos.responsableNuevoId,
        tipo_movimiento: datos.tipoMovimiento,
        motivo: datos.motivo || "Reorganización comercial de estructura",
      })
      .select("id")
      .single();

    if (errAudit) {
      console.error("[Auditoría] Error al registrar traspaso:", errAudit);
    }

    return {
      exito: true,
      registroAuditoriaId: audit?.id,
    };
  }

  /**
   * Consulta el historial de traspasos de personal
   */
  async listarAuditoriaTraspasos(
    organizacionId: string,
    limite = 50
  ): Promise<AuditoriaTraspasoPersonal[]> {
    const supabase = crearClienteSupabaseAdministrador();

    const { data, error } = await supabase
      .from("auditoria_traspasos_personal")
      .select(`
        id,
        organizacion_id,
        usuario_responsable_movimiento_id,
        usuario_responsable:usuarios!auditoria_traspasos_personal_usuario_responsable_movimien_fkey (
          id, nombre_completo, correo_electronico
        ),
        usuario_transferido_id,
        usuario_transferido:usuarios!auditoria_traspasos_personal_usuario_transferido_id_fkey (
          id, nombre_completo, correo_electronico, rol_jerarquico
        ),
        responsable_anterior_id,
        responsable_anterior:usuarios!auditoria_traspasos_personal_responsable_anterior_id_fkey (
          id, nombre_completo
        ),
        responsable_nuevo_id,
        responsable_nuevo:usuarios!auditoria_traspasos_personal_responsable_nuevo_id_fkey (
          id, nombre_completo
        ),
        tipo_movimiento,
        motivo,
        fecha_movimiento
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_movimiento", { ascending: false })
      .limit(limite);

    if (error) {
      console.error("[Auditoría] Error al listar traspasos:", error);
      return [];
    }

    return (data as any) || [];
  }
}

export const servicioEstructuraOrganizacional = new ServicioEstructuraOrganizacional();
