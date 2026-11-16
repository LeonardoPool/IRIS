// ==============================================================================
// IRIS by WYLEN — SERVICIO DE MARKETING Y PRODUCTIVIDAD (FASE 4)
// ==============================================================================
// Gestión de Formularios Web, Atribución de Campañas y Agenda Google Meet
// ==============================================================================

import crypto from "crypto";
import {
  crearClienteSupabaseServidor,
  crearClienteSupabaseAdministrador,
} from "@/librerias/supabase/servidor";
import type {
  FormularioWeb,
  RegistroCapturaLead,
  IntegracionMarketing,
  ConexionCalendario,
  ResultadoCreacionReunion,
} from "@/tipos/marketing";
import type {
  DatosFormularioWeb,
  DatosCapturaFormularioPublico,
  DatosAgendarReunion,
} from "@/librerias/validaciones/marketing";
import { AdaptadorGoogleCalendar } from "@/librerias/adaptadores/google-calendar";
import type { LeadNormalizadoMeta } from "@/librerias/adaptadores/meta-lead-ads";

export class ServicioMarketing {
  // ----------------------------------------------------------------------------
  // 1. FORMULARIOS WEB
  // ----------------------------------------------------------------------------

  async listarFormulariosWeb(organizacionId: string): Promise<FormularioWeb[]> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("formularios_web")
      .select(`
        *,
        origen:origenes_prospecto(id, nombre),
        agente_predeterminado:usuarios(id, nombre_completo)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false });

    if (error) {
      console.error("[Marketing] Error al listar formularios:", error);
      return [];
    }

    return (data || []) as FormularioWeb[];
  }

  async obtenerFormularioPorId(organizacionId: string, formularioId: string): Promise<FormularioWeb | null> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("formularios_web")
      .select(`
        *,
        origen:origenes_prospecto(id, nombre),
        agente_predeterminado:usuarios(id, nombre_completo)
      `)
      .eq("organizacion_id", organizacionId)
      .eq("id", formularioId)
      .maybeSingle();

    if (error || !data) return null;
    return data as FormularioWeb;
  }

  async crearFormularioWeb(organizacionId: string, datos: DatosFormularioWeb): Promise<FormularioWeb> {
    const supabase = await crearClienteSupabaseServidor();
    const claveApiPublica = `iris_pub_${datos.slug.replace(/[^a-z0-9]/g, "")}_${crypto.randomBytes(8).toString("hex")}`;

    const { data, error } = await supabase
      .from("formularios_web")
      .insert({
        organizacion_id: organizacionId,
        nombre: datos.nombre,
        slug: datos.slug,
        descripcion: datos.descripcion || null,
        clave_api_publica: claveApiPublica,
        origen_prospecto_id: datos.origen_prospecto_id || null,
        agente_predeterminado_id: datos.agente_predeterminado_id || null,
        equipo_predeterminado_id: datos.equipo_predeterminado_id || null,
        etapa_predeterminada_id: datos.etapa_predeterminada_id || null,
        campos_habilitados: datos.campos_habilitados,
        permitir_dominios: datos.permitir_dominios,
        mensaje_exito: datos.mensaje_exito,
        url_redireccion: datos.url_redireccion || null,
        estado: datos.estado,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear formulario: ${error.message}`);
    }

    return data as FormularioWeb;
  }

  async actualizarFormularioWeb(
    organizacionId: string,
    formularioId: string,
    datos: Partial<DatosFormularioWeb>
  ): Promise<FormularioWeb> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("formularios_web")
      .update(datos)
      .eq("organizacion_id", organizacionId)
      .eq("id", formularioId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar formulario: ${error.message}`);
    }

    return data as FormularioWeb;
  }

  async eliminarFormularioWeb(organizacionId: string, formularioId: string): Promise<void> {
    const supabase = await crearClienteSupabaseServidor();

    const { error } = await supabase
      .from("formularios_web")
      .delete()
      .eq("organizacion_id", organizacionId)
      .eq("id", formularioId);

    if (error) {
      throw new Error(`Error al eliminar formulario: ${error.message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // 2. INGESTA PÚBLICA DE LEADS (FORMULARIO WEB)
  // ----------------------------------------------------------------------------

  async procesarCapturaFormularioPublico(
    datos: DatosCapturaFormularioPublico,
    metadatosRed: { ip: string | null; userAgent: string | null; origenUrl?: string | null }
  ): Promise<{ exito: boolean; mensaje: string; redireccionUrl?: string | null }> {
    const admin = crearClienteSupabaseAdministrador();

    // 1. Obtener formulario por clave API pública
    const { data: formulario, error: errForm } = await admin
      .from("formularios_web")
      .select("*")
      .eq("clave_api_publica", datos.claveApi)
      .eq("estado", "activo")
      .maybeSingle();

    if (errForm || !formulario) {
      throw new Error("Clave pública de formulario inválida o formulario inactivo.");
    }

    // 2. Protección contra Spam (Honeypot)
    const trampaHoneypot = datos.honeypot || datos._trampa_honeypot;
    if (trampaHoneypot && trampaHoneypot.trim().length > 0) {
      await admin.from("registros_captura_lead").insert({
        organizacion_id: formulario.organizacion_id,
        formulario_web_id: formulario.id,
        proveedor: "formulario_web",
        datos_crudos: datos,
        estado_procesamiento: "descartado_spam",
        mensaje_error: "Detectado campo honeypot completado por bot.",
        ip_origen: metadatosRed.ip,
        agente_usuario: metadatosRed.userAgent,
      });

      return { exito: true, mensaje: formulario.mensaje_exito };
    }

    // 3. Crear o actualizar prospecto en CRM
    const correo = (datos.correo || datos.correoElectronico)?.trim().toLowerCase() || null;
    const telefono = datos.telefono?.trim() || null;

    // Buscar si ya existe para evitar duplicación
    let prospectoId: string | null = null;
    if (correo || telefono) {
      let consultaExistente = admin
        .from("prospectos")
        .select("id")
        .eq("organizacion_id", formulario.organizacion_id);

      if (correo && telefono) {
        consultaExistente = consultaExistente.or(`correo_electronico.eq.${correo},telefono.eq.${telefono}`);
      } else if (correo) {
        consultaExistente = consultaExistente.eq("correo_electronico", correo);
      } else if (telefono) {
        consultaExistente = consultaExistente.eq("telefono", telefono);
      }

      const { data: existente } = await consultaExistente.limit(1).maybeSingle();
      if (existente) {
        prospectoId = existente.id;
      }
    }

    const metadatosCampana = {
      utm_source: datos.utm_source || "web",
      utm_medium: datos.utm_medium || "formulario",
      utm_campaign: datos.utm_campaign || formulario.slug,
      utm_content: datos.utm_content || null,
      utm_term: datos.utm_term || null,
    };

    if (!prospectoId) {
      // Crear nuevo prospecto
      const { data: nuevoProspecto, error: errProspecto } = await admin
        .from("prospectos")
        .insert({
          organizacion_id: formulario.organizacion_id,
          origen_id: formulario.origen_prospecto_id,
          agente_asignado_id: formulario.agente_predeterminado_id,
          equipo_asignado_id: formulario.equipo_predeterminado_id,
          nombre: datos.nombre,
          correo_electronico: correo,
          telefono,
          presupuesto: datos.presupuesto || null,
          notas: datos.mensaje ? `Mensaje del formulario: ${datos.mensaje}` : null,
          metadatos_origen: metadatosCampana,
          estado: "nuevo",
        })
        .select("id")
        .single();

      if (!errProspecto && nuevoProspecto) {
        prospectoId = nuevoProspecto.id;
      }
    } else {
      // Si ya existía, registrar nota de nuevo contacto
      await admin.from("actividades").insert({
        organizacion_id: formulario.organizacion_id,
        prospecto_id: prospectoId,
        tipo: "nota",
        titulo: `Recontacto vía formulario: ${formulario.nombre}`,
        descripcion: datos.mensaje || "El prospecto volvió a enviar un formulario de contacto.",
        metadatos: metadatosCampana,
      });
    }

    // 4. Registrar auditoría forense de captura
    await admin.from("registros_captura_lead").insert({
      organizacion_id: formulario.organizacion_id,
      formulario_web_id: formulario.id,
      proveedor: "formulario_web",
      prospecto_id: prospectoId,
      datos_crudos: datos,
      metadatos_campana: metadatosCampana,
      ip_origen: metadatosRed.ip,
      agente_usuario: metadatosRed.userAgent,
      estado_procesamiento: "exitoso",
    });

    // 5. Incrementar contador en formulario
    await admin
      .from("formularios_web")
      .update({
        contador_envios: (formulario.contador_envios || 0) + 1,
        ultimo_envio: new Date().toISOString(),
      })
      .eq("id", formulario.id);

    return {
      exito: true,
      mensaje: formulario.mensaje_exito,
      redireccionUrl: formulario.url_redireccion,
    };
  }

  // ----------------------------------------------------------------------------
  // 3. INGESTA DE LEADS DESDE META LEAD ADS
  // ----------------------------------------------------------------------------

  async procesarLeadMetaAds(
    organizacionId: string,
    lead: LeadNormalizadoMeta,
    integracionId?: string
  ): Promise<{ exito: boolean; prospectoId?: string; error?: string }> {
    const admin = crearClienteSupabaseAdministrador();

    try {
      // 1. Obtener origen Meta Ads configurado o predeterminado
      const { data: origenMeta } = await admin
        .from("origenes_prospecto")
        .select("id")
        .eq("organizacion_id", organizacionId)
        .eq("codigo", "meta_ads")
        .maybeSingle();

      const metadatosCampana = {
        utm_source: "meta",
        utm_medium: "lead_ad",
        utm_campaign: lead.campana.campaignName || lead.campana.campaignId,
        ad_id: lead.campana.adId,
        ad_name: lead.campana.adName,
        adset_id: lead.campana.adsetId,
        adset_name: lead.campana.adsetName,
        campaign_id: lead.campana.campaignId,
        form_id: lead.campana.formId,
        meta_lead_id: lead.metaLeadId,
      };

      // 2. Verificar duplicados por meta_lead_id o teléfono/correo
      let prospectoId: string | null = null;
      const { data: existente } = await admin
        .from("prospectos")
        .select("id")
        .eq("organizacion_id", organizacionId)
        .contains("metadatos_origen", { meta_lead_id: lead.metaLeadId })
        .maybeSingle();

      if (existente) {
        prospectoId = existente.id;
      } else {
        // Crear nuevo prospecto
        const { data: nuevo, error: errNuevo } = await admin
          .from("prospectos")
          .insert({
            organizacion_id: organizacionId,
            origen_id: origenMeta?.id || null,
            nombre: lead.nombre,
            correo_electronico: lead.correoElectronico,
            telefono: lead.telefono,
            notas: lead.mensaje ? `Mensaje de Meta Ads: ${lead.mensaje}` : "Captado desde anuncio en Meta Ads",
            metadatos_origen: metadatosCampana,
            estado: "nuevo",
          })
          .select("id")
          .single();

        if (errNuevo) {
          throw errNuevo;
        }
        prospectoId = nuevo.id;
      }

      // 3. Registrar auditoría forense
      await admin.from("registros_captura_lead").insert({
        organizacion_id: organizacionId,
        integracion_marketing_id: integracionId || null,
        proveedor: "meta_lead_ads",
        prospecto_id: prospectoId,
        datos_crudos: lead,
        metadatos_campana: metadatosCampana,
        estado_procesamiento: existente ? "duplicado" : "exitoso",
      });

      return { exito: true, prospectoId: prospectoId || undefined };
    } catch (error: any) {
      console.error("[Marketing] Error procesando lead de Meta Ads:", error);
      return { exito: false, error: error.message };
    }
  }

  // ----------------------------------------------------------------------------
  // 4. CONSULTA Y GESTIÓN DE AUDITORÍA Y CAPTURAS
  // ----------------------------------------------------------------------------

  async listarCapturasLead(
    organizacionId: string,
    limite: number = 50
  ): Promise<RegistroCapturaLead[]> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("registros_captura_lead")
      .select(`
        *,
        prospecto:prospectos(id, nombre, correo_electronico, telefono)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false })
      .limit(limite);

    if (error) {
      console.error("[Marketing] Error al listar capturas:", error);
      return [];
    }

    return (data || []) as RegistroCapturaLead[];
  }

  async listarIntegracionesMarketing(organizacionId: string): Promise<IntegracionMarketing[]> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("integraciones_marketing")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: true });

    if (error) {
      console.error("[Marketing] Error al listar integraciones:", error);
      return [];
    }

    return (data || []) as IntegracionMarketing[];
  }

  // ----------------------------------------------------------------------------
  // 5. GOOGLE CALENDAR Y GOOGLE MEET
  // ----------------------------------------------------------------------------

  async obtenerConexionCalendario(
    usuarioId: string,
    organizacionId: string
  ): Promise<ConexionCalendario | null> {
    const supabase = await crearClienteSupabaseServidor();

    const { data, error } = await supabase
      .from("conexiones_calendario")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("organizacion_id", organizacionId)
      .eq("proveedor", "google_calendar")
      .maybeSingle();

    if (error || !data) return null;
    return data as ConexionCalendario;
  }

  async agendarReunionConMeet(
    usuarioId: string,
    organizacionId: string,
    datos: DatosAgendarReunion
  ): Promise<ResultadoCreacionReunion> {
    const admin = crearClienteSupabaseAdministrador();

    // 1. Obtener conexión activa del usuario
    const { data: conexion, error: errConexion } = await admin
      .from("conexiones_calendario")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("organizacion_id", organizacionId)
      .eq("proveedor", "google_calendar")
      .eq("estado", "activo")
      .maybeSingle();

    if (errConexion || !conexion) {
      return {
        exito: false,
        error: "El usuario no tiene una cuenta de Google Calendar vinculada o activa.",
      };
    }

    // 2. Verificar vigencia del token y refrescar si ha expirado
    let accessToken = conexion.access_token;
    const ahora = new Date();
    const fechaExpiracion = new Date(conexion.expira_en);

    if (ahora >= fechaExpiracion && conexion.refresh_token) {
      try {
        const renovacion = await AdaptadorGoogleCalendar.refrescarTokenAcceso(conexion.refresh_token);
        accessToken = renovacion.access_token;
        const nuevaExpiracion = new Date(Date.now() + renovacion.expires_in * 1000).toISOString();

        await admin
          .from("conexiones_calendario")
          .update({
            access_token: accessToken,
            expira_en: nuevaExpiracion,
          })
          .eq("id", conexion.id);
      } catch (err: any) {
        await admin
          .from("conexiones_calendario")
          .update({ estado: "error_token" })
          .eq("id", conexion.id);

        return {
          exito: false,
          error: `Error al renovar credencial de Google: ${err.message}`,
        };
      }
    }

    // 3. Crear el evento en Google Calendar
    try {
      const eventoGoogle = await AdaptadorGoogleCalendar.crearEvento(
        accessToken,
        conexion.id_calendario_principal || "primary",
        {
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          fechaInicio: datos.fechaInicio,
          fechaFin: datos.fechaFin,
          zonaHoraria: datos.zonaHoraria,
          asistentes: datos.asistentes,
          generarMeet: datos.generarGoogleMeet,
        }
      );

      // 4. Registrar la actividad en IRIS CRM
      await admin.from("actividades").insert({
        organizacion_id: organizacionId,
        prospecto_id: datos.prospectoId,
        usuario_id: usuarioId,
        tipo: "reunion",
        titulo: datos.titulo,
        descripcion: datos.descripcion || "Reunión agendada vía Google Calendar con videollamada Meet",
        fecha_programada: datos.fechaInicio,
        estado: "pendiente",
        metadatos: {
          google_event_id: eventoGoogle.id,
          google_html_link: eventoGoogle.htmlLink,
          google_meet_link: eventoGoogle.hangoutLink,
        },
      });

      return {
        exito: true,
        eventoId: eventoGoogle.id,
        urlReunionMeet: eventoGoogle.hangoutLink,
        urlEventoGoogle: eventoGoogle.htmlLink,
      };
    } catch (error: any) {
      console.error("[Marketing] Error al crear evento en Google Calendar:", error);
      return {
        exito: false,
        error: error.message || "Error al sincronizar con Google Calendar.",
      };
    }
  }
}
