// ==============================================================================
// IRIS by WYLEN — RESOLUTOR DEL CONTEXTO DE INQUILINO (TENANT)
// ==============================================================================

import { redirect } from "next/navigation";
import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type { ContextoInquilino, Membresia } from "@/tipos/identidad";

export class ErrorAutenticacion extends Error {
  constructor(mensaje: string = "Sesión no autenticada") {
    super(mensaje);
    this.name = "ErrorAutenticacion";
  }
}

export class ErrorMembresiaInvalida extends Error {
  constructor(mensaje: string = "El usuario no cuenta con una membresía activa en ninguna organización.") {
    super(mensaje);
    this.name = "ErrorMembresiaInvalida";
  }
}

/**
 * Resuelve y valida el contexto de inquilino para el usuario autenticado actual.
 * Ejecuta validaciones estrictas en el servidor y nunca confía en parámetros del cliente.
 */
export async function obtenerContextoInquilino(
  opciones: { redirigirSiNoAutenticado?: boolean } = { redirigirSiNoAutenticado: true }
): Promise<ContextoInquilino | null> {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    if (opciones.redirigirSiNoAutenticado) {
      redirect("/iniciar-sesion");
    }
    return null;
  }

  // 1. Obtener la membresía activa predeterminada del usuario
  // Se utiliza el cliente administrativo interno para resolver la entidad y rol del usuario
  // cuya sesión e identidad ya fueron estrictamente validadas con auth.getUser().
  const clienteAdmin = crearClienteSupabaseAdministrador();

  const { data: membresiaData, error: errorMembresia } = await clienteAdmin
    .from("membresias")
    .select(`
      id,
      organizacion_id,
      usuario_id,
      rol_id,
      estado,
      es_predeterminada,
      fecha_creacion,
      fecha_actualizacion,
      organizacion:organizaciones (
        id,
        nombre,
        slug,
        identificador_fiscal,
        dominio,
        estado,
        configuracion,
        fecha_creacion,
        fecha_actualizacion
      ),
      rol:roles (
        id,
        organizacion_id,
        codigo,
        nombre,
        descripcion,
        es_sistema,
        fecha_creacion,
        roles_permisos (
          permisos (
            id,
            codigo,
            modulo,
            descripcion,
            fecha_creacion
          )
        )
      )
    `)
    .eq("usuario_id", user.id)
    .eq("estado", "activo")
    .order("es_predeterminada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorMembresia || !membresiaData) {
    // Si la base de datos aún no tiene el registro en membresias (ej. desarrollo inicial o usuario huérfano)
    const { data: perfilUsuario } = await clienteAdmin
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!membresiaData) {
      // Si no hay membresía vinculada
      throw new ErrorMembresiaInvalida();
    }
  }

  // Estructurar permisos planos para evaluación rápida O(1)
  const rolData = (membresiaData as any).rol;
  const listaPermisos: string[] = [];

  if (rolData && rolData.roles_permisos) {
    for (const rp of rolData.roles_permisos) {
      if (rp.permisos && rp.permisos.codigo) {
        listaPermisos.push(rp.permisos.codigo);
      }
    }
  }

  const organizacionData = (membresiaData as any).organizacion;

  return {
    organizacionId: membresiaData.organizacion_id,
    organizacion: organizacionData,
    usuarioId: user.id,
    usuario: {
      id: user.id,
      correo_electronico: user.email || "",
      nombre_completo: user.user_metadata?.nombre_completo || user.email || "Usuario IRIS",
      telefono: user.phone || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      estado: "activo",
      fecha_creacion: user.created_at,
      fecha_actualizacion: user.updated_at || user.created_at,
    },
    membresiaId: membresiaData.id,
    rol: {
      id: rolData.id,
      organizacion_id: rolData.organizacion_id,
      codigo: rolData.codigo,
      nombre: rolData.nombre,
      descripcion: rolData.descripcion,
      es_sistema: rolData.es_sistema,
      fecha_creacion: rolData.fecha_creacion,
    },
    permisos: listaPermisos,
  };
}
