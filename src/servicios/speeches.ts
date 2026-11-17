// ==============================================================================
// IRIS by WYLEN — SERVICIO DE SPEECHES COMERCIALES MULTIMEDIA
// ==============================================================================

import { crearClienteSupabaseServidor, crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";
import { adaptadorWhatsApp } from "@/librerias/adaptadores/whatsapp";
import type {
  SpeechComercial,
  ElementoSpeech,
  DatosCrearSpeech,
  DatosActualizarSpeech,
  EjecucionSpeech,
  ResultadoPasoSpeech,
} from "@/tipos/speeches";

export class ServicioSpeeches {
  private static speechesMemoria: Record<string, SpeechComercial[]> = {};

  // Plantilla maestra preconfigurada del desarrollo SOLHÁ (10 pasos)
  private obtenerSpeechBaseSolha(organizacionId: string): SpeechComercial {
    const speechId = "speech-solha-maestro";
    return {
      id: speechId,
      organizacion_id: organizacionId,
      nombre: "Presentación Comercial SOLHÁ (Lotes Campestres)",
      descripcion:
        "Secuencia argumental estructurada de 10 impactos visuales y técnicos para clientes interesados en terrenos y lotes de inversión.",
      desarrollo_inmueble: "SOLHÁ - Lotes Campestres",
      activo: true,
      contador_envios: 12,
      fecha_creacion: new Date(Date.now() - 86400000 * 3).toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      elementos: [
        {
          id: `${speechId}-1`,
          speech_id: speechId,
          orden: 1,
          tipo: "imagen_con_texto",
          contenido_texto:
            "¡Hola! Un gusto saludarte. Soy Carlos Méndez, Asesor Patrimonial de INDOMO Desarrollos.",
          url_imagen:
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "01-presentacion-asesor.jpg",
        },
        {
          id: `${speechId}-2`,
          speech_id: speechId,
          orden: 2,
          tipo: "texto",
          contenido_texto:
            "Te comparto la información exclusiva de nuestro desarrollo SOLHÁ, un proyecto campestre diseñado para quienes buscan certeza jurídica, plusvalía y alta rentabilidad en Yucatán.",
          url_imagen: null,
          nombre_archivo: null,
        },
        {
          id: `${speechId}-3`,
          speech_id: speechId,
          orden: 3,
          tipo: "imagen_con_texto",
          contenido_texto:
            "📍 Ubicación estratégica: A solo 25 minutos del periférico de Mérida y con conectividad inmediata a los principales polos industriales y turísticos.",
          url_imagen:
            "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "03-mapa-ubicacion-solha.jpg",
        },
        {
          id: `${speechId}-4`,
          speech_id: speechId,
          orden: 4,
          tipo: "texto",
          contenido_texto:
            "SOLHÁ está conformado por únicamente 167 lotes tipo campestre con amplias dimensiones de 10 × 35 metros (350 m² de superficie promedio) y acceso directo a pie de carretera pavimentada.",
          url_imagen: null,
          nombre_archivo: null,
        },
        {
          id: `${speechId}-5`,
          speech_id: speechId,
          orden: 5,
          tipo: "imagen_con_texto",
          contenido_texto:
            "📐 Master Plan de Lotificación: Distribución orientada Norte-Sur para optimizar vientos y privacidad entre vecinos.",
          url_imagen:
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "05-masterplan-aereo.jpg",
        },
        {
          id: `${speechId}-6`,
          speech_id: speechId,
          orden: 6,
          tipo: "texto",
          contenido_texto:
            "Cuenta con vocación de uso mixto: puedes edificar tu quinta o casa de descanso familiar, o bien desarrollar un espacio comercial de baja densidad.",
          url_imagen: null,
          nombre_archivo: null,
        },
        {
          id: `${speechId}-7`,
          speech_id: speechId,
          orden: 7,
          tipo: "imagen_con_texto",
          contenido_texto:
            "🏡 Render conceptual: Entornos arbolados que preservan más del 40% de vegetación nativa de la región.",
          url_imagen:
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "07-render-residencial.jpg",
        },
        {
          id: `${speechId}-8`,
          speech_id: speechId,
          orden: 8,
          tipo: "texto",
          contenido_texto:
            "Sin cuotas forzosas de mantenimiento ni plazos obligatorios de edificación. Tu lote adquiere plusvalía orgánica mes a mes con propiedad privada escriturable.",
          url_imagen: null,
          nombre_archivo: null,
        },
        {
          id: `${speechId}-9`,
          speech_id: speechId,
          orden: 9,
          tipo: "imagen_con_texto",
          contenido_texto:
            "🛣️ Infraestructura en desarrollo: Calles amplias con material estabilizado, delimitación física y mojoneras de concreto.",
          url_imagen:
            "https://images.unsplash.com/photo-1541888946425-d0fbb1861564?q=80&w=800&auto=format&fit=crop",
          nombre_archivo: "09-acceso-infraestructura.jpg",
        },
        {
          id: `${speechId}-10`,
          speech_id: speechId,
          orden: 10,
          tipo: "texto",
          contenido_texto:
            "Actualmente tenemos facilidades desde 20% de enganche y hasta 24 meses sin intereses con mensualidades de $3,500 MXN. ¿Te gustaría que te comparta el cotizador interactivo o coordinamos una videollamada para elegir tu lote en el plano?",
          url_imagen: null,
          nombre_archivo: null,
        },
      ],
    };
  }

  // ----------------------------------------------------------------------------
  // 1. LISTAR SPEECHES
  // ----------------------------------------------------------------------------
  async listarSpeeches(organizacionId: string): Promise<SpeechComercial[]> {
    try {
      const supabase = await crearClienteSupabaseServidor();
      const { data, error } = await supabase
        .from("speeches_comerciales")
        .select(`
          *,
          elementos:elementos_speech(*)
        `)
        .eq("organizacion_id", organizacionId)
        .order("fecha_creacion", { ascending: false });

      if (data && data.length > 0 && !error) {
        // Ordenar elementos ascendentemente por 'orden'
        return data.map((sp: any) => ({
          ...sp,
          elementos: (sp.elementos || []).sort((a: any, b: any) => a.orden - b.orden),
        }));
      }
    } catch (_) {
      // Si la tabla aún no tiene datos o estamos en desarrollo
    }

    if (!ServicioSpeeches.speechesMemoria[organizacionId]) {
      ServicioSpeeches.speechesMemoria[organizacionId] = [this.obtenerSpeechBaseSolha(organizacionId)];
    }
    return ServicioSpeeches.speechesMemoria[organizacionId];
  }

  // ----------------------------------------------------------------------------
  // 2. OBTENER SPEECH POR ID
  // ----------------------------------------------------------------------------
  async obtenerSpeechPorId(organizacionId: string, id: string): Promise<SpeechComercial | null> {
    try {
      const supabase = await crearClienteSupabaseServidor();
      const { data, error } = await supabase
        .from("speeches_comerciales")
        .select(`
          *,
          elementos:elementos_speech(*)
        `)
        .eq("organizacion_id", organizacionId)
        .eq("id", id)
        .maybeSingle();

      if (data && !error) {
        return {
          ...data,
          elementos: (data.elementos || []).sort((a: any, b: any) => a.orden - b.orden),
        };
      }
    } catch (_) {}

    const lista = await this.listarSpeeches(organizacionId);
    return lista.find((s) => s.id === id) || null;
  }

  // ----------------------------------------------------------------------------
  // 3. CREAR SPEECH
  // ----------------------------------------------------------------------------
  async crearSpeech(
    organizacionId: string,
    usuarioId: string,
    datos: DatosCrearSpeech
  ): Promise<SpeechComercial> {
    const speechId = `sp-${Date.now()}`;
    const nuevoSpeech: SpeechComercial = {
      id: speechId,
      organizacion_id: organizacionId,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      desarrollo_inmueble: datos.desarrollo_inmueble,
      activo: datos.activo !== undefined ? datos.activo : true,
      contador_envios: 0,
      creado_por_id: usuarioId,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      elementos: datos.elementos.map((elem, index) => ({
        id: `elem-${Date.now()}-${index + 1}`,
        speech_id: speechId,
        orden: index + 1,
        tipo: elem.tipo,
        contenido_texto: elem.contenido_texto || null,
        url_imagen: elem.url_imagen || null,
        nombre_archivo: elem.nombre_archivo || null,
        fecha_creacion: new Date().toISOString(),
      })),
    };

    try {
      const supabase = await crearClienteSupabaseServidor();
      const { data: insertado, error: errInsert } = await supabase
        .from("speeches_comerciales")
        .insert({
          organizacion_id: organizacionId,
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          desarrollo_inmueble: datos.desarrollo_inmueble,
          activo: nuevoSpeech.activo,
          creado_por_id: usuarioId,
        })
        .select()
        .single();

      if (insertado && !errInsert) {
        const elementosParaInsertar = datos.elementos.map((elem, i) => ({
          speech_id: insertado.id,
          orden: i + 1,
          tipo: elem.tipo,
          contenido_texto: elem.contenido_texto || null,
          url_imagen: elem.url_imagen || null,
          nombre_archivo: elem.nombre_archivo || null,
        }));

        if (elementosParaInsertar.length > 0) {
          const { data: elemsInsertados } = await supabase
            .from("elementos_speech")
            .insert(elementosParaInsertar)
            .select();

          return {
            ...insertado,
            elementos: (elemsInsertados || []).sort((a: any, b: any) => a.orden - b.orden),
          };
        }

        return { ...insertado, elementos: [] };
      }
    } catch (_) {}

    // Fallback de memoria
    if (!ServicioSpeeches.speechesMemoria[organizacionId]) {
      ServicioSpeeches.speechesMemoria[organizacionId] = [this.obtenerSpeechBaseSolha(organizacionId)];
    }
    ServicioSpeeches.speechesMemoria[organizacionId].unshift(nuevoSpeech);
    return nuevoSpeech;
  }

  // ----------------------------------------------------------------------------
  // 4. ACTUALIZAR SPEECH
  // ----------------------------------------------------------------------------
  async actualizarSpeech(
    organizacionId: string,
    id: string,
    datos: DatosActualizarSpeech
  ): Promise<SpeechComercial> {
    try {
      const supabase = await crearClienteSupabaseServidor();
      const actualizacion: any = { fecha_actualizacion: new Date().toISOString() };
      if (datos.nombre !== undefined) actualizacion.nombre = datos.nombre;
      if (datos.descripcion !== undefined) actualizacion.descripcion = datos.descripcion;
      if (datos.desarrollo_inmueble !== undefined) actualizacion.desarrollo_inmueble = datos.desarrollo_inmueble;
      if (datos.activo !== undefined) actualizacion.activo = datos.activo;

      await supabase
        .from("speeches_comerciales")
        .update(actualizacion)
        .eq("id", id)
        .eq("organizacion_id", organizacionId);

      if (datos.elementos) {
        // Reemplazar elementos ordenados
        await supabase.from("elementos_speech").delete().eq("speech_id", id);
        const elementosNuevos = datos.elementos.map((elem, i) => ({
          speech_id: id,
          orden: i + 1,
          tipo: elem.tipo,
          contenido_texto: elem.contenido_texto || null,
          url_imagen: elem.url_imagen || null,
          nombre_archivo: elem.nombre_archivo || null,
        }));
        await supabase.from("elementos_speech").insert(elementosNuevos);
      }

      const actualizado = await this.obtenerSpeechPorId(organizacionId, id);
      if (actualizado) return actualizado;
    } catch (_) {}

    // Fallback de memoria
    const lista = await this.listarSpeeches(organizacionId);
    const index = lista.findIndex((s) => s.id === id);
    if (index >= 0) {
      const actual = lista[index];
      lista[index] = {
        ...actual,
        nombre: datos.nombre ?? actual.nombre,
        descripcion: datos.descripcion ?? actual.descripcion,
        desarrollo_inmueble: datos.desarrollo_inmueble ?? actual.desarrollo_inmueble,
        activo: datos.activo ?? actual.activo,
        fecha_actualizacion: new Date().toISOString(),
        elementos: datos.elementos
          ? datos.elementos.map((e, idx) => ({
              id: e.id || `elem-${Date.now()}-${idx + 1}`,
              speech_id: id,
              orden: idx + 1,
              tipo: e.tipo,
              contenido_texto: e.contenido_texto || null,
              url_imagen: e.url_imagen || null,
              nombre_archivo: e.nombre_archivo || null,
            }))
          : actual.elementos,
      };
      return lista[index];
    }
    throw new Error("Speech comercial no encontrado.");
  }

  // ----------------------------------------------------------------------------
  // 5. ELIMINAR SPEECH
  // ----------------------------------------------------------------------------
  async eliminarSpeech(organizacionId: string, id: string): Promise<void> {
    try {
      const supabase = await crearClienteSupabaseServidor();
      await supabase
        .from("speeches_comerciales")
        .delete()
        .eq("id", id)
        .eq("organizacion_id", organizacionId);
    } catch (_) {}

    if (ServicioSpeeches.speechesMemoria[organizacionId]) {
      ServicioSpeeches.speechesMemoria[organizacionId] = ServicioSpeeches.speechesMemoria[
        organizacionId
      ].filter((s) => s.id !== id);
    }
  }

  // ----------------------------------------------------------------------------
  // 6. DUPLICAR SPEECH
  // ----------------------------------------------------------------------------
  async duplicarSpeech(organizacionId: string, usuarioId: string, id: string): Promise<SpeechComercial> {
    const original = await this.obtenerSpeechPorId(organizacionId, id);
    if (!original) throw new Error("Speech original no encontrado.");

    return this.crearSpeech(organizacionId, usuarioId, {
      nombre: `${original.nombre} (Copia)`,
      descripcion: original.descripcion || undefined,
      desarrollo_inmueble: original.desarrollo_inmueble,
      activo: true,
      elementos: (original.elementos || []).map((e) => ({
        tipo: e.tipo,
        contenido_texto: e.contenido_texto || undefined,
        url_imagen: e.url_imagen || undefined,
        nombre_archivo: e.nombre_archivo || undefined,
      })),
    });
  }

  // ----------------------------------------------------------------------------
  // 7. EJECUCIÓN SECUENCIAL PASO A PASO CON CONTROL DE ERRORES Y META COMPLIANCE
  // ----------------------------------------------------------------------------
  async ejecutarPasoDeSpeech({
    conversacionId,
    speechId,
    pasoOrden,
    ejecucionId,
    usuarioId,
    organizacionId,
  }: {
    conversacionId: string;
    speechId: string;
    pasoOrden: number;
    ejecucionId?: string;
    usuarioId: string;
    organizacionId: string;
  }): Promise<ResultadoPasoSpeech> {
    const speech = await this.obtenerSpeechPorId(organizacionId, speechId);
    if (!speech) {
      throw new Error(`Speech "${speechId}" no localizado.`);
    }

    const elementos = speech.elementos || [];
    const elemento = elementos.find((e) => e.orden === pasoOrden);
    if (!elemento) {
      throw new Error(`El paso ${pasoOrden} no existe en el speech (total: ${elementos.length}).`);
    }

    const supabase = await crearClienteSupabaseServidor();

    // 1. Obtener la conversación y sus credenciales de canal
    const { data: conversacion } = await supabase
      .from("conversaciones")
      .select("*, cuenta_canal:cuentas_canal(*)")
      .eq("id", conversacionId)
      .eq("organizacion_id", organizacionId)
      .single();

    if (!conversacion) {
      throw new Error("Conversación no localizada en el sistema.");
    }

    const telefonoDestino = conversacion.identificador_remoto_cliente;
    const cuentaCanal = conversacion.cuenta_canal;
    const credenciales = cuentaCanal?.credenciales_cifradas || {};
    const tokenAcceso = credenciales.access_token || process.env.META_APP_SECRET || "TOKEN_DEMO";
    const proveedorCuentaId = cuentaCanal?.proveedor_cuenta_id || "PROV_DEMO";

    // 2. Control o creación de registro de ejecución en BD
    let idEjecucionActual = ejecucionId;
    if (!idEjecucionActual) {
      try {
        const { data: nuevaEjec } = await supabase
          .from("ejecuciones_speech")
          .insert({
            speech_id: speechId,
            conversacion_id: conversacionId,
            prospecto_id: conversacion.prospecto_id,
            usuario_id: usuarioId,
            organizacion_id: organizacionId,
            total_elementos: elementos.length,
            elementos_enviados: 0,
            estado: "en_progreso",
          })
          .select("id")
          .single();

        if (nuevaEjec) idEjecucionActual = nuevaEjec.id;
      } catch (_) {}
    }

    try {
      let idMensajeProveedor = "";
      let textoMensaje = elemento.contenido_texto || "";

      // 3. Envío especializado según el tipo de bloque multimedia
      if (elemento.tipo === "imagen" || elemento.tipo === "imagen_con_texto") {
        if (!elemento.url_imagen) {
          throw new Error(`El bloque ${pasoOrden} no tiene una URL de imagen válida.`);
        }

        const resImg = await adaptadorWhatsApp.enviarMensajeImagen(
          proveedorCuentaId,
          tokenAcceso,
          telefonoDestino,
          elemento.url_imagen,
          elemento.tipo === "imagen_con_texto" ? elemento.contenido_texto || undefined : undefined
        );
        idMensajeProveedor = resImg.idMensajeProveedor;
      } else {
        // Bloque de texto
        if (!textoMensaje) {
          throw new Error(`El bloque de texto ${pasoOrden} está vacío.`);
        }

        const resTxt = await adaptadorWhatsApp.enviarMensajeTexto(
          proveedorCuentaId,
          tokenAcceso,
          telefonoDestino,
          textoMensaje
        );
        idMensajeProveedor = resTxt.idMensajeProveedor;
      }

      // 4. Registro persistente en la tabla `mensajes` con metadatos del speech
      let mensajeLocalId = `msg-speech-${Date.now()}-${pasoOrden}`;
      try {
        const { data: mensajeGuardado } = await supabase
          .from("mensajes")
          .insert({
            organizacion_id: organizacionId,
            conversacion_id: conversacionId,
            proveedor_mensaje_id: idMensajeProveedor,
            direccion: "saliente",
            remitente_tipo: "agente",
            remitente_usuario_id: usuarioId,
            tipo_contenido: elemento.tipo === "texto" ? "texto" : "imagen",
            contenido_texto: textoMensaje || `[Imagen: ${elemento.nombre_archivo || "Speech"}]`,
            metadatos_adjunto: {
              speech_id: speechId,
              speech_nombre: speech.nombre,
              elemento_id: elemento.id,
              paso_orden: pasoOrden,
              total_pasos: elementos.length,
              url_imagen: elemento.url_imagen,
              ejecucion_id: idEjecucionActual,
            },
            estado_entrega: "enviado",
          })
          .select("id")
          .single();

        if (mensajeGuardado) {
          mensajeLocalId = mensajeGuardado.id;
        }

        // Actualizar último mensaje de la conversación
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_texto: textoMensaje || `[Imagen de ${speech.desarrollo_inmueble}]`,
            fecha_ultimo_mensaje: new Date().toISOString(),
          })
          .eq("id", conversacionId);

        // Actualizar estado de ejecución
        const esUltimoPaso = pasoOrden === elementos.length;
        if (idEjecucionActual) {
          await supabase
            .from("ejecuciones_speech")
            .update({
              elementos_enviados: pasoOrden,
              estado: esUltimoPaso ? "completado" : "en_progreso",
              fecha_fin: esUltimoPaso ? new Date().toISOString() : null,
            })
            .eq("id", idEjecucionActual);
        }

        if (esUltimoPaso) {
          await supabase
            .from("speeches_comerciales")
            .update({ contador_envios: (speech.contador_envios || 0) + 1 })
            .eq("id", speechId);
        }
      } catch (_) {}

      return {
        paso: pasoOrden,
        total: elementos.length,
        elementoId: elemento.id,
        tipo: elemento.tipo,
        idMensajeProveedor,
        mensajeLocalId,
        textoEnviado: textoMensaje,
        urlImagenEnviada: elemento.url_imagen || undefined,
        exito: true,
      };
    } catch (error: any) {
      // Registrar falla en la ejecución para permitir reintento controlado
      if (idEjecucionActual) {
        try {
          await supabase
            .from("ejecuciones_speech")
            .update({
              estado: "fallido",
              ultimo_error: error.message || "Error al transmitir el elemento de speech.",
            })
            .eq("id", idEjecucionActual);
        } catch (_) {}
      }

      return {
        paso: pasoOrden,
        total: elementos.length,
        elementoId: elemento.id,
        tipo: elemento.tipo,
        exito: false,
        error: error.message || "Fallo en la entrega del paso de speech.",
      };
    }
  }
}
