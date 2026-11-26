// ==============================================================================
// IRIS by WYLEN — SERVICIOS DE COMUNICACIÓN OMNICANAL Y MOTOR DE SLA
// ==============================================================================

import { crearClienteSupabaseServidor, crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";
import {
  adaptadorWhatsApp,
  type PayloadMensajeNormalizado,
  type PayloadEstadoMensaje,
} from "@/librerias/adaptadores/whatsapp";
import type {
  Conversacion,
  Mensaje,
  EstadoEntregaMensaje,
  CuentaCanal,
} from "@/tipos/omnicanal";

export class ServicioComunicacion {
  // ----------------------------------------------------------------------------
  // 1. PROCESAMIENTO IDEMPOTENTE DE MENSAJES ENTRANTES (WEBHOOK)
  // ----------------------------------------------------------------------------

  async procesarMensajeEntrante(payload: PayloadMensajeNormalizado) {
    const supabaseAdmin = crearClienteSupabaseAdministrador();

    // 1. Buscar la cuenta del canal explícitamente por su Phone Number ID (aislamiento multiempresa estricto)
    const { data: cuentaCanal, error: errCuenta } = await supabaseAdmin
      .from("cuentas_canal")
      .select("id, organizacion_id, credenciales_cifradas, estado, organizacion:organizaciones(configuracion)")
      .eq("proveedor_cuenta_id", payload.proveedorCuentaId)
      .eq("estado", "conectado")
      .maybeSingle();

    if (errCuenta || !cuentaCanal) {
      console.error(
        `[Omnicanal] Mensaje entrante rechazado: no existe cuenta_canal conectada para proveedor_cuenta_id=${payload.proveedorCuentaId}`
      );
      return { procesado: false, razon: "cuenta_canal_no_encontrada" };
    }

    const organizacionId = cuentaCanal.organizacion_id;

    // 2. Comprobar Idempotencia: Verificar si el mensaje ya fue insertado previamente
    const { data: mensajeExistente } = await supabaseAdmin
      .from("mensajes")
      .select("id")
      .eq("proveedor_mensaje_id", payload.proveedorMensajeId)
      .maybeSingle();

    if (mensajeExistente) {
      // Mensaje ya procesado (reintento del proveedor). Retornar éxito inmediato sin duplicar.
      return { procesado: true, mensajeId: mensajeExistente.id, duplicado: true };
    }

    // 3. Buscar o crear la Conversación para este cliente
    let conversacionId: string;
    let noLeidosActuales = 0;
    const { data: conversacionExistente } = await supabaseAdmin
      .from("conversaciones")
      .select("id, estado, agente_asignado_actual_id, contacto_id, prospecto_id, no_leidos_agente")
      .eq("cuenta_canal_id", cuentaCanal.id)
      .eq("identificador_remoto_cliente", payload.remitenteTelefono)
      .maybeSingle();

    if (conversacionExistente) {
      conversacionId = conversacionExistente.id;
      noLeidosActuales = conversacionExistente.no_leidos_agente || 0;

      // Si la conversación estaba cerrada, se reabre automáticamente
      if (conversacionExistente.estado === "cerrada") {
        await supabaseAdmin
          .from("conversaciones")
          .update({
            estado: conversacionExistente.agente_asignado_actual_id ? "asignada" : "no_asignada",
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq("id", conversacionId);

        await supabaseAdmin.from("eventos_conversacion").insert({
          organizacion_id: organizacionId,
          conversacion_id: conversacionId,
          tipo_evento: "reapertura",
          detalles: { motivo: "nuevo_mensaje_cliente_entrante" },
        });
      }
    } else {
      // Intentar vincular con Contacto o Prospecto existente por teléfono
      const { data: contacto } = await supabaseAdmin
        .from("contactos")
        .select("id")
        .eq("organizacion_id", organizacionId)
        .eq("telefono_principal", payload.remitenteTelefono)
        .maybeSingle();

      const { data: prospecto } = !contacto
        ? await supabaseAdmin
            .from("prospectos")
            .select("id")
            .eq("organizacion_id", organizacionId)
            .eq("telefono", payload.remitenteTelefono)
            .maybeSingle()
        : { data: null };

      // Crear nueva conversación
      const { data: nuevaConv, error: errConv } = await supabaseAdmin
        .from("conversaciones")
        .insert({
          organizacion_id: organizacionId,
          cuenta_canal_id: cuentaCanal.id,
          identificador_remoto_cliente: payload.remitenteTelefono,
          nombre_remoto_cliente: payload.remitenteNombre,
          contacto_id: contacto?.id || null,
          prospecto_id: prospecto?.id || null,
          estado: "no_asignada",
          prioridad: "media",
          ultimo_mensaje_texto: payload.contenidoTexto || `[Adjunto: ${payload.tipoContenido}]`,
          fecha_ultimo_mensaje: payload.marcaTiempoProveedor,
          no_leidos_agente: 1,
        })
        .select("id")
        .single();

      if (errConv || !nuevaConv) {
        throw new Error(`Error al crear conversación: ${errConv?.message}`);
      }

      conversacionId = nuevaConv.id;

      // Registrar evento de creación
      await supabaseAdmin.from("eventos_conversacion").insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        tipo_evento: "creacion",
        detalles: { canal: "whatsapp_cloud", remitente: payload.remitenteTelefono },
      });
    }

    // 4. Insertar el Mensaje de forma idempotente
    const { data: nuevoMensaje, error: errMsg } = await supabaseAdmin
      .from("mensajes")
      .insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        proveedor_mensaje_id: payload.proveedorMensajeId,
        direccion: "entrante",
        remitente_tipo: "cliente",
        tipo_contenido: payload.tipoContenido,
        contenido_texto: payload.contenidoTexto || null,
        metadatos_adjunto: payload.adjuntoUrl ? { adjuntoId: payload.adjuntoUrl } : null,
        estado_entrega: "entregado",
        fecha_creacion: payload.marcaTiempoProveedor,
      })
      .select("id")
      .single();

    if (errMsg) {
      throw new Error(`Error al insertar mensaje: ${errMsg.message}`);
    }

    // 5. Actualizar la Conversación (último mensaje y contador de no leídos)
    await supabaseAdmin
      .from("conversaciones")
      .update({
        ultimo_mensaje_texto: payload.contenidoTexto || `[${payload.tipoContenido}]`,
        fecha_ultimo_mensaje: payload.marcaTiempoProveedor,
        ...(conversacionExistente ? { no_leidos_agente: noLeidosActuales + 1 } : {}),
      })
      .eq("id", conversacionId);

    // 6. Motor de SLA: Activar o actualizar el temporizador de primera respuesta
    const minutosSla = (cuentaCanal as any)?.organizacion?.configuracion?.sla_minutos_primera_respuesta || 10;
    const tiempoObjetivoSegundos = minutosSla * 60;
    const fechaLimite = new Date(Date.now() + tiempoObjetivoSegundos * 1000).toISOString();

    const { data: slaExistente } = await supabaseAdmin
      .from("registros_sla")
      .select("id, es_primera_respuesta_completada")
      .eq("conversacion_id", conversacionId)
      .maybeSingle();

    if (!slaExistente) {
      await supabaseAdmin.from("registros_sla").insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        tiempo_objetivo_segundos: tiempoObjetivoSegundos,
        fecha_limite: fechaLimite,
        estado_sla: "a_tiempo",
      });
    } else if (!slaExistente.es_primera_respuesta_completada) {
      // Aún espera primera respuesta; no se reinicia el temporizador (mantiene la fecha límite inicial)
    }

    return { procesado: true, conversacionId, mensajeId: nuevoMensaje.id };
  }

  /**
   * Procesa actualizaciones de estado de entrega enviadas por Meta (sent, delivered, read, failed),
   * respetando aislamiento multiempresa y evitando duplicados o regresiones de estado.
   */
  async procesarActualizacionEstado(estado: PayloadEstadoMensaje) {
    const supabaseAdmin = crearClienteSupabaseAdministrador();

    const { data: cuentaCanal } = await supabaseAdmin
      .from("cuentas_canal")
      .select("id, organizacion_id")
      .eq("proveedor_cuenta_id", estado.proveedorCuentaId)
      .maybeSingle();

    if (!cuentaCanal) {
      return { actualizado: false, razon: "cuenta_canal_no_encontrada" };
    }

    const mapaEstados: Record<PayloadEstadoMensaje["estado"], EstadoEntregaMensaje> = {
      sent: "enviado",
      delivered: "entregado",
      read: "leido",
      failed: "fallido",
    };

    const nuevoEstado = mapaEstados[estado.estado];

    const { data: mensaje } = await supabaseAdmin
      .from("mensajes")
      .select("id, estado_entrega, metadatos_adjunto")
      .eq("organizacion_id", cuentaCanal.organizacion_id)
      .eq("proveedor_mensaje_id", estado.proveedorMensajeId)
      .maybeSingle();

    if (!mensaje) {
      return { actualizado: false, razon: "mensaje_no_encontrado" };
    }

    if (mensaje.estado_entrega === nuevoEstado) {
      return { actualizado: false, razon: "estado_sin_cambios" };
    }

    const ordenEstado: Record<string, number> = {
      pendiente: 0,
      enviado: 1,
      entregado: 2,
      leido: 3,
    };

    if (mensaje.estado_entrega === "fallido" && nuevoEstado !== "fallido") {
      return { actualizado: false, razon: "regresion_desde_fallido_evitada" };
    }

    if (
      nuevoEstado !== "fallido" &&
      (ordenEstado[nuevoEstado] ?? 0) <= (ordenEstado[mensaje.estado_entrega] ?? 0)
    ) {
      return { actualizado: false, razon: "regresion_evitada" };
    }

    const metadatosActualizados =
      nuevoEstado === "fallido"
        ? {
            ...(mensaje.metadatos_adjunto || {}),
            error_meta: {
              codigo: estado.codigoError || null,
              mensaje: estado.mensajeError || "Entrega fallida reportada por Meta",
              fecha: estado.marcaTiempoProveedor,
            },
          }
        : mensaje.metadatos_adjunto;

    const { error: errUpdate } = await supabaseAdmin
      .from("mensajes")
      .update({
        estado_entrega: nuevoEstado,
        metadatos_adjunto: metadatosActualizados,
      })
      .eq("id", mensaje.id)
      .eq("organizacion_id", cuentaCanal.organizacion_id);

    if (errUpdate) {
      console.error("[Omnicanal] Error al actualizar estado de mensaje:", errUpdate.message);
      return { actualizado: false, razon: "error_bd" };
    }

    return { actualizado: true, mensajeId: mensaje.id, nuevoEstado };
  }

  private resolverCredencialesCuenta(cuentaCanal: any): {
    proveedorCuentaId: string;
    tokenAcceso: string;
  } {
    const proveedorCuentaId = (cuentaCanal?.proveedor_cuenta_id || "").trim();
    if (!proveedorCuentaId || proveedorCuentaId.startsWith("PHONE_NUM_DEMO")) {
      throw new Error(
        "La cuenta de WhatsApp de esta organización aún tiene el ID de demostración. Configura el Phone Number ID real en Cuentas de Canal."
      );
    }

    const credenciales = cuentaCanal?.credenciales_cifradas || {};
    const tokenAcceso = (credenciales.access_token || process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    if (!tokenAcceso || tokenAcceso.includes("TOKEN_DEMO")) {
      throw new Error(
        "No hay un token de acceso válido configurado para la cuenta de WhatsApp de esta organización."
      );
    }

    return { proveedorCuentaId, tokenAcceso };
  }

  // ----------------------------------------------------------------------------
  // 2. ENVÍO DE MENSAJES SALIENTES Y CUMPLIMIENTO DE SLA
  // ----------------------------------------------------------------------------

  async enviarMensajeSaliente(
    conversacionId: string,
    texto: string,
    usuarioId: string,
    organizacionId: string
  ): Promise<Mensaje> {
    const supabase = await crearClienteSupabaseServidor();

    // 1. Obtener conversación y cuenta de canal
    const { data: conversacion, error: errConv } = await supabase
      .from("conversaciones")
      .select("*, cuenta_canal:cuentas_canal(*)")
      .eq("id", conversacionId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (errConv || !conversacion) {
      throw new Error("Conversación no localizada.");
    }

    // 2. Enviar a través de la API del canal usando las credenciales explícitas de la cuenta
    const { proveedorCuentaId, tokenAcceso } = this.resolverCredencialesCuenta(conversacion.cuenta_canal);

    const { idMensajeProveedor } = await adaptadorWhatsApp.enviarMensajeTexto(
      proveedorCuentaId,
      tokenAcceso,
      conversacion.identificador_remoto_cliente,
      texto
    );

    // 3. Persistir en la base de datos
    const { data: mensajeGuardado, error: errIns } = await supabase
      .from("mensajes")
      .insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        proveedor_mensaje_id: idMensajeProveedor,
        direccion: "saliente",
        remitente_tipo: "agente",
        remitente_usuario_id: usuarioId,
        tipo_contenido: "texto",
        contenido_texto: texto,
        estado_entrega: "enviado",
      })
      .select("*, remitente_usuario:usuarios(id, nombre_completo, avatar_url)")
      .single();

    if (errIns || !mensajeGuardado) {
      throw new Error(`Error al registrar mensaje saliente: ${errIns?.message}`);
    }

    // 4. Actualizar estado de la conversación
    await supabase
      .from("conversaciones")
      .update({
        ultimo_mensaje_texto: texto,
        fecha_ultimo_mensaje: new Date().toISOString(),
        no_leidos_agente: 0,
      })
      .eq("id", conversacionId);

    // 5. Motor de SLA: Registrar Primera Respuesta Humana si estaba pendiente
    const { data: sla } = await supabase
      .from("registros_sla")
      .select("*")
      .eq("conversacion_id", conversacionId)
      .maybeSingle();

    if (sla && !sla.es_primera_respuesta_completada) {
      const ahora = new Date();
      const tiempoInicio = new Date(sla.fecha_inicio).getTime();
      const segundosTranscurridos = Math.round((ahora.getTime() - tiempoInicio) / 1000);
      const estadoFinal = segundosTranscurridos <= sla.tiempo_objetivo_segundos ? "cumplido" : "violado";

      await supabase
        .from("registros_sla")
        .update({
          es_primera_respuesta_completada: true,
          fecha_primera_respuesta: ahora.toISOString(),
          tiempo_transcurrido_segundos: segundosTranscurridos,
          estado_sla: estadoFinal,
        })
        .eq("conversacion_id", conversacionId);

      // Registrar evento inmutable de primera respuesta humana
      await supabase.from("eventos_conversacion").insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        tipo_evento: "primera_respuesta_humana",
        actor_usuario_id: usuarioId,
        detalles: {
          tiempo_respuesta_segundos: segundosTranscurridos,
          cumplio_sla: estadoFinal === "cumplido",
        },
      });
    }

    // 6. Actualizar participante en la conversación
    await supabase.from("participantes_conversacion").upsert(
      {
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        usuario_id: usuarioId,
        ultimo_aporte: new Date().toISOString(),
      },
      { onConflict: "conversacion_id, usuario_id" }
    );

    return mensajeGuardado as any;
  }

  // ----------------------------------------------------------------------------
  // 3. NOTAS INTERNAS ENTRE AGENTES
  // ----------------------------------------------------------------------------

  async agregarNotaInterna(
    conversacionId: string,
    textoNota: string,
    usuarioId: string,
    organizacionId: string
  ): Promise<Mensaje> {
    const supabase = await crearClienteSupabaseServidor();

    const { data: nota, error } = await supabase
      .from("mensajes")
      .insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        direccion: "interna",
        remitente_tipo: "agente",
        remitente_usuario_id: usuarioId,
        tipo_contenido: "nota_interna",
        contenido_texto: textoNota,
        estado_entrega: "enviado",
      })
      .select("*, remitente_usuario:usuarios(id, nombre_completo, avatar_url)")
      .single();

    if (error) {
      throw new Error(`Error al registrar nota interna: ${error.message}`);
    }

    await supabase.from("eventos_conversacion").insert({
      organizacion_id: organizacionId,
      conversacion_id: conversacionId,
      tipo_evento: "nota_interna",
      actor_usuario_id: usuarioId,
      detalles: { extracto: textoNota.slice(0, 100) },
    });

    return nota as any;
  }

  // ----------------------------------------------------------------------------
  // 4. ASIGNACIÓN Y REASIGNACIÓN CON AUDITORÍA INMUTABLE
  // ----------------------------------------------------------------------------

  async asignarConversacion(
    conversacionId: string,
    nuevoAgenteId: string,
    actorId: string,
    motivo: string,
    organizacionId: string
  ): Promise<boolean> {
    const supabase = await crearClienteSupabaseServidor();

    // 1. Obtener estado previo
    const { data: conv, error: errConv } = await supabase
      .from("conversaciones")
      .select("agente_asignado_actual_id, agente_receptor_inicial_id")
      .eq("id", conversacionId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (errConv || !conv) {
      throw new Error("Conversación no localizada.");
    }

    const agenteAnteriorId = conv.agente_asignado_actual_id;
    const esReasignacion = Boolean(agenteAnteriorId && agenteAnteriorId !== nuevoAgenteId);

    // 2. Actualizar conversación
    await supabase
      .from("conversaciones")
      .update({
        agente_asignado_actual_id: nuevoAgenteId,
        agente_receptor_inicial_id: conv.agente_receptor_inicial_id || nuevoAgenteId,
        estado: "asignada",
      })
      .eq("id", conversacionId);

    // 3. Registrar en asignaciones_conversacion (Auditoría permanente)
    await supabase.from("asignaciones_conversacion").insert({
      organizacion_id: organizacionId,
      conversacion_id: conversacionId,
      agente_anterior_id: agenteAnteriorId,
      agente_nuevo_id: nuevoAgenteId,
      actor_reasignacion_id: actorId,
      motivo: motivo || (esReasignacion ? "Reasignación de atención" : "Asignación inicial"),
    });

    // 4. Registrar evento inmutable
    await supabase.from("eventos_conversacion").insert({
      organizacion_id: organizacionId,
      conversacion_id: conversacionId,
      tipo_evento: esReasignacion ? "reasignacion" : "asignacion",
      actor_usuario_id: actorId,
      detalles: {
        agente_anterior_id: agenteAnteriorId,
        agente_nuevo_id: nuevoAgenteId,
        motivo,
      },
    });

    return true;
  }

  // ----------------------------------------------------------------------------
  // 5. CONSULTAS DE LA BANDEJA OMNICANAL
  // ----------------------------------------------------------------------------

  async listarConversaciones(
    organizacionId: string,
    clasificacion: "todas" | "no_asignadas" | "mis_conversaciones" | "prioritarias" | "cerradas" = "todas",
    usuarioId?: string
  ): Promise<Conversacion[]> {
    const supabase = await crearClienteSupabaseServidor();

    let consulta = supabase
      .from("conversaciones")
      .select(`
        *,
        cuenta_canal:cuentas_canal(id, nombre_identificador, canal:canales_comunicacion(codigo, nombre)),
        contacto:contactos(id, nombre, apellidos, correo_principal, telefono_principal),
        prospecto:prospectos(id, nombre, estado, puntuacion, desarrollo_interes),
        agente_asignado_actual:usuarios!conversaciones_agente_asignado_actual_id_fkey(id, nombre_completo, correo_electronico, avatar_url),
        registro_sla:registros_sla(*)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_ultimo_mensaje", { ascending: false });

    if (clasificacion === "no_asignadas") {
      consulta = consulta.is("agente_asignado_actual_id", null).neq("estado", "cerrada");
    } else if (clasificacion === "mis_conversaciones" && usuarioId) {
      consulta = consulta.eq("agente_asignado_actual_id", usuarioId).neq("estado", "cerrada");
    } else if (clasificacion === "prioritarias") {
      consulta = consulta.in("prioridad", ["alta", "urgente"]).neq("estado", "cerrada");
    } else if (clasificacion === "cerradas") {
      consulta = consulta.eq("estado", "cerrada");
    } else {
      consulta = consulta.neq("estado", "cerrada");
    }

    const { data, error } = await consulta;
    if (error) {
      console.error("[Omnicanal] Error al listar conversaciones:", error);
      return [];
    }

    // Calcular minutos restantes de SLA en memoria para renderizado reactivo
    const ahora = Date.now();
    return (data as any[]).map((c) => {
      if (c.registro_sla && !c.registro_sla.es_primera_respuesta_completada) {
        const limite = new Date(c.registro_sla.fecha_limite).getTime();
        const diffMinutos = Math.round((limite - ahora) / 60000);
        c.registro_sla.minutos_restantes = diffMinutos;
        if (diffMinutos <= 0) {
          c.registro_sla.estado_sla = "violado";
        } else if (diffMinutos <= 3) {
          c.registro_sla.estado_sla = "en_alerta";
        }
      }
      return c;
    });
  }

  async obtenerMensajesConversacion(conversacionId: string, organizacionId: string): Promise<Mensaje[]> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("mensajes")
      .select(`
        *,
        remitente_usuario:usuarios(id, nombre_completo, avatar_url)
      `)
      .eq("conversacion_id", conversacionId)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: true });

    if (error) {
      console.error("[Omnicanal] Error al obtener mensajes:", error);
      return [];
    }

    return (data as any) || [];
  }

  // ----------------------------------------------------------------------------
  // 6. PLANTILLAS, NUEVAS CONVERSACIONES Y CUENTAS DE CANAL EXPLÍCITAS
  // ----------------------------------------------------------------------------

  async obtenerCuentaWhatsAppOrganizacion(organizacionId: string): Promise<CuentaCanal | null> {
    const supabase = await crearClienteSupabaseServidor();
    const { data: canal } = await supabase
      .from("canales_comunicacion")
      .select("id")
      .eq("codigo", "whatsapp_cloud")
      .maybeSingle();

    if (!canal) return null;

    const { data: cuenta } = await supabase
      .from("cuentas_canal")
      .select("id, organizacion_id, canal_id, nombre_identificador, proveedor_cuenta_id, identificador_waba, estado, fecha_conexion")
      .eq("organizacion_id", organizacionId)
      .eq("canal_id", canal.id)
      .order("fecha_conexion", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (cuenta as CuentaCanal) || null;
  }

  async configurarCuentaWhatsAppOrganizacion(
    organizacionId: string,
    datos: {
      nombreIdentificador: string;
      proveedorCuentaId: string;
      identificadorWaba?: string;
      accessToken?: string;
    }
  ): Promise<{ cuenta: CuentaCanal; verificacion?: { conectado: boolean; nombreVerificado?: string; numero?: string; detalle?: string } }> {
    const proveedorCuentaId = datos.proveedorCuentaId.trim();
    if (!proveedorCuentaId || proveedorCuentaId.startsWith("PHONE_NUM_DEMO")) {
      throw new Error("Debes ingresar un Phone Number ID real de Meta WhatsApp Cloud API.");
    }

    const supabaseAdmin = crearClienteSupabaseAdministrador();

    // Garantizar aislamiento multiempresa: un mismo Phone Number ID no puede pertenecer a otra organización
    const { data: colision } = await supabaseAdmin
      .from("cuentas_canal")
      .select("id, organizacion_id")
      .eq("proveedor_cuenta_id", proveedorCuentaId)
      .neq("organizacion_id", organizacionId)
      .maybeSingle();

    if (colision) {
      throw new Error("Este Phone Number ID ya se encuentra vinculado a otra organización.");
    }

    const supabase = await crearClienteSupabaseServidor();
    const { data: canal } = await supabase
      .from("canales_comunicacion")
      .select("id")
      .eq("codigo", "whatsapp_cloud")
      .single();

    if (!canal) {
      throw new Error("El canal whatsapp_cloud no está registrado en el catálogo.");
    }

    const { data: existente } = await supabase
      .from("cuentas_canal")
      .select("id, credenciales_cifradas")
      .eq("organizacion_id", organizacionId)
      .eq("canal_id", canal.id)
      .limit(1)
      .maybeSingle();

    const credencialesActuales = (existente?.credenciales_cifradas as Record<string, unknown>) || {};
    const tokenNuevo = datos.accessToken?.trim();
    const credencialesFinales = tokenNuevo
      ? { ...credencialesActuales, access_token: tokenNuevo }
      : credencialesActuales;

    const tokenParaVerificar =
      (credencialesFinales.access_token as string | undefined) ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      "";

    const verificacion = tokenParaVerificar
      ? await adaptadorWhatsApp.verificarEstadoNumero(proveedorCuentaId, tokenParaVerificar)
      : undefined;

    let cuentaGuardada: any;
    if (existente) {
      const { data, error } = await supabase
        .from("cuentas_canal")
        .update({
          nombre_identificador: datos.nombreIdentificador.trim() || "WhatsApp Business",
          proveedor_cuenta_id: proveedorCuentaId,
          identificador_waba: datos.identificadorWaba?.trim() || null,
          credenciales_cifradas: credencialesFinales,
          estado: "conectado",
        })
        .eq("id", existente.id)
        .eq("organizacion_id", organizacionId)
        .select("id, organizacion_id, canal_id, nombre_identificador, proveedor_cuenta_id, identificador_waba, estado, fecha_conexion")
        .single();

      if (error) throw new Error(`Error al actualizar cuenta de WhatsApp: ${error.message}`);
      cuentaGuardada = data;
    } else {
      const { data, error } = await supabase
        .from("cuentas_canal")
        .insert({
          organizacion_id: organizacionId,
          canal_id: canal.id,
          nombre_identificador: datos.nombreIdentificador.trim() || "WhatsApp Business",
          proveedor_cuenta_id: proveedorCuentaId,
          identificador_waba: datos.identificadorWaba?.trim() || null,
          credenciales_cifradas: credencialesFinales,
          estado: "conectado",
        })
        .select("id, organizacion_id, canal_id, nombre_identificador, proveedor_cuenta_id, identificador_waba, estado, fecha_conexion")
        .single();

      if (error) throw new Error(`Error al registrar cuenta de WhatsApp: ${error.message}`);
      cuentaGuardada = data;
    }

    return { cuenta: cuentaGuardada as CuentaCanal, verificacion };
  }

  async enviarPlantillaEnConversacion(
    conversacionId: string,
    usuarioId: string,
    organizacionId: string,
    datos: { nombrePlantilla: string; codigoIdioma: string; parametrosCuerpo?: string[] }
  ): Promise<Mensaje> {
    const supabase = await crearClienteSupabaseServidor();

    const { data: conversacion, error: errConv } = await supabase
      .from("conversaciones")
      .select("*, cuenta_canal:cuentas_canal(*)")
      .eq("id", conversacionId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (errConv || !conversacion) {
      throw new Error("Conversación no localizada.");
    }

    const { proveedorCuentaId, tokenAcceso } = this.resolverCredencialesCuenta(conversacion.cuenta_canal);

    const { idMensajeProveedor } = await adaptadorWhatsApp.enviarMensajePlantilla(
      proveedorCuentaId,
      tokenAcceso,
      conversacion.identificador_remoto_cliente,
      datos.nombrePlantilla.trim(),
      datos.codigoIdioma.trim() || "es_MX",
      datos.parametrosCuerpo || []
    );

    const resumenTexto = `[Plantilla: ${datos.nombrePlantilla.trim()}]${
      datos.parametrosCuerpo?.length ? ` (${datos.parametrosCuerpo.join(", ")})` : ""
    }`;

    const { data: mensajeGuardado, error: errIns } = await supabase
      .from("mensajes")
      .insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        proveedor_mensaje_id: idMensajeProveedor,
        direccion: "saliente",
        remitente_tipo: "agente",
        remitente_usuario_id: usuarioId,
        tipo_contenido: "texto",
        contenido_texto: resumenTexto,
        metadatos_adjunto: {
          plantilla: datos.nombrePlantilla.trim(),
          idioma: datos.codigoIdioma.trim() || "es_MX",
          parametros: datos.parametrosCuerpo || [],
        },
        estado_entrega: "enviado",
      })
      .select("*, remitente_usuario:usuarios(id, nombre_completo, avatar_url)")
      .single();

    if (errIns || !mensajeGuardado) {
      throw new Error(`Error al registrar plantilla enviada: ${errIns?.message}`);
    }

    await supabase
      .from("conversaciones")
      .update({
        ultimo_mensaje_texto: resumenTexto,
        fecha_ultimo_mensaje: new Date().toISOString(),
        no_leidos_agente: 0,
      })
      .eq("id", conversacionId)
      .eq("organizacion_id", organizacionId);

    return mensajeGuardado as Mensaje;
  }

  async iniciarConversacionConPlantilla(
    organizacionId: string,
    usuarioId: string,
    datos: {
      telefonoDestino: string;
      nombreContacto?: string;
      nombrePlantilla: string;
      codigoIdioma: string;
      parametrosCuerpo?: string[];
    }
  ): Promise<{ conversacion: Conversacion; mensaje: Mensaje }> {
    const telefonoLimpio = datos.telefonoDestino.replace(/[^\d]/g, "");
    if (telefonoLimpio.length < 10 || telefonoLimpio.length > 15) {
      throw new Error("El número de teléfono debe incluir código de país (10 a 15 dígitos, ej. 5219981234567).");
    }

    const supabase = await crearClienteSupabaseServidor();

    const { data: canal } = await supabase
      .from("canales_comunicacion")
      .select("id")
      .eq("codigo", "whatsapp_cloud")
      .single();

    if (!canal) {
      throw new Error("Canal whatsapp_cloud no disponible.");
    }

    const { data: cuentaCanal } = await supabase
      .from("cuentas_canal")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("canal_id", canal.id)
      .eq("estado", "conectado")
      .limit(1)
      .maybeSingle();

    if (!cuentaCanal) {
      throw new Error("No hay una cuenta de WhatsApp conectada para esta organización.");
    }

    const { proveedorCuentaId, tokenAcceso } = this.resolverCredencialesCuenta(cuentaCanal);

    const { idMensajeProveedor } = await adaptadorWhatsApp.enviarMensajePlantilla(
      proveedorCuentaId,
      tokenAcceso,
      telefonoLimpio,
      datos.nombrePlantilla.trim(),
      datos.codigoIdioma.trim() || "es_MX",
      datos.parametrosCuerpo || []
    );

    // Buscar o crear conversación para este teléfono en la cuenta de canal de la organización
    const { data: existente } = await supabase
      .from("conversaciones")
      .select("id")
      .eq("organizacion_id", organizacionId)
      .eq("cuenta_canal_id", cuentaCanal.id)
      .eq("identificador_remoto_cliente", telefonoLimpio)
      .maybeSingle();

    const resumenTexto = `[Plantilla: ${datos.nombrePlantilla.trim()}]`;
    let conversacionId = existente?.id;

    if (!conversacionId) {
      const { data: nuevaConv, error: errConv } = await supabase
        .from("conversaciones")
        .insert({
          organizacion_id: organizacionId,
          cuenta_canal_id: cuentaCanal.id,
          identificador_remoto_cliente: telefonoLimpio,
          nombre_remoto_cliente: datos.nombreContacto?.trim() || `+${telefonoLimpio}`,
          agente_receptor_inicial_id: usuarioId,
          agente_asignado_actual_id: usuarioId,
          estado: "asignada",
          prioridad: "media",
          ultimo_mensaje_texto: resumenTexto,
          fecha_ultimo_mensaje: new Date().toISOString(),
          no_leidos_agente: 0,
        })
        .select("id")
        .single();

      if (errConv || !nuevaConv) {
        throw new Error(`Error al crear conversación: ${errConv?.message}`);
      }
      conversacionId = nuevaConv.id;
    } else {
      await supabase
        .from("conversaciones")
        .update({
          ultimo_mensaje_texto: resumenTexto,
          fecha_ultimo_mensaje: new Date().toISOString(),
          estado: "asignada",
          no_leidos_agente: 0,
        })
        .eq("id", conversacionId)
        .eq("organizacion_id", organizacionId);
    }

    const { data: mensajeGuardado, error: errMsg } = await supabase
      .from("mensajes")
      .insert({
        organizacion_id: organizacionId,
        conversacion_id: conversacionId,
        proveedor_mensaje_id: idMensajeProveedor,
        direccion: "saliente",
        remitente_tipo: "agente",
        remitente_usuario_id: usuarioId,
        tipo_contenido: "texto",
        contenido_texto: resumenTexto,
        metadatos_adjunto: {
          plantilla: datos.nombrePlantilla.trim(),
          idioma: datos.codigoIdioma.trim() || "es_MX",
          parametros: datos.parametrosCuerpo || [],
        },
        estado_entrega: "enviado",
      })
      .select("*, remitente_usuario:usuarios(id, nombre_completo, avatar_url)")
      .single();

    if (errMsg || !mensajeGuardado) {
      throw new Error(`Error al registrar mensaje de plantilla: ${errMsg?.message}`);
    }

    const conversaciones = await this.listarConversaciones(organizacionId, "todas");
    const conversacionCompleta = conversaciones.find((c) => c.id === conversacionId) || ({ id: conversacionId } as Conversacion);

    return { conversacion: conversacionCompleta, mensaje: mensajeGuardado as Mensaje };
  }
}

export const servicioComunicacion = new ServicioComunicacion();
