// ==============================================================================
// IRIS by WYLEN — SERVICIO: FICHA UNIFICADA DEL CLIENTE 360°
// ==============================================================================
// Consulta exclusivamente las tablas y relaciones existentes sin duplicar datos:
// prospectos, contactos, prospectos_intereses, oportunidades,
// oportunidad_unidades, conversaciones, actividades, cotizaciones_inmobiliarias,
// apartados_unidades, contratos y historial_etapas_oportunidad.
// ==============================================================================

import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";

export interface ParametrosConsultaFichaCliente {
  organizacionId: string;
  prospectoId?: string | null;
  contactoId?: string | null;
  oportunidadId?: string | null;
  conversacionId?: string | null;
  correo?: string | null;
  telefono?: string | null;
}

export interface DatosFichaUnificadaCliente {
  identidad: {
    prospectoId: string | null;
    contactoId: string | null;
    oportunidadPrincipalId: string | null;
    nombre: string;
    telefono: string | null;
    correo: string | null;
    estado: string;
    puntuacion: number | null;
    desarrolloInteres: string | null;
    responsableActualNombre: string | null;
    responsableInicialNombre: string | null;
    fechaRegistro: string | null;
  };
  interesesInmobiliarios: Array<{
    id: string;
    desarrolloNombre: string;
    unidadClave: string | null;
    estadoInteres: string;
    esPrincipal: boolean;
    presupuestoEstimado: number | null;
    notas: string | null;
  }>;
  oportunidades: Array<{
    id: string;
    titulo: string;
    etapaNombre: string;
    estado: string;
    valorEstimado: number;
    moneda: string;
    desarrolloPropiedad: string | null;
    loteUnidad: string | null;
  }>;
  conversaciones: Array<{
    id: string;
    canal: string;
    estado: string;
    ultimoMensaje: string | null;
    fechaUltimoMensaje: string | null;
    responsableInicialId: string | null;
    responsableActualId: string | null;
  }>;
  actividades: Array<{
    id: string;
    tipoActividad: string;
    titulo: string;
    estado: string;
    prioridad: string;
    fechaVencimiento: string | null;
  }>;
  cotizaciones: Array<{
    id: string;
    folio: string;
    estado: string;
    precioNetoFinal: number;
    mensualidadOrdinaria: number;
    plazoMeses: number;
    fechaVigencia: string;
    moneda: string;
  }>;
  apartados: Array<{
    id: string;
    folioApartado: string;
    unidadClave: string | null;
    estadoApartado: string;
    montoApartado: number;
    fechaVencimiento: string;
    moneda: string;
  }>;
  contratos: Array<{
    id: string;
    folio: string;
    titulo: string;
    tipoContrato: string;
    estado: string;
    montoTotal: number;
    moneda: string;
    fechaEmision: string;
  }>;
  historialCambios: Array<{
    id: string;
    tipo: string;
    descripcion: string;
    fecha: string;
  }>;
}

export async function obtenerFichaUnificadaCliente(
  params: ParametrosConsultaFichaCliente
): Promise<DatosFichaUnificadaCliente | null> {
  const supabase = crearClienteSupabaseAdministrador();
  const { organizacionId } = params;

  let prospecto: any = null;
  let contacto: any = null;
  let conversacionOrigen: any = null;

  if (params.conversacionId) {
    const { data } = await supabase
      .from("conversaciones")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("id", params.conversacionId)
      .maybeSingle();
    conversacionOrigen = data;
  }

  const pId = params.prospectoId || conversacionOrigen?.prospecto_id || null;
  let cId = params.contactoId || conversacionOrigen?.contacto_id || null;

  if (pId) {
    const { data } = await supabase
      .from("prospectos")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("id", pId)
      .maybeSingle();
    prospecto = data;
    if (data?.contacto_convertido_id && !cId) {
      cId = data.contacto_convertido_id;
    }
  }

  if (cId) {
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("id", cId)
      .maybeSingle();
    contacto = data;
  }

  // Si venimos de una oportunidad sin contactoId previo
  if (!contacto && params.oportunidadId) {
    const { data: op } = await supabase
      .from("oportunidades")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .eq("id", params.oportunidadId)
      .maybeSingle();
    if (op?.contacto_id) {
      cId = op.contacto_id;
      const { data: cont } = await supabase
        .from("contactos")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .eq("id", cId)
        .maybeSingle();
      contacto = cont;
    }
  }

  // Búsqueda por correo o teléfono si aún no hay registro
  if (!prospecto && !contacto && (params.correo || params.telefono)) {
    if (params.correo) {
      const { data: pCorreo } = await supabase
        .from("prospectos")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .ilike("correo_electronico", params.correo.trim())
        .limit(1)
        .maybeSingle();
      if (pCorreo) prospecto = pCorreo;
    }
    if (!prospecto && params.telefono) {
      const digitos = params.telefono.replace(/\D/g, "").slice(-10);
      if (digitos.length >= 8) {
        const { data: pTel } = await supabase
          .from("prospectos")
          .select("*")
          .eq("organizacion_id", organizacionId)
          .ilike("telefono", `%${digitos}%`)
          .limit(1)
          .maybeSingle();
        if (pTel) prospecto = pTel;
      }
    }
  }

  const prospectoFinalId = prospecto?.id || contacto?.prospecto_origen_id || null;
  const contactoFinalId = contacto?.id || prospecto?.contacto_convertido_id || null;

  const nombreCliente =
    (contacto ? `${contacto.nombre} ${contacto.apellidos || ""}`.trim() : null) ||
    prospecto?.nombre ||
    conversacionOrigen?.nombre_remoto_cliente ||
    "Cliente sin nombre";

  const correoCliente =
    contacto?.correo_principal || prospecto?.correo_electronico || params.correo || null;
  const telefonoCliente =
    contacto?.telefono_principal ||
    prospecto?.telefono ||
    conversacionOrigen?.identificador_remoto_cliente ||
    params.telefono ||
    null;

  // Consultas paralelas tolerantes a tablas opcionales
  const [
    interesesRes,
    oportunidadesRes,
    conversacionesRes,
    actividadesRes,
    cotizacionesRes,
    apartadosRes,
    contratosRes,
  ] = await Promise.all([
    prospectoFinalId
      ? supabase
          .from("prospectos_intereses")
          .select(
            "id, estado_interes, es_principal, presupuesto_estimado, notas, desarrollo:desarrollos(nombre), unidad:unidades_inmobiliarias(clave_comercial)"
          )
          .eq("organizacion_id", organizacionId)
          .eq("prospecto_id", prospectoFinalId)
          .order("es_principal", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),

    contactoFinalId
      ? supabase
          .from("oportunidades")
          .select("id, titulo, estado, valor_estimado, moneda, desarrollo_propiedad, lote_unidad, etapa:etapas_embudo(nombre)")
          .eq("organizacion_id", organizacionId)
          .eq("contacto_id", contactoFinalId)
          .order("fecha_creacion", { ascending: false })
      : params.oportunidadId
        ? supabase
            .from("oportunidades")
            .select("id, titulo, estado, valor_estimado, moneda, desarrollo_propiedad, lote_unidad, etapa:etapas_embudo(nombre)")
            .eq("organizacion_id", organizacionId)
            .eq("id", params.oportunidadId)
        : Promise.resolve({ data: [] as any[] }),

    prospectoFinalId || contactoFinalId
      ? supabase
          .from("conversaciones")
          .select("id, estado, ultimo_mensaje_texto, fecha_ultimo_mensaje, agente_receptor_inicial_id, agente_asignado_actual_id")
          .eq("organizacion_id", organizacionId)
          .or(
            [
              prospectoFinalId ? `prospecto_id.eq.${prospectoFinalId}` : null,
              contactoFinalId ? `contacto_id.eq.${contactoFinalId}` : null,
            ]
              .filter(Boolean)
              .join(",")
          )
          .order("fecha_actualizacion", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: conversacionOrigen ? [conversacionOrigen] : [] }),

    prospectoFinalId || contactoFinalId
      ? supabase
          .from("actividades")
          .select("id, tipo_actividad, titulo, estado, prioridad, fecha_vencimiento")
          .eq("organizacion_id", organizacionId)
          .or(
            [
              prospectoFinalId ? `prospecto_id.eq.${prospectoFinalId}` : null,
              contactoFinalId ? `contacto_id.eq.${contactoFinalId}` : null,
            ]
              .filter(Boolean)
              .join(",")
          )
          .order("fecha_vencimiento", { ascending: true })
          .limit(15)
      : Promise.resolve({ data: [] as any[] }),

    prospectoFinalId || contactoFinalId
      ? supabase
          .from("cotizaciones_inmobiliarias")
          .select("id, folio, estado, precio_neto_final, mensualidad_ordinaria_base, plazo_meses, fecha_vigencia, moneda")
          .eq("organizacion_id", organizacionId)
          .or(
            [
              prospectoFinalId ? `prospecto_id.eq.${prospectoFinalId}` : null,
              contactoFinalId ? `contacto_id.eq.${contactoFinalId}` : null,
            ]
              .filter(Boolean)
              .join(",")
          )
          .order("fecha_creacion", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as any[] }),

    prospectoFinalId || contactoFinalId
      ? supabase
          .from("apartados_unidades")
          .select("id, folio_apartado, estado_apartado, monto_apartado, fecha_vencimiento, moneda, unidad:unidades_inmobiliarias(clave_comercial)")
          .eq("organizacion_id", organizacionId)
          .or(
            [
              prospectoFinalId ? `prospecto_id.eq.${prospectoFinalId}` : null,
              contactoFinalId ? `contacto_id.eq.${contactoFinalId}` : null,
            ]
              .filter(Boolean)
              .join(",")
          )
          .order("fecha_creacion", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as any[] }),

    correoCliente
      ? supabase
          .from("contratos")
          .select("id, folio, titulo, tipo_contrato, estado, monto_total, moneda, fecha_emision")
          .eq("organizacion_id", organizacionId)
          .ilike("cliente_correo", correoCliente)
          .order("fecha_emision", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Resolver nombres de responsables actuales e iniciales
  const usuarioIds = Array.from(
    new Set(
      [
        prospecto?.agente_asignado_id,
        contacto?.agente_responsable_id,
        conversacionOrigen?.agente_asignado_actual_id,
        conversacionOrigen?.agente_receptor_inicial_id,
      ].filter(Boolean)
    )
  ) as string[];

  const mapaUsuarios = new Map<string, string>();
  if (usuarioIds.length > 0) {
    const { data: users } = await supabase
      .from("usuarios")
      .select("id, nombre_completo")
      .in("id", usuarioIds);
    for (const u of users || []) {
      mapaUsuarios.set(u.id, u.nombre_completo);
    }
  }

  const responsableActualId =
    conversacionOrigen?.agente_asignado_actual_id ||
    contacto?.agente_responsable_id ||
    prospecto?.agente_asignado_id ||
    null;
  const responsableInicialId = conversacionOrigen?.agente_receptor_inicial_id || null;

  const oportunidadesLista = (oportunidadesRes.data || []).map((o: any) => ({
    id: o.id,
    titulo: o.titulo,
    etapaNombre: o.etapa?.nombre || "En Proceso",
    estado: o.estado,
    valorEstimado: Number(o.valor_estimado || 0),
    moneda: o.moneda || "MXN",
    desarrolloPropiedad: o.desarrollo_propiedad || null,
    loteUnidad: o.lote_unidad || null,
  }));

  const historialCambios: DatosFichaUnificadaCliente["historialCambios"] = [];
  if (prospecto?.fecha_creacion) {
    historialCambios.push({
      id: `hist-p-${prospecto.id}`,
      tipo: "Captación",
      descripcion: `Alta inicial de prospecto (${prospecto.estado || "nuevo"})`,
      fecha: prospecto.fecha_creacion,
    });
  }
  if (contacto?.fecha_creacion) {
    historialCambios.push({
      id: `hist-c-${contacto.id}`,
      tipo: "Conversión",
      descripcion: "Registro convertido a Contacto calificado",
      fecha: contacto.fecha_creacion,
    });
  }

  return {
    identidad: {
      prospectoId: prospectoFinalId,
      contactoId: contactoFinalId,
      oportunidadPrincipalId: oportunidadesLista[0]?.id || params.oportunidadId || null,
      nombre: nombreCliente,
      telefono: telefonoCliente,
      correo: correoCliente,
      estado: contacto?.estado || prospecto?.estado || "activo",
      puntuacion: prospecto?.puntuacion ?? null,
      desarrolloInteres:
        prospecto?.desarrollo_interes || oportunidadesLista[0]?.desarrolloPropiedad || null,
      responsableActualNombre: responsableActualId
        ? mapaUsuarios.get(responsableActualId) || "Asesor asignado"
        : null,
      responsableInicialNombre: responsableInicialId
        ? mapaUsuarios.get(responsableInicialId) || "Receptor inicial"
        : null,
      fechaRegistro: contacto?.fecha_creacion || prospecto?.fecha_creacion || null,
    },
    interesesInmobiliarios: (interesesRes.data || []).map((i: any) => ({
      id: i.id,
      desarrolloNombre: i.desarrollo?.nombre || "Desarrollo",
      unidadClave: i.unidad?.clave_comercial || null,
      estadoInteres: i.estado_interes,
      esPrincipal: Boolean(i.es_principal),
      presupuestoEstimado: i.presupuesto_estimado ? Number(i.presupuesto_estimado) : null,
      notas: i.notas || null,
    })),
    oportunidades: oportunidadesLista,
    conversaciones: (conversacionesRes.data || []).map((c: any) => ({
      id: c.id,
      canal: "WhatsApp / Omnicanal",
      estado: c.estado,
      ultimoMensaje: c.ultimo_mensaje_texto || null,
      fechaUltimoMensaje: c.fecha_ultimo_mensaje || null,
      responsableInicialId: c.agente_receptor_inicial_id || null,
      responsableActualId: c.agente_asignado_actual_id || null,
    })),
    actividades: (actividadesRes.data || []).map((a: any) => ({
      id: a.id,
      tipoActividad: a.tipo_actividad,
      titulo: a.titulo,
      estado: a.estado,
      prioridad: a.prioridad,
      fechaVencimiento: a.fecha_vencimiento || null,
    })),
    cotizaciones: (cotizacionesRes.data || []).map((c: any) => ({
      id: c.id,
      folio: c.folio,
      estado: c.estado,
      precioNetoFinal: Number(c.precio_neto_final || 0),
      mensualidadOrdinaria: Number(c.mensualidad_ordinaria_base || 0),
      plazoMeses: Number(c.plazo_meses || 0),
      fechaVigencia: c.fecha_vigencia,
      moneda: c.moneda || "MXN",
    })),
    apartados: (apartadosRes.data || []).map((a: any) => ({
      id: a.id,
      folioApartado: a.folio_apartado,
      unidadClave: a.unidad?.clave_comercial || null,
      estadoApartado: a.estado_apartado,
      montoApartado: Number(a.monto_apartado || 0),
      fechaVencimiento: a.fecha_vencimiento,
      moneda: a.moneda || "MXN",
    })),
    contratos: (contratosRes.data || []).map((c: any) => ({
      id: c.id,
      folio: c.folio,
      titulo: c.titulo,
      tipoContrato: c.tipo_contrato,
      estado: c.estado,
      montoTotal: Number(c.monto_total || 0),
      moneda: c.moneda || "MXN",
      fechaEmision: c.fecha_emision,
    })),
    historialCambios,
  };
}
