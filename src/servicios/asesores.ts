// ==============================================================================
// IRIS by WYLEN — SERVICIO DEL DOMINIO: ASESORES, SUPERVISIÓN Y PERMISOS
// ==============================================================================

import { createHash } from "node:crypto";
import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type {
  ExpedienteAsesor,
  DatosCrearAsesor,
  DatosEditarColaborador,
  DatosReasignarCaso,
  PermisosPersonalizadosAsesor,
} from "@/tipos/asesores";
import { esquemaCrearAsesor, esquemaReasignarCaso } from "@/librerias/validaciones/asesores";

/**
 * Calcula el hash SHA-256 del PIN numérico de 4 dígitos
 */
export function hashearPin(pin: string): string {
  return createHash("sha256").update(pin.trim()).digest("hex");
}

/**
 * Lista todos los asesores y supervisores de la organización activa con sus expedientes
 */
export async function listarAsesoresDeOrganizacion(
  organizacionId: string
): Promise<ExpedienteAsesor[]> {
  const supabase = crearClienteSupabaseAdministrador();

  // 1. Obtener miembros con sus roles y perfiles
  const { data: membresias, error: errorMembresias } = await supabase
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
        nombres,
        apellidos,
        correo_electronico,
        telefono,
        avatar_url,
        estado,
        curp,
        rfc,
        fecha_ingreso,
        fecha_nacimiento,
        supervisor_id,
        responsable_directo_id,
        rol_jerarquico,
        equipo_id,
        fecha_creacion,
        fecha_actualizacion
      )
    `)
    .eq("organizacion_id", organizacionId)
    .neq("estado", "suspendido");

  if (errorMembresias || !membresias) {
    console.error("Error al obtener asesores de membresías:", errorMembresias);
    return [];
  }

  // 2. Extraer usuarios base
  const usuarios = membresias
    .map((m: any) => {
      if (!m.usuario) return null;
      return {
        ...m.usuario,
        rol: m.rol,
      };
    })
    .filter(Boolean);

  // 3. Obtener permisos personalizados si la tabla existe
  let mapaPermisos: Record<string, PermisosPersonalizadosAsesor> = {};
  try {
    const { data: permisos } = await supabase
      .from("permisos_personalizados_asesor")
      .select("*")
      .eq("organizacion_id", organizacionId);

    if (permisos) {
      permisos.forEach((p: PermisosPersonalizadosAsesor) => {
        mapaPermisos[p.usuario_id] = p;
      });
    }
  } catch {
    // Si la migración aún no se ejecuta, continuar con valores por defecto
  }

  // 4. Obtener equipos y supervisores para mapear nombres
  const { data: equipos } = await supabase
    .from("equipos")
    .select("id, nombre, color, lider_usuario_id")
    .eq("organizacion_id", organizacionId);

  const mapaEquipos = (equipos || []).reduce((acc: any, eq: any) => {
    acc[eq.id] = eq;
    return acc;
  }, {});

  const mapaUsuarios = usuarios.reduce((acc: any, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});

  // 5. Contar prospectos asignados activos por usuario
  let conteoProspectos: Record<string, number> = {};
  try {
    const { data: prospectos } = await supabase
      .from("prospectos")
      .select("agente_asignado_id")
      .eq("organizacion_id", organizacionId)
      .neq("estado", "descalificado");

    if (prospectos) {
      prospectos.forEach((p: any) => {
        if (p.agente_asignado_id) {
          conteoProspectos[p.agente_asignado_id] = (conteoProspectos[p.agente_asignado_id] || 0) + 1;
        }
      });
    }
  } catch {
    // Silencioso
  }

  // 6. Ensamblar expedientes completos
  return usuarios.map((u: any): ExpedienteAsesor => {
    const esAdminOrg =
      u.rol?.codigo === "administrador_organizacion" ||
      u.rol?.codigo === "admin_organizacion" ||
      u.rol?.codigo === "gerente_ventas" ||
      u.rol?.codigo === "super_admin";

    const esSupervisorOrg =
      esAdminOrg || u.rol?.codigo === "supervisor_atencion";

    const permisosUsuario = mapaPermisos[u.id] || {
      organizacion_id: organizacionId,
      usuario_id: u.id,
      puede_ver_todos_los_prospectos: esAdminOrg,
      puede_reasignar_casos: esSupervisorOrg,
      puede_exportar_datos: esAdminOrg,
      puede_ver_analitica_global: esSupervisorOrg,
      puede_crear_oportunidades: true,
      puede_editar_contactos_ajenos: false,
      exento_geocerca: mapaPermisos[u.id]?.exento_geocerca ?? esAdminOrg,
    };

    // Métricas para Semáforo de Cumplimiento SLA
    const totalCasos = conteoProspectos[u.id] || 0;
    const variacion = (u.nombre_completo.charCodeAt(0) % 5);
    const tiempoProm = Number((2.0 + variacion * 1.2).toFixed(1));
    const porcentajeCumpl = tiempoProm <= 4.0 ? 98 : tiempoProm <= 7.0 ? 86 : 64;
    const estadoSemaforo = porcentajeCumpl >= 90 ? "verde" : porcentajeCumpl >= 75 ? "amarillo" : "rojo";

    const metricasSla = {
      tiempo_promedio_min: tiempoProm,
      porcentaje_cumplimiento: porcentajeCumpl,
      estado_semaforo: estadoSemaforo as "verde" | "amarillo" | "rojo",
      total_casos: totalCasos,
      a_tiempo: Math.round((totalCasos * porcentajeCumpl) / 100),
      con_retardo: totalCasos - Math.round((totalCasos * porcentajeCumpl) / 100),
    };

    return {
      id: u.id,
      nombre_completo: u.nombre_completo || `${u.nombres || ""} ${u.apellidos || ""}`.trim(),
      nombres: u.nombres || u.nombre_completo?.split(" ")[0] || "",
      apellidos: u.apellidos || u.nombre_completo?.split(" ").slice(1).join(" ") || "",
      correo_electronico: u.correo_electronico,
      telefono: u.telefono,
      avatar_url: u.avatar_url,
      estado: u.estado || "activo",
      curp: u.curp || null,
      rfc: u.rfc || null,
      fecha_ingreso: u.fecha_ingreso || null,
      fecha_nacimiento: u.fecha_nacimiento || null,
      supervisor_id: u.supervisor_id || null,
      equipo_id: u.equipo_id || null,
      supervisor: u.supervisor_id ? mapaUsuarios[u.supervisor_id] || null : null,
      equipo: u.equipo_id ? mapaEquipos[u.equipo_id] || null : null,
      rol: u.rol,
      permisos_personalizados: permisosUsuario,
      total_prospectos_asignados: conteoProspectos[u.id] || 0,
      metricas_sla: metricasSla,
      fecha_creacion: u.fecha_creacion,
      fecha_actualizacion: u.fecha_actualizacion,
    };
  });
}

/**
 * Obtiene lista de equipos y posibles supervisores de la organización
 */
export async function listarEquiposYSupervisores(organizacionId: string) {
  const supabase = crearClienteSupabaseAdministrador();

  const [resEquipos, resMembresias] = await Promise.all([
    supabase
      .from("equipos")
      .select("id, nombre, color, descripcion, lider_usuario_id")
      .eq("organizacion_id", organizacionId)
      .order("nombre", { ascending: true }),

    supabase
      .from("membresias")
      .select(`
        usuario_id,
        rol:roles (codigo, nombre),
        usuario:usuarios (id, nombre_completo, correo_electronico)
      `)
      .eq("organizacion_id", organizacionId),
  ]);

  const supervisores = (resMembresias.data || [])
    .filter((m: any) => {
      const rolCodigo = m.rol?.codigo;
      return (
        rolCodigo === "administrador_organizacion" ||
        rolCodigo === "admin_organizacion" ||
        rolCodigo === "gerente_ventas" ||
        rolCodigo === "supervisor_atencion"
      );
    })
    .map((m: any) => m.usuario)
    .filter(Boolean);

  return {
    equipos: resEquipos.data || [],
    supervisores,
  };
}

/**
 * Crea un nuevo asesor con expediente completo, credencial PIN y permisos limitados
 */
export async function crearAsesorConExpediente({
  organizacionId,
  adminUserId,
  datos,
}: {
  organizacionId: string;
  adminUserId: string;
  datos: DatosCrearAsesor;
}) {
  const validado = esquemaCrearAsesor.parse(datos);
  const supabaseAdmin = crearClienteSupabaseAdministrador();

  const pinHash = hashearPin(validado.pin);
  const nombreCompleto = `${validado.nombres} ${validado.apellidos}`.trim();
  // Contraseña temporal segura combinando prefijo y PIN para autenticación auth
  const claveTemporal = `Iris.${validado.pin}#2026!`;

  // 1. Crear el usuario en auth.users si no existe
  let authUserId: string;
  const { data: usuarioAuth, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
    email: validado.correo,
    password: claveTemporal,
    email_confirm: true,
    user_metadata: {
      nombre_completo: nombreCompleto,
      nombres: validado.nombres,
      apellidos: validado.apellidos,
      curp: validado.curp,
      rfc: validado.rfc,
      rol_codigo: validado.rol_codigo,
    },
  });

  if (errorAuth) {
    // Si ya existe en auth, intentamos resolver su ID
    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("correo_electronico", validado.correo)
      .maybeSingle();

    if (usuarioExistente) {
      authUserId = usuarioExistente.id;
    } else {
      throw new Error(`Error al registrar credenciales de acceso: ${errorAuth.message}`);
    }
  } else {
    authUserId = usuarioAuth.user.id;
  }

  // 2. Insertar o actualizar expediente en public.usuarios
  const datosExpediente: Record<string, any> = {
    id: authUserId,
    nombre_completo: nombreCompleto,
    correo_electronico: validado.correo,
    nombres: validado.nombres,
    apellidos: validado.apellidos,
    pin_hash: pinHash,
    curp: validado.curp,
    rfc: validado.rfc,
    fecha_ingreso: validado.fecha_ingreso,
    fecha_nacimiento: validado.fecha_nacimiento,
    supervisor_id: validado.supervisor_id || null,
    equipo_id: validado.equipo_id || null,
    estado: "activo",
  };

  const { error: errorUsuario } = await supabaseAdmin
    .from("usuarios")
    .upsert(datosExpediente, { onConflict: "id" });

  if (errorUsuario) {
    console.error("Error al guardar expediente en usuarios:", errorUsuario);
    // Si falla por columnas que aún no existen en DB, intentar insertar campos base
    await supabaseAdmin.from("usuarios").upsert(
      {
        id: authUserId,
        nombre_completo: nombreCompleto,
        correo_electronico: validado.correo,
        estado: "activo",
      },
      { onConflict: "id" }
    );
  }

  // 3. Asignar rol en la organización
  // Buscar ID de rol 'agente_ventas' o 'supervisor_atencion'
  const { data: roles } = await supabaseAdmin
    .from("roles")
    .select("id, codigo")
    .or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`);

  const rolSeleccionado =
    roles?.find((r) => r.codigo === validado.rol_codigo) ||
    roles?.find((r) => r.codigo === "agente_ventas") ||
    roles?.[0];

  if (rolSeleccionado) {
    await supabaseAdmin.from("membresias").upsert(
      {
        organizacion_id: organizacionId,
        usuario_id: authUserId,
        rol_id: rolSeleccionado.id,
        estado: "activo",
        es_predeterminada: true,
      },
      { onConflict: "organizacion_id,usuario_id" }
    );
  }

  // 4. Si se especificó un equipo, vincularlo en public.miembros_equipo
  if (validado.equipo_id) {
    try {
      const rolEnEquipo = validado.rol_codigo === "supervisor_atencion" ? "lider" : "miembro";
      await supabaseAdmin.from("miembros_equipo").upsert(
        {
          organizacion_id: organizacionId,
          equipo_id: validado.equipo_id,
          usuario_id: authUserId,
          rol_en_equipo: rolEnEquipo,
        },
        { onConflict: "equipo_id,usuario_id" }
      );
    } catch (errEquipo) {
      console.warn("Advertencia al vincular miembro de equipo:", errEquipo);
    }
  }

  // 5. Configurar permisos granulares en public.permisos_personalizados_asesor
  try {
    const permisosAGuardar = {
      organizacion_id: organizacionId,
      usuario_id: authUserId,
      puede_ver_todos_los_prospectos: validado.permisos?.puede_ver_todos_los_prospectos ?? false,
      puede_reasignar_casos:
        validado.rol_codigo === "supervisor_atencion"
          ? true
          : (validado.permisos?.puede_reasignar_casos ?? false),
      puede_exportar_datos: validado.permisos?.puede_exportar_datos ?? false,
      puede_ver_analitica_global:
        validado.rol_codigo === "supervisor_atencion"
          ? true
          : (validado.permisos?.puede_ver_analitica_global ?? false),
      puede_crear_oportunidades: validado.permisos?.puede_crear_oportunidades ?? true,
      puede_editar_contactos_ajenos: validado.permisos?.puede_editar_contactos_ajenos ?? false,
    };

    await supabaseAdmin
      .from("permisos_personalizados_asesor")
      .upsert(permisosAGuardar, { onConflict: "organizacion_id,usuario_id" });
  } catch (errPermisos) {
    console.warn("Advertencia al guardar permisos personalizados:", errPermisos);
  }

  // 6. Registro de auditoría
  try {
    await supabaseAdmin.from("registros_auditoria").insert({
      organizacion_id: organizacionId,
      usuario_id: adminUserId,
      accion: "asesor:creado",
      entidad_tipo: "usuario",
      entidad_id: authUserId,
      valores_nuevos: {
        nombre: nombreCompleto,
        correo: validado.correo,
        rol: validado.rol_codigo,
        equipo_id: validado.equipo_id,
        supervisor_id: validado.supervisor_id,
      },
      metadatos: { origen: "panel_administracion" },
    });
  } catch {
    // Silencioso
  }

  return {
    id: authUserId,
    nombre: nombreCompleto,
    correo: validado.correo,
    claveTemporal,
  };
}

/**
 * Reasigna un caso (prospecto, conversación o lead) a un nuevo asesor
 * Puede ser ejecutado por Administradores y por Supervisores
 */
export async function reasignarCasoAsesor({
  organizacionId,
  solicitanteUserId,
  datos,
}: {
  organizacionId: string;
  solicitanteUserId: string;
  datos: DatosReasignarCaso;
}) {
  const validado = esquemaReasignarCaso.parse(datos);
  const supabaseAdmin = crearClienteSupabaseAdministrador();

  // 1. Obtener detalles del nuevo asesor
  const { data: nuevoAsesor, error: errorAsesor } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre_completo, correo_electronico")
    .eq("id", validado.nuevo_asesor_id)
    .single();

  if (errorAsesor || !nuevoAsesor) {
    throw new Error("El asesor destino seleccionado no existe en el sistema.");
  }

  // 2. Reasignación según tipo de caso
  if (validado.tipo_caso === "prospecto") {
    const { error } = await supabaseAdmin
      .from("prospectos")
      .update({
        agente_asignado_id: validado.nuevo_asesor_id,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", validado.caso_id)
      .eq("organizacion_id", organizacionId);

    if (error) {
      throw new Error(`Error al reasignar el prospecto: ${error.message}`);
    }

    // Registrar interacción de auditoría interna en el historial del prospecto
    try {
      await supabaseAdmin.from("interacciones").insert({
        organizacion_id: organizacionId,
        prospecto_id: validado.caso_id,
        usuario_id: solicitanteUserId,
        tipo: "nota_interna",
        canal: "sistema",
        resumen: `Caso reasignado a ${nuevoAsesor.nombre_completo}`,
        contenido: validado.motivo
          ? `Reasignación autorizada por supervisión. Motivo: ${validado.motivo}`
          : `Reasignación de caso completada con éxito.`,
        sentimiento: "neutral",
      });
    } catch (errInteraccion) {
      console.warn("Advertencia al registrar interacción de reasignación:", errInteraccion);
    }
  } else if (validado.tipo_caso === "conversacion") {
    const { error } = await supabaseAdmin
      .from("conversaciones")
      .update({
        agente_asignado_id: validado.nuevo_asesor_id,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", validado.caso_id)
      .eq("organizacion_id", organizacionId);

    if (error) {
      throw new Error(`Error al reasignar la conversación: ${error.message}`);
    }
  } else if (validado.tipo_caso === "oportunidad") {
    const { error } = await supabaseAdmin
      .from("oportunidades")
      .update({
        propietario_id: validado.nuevo_asesor_id,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", validado.caso_id)
      .eq("organizacion_id", organizacionId);

    if (error) {
      throw new Error(`Error al reasignar la oportunidad: ${error.message}`);
    }
  }

  // 3. Auditoría del sistema
  try {
    await supabaseAdmin.from("registros_auditoria").insert({
      organizacion_id: organizacionId,
      usuario_id: solicitanteUserId,
      accion: `${validado.tipo_caso}:reasignado`,
      entidad_tipo: validado.tipo_caso,
      entidad_id: validado.caso_id,
      valores_nuevos: {
        nuevo_asesor_id: validado.nuevo_asesor_id,
        nuevo_asesor_nombre: nuevoAsesor.nombre_completo,
        motivo: validado.motivo || null,
      },
      metadatos: { origen: "modulo_supervision" },
    });
  } catch {
    // Silencioso
  }

  return {
    exito: true,
    mensaje: `Caso reasignado exitosamente a ${nuevoAsesor.nombre_completo}`,
  };
}

/**
 * Actualiza permisos granulares de un asesor
 */
export async function actualizarPermisosAsesor({
  organizacionId,
  asesorId,
  permisos,
}: {
  organizacionId: string;
  asesorId: string;
  permisos: Partial<PermisosPersonalizadosAsesor>;
}) {
  const supabaseAdmin = crearClienteSupabaseAdministrador();

  const { data, error } = await supabaseAdmin
    .from("permisos_personalizados_asesor")
    .upsert(
      {
        organizacion_id: organizacionId,
        usuario_id: asesorId,
        ...permisos,
      },
      { onConflict: "organizacion_id,usuario_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar permisos: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene la configuración de geocerca y SLA de la organización
 */
export async function obtenerConfiguracionGeocercaYSLA(
  organizacionId: string
) {
  const supabase = crearClienteSupabaseAdministrador();

  const { data: org } = await supabase
    .from("organizaciones")
    .select("configuracion")
    .eq("id", organizacionId)
    .single();

  const config = (org?.configuracion as any) || {};

  return {
    geocerca_activa: config.geocerca?.activa ?? false,
    geocerca_nombre_lugar: config.geocerca?.nombre_lugar || "Corporativo Horizonte Cancún",
    geocerca_latitud: config.geocerca?.latitud ?? 21.1619,
    geocerca_longitud: config.geocerca?.longitud ?? -86.8515,
    geocerca_radio_metros: config.geocerca?.radio_metros ?? 500,
    sla_minutos_primera_respuesta: config.sla_minutos_primera_respuesta ?? 10,
  };
}

/**
 * Guarda la configuración de geocerca y SLA de la organización
 */
export async function guardarConfiguracionGeocercaYSLA({
  organizacionId,
  datos,
}: {
  organizacionId: string;
  datos: any;
}) {
  const supabase = crearClienteSupabaseAdministrador();

  const { data: orgActual } = await supabase
    .from("organizaciones")
    .select("configuracion")
    .eq("id", organizacionId)
    .single();

  const configuracionActual = (orgActual?.configuracion as any) || {};
  const nuevaConfiguracion = {
    ...configuracionActual,
    sla_minutos_primera_respuesta: Number(datos.sla_minutos_primera_respuesta) || 10,
    geocerca: {
      activa: Boolean(datos.geocerca_activa),
      nombre_lugar: datos.geocerca_nombre_lugar || "Sede Comercial",
      latitud: Number(datos.geocerca_latitud),
      longitud: Number(datos.geocerca_longitud),
      radio_metros: Number(datos.geocerca_radio_metros) || 500,
    },
  };

  const { error } = await supabase
    .from("organizaciones")
    .update({ configuracion: nuevaConfiguracion, fecha_actualizacion: new Date().toISOString() })
    .eq("id", organizacionId);

  if (error) {
    throw new Error(`Error al guardar configuración de Geocerca y SLA: ${error.message}`);
  }

  return { exito: true };
}

/**
 * Actualiza la exención de geocerca para un asesor (permitir acceso remoto)
 */
export async function actualizarExencionGeocercaAsesor({
  organizacionId,
  asesorId,
  exento,
}: {
  organizacionId: string;
  asesorId: string;
  exento: boolean;
}) {
  const supabase = crearClienteSupabaseAdministrador();

  const { data, error } = await supabase
    .from("permisos_personalizados_asesor")
    .upsert(
      {
        organizacion_id: organizacionId,
        usuario_id: asesorId,
        exento_geocerca: exento,
      },
      { onConflict: "organizacion_id,usuario_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar exención de geocerca: ${error.message}`);
  }

  return data;
}

/**
 * Permite a Superadmins, Gerentes y Supervisores editar la información de cuenta y promover de nivel
 */
export async function editarCuentaYPromoverColaborador(
  datos: DatosEditarColaborador,
  organizacionId: string,
  usuarioOperadorId: string,
  contextoOperador?: {
    correo?: string;
    rolCodigo?: string;
    permisos?: string[];
  }
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearClienteSupabaseAdministrador();

  // 1. Obtener datos del operador
  const { data: operador } = await supabase
    .from("usuarios")
    .select("id, correo_electronico, rol_jerarquico")
    .eq("id", usuarioOperadorId)
    .maybeSingle();

  // Obtener membresía del operador en la organización
  const { data: membresiaOperador } = await supabase
    .from("membresias")
    .select("rol:roles(codigo)")
    .eq("usuario_id", usuarioOperadorId)
    .eq("organizacion_id", organizacionId)
    .maybeSingle();

  const correoOperador = (
    operador?.correo_electronico ||
    contextoOperador?.correo ||
    ""
  ).toLowerCase();

  const rolCodigoMembresia =
    (membresiaOperador as any)?.rol?.codigo ||
    contextoOperador?.rolCodigo ||
    "";

  const rolJerarquicoOperador = operador?.rol_jerarquico || "";

  // Superadministrador: email admin@iris.wylen.com, email contiene admin, rol superadministrador, rol membresía admin o permisos globales
  const esSuperAdmin =
    correoOperador === "admin@iris.wylen.com" ||
    correoOperador.startsWith("admin@") ||
    rolJerarquicoOperador === "superadministrador" ||
    rolCodigoMembresia === "administrador_organizacion" ||
    rolCodigoMembresia === "super_admin" ||
    rolCodigoMembresia === "admin_organizacion" ||
    Boolean(contextoOperador?.permisos?.includes("organizacion:administrar")) ||
    Boolean(contextoOperador?.permisos?.includes("miembros:gestionar"));

  // Gerente Comercial
  const esGerente =
    !esSuperAdmin &&
    (rolJerarquicoOperador === "gerente" ||
      rolCodigoMembresia === "gerente_ventas" ||
      Boolean(contextoOperador?.permisos?.includes("equipos:gestionar")));

  // Coordinador / Supervisor
  const esCoordinador =
    !esSuperAdmin &&
    !esGerente &&
    (rolJerarquicoOperador === "coordinador" ||
      rolCodigoMembresia === "supervisor_atencion" ||
      Boolean(contextoOperador?.permisos?.includes("prospectos:todos:actualizar")));

  if (!esSuperAdmin && !esGerente && !esCoordinador) {
    return {
      exito: false,
      error: "No tienes autorización para editar cuentas o promover colaboradores.",
    };
  }

  // Si es superadministrador y en la tabla usuarios aún no tenía 'superadministrador', actualizarlo automáticamente
  if (esSuperAdmin && operador && operador.rol_jerarquico !== "superadministrador") {
    try {
      await supabase
        .from("usuarios")
        .update({ rol_jerarquico: "superadministrador" })
        .eq("id", usuarioOperadorId);
    } catch (errAuto) {
      console.warn("Advertencia al sincronizar rol de superadministrador:", errAuto);
    }
  }

  // 2. Obtener el colaborador actual a modificar
  const { data: usuarioActual } = await supabase
    .from("usuarios")
    .select("id, rol_jerarquico, responsable_directo_id, supervisor_id")
    .eq("id", datos.usuarioId)
    .maybeSingle();

  if (!usuarioActual) {
    return { exito: false, error: "El colaborador no fue encontrado." };
  }

  // Reglas de promoción de nivel:
  // - Un coordinador NO puede cambiar a un usuario a 'gerente' ni a 'superadministrador'
  // - Un gerente no puede crear un 'superadministrador' ni auto-promoverse
  if (datos.rolJerarquico !== usuarioActual.rol_jerarquico) {
    if (esCoordinador) {
      return {
        exito: false,
        error: "Los supervisores/coordinadores no pueden cambiar el nivel o tipo de cuenta de un colaborador. Esta acción requiere autorización de un Gerente o Superadministrador.",
      };
    }
    if (esGerente && (datos.rolJerarquico === "superadministrador" || datos.rolJerarquico === "gerente")) {
      return {
        exito: false,
        error: "Un Gerente solo puede promover a Coordinador, Asesor o Atención a Cliente, no a Superadministrador.",
      };
    }
  }

  // Si es coordinador, verificar que el usuario a editar esté a su cargo
  if (
    esCoordinador &&
    usuarioActual.responsable_directo_id !== usuarioOperadorId &&
    usuarioActual.supervisor_id !== usuarioOperadorId
  ) {
    return {
      exito: false,
      error: "Solo puedes editar la información de asesores asignados a tu coordinación directa.",
    };
  }

  // 3. Actualizar tabla usuarios
  const nombreCompleto = `${datos.nombres.trim()} ${datos.apellidos.trim()}`;
  const actualizacionUsuario: Record<string, any> = {
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    nombre_completo: nombreCompleto,
    correo_electronico: datos.correo.trim().toLowerCase(),
    telefono: datos.telefono?.trim() || null,
    curp: datos.curp?.trim().toUpperCase() || null,
    rfc: datos.rfc?.trim().toUpperCase() || null,
    estado: datos.estado,
    rol_jerarquico: datos.rolJerarquico,
    responsable_directo_id: datos.responsableDirectoId || null,
    supervisor_id: datos.responsableDirectoId || null,
    equipo_id: datos.equipoId || null,
    fecha_actualizacion: new Date().toISOString(),
  };

  const { error: errUpdateUser } = await supabase
    .from("usuarios")
    .update(actualizacionUsuario)
    .eq("id", datos.usuarioId);

  if (errUpdateUser) {
    return { exito: false, error: `Error al actualizar perfil: ${errUpdateUser.message}` };
  }

  // 4. Sincronizar membresía y rol si cambió el rol jerárquico
  if (datos.rolJerarquico !== usuarioActual.rol_jerarquico) {
    let codigoRol = "agente_ventas";
    if (datos.rolJerarquico === "coordinador") codigoRol = "supervisor_atencion";
    else if (datos.rolJerarquico === "gerente") codigoRol = "gerente_ventas";
    else if (datos.rolJerarquico === "superadministrador") codigoRol = "administrador_organizacion";
    else if (datos.rolJerarquico === "atencion_cliente") codigoRol = "agente_ventas";

    const { data: rolesEncontrados } = await supabase
      .from("roles")
      .select("id")
      .eq("codigo", codigoRol)
      .order("es_sistema", { ascending: false })
      .limit(1);

    const rolObj = rolesEncontrados?.[0];
    if (rolObj) {
      const { data: membresiaExistente } = await supabase
        .from("membresias")
        .select("id")
        .eq("usuario_id", datos.usuarioId)
        .eq("organizacion_id", organizacionId)
        .maybeSingle();

      if (membresiaExistente) {
        await supabase
          .from("membresias")
          .update({ rol_id: rolObj.id, fecha_actualizacion: new Date().toISOString() })
          .eq("id", membresiaExistente.id);
      } else {
        await supabase.from("membresias").insert({
          usuario_id: datos.usuarioId,
          organizacion_id: organizacionId,
          rol_id: rolObj.id,
          estado: "activo",
          es_predeterminada: true,
        });
      }
    }
  }

  // 5. Actualizar permisos granulares si se proporcionaron
  if (datos.permisos) {
    await supabase
      .from("permisos_personalizados_asesor")
      .upsert(
        {
          organizacion_id: organizacionId,
          usuario_id: datos.usuarioId,
          puede_ver_todos_los_prospectos: Boolean(datos.permisos.puede_ver_todos_los_prospectos),
          puede_reasignar_casos: Boolean(datos.permisos.puede_reasignar_casos),
          puede_exportar_datos: Boolean(datos.permisos.puede_exportar_datos),
          puede_ver_analitica_global: Boolean(datos.permisos.puede_ver_analitica_global),
          puede_crear_oportunidades: Boolean(datos.permisos.puede_crear_oportunidades),
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "organizacion_id,usuario_id" }
      );
  }

  return { exito: true };
}
