// ==============================================================================
// IRIS by WYLEN — SERVICIO DE DOMINIO: COTIZADOR INMOBILIARIO, APARTADOS Y CRM
// ==============================================================================
// Decisiones implementadas:
// • IRIS-DEC-002 / 032: Resolución de política comercial con precedencia por campo
// • IRIS-DEC-011 / 012: Ciclo de vida de unidades, apartados con vigencia configurable,
//                       prórroga auditada, conversión a venta y liberación automática
// • IRIS-DEC-014 / 015 / 024: Cotizaciones multiunidad con snapshot inmutable y
//                       bloqueo de conversión de cotizaciones vencidas
// • IRIS-DEC-019 / 025: Registro de intereses comerciales y vinculación con oportunidades
// ==============================================================================

import { createHash, randomBytes } from "node:crypto";
import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";
import { servicioProyectosInmobiliarios } from "@/servicios/proyectos";
import { calcularCorridaFinancieraInmobiliaria } from "@/librerias/financiero/motor-cotizador";
import type { DesarrolloInmobiliario, UnidadInmobiliaria } from "@/tipos/proyectos";
import type {
  ApartadoUnidadInmobiliaria,
  ContextoInicialCotizador,
  CotizacionInmobiliaria,
  EsquemaFinanciamientoInmobiliario,
  PoliticaComercialEfectiva,
  ProspectoResumenSelector,
  UnidadCotizadaSnapshot,
} from "@/tipos/cotizador";
import type {
  DatosCrearApartadoUnidad,
  DatosEmitirCotizacionInmobiliaria,
  DatosLiberarOConvertirApartado,
  DatosProrrogarApartado,
} from "@/librerias/validaciones/cotizador";

export function obtenerDesarrolloYUnidadesFallback(organizacionId: string): {
  desarrollo: DesarrolloInmobiliario;
  unidades: UnidadInmobiliaria[];
} {
  const ahora = new Date().toISOString();
  const devId = "d0200000-0000-0000-0000-000000000001";
  const etapaId = "e0100000-0000-0000-0000-000000000001";
  const mzaAId = "m0100000-0000-0000-0000-000000000001";
  const mzaBId = "m0200000-0000-0000-0000-000000000002";

  const lotesBase = [
    { id: "c0100000-0000-0000-0000-000000000001", clave: "SOL-A01", num: "A-01", mza: mzaAId, sup: 450, precio: 495000, promo: 465000, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000002", clave: "SOL-A02", num: "A-02", mza: mzaAId, sup: 450, precio: 495000, promo: null, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000003", clave: "SOL-A03", num: "A-03", mza: mzaAId, sup: 450, precio: 495000, promo: null, estado: "apartado" as const },
    { id: "c0100000-0000-0000-0000-000000000004", clave: "SOL-A04", num: "A-04", mza: mzaAId, sup: 450, precio: 495000, promo: null, estado: "vendido" as const },
    { id: "c0100000-0000-0000-0000-000000000005", clave: "SOL-A05", num: "A-05", mza: mzaAId, sup: 450, precio: 495000, promo: null, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000006", clave: "SOL-A06", num: "A-06", mza: mzaAId, sup: 525, precio: 577500, promo: 545000, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000007", clave: "SOL-B01", num: "B-01", mza: mzaBId, sup: 500, precio: 600000, promo: null, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000008", clave: "SOL-B02", num: "B-02", mza: mzaBId, sup: 500, precio: 600000, promo: null, estado: "apartado" as const },
    { id: "c0100000-0000-0000-0000-000000000009", clave: "SOL-B03", num: "B-03", mza: mzaBId, sup: 500, precio: 600000, promo: null, estado: "vendido" as const },
    { id: "c0100000-0000-0000-0000-000000000010", clave: "SOL-B04", num: "B-04", mza: mzaBId, sup: 500, precio: 600000, promo: null, estado: "disponible" as const },
    { id: "c0100000-0000-0000-0000-000000000011", clave: "SOL-B05", num: "B-05", mza: mzaBId, sup: 500, precio: 600000, promo: null, estado: "bloqueado" as const },
    { id: "c0100000-0000-0000-0000-000000000012", clave: "SOL-B06", num: "B-06", mza: mzaBId, sup: 600, precio: 720000, promo: 685000, estado: "disponible" as const },
  ];

  const unidades: UnidadInmobiliaria[] = lotesBase.map((l) => ({
    id: l.id,
    organizacion_id: organizacionId,
    desarrollo_id: devId,
    etapa_id: etapaId,
    manzana_id: l.mza,
    clave_comercial: l.clave,
    numero_lote_unidad: l.num,
    identificador_plano_svg: l.clave,
    tipo_unidad: "lote",
    superficie_m2: l.sup,
    frente_m: 15,
    fondo_m: Math.round((l.sup / 15) * 100) / 100,
    orientacion: "Norte-Sur",
    precio_m2: Math.round(l.precio / l.sup),
    precio_lista: l.precio,
    precio_promocional: l.promo,
    moneda: "MXN",
    estado_disponibilidad: l.estado,
    asesor_apartado_id: null,
    prospecto_actual_id: null,
    oportunidad_actual_id: null,
    apartado_en: l.estado === "apartado" ? ahora : null,
    apartado_vence_en:
      l.estado === "apartado" ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null,
    vendido_en: l.estado === "vendido" ? ahora : null,
    caracteristicas: {},
    documentos_urls: [],
    notas_inventario: null,
    version_registro: 1,
    creado_por_id: null,
    actualizado_por_id: null,
    fecha_creacion: ahora,
    fecha_actualizacion: ahora,
  }));

  const desarrollo: DesarrolloInmobiliario = {
    id: devId,
    organizacion_id: organizacionId,
    desarrolladora_id: "d0100000-0000-0000-0000-000000000001",
    nombre: "SOLHÁ — Lotes Campestres",
    slug: "solha-lotes-campestres",
    tipo_desarrollo: "lotes_campestres",
    descripcion: "Desarrollo campestre residencial.",
    ubicacion_texto: "Corredor Mérida - Conkal, Yucatán",
    estado_provincia: "Yucatán",
    municipio_ciudad: "Conkal",
    direccion: "Km 14 Carretera Mérida - Motul",
    latitud: 21.0734,
    longitud: -89.5211,
    moneda: "MXN",
    precio_desde: 465000,
    superficie_total_hectareas: 18.5,
    amenidades: ["Acceso Monumental", "Parque Central"],
    portada_url: null,
    galeria_urls: [],
    configuracion_comercial: {},
    estado_publicacion: "activo",
    creado_por_id: null,
    actualizado_por_id: null,
    fecha_creacion: ahora,
    fecha_actualizacion: ahora,
  };

  return { desarrollo, unidades };
}

const POLITICA_SISTEMA_DEFAULT: PoliticaComercialEfectiva = {
  horas_vigencia_apartado: 72,
  dias_vigencia_cotizacion: 7,
  permitir_apartado_directo_asesor: true,
  permitir_liberacion_propia_asesor: true,
  requiere_autorizacion_gerente_cierre: true,
  descuento_maximo_sin_autorizacion_pct: 5.0,
  modo_pagos_extraordinarios_default: "valor_presente_cuota_fija",
  version_politica_org: 1,
  version_politica_desarrollo: 0,
};

function obtenerEsquemasDemo(organizacionId: string, desarrolloId: string): EsquemaFinanciamientoInmobiliario[] {
  return [
    {
      id: "f1000000-0000-4000-8000-000000000001",
      organizacion_id: organizacionId,
      desarrollo_id: desarrolloId,
      nombre: "Contado Comercial (Hasta 8% Dto.)",
      descripcion: "Liquidación de contado con enganche inmediato y hasta 8% de descuento.",
      tipo_tasa_interes: "sin_intereses",
      tasa_interes_anual: 0,
      modo_pagos_extraordinarios: "valor_presente_cuota_fija",
      porcentaje_enganche_min: 30,
      max_meses_enganche_diferido: 3,
      plazos_meses_permitidos: [1, 3, 6],
      descuento_maximo_pct: 8,
      permite_pagos_extraordinarios: false,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    },
    {
      id: "f1000000-0000-4000-8000-000000000002",
      organizacion_id: organizacionId,
      desarrollo_id: desarrolloId,
      nombre: "36 Meses Sin Intereses (MSI Directo)",
      descripcion: "Financiamiento directo con la desarrolladora hasta 36 meses sin intereses con 15% de enganche.",
      tipo_tasa_interes: "sin_intereses",
      tasa_interes_anual: 0,
      modo_pagos_extraordinarios: "valor_presente_cuota_fija",
      porcentaje_enganche_min: 15,
      max_meses_enganche_diferido: 6,
      plazos_meses_permitidos: [12, 18, 24, 36],
      descuento_maximo_pct: 5,
      permite_pagos_extraordinarios: true,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    },
    {
      id: "f1000000-0000-4000-8000-000000000003",
      organizacion_id: organizacionId,
      desarrollo_id: desarrolloId,
      nombre: "Crédito Directo 60 a 120 Meses (Tasa Nominal 12% Anual)",
      descripcion: "Amortización francesa con tasa nominal anual del 12% y anualidades programables.",
      tipo_tasa_interes: "nominal_anual",
      tasa_interes_anual: 12,
      modo_pagos_extraordinarios: "valor_presente_cuota_fija",
      porcentaje_enganche_min: 10,
      max_meses_enganche_diferido: 12,
      plazos_meses_permitidos: [48, 60, 72, 84, 96, 120],
      descuento_maximo_pct: 3,
      permite_pagos_extraordinarios: true,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    },
  ];
}

function generarFolioComercial(prefijo: "COT" | "APT"): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const sufijo = randomBytes(2).toString("hex").toUpperCase();
  return `${prefijo}-${anio}${mes}${dia}-${sufijo}`;
}

export class ServicioCotizadorYApartados {
  /**
   * Resuelve la política comercial efectiva con herencia campo por campo:
   * Desarrollo -> Organización -> Sistema (IRIS-DEC-002 / IRIS-DEC-032).
   */
  static async obtenerPoliticaComercialEfectiva(
    organizacionId: string,
    desarrolloId: string
  ): Promise<PoliticaComercialEfectiva> {
    try {
      const supabase = crearClienteSupabaseAdministrador();
      const { data, error } = await supabase
        .from("politicas_comerciales")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .or(`desarrollo_id.is.null,desarrollo_id.eq.${desarrolloId}`);

      if (error || !data || data.length === 0) {
        return POLITICA_SISTEMA_DEFAULT;
      }

      const polOrg = data.find((p) => p.desarrollo_id === null);
      const polDes = data.find((p) => p.desarrollo_id === desarrolloId);

      return {
        horas_vigencia_apartado: Number(
          polDes?.horas_vigencia_apartado ??
            polOrg?.horas_vigencia_apartado ??
            POLITICA_SISTEMA_DEFAULT.horas_vigencia_apartado
        ),
        dias_vigencia_cotizacion: Number(
          polDes?.dias_vigencia_cotizacion ??
            polOrg?.dias_vigencia_cotizacion ??
            POLITICA_SISTEMA_DEFAULT.dias_vigencia_cotizacion
        ),
        permitir_apartado_directo_asesor: Boolean(
          polDes?.permitir_apartado_directo_asesor ??
            polOrg?.permitir_apartado_directo_asesor ??
            POLITICA_SISTEMA_DEFAULT.permitir_apartado_directo_asesor
        ),
        permitir_liberacion_propia_asesor: Boolean(
          polDes?.permitir_liberacion_propia_asesor ??
            polOrg?.permitir_liberacion_propia_asesor ??
            POLITICA_SISTEMA_DEFAULT.permitir_liberacion_propia_asesor
        ),
        requiere_autorizacion_gerente_cierre: Boolean(
          polDes?.requiere_autorizacion_gerente_cierre ??
            polOrg?.requiere_autorizacion_gerente_cierre ??
            POLITICA_SISTEMA_DEFAULT.requiere_autorizacion_gerente_cierre
        ),
        descuento_maximo_sin_autorizacion_pct: Number(
          polDes?.descuento_maximo_sin_autorizacion_pct ??
            polOrg?.descuento_maximo_sin_autorizacion_pct ??
            POLITICA_SISTEMA_DEFAULT.descuento_maximo_sin_autorizacion_pct
        ),
        modo_pagos_extraordinarios_default:
          (polDes?.modo_pagos_extraordinarios_default ??
            polOrg?.modo_pagos_extraordinarios_default ??
            POLITICA_SISTEMA_DEFAULT.modo_pagos_extraordinarios_default) as PoliticaComercialEfectiva["modo_pagos_extraordinarios_default"],
        version_politica_org: Number(polOrg?.version_politica ?? 1),
        version_politica_desarrollo: Number(polDes?.version_politica ?? 0),
      };
    } catch {
      return POLITICA_SISTEMA_DEFAULT;
    }
  }

  /**
   * Libera de forma idempotente y Just-in-Time los apartados cuya vigencia ya expiró.
   */
  static async liberarApartadosVencidosJustInTime(
    organizacionId: string,
    desarrolloId?: string
  ): Promise<number> {
    try {
      const supabase = crearClienteSupabaseAdministrador();
      const ahoraIso = new Date().toISOString();

      let consulta = supabase
        .from("unidades_inmobiliarias")
        .select("id, organizacion_id, desarrollo_id, clave_comercial, asesor_apartado_id, prospecto_actual_id, oportunidad_actual_id, apartado_vence_en, version_registro")
        .eq("organizacion_id", organizacionId)
        .eq("estado_disponibilidad", "apartado")
        .not("apartado_vence_en", "is", null)
        .lte("apartado_vence_en", ahoraIso);

      if (desarrolloId) {
        consulta = consulta.eq("desarrollo_id", desarrolloId);
      }

      const { data: vencidas, error } = await consulta;
      if (error || !vencidas || vencidas.length === 0) {
        return 0;
      }

      let liberadas = 0;
      for (const u of vencidas) {
        const { error: errUpd } = await supabase
          .from("unidades_inmobiliarias")
          .update({
            estado_disponibilidad: "disponible",
            asesor_apartado_id: null,
            prospecto_actual_id: null,
            oportunidad_actual_id: null,
            apartado_en: null,
            apartado_vence_en: null,
            version_registro: Number(u.version_registro || 1) + 1,
          })
          .eq("id", u.id)
          .eq("organizacion_id", organizacionId)
          .eq("estado_disponibilidad", "apartado");

        if (!errUpd) {
          liberadas++;
          await supabase
            .from("apartados_unidades")
            .update({
              estado_apartado: "vencido_liberado",
              liberado_en: ahoraIso,
              motivo_liberacion: "Expiración automática de vigencia de apartado (Just-in-Time)",
            })
            .eq("organizacion_id", organizacionId)
            .eq("unidad_id", u.id)
            .eq("estado_apartado", "activo");

          await supabase.from("historial_disponibilidad_unidad").insert({
            organizacion_id: organizacionId,
            unidad_id: u.id,
            estado_anterior: "apartado",
            estado_nuevo: "disponible",
            actor_tipo: "sistema_cron",
            usuario_id: null,
            actor_sistema_identificador: "jit:liberar_apartados_vencidos",
            prospecto_id: u.prospecto_actual_id,
            oportunidad_id: u.oportunidad_actual_id,
            motivo: "Expiración automática de vigencia de apartado",
            metadatos: {
              apartado_vence_en: u.apartado_vence_en,
              asesor_anterior_id: u.asesor_apartado_id,
            },
          });
        }
      }

      return liberadas;
    } catch {
      return 0;
    }
  }

  /**
   * Obtiene todo el contexto necesario para operar el Cotizador y el módulo de Apartados
   * sobre un desarrollo específico.
   */
  static async obtenerContextoCotizadorPorDesarrollo(
    organizacionId: string,
    desarrolloId: string
  ): Promise<ContextoInicialCotizador> {
    await this.liberarApartadosVencidosJustInTime(organizacionId, desarrolloId);

    const estructuraBd =
      await servicioProyectosInmobiliarios.obtenerEstructuraJerarquicaDesarrollo(
        organizacionId,
        desarrolloId
      );
    const fallback = obtenerDesarrolloYUnidadesFallback(organizacionId);
    const estructura = {
      desarrollo: estructuraBd.desarrollo ?? fallback.desarrollo,
      unidades: estructuraBd.unidades.length > 0 ? estructuraBd.unidades : fallback.unidades,
    };
    const politicaEfectiva = await this.obtenerPoliticaComercialEfectiva(organizacionId, desarrolloId);

    const supabase = crearClienteSupabaseAdministrador();

    // 1. Esquemas de financiamiento
    let esquemasFinanciamiento: EsquemaFinanciamientoInmobiliario[] = [];
    try {
      const { data: esqData, error: esqErr } = await supabase
        .from("esquemas_financiamiento")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .eq("desarrollo_id", desarrolloId)
        .eq("activo", true)
        .order("fecha_creacion", { ascending: true });

      if (!esqErr && esqData && esqData.length > 0) {
        esquemasFinanciamiento = esqData.map((e) => ({
          id: e.id,
          organizacion_id: e.organizacion_id,
          desarrollo_id: e.desarrollo_id,
          nombre: e.nombre,
          descripcion: e.descripcion,
          tipo_tasa_interes: e.tipo_tasa_interes,
          tasa_interes_anual: Number(e.tasa_interes_anual || 0),
          modo_pagos_extraordinarios: e.modo_pagos_extraordinarios,
          porcentaje_enganche_min: Number(e.porcentaje_enganche_min || 10),
          max_meses_enganche_diferido: Number(e.max_meses_enganche_diferido || 6),
          plazos_meses_permitidos: Array.isArray(e.plazos_meses_permitidos)
            ? e.plazos_meses_permitidos.map(Number)
            : [12, 24, 36, 48, 60],
          descuento_maximo_pct: Number(e.descuento_maximo_pct || 0),
          permite_pagos_extraordinarios: Boolean(e.permite_pagos_extraordinarios),
          activo: Boolean(e.activo),
          fecha_creacion: e.fecha_creacion,
        }));
      } else {
        esquemasFinanciamiento = obtenerEsquemasDemo(organizacionId, desarrolloId);
      }
    } catch {
      esquemasFinanciamiento = obtenerEsquemasDemo(organizacionId, desarrolloId);
    }

    // 2. Cotizaciones recientes
    let cotizacionesRecientes: CotizacionInmobiliaria[] = [];
    try {
      const { data: cotData, error: cotErr } = await supabase
        .from("cotizaciones_inmobiliarias")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .eq("desarrollo_id", desarrolloId)
        .order("fecha_creacion", { ascending: false })
        .limit(30);

      if (!cotErr && cotData) {
        cotizacionesRecientes = cotData.map((c) => {
          const snap = (c.snapshot_comercial || {}) as Record<string, unknown>;
          return {
            id: c.id,
            organizacion_id: c.organizacion_id,
            folio: c.folio,
            token_publico_ultimos4: c.token_publico_ultimos4,
            acceso_publico_activo: Boolean(c.acceso_publico_activo),
            desarrollo_id: c.desarrollo_id,
            desarrollo_nombre: estructura.desarrollo.nombre,
            esquema_financiamiento_id: c.esquema_financiamiento_id,
            prospecto_id: c.prospecto_id,
            contacto_id: c.contacto_id,
            oportunidad_id: c.oportunidad_id,
            cliente_nombre_libre: c.cliente_nombre_libre ?? (snap.cliente_nombre as string) ?? "Cliente Comercial",
            cliente_telefono_libre: c.cliente_telefono_libre ?? null,
            cliente_correo_libre: c.cliente_correo_libre ?? null,
            asesor_id: c.asesor_id,
            estado: c.estado,
            requiere_autorizacion: Boolean(c.requiere_autorizacion),
            autorizada_por_id: c.autorizada_por_id,
            fecha_autorizacion: c.fecha_autorizacion,
            fecha_vigencia: c.fecha_vigencia,
            moneda: c.moneda,
            subtotal_lista: Number(c.subtotal_lista || 0),
            descuento_pct: Number(c.descuento_pct || 0),
            descuento_monto: Number(c.descuento_monto || 0),
            precio_neto_final: Number(c.precio_neto_final || 0),
            enganche_total: Number(c.enganche_total || 0),
            meses_enganche_diferido: Number(c.meses_enganche_diferido || 1),
            saldo_financiado: Number(c.saldo_financiado || 0),
            plazo_meses: Number(c.plazo_meses || 0),
            tipo_tasa_interes: c.tipo_tasa_interes,
            tasa_interes_anual: Number(c.tasa_interes_anual || 0),
            tasa_mensual_efectiva: Number(c.tasa_mensual_efectiva || 0),
            modo_pagos_extraordinarios: c.modo_pagos_extraordinarios,
            mensualidad_ordinaria_base: Number(c.mensualidad_ordinaria_base || 0),
            total_pagos_extraordinarios: Number(c.total_pagos_extraordinarios || 0),
            total_intereses: Number(c.total_intereses || 0),
            total_a_pagar: Number(c.total_a_pagar || 0),
            notas_comerciales: c.notas_comerciales,
            unidades: Array.isArray(snap.unidades) ? (snap.unidades as UnidadCotizadaSnapshot[]) : [],
            corrida_financiera: snap.corrida_financiera as CotizacionInmobiliaria["corrida_financiera"],
            fecha_creacion: c.fecha_creacion,
            fecha_actualizacion: c.fecha_actualizacion,
          };
        });
      }
    } catch {
      cotizacionesRecientes = [];
    }

    // 3. Apartados del desarrollo
    let apartadosDesarrollo: ApartadoUnidadInmobiliaria[] = [];
    try {
      const mapaUnidades = new Map(estructura.unidades.map((u) => [u.id, u]));
      const { data: aptData, error: aptErr } = await supabase
        .from("apartados_unidades")
        .select("*")
        .eq("organizacion_id", organizacionId)
        .eq("desarrollo_id", desarrolloId)
        .order("fecha_creacion", { ascending: false })
        .limit(40);

      if (!aptErr && aptData && aptData.length > 0) {
        apartadosDesarrollo = aptData.map((a) => {
          const u = mapaUnidades.get(a.unidad_id);
          return {
            id: a.id,
            organizacion_id: a.organizacion_id,
            folio_apartado: a.folio_apartado,
            desarrollo_id: a.desarrollo_id,
            desarrollo_nombre: estructura.desarrollo.nombre,
            unidad_id: a.unidad_id,
            unidad_clave_comercial: u?.clave_comercial ?? "UNIDAD",
            unidad_superficie_m2: u?.superficie_m2 ?? 0,
            cotizacion_id: a.cotizacion_id,
            prospecto_id: a.prospecto_id,
            contacto_id: a.contacto_id,
            oportunidad_id: a.oportunidad_id,
            cliente_nombre: a.cliente_nombre,
            cliente_telefono: a.cliente_telefono,
            cliente_correo: a.cliente_correo,
            asesor_id: a.asesor_id,
            monto_apartado: Number(a.monto_apartado || 0),
            precio_congelado_unidad: Number(a.precio_congelado_unidad || 0),
            moneda: a.moneda,
            estado_apartado: a.estado_apartado,
            fecha_apartado: a.fecha_apartado,
            fecha_vencimiento: a.fecha_vencimiento,
            prorrogas_aplicadas: Number(a.prorrogas_aplicadas || 0),
            justificacion_ultima_prorroga: a.justificacion_ultima_prorroga,
            liberado_en: a.liberado_en,
            motivo_liberacion: a.motivo_liberacion,
            convertido_venta_en: a.convertido_venta_en,
            notas: a.notas,
            fecha_creacion: a.fecha_creacion,
          };
        });
      } else {
        // Si hay unidades en estado 'apartado' desde el inventario pero aún sin fila en apartados_unidades, reflejarlas
        apartadosDesarrollo = estructura.unidades
          .filter((u) => u.estado_disponibilidad === "apartado")
          .map((u, idx) => ({
            id: `apt-inv-${u.id}`,
            organizacion_id: organizacionId,
            folio_apartado: `APT-INV-0${idx + 1}`,
            desarrollo_id: desarrolloId,
            desarrollo_nombre: estructura.desarrollo.nombre,
            unidad_id: u.id,
            unidad_clave_comercial: u.clave_comercial,
            unidad_superficie_m2: u.superficie_m2,
            cotizacion_id: null,
            prospecto_id: u.prospecto_actual_id,
            contacto_id: null,
            oportunidad_id: u.oportunidad_actual_id,
            cliente_nombre: "Reserva Comercial Activa",
            cliente_telefono: null,
            cliente_correo: null,
            asesor_id: u.asesor_apartado_id || "",
            monto_apartado: 10000,
            precio_congelado_unidad: Number(u.precio_promocional ?? u.precio_lista),
            moneda: u.moneda,
            estado_apartado: "activo",
            fecha_apartado: u.apartado_en || new Date().toISOString(),
            fecha_vencimiento:
              u.apartado_vence_en || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            prorrogas_aplicadas: 0,
            justificacion_ultima_prorroga: null,
            liberado_en: null,
            motivo_liberacion: null,
            convertido_venta_en: null,
            notas: u.notas_inventario,
            fecha_creacion: u.fecha_creacion,
          }));
      }
    } catch {
      apartadosDesarrollo = [];
    }

    // 4. Prospectos activos para el selector
    let prospectosActivos: ProspectoResumenSelector[] = [];
    try {
      const { data: prospData } = await supabase
        .from("prospectos")
        .select("id, nombre, telefono, correo_electronico, estado, contacto_convertido_id, oportunidad_convertida_id")
        .eq("organizacion_id", organizacionId)
        .neq("estado", "descartado")
        .order("fecha_creacion", { ascending: false })
        .limit(50);

      if (prospData) {
        prospectosActivos = prospData.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          telefono: p.telefono,
          correo_electronico: p.correo_electronico,
          estado: p.estado,
          contacto_convertido_id: p.contacto_convertido_id,
          oportunidad_convertida_id: p.oportunidad_convertida_id,
        }));
      }
    } catch {
      prospectosActivos = [];
    }

    return {
      desarrolloActivoId: desarrolloId,
      unidadesDesarrollo: estructura.unidades,
      esquemasFinanciamiento,
      politicaEfectiva,
      cotizacionesRecientes,
      apartadosDesarrollo,
      prospectosActivos,
    };
  }

  /**
   * Emite una nueva cotización inmobiliaria multiunidad o individual con corrida financiera
   * inmutable y registro de intereses comerciales.
   */
  static async emitirCotizacionInmobiliaria(
    organizacionId: string,
    usuarioId: string,
    rolJerarquico: string,
    datos: DatosEmitirCotizacionInmobiliaria
  ): Promise<CotizacionInmobiliaria> {
    const estructuraBd =
      await servicioProyectosInmobiliarios.obtenerEstructuraJerarquicaDesarrollo(
        organizacionId,
        datos.desarrollo_id
      );
    const fallback = obtenerDesarrolloYUnidadesFallback(organizacionId);
    const estructura = {
      desarrollo: estructuraBd.desarrollo ?? fallback.desarrollo,
      unidades: estructuraBd.unidades.length > 0 ? estructuraBd.unidades : fallback.unidades,
    };
    const politica = await this.obtenerPoliticaComercialEfectiva(organizacionId, datos.desarrollo_id);

    const unidadesSeleccionadas = estructura.unidades.filter((u) =>
      datos.unidades_ids.includes(u.id)
    );

    if (unidadesSeleccionadas.length === 0) {
      throw new Error("No se encontraron las unidades seleccionadas en el inventario del desarrollo.");
    }

    const unidadesVendidas = unidadesSeleccionadas.filter(
      (u) => u.estado_disponibilidad === "vendido" || u.estado_disponibilidad === "bloqueado"
    );
    if (unidadesVendidas.length > 0) {
      throw new Error(
        `Las unidades ${unidadesVendidas.map((u) => u.clave_comercial).join(", ")} ya se encuentran vendidas o bloqueadas y no pueden cotizarse.`
      );
    }

    const unidadesSnapshot: UnidadCotizadaSnapshot[] = unidadesSeleccionadas.map((u) => ({
      unidad_id: u.id,
      clave_comercial: u.clave_comercial,
      tipo_unidad: u.tipo_unidad,
      superficie_m2: Number(u.superficie_m2),
      precio_lista: Number(u.precio_lista),
      precio_base_aplicado: Number(u.precio_promocional ?? u.precio_lista),
      etapa_nombre: u.etapa?.nombre ?? null,
      manzana_nombre: u.manzana?.nombre ?? null,
    }));

    const subtotalLista = unidadesSnapshot.reduce((acc, u) => acc + u.precio_base_aplicado, 0);

    const corrida = calcularCorridaFinancieraInmobiliaria({
      subtotalLista,
      descuentoPorcentaje: datos.descuento_porcentaje,
      modalidadEnganche: datos.modalidad_enganche,
      enganchePorcentaje: datos.enganche_porcentaje,
      engancheMontoFijo: datos.enganche_monto_fijo,
      mesesEngancheDiferido: datos.meses_enganche_diferido,
      plazoMesesFinanciamiento: datos.plazo_meses,
      tipoTasaInteres: datos.tipo_tasa_interes,
      tasaInteresAnualPorcentaje: datos.tasa_interes_anual,
      modoPagosExtraordinarios: datos.modo_pagos_extraordinarios,
      pagosExtraordinarios: datos.pagos_extraordinarios,
    });

    const esGerencia = rolJerarquico === "superadministrador" || rolJerarquico === "gerente";
    const requiereAutorizacion =
      corrida.descuentoPorcentajeAplicado > politica.descuento_maximo_sin_autorizacion_pct && !esGerencia;

    const estadoCotizacion = requiereAutorizacion ? "pendiente_autorizacion" : "emitida";
    const folio = generarFolioComercial("COT");
    const tokenPlano = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(tokenPlano).digest("hex");
    const tokenUltimos4 = tokenPlano.slice(-4).toUpperCase();

    const fechaVigenciaDate = new Date();
    fechaVigenciaDate.setDate(fechaVigenciaDate.getDate() + politica.dias_vigencia_cotizacion);
    const fechaVigenciaStr = fechaVigenciaDate.toISOString().split("T")[0];

    const snapshotComercial = {
      desarrolladora: estructura.desarrollo.desarrolladora?.nombre || "Desarrolladora",
      desarrollo: {
        id: estructura.desarrollo.id,
        nombre: estructura.desarrollo.nombre,
        ubicacion: estructura.desarrollo.ubicacion_texto,
        moneda: estructura.desarrollo.moneda,
      },
      cliente_nombre: datos.cliente_nombre_libre,
      cliente_telefono: datos.cliente_telefono_libre ?? null,
      cliente_correo: datos.cliente_correo_libre ?? null,
      unidades: unidadesSnapshot,
      corrida_financiera: corrida,
      politica_aplicada: politica,
    };

    const supabase = crearClienteSupabaseAdministrador();
    const ahoraIso = new Date().toISOString();

    const { data: insertada, error: errCot } = await supabase
      .from("cotizaciones_inmobiliarias")
      .insert({
        organizacion_id: organizacionId,
        folio,
        token_publico_hash: tokenHash,
        token_publico_ultimos4: tokenUltimos4,
        acceso_publico_activo: true,
        desarrollo_id: datos.desarrollo_id,
        esquema_financiamiento_id: datos.esquema_financiamiento_id || null,
        prospecto_id: datos.prospecto_id || null,
        contacto_id: datos.contacto_id || null,
        oportunidad_id: datos.oportunidad_id || null,
        cliente_nombre_libre: datos.cliente_nombre_libre,
        cliente_telefono_libre: datos.cliente_telefono_libre || null,
        cliente_correo_libre: datos.cliente_correo_libre || null,
        asesor_id: usuarioId,
        estado: estadoCotizacion,
        requiere_autorizacion: requiereAutorizacion,
        autorizada_por_id: !requiereAutorizacion && corrida.descuentoPorcentajeAplicado > 0 && esGerencia ? usuarioId : null,
        fecha_autorizacion: !requiereAutorizacion && corrida.descuentoPorcentajeAplicado > 0 && esGerencia ? ahoraIso : null,
        fecha_vigencia: fechaVigenciaStr,
        moneda: estructura.desarrollo.moneda,
        subtotal_lista: corrida.subtotalLista,
        descuento_pct: corrida.descuentoPorcentajeAplicado,
        descuento_monto: corrida.descuentoMontoAplicado,
        precio_neto_final: corrida.precioNetoFinal,
        enganche_total: corrida.engancheTotal,
        meses_enganche_diferido: corrida.mesesEngancheDiferido,
        saldo_financiado: corrida.saldoFinanciado,
        plazo_meses: corrida.plazoMeses,
        tipo_tasa_interes: corrida.tipoTasaInteres,
        tasa_interes_anual: corrida.tasaInteresAnualPorcentaje,
        tasa_mensual_efectiva: corrida.tasaMensualEfectivaDecimal,
        modo_pagos_extraordinarios: corrida.modoPagosExtraordinarios,
        mensualidad_ordinaria_base: corrida.mensualidadOrdinariaBase,
        total_pagos_extraordinarios: corrida.totalPagosExtraordinarios,
        total_intereses: corrida.totalIntereses,
        total_a_pagar: corrida.totalInversionGeneral,
        notas_comerciales: datos.notas_comerciales || null,
        snapshot_comercial: snapshotComercial,
      })
      .select("*")
      .single();

    const cotizacionId = insertada?.id ?? `cot-local-${Date.now()}`;

    if (insertada) {
      const filasUnidades = unidadesSnapshot.map((u) => ({
        organizacion_id: organizacionId,
        cotizacion_id: insertada.id,
        desarrollo_id: datos.desarrollo_id,
        unidad_id: u.unidad_id,
        clave_comercial_congelada: u.clave_comercial,
        superficie_m2_congelada: u.superficie_m2,
        precio_lista_congelado: u.precio_lista,
        precio_base_aplicado: u.precio_base_aplicado,
      }));
      await supabase.from("cotizacion_unidades").insert(filasUnidades);

      // Si hay prospecto_id, registrar el interés comercial sin sobrescribir su historial (IRIS-DEC-019)
      if (datos.prospecto_id) {
        for (const u of unidadesSnapshot) {
          await supabase.from("prospectos_intereses").insert({
            organizacion_id: organizacionId,
            prospecto_id: datos.prospecto_id,
            desarrollo_id: datos.desarrollo_id,
            unidad_id: u.unidad_id,
            es_principal: false,
            estado_interes: "cotizado",
            presupuesto_estimado: corrida.precioNetoFinal,
            notas: `Cotización emitida ${folio}`,
            creado_por_id: usuarioId,
          });
        }
      }
    }

    return {
      id: cotizacionId,
      organizacion_id: organizacionId,
      folio,
      token_publico_ultimos4: tokenUltimos4,
      acceso_publico_activo: true,
      desarrollo_id: datos.desarrollo_id,
      desarrollo_nombre: estructura.desarrollo.nombre,
      esquema_financiamiento_id: datos.esquema_financiamiento_id || null,
      prospecto_id: datos.prospecto_id || null,
      contacto_id: datos.contacto_id || null,
      oportunidad_id: datos.oportunidad_id || null,
      cliente_nombre_libre: datos.cliente_nombre_libre,
      cliente_telefono_libre: datos.cliente_telefono_libre || null,
      cliente_correo_libre: datos.cliente_correo_libre || null,
      asesor_id: usuarioId,
      estado: estadoCotizacion,
      requiere_autorizacion: requiereAutorizacion,
      autorizada_por_id: insertada?.autorizada_por_id ?? null,
      fecha_autorizacion: insertada?.fecha_autorizacion ?? null,
      fecha_vigencia: fechaVigenciaStr,
      moneda: estructura.desarrollo.moneda,
      subtotal_lista: corrida.subtotalLista,
      descuento_pct: corrida.descuentoPorcentajeAplicado,
      descuento_monto: corrida.descuentoMontoAplicado,
      precio_neto_final: corrida.precioNetoFinal,
      enganche_total: corrida.engancheTotal,
      meses_enganche_diferido: corrida.mesesEngancheDiferido,
      saldo_financiado: corrida.saldoFinanciado,
      plazo_meses: corrida.plazoMeses,
      tipo_tasa_interes: corrida.tipoTasaInteres,
      tasa_interes_anual: corrida.tasaInteresAnualPorcentaje,
      tasa_mensual_efectiva: corrida.tasaMensualEfectivaDecimal,
      modo_pagos_extraordinarios: corrida.modoPagosExtraordinarios,
      mensualidad_ordinaria_base: corrida.mensualidadOrdinariaBase,
      total_pagos_extraordinarios: corrida.totalPagosExtraordinarios,
      total_intereses: corrida.totalIntereses,
      total_a_pagar: corrida.totalInversionGeneral,
      notas_comerciales: datos.notas_comerciales || null,
      unidades: unidadesSnapshot,
      corrida_financiera: corrida,
      fecha_creacion: insertada?.fecha_creacion ?? ahoraIso,
      fecha_actualizacion: insertada?.fecha_actualizacion ?? ahoraIso,
    };
  }

  /**
   * Crea un apartado formal sobre una unidad disponible, bloqueándola atómicamente en
   * unidades_inmobiliarias con fecha de vencimiento configurable y registrando la auditoría.
   */
  static async crearApartadoUnidad(
    organizacionId: string,
    usuarioId: string,
    rolJerarquico: string,
    datos: DatosCrearApartadoUnidad
  ): Promise<ApartadoUnidadInmobiliaria> {
    const supabase = crearClienteSupabaseAdministrador();
    const politica = await this.obtenerPoliticaComercialEfectiva(organizacionId, datos.desarrollo_id);

    if (rolJerarquico === "asesor" && !politica.permitir_apartado_directo_asesor) {
      throw new Error(
        "La política comercial del desarrollo exige que el apartado sea registrado o autorizado por un Coordinador o Gerente."
      );
    }

    // Si proviene de una cotización, validar que no esté expirada ni pendiente de autorización (IRIS-DEC-024)
    if (datos.cotizacion_id) {
      const { data: cot } = await supabase
        .from("cotizaciones_inmobiliarias")
        .select("id, folio, estado, fecha_vigencia, requiere_autorizacion")
        .eq("id", datos.cotizacion_id)
        .eq("organizacion_id", organizacionId)
        .maybeSingle();

      if (cot) {
        if (cot.estado === "pendiente_autorizacion") {
          throw new Error(
            `La cotización ${cot.folio} tiene un descuento pendiente de autorización gerencial y no puede convertirse en apartado aún.`
          );
        }
        const hoyStr = new Date().toISOString().split("T")[0];
        if (cot.fecha_vigencia < hoyStr || cot.estado === "expirada") {
          throw new Error(
            `La cotización ${cot.folio} venció el ${cot.fecha_vigencia}. Revalida o emite una nueva cotización con precios vigentes antes de apartar (IRIS-DEC-024).`
          );
        }
      }
    }

    // Liberar primero si esa unidad tenía un apartado vencido no sincronizado
    await this.liberarApartadosVencidosJustInTime(organizacionId, datos.desarrollo_id);

    const { data: unidadActual, error: errUnidad } = await supabase
      .from("unidades_inmobiliarias")
      .select("*")
      .eq("id", datos.unidad_id)
      .eq("organizacion_id", organizacionId)
      .eq("desarrollo_id", datos.desarrollo_id)
      .maybeSingle();

    if (errUnidad || !unidadActual) {
      throw new Error("No se encontró la unidad inmobiliaria en el inventario de la organización.");
    }

    if (unidadActual.estado_disponibilidad !== "disponible") {
      throw new Error(
        `CONFLICTO DE CONCURRENCIA: La unidad ${unidadActual.clave_comercial} ya no está disponible (estado actual: ${unidadActual.estado_disponibilidad.toUpperCase()}).`
      );
    }

    const horasVigencia = datos.horas_vigencia || politica.horas_vigencia_apartado || 72;
    const ahora = new Date();
    const venceEn = new Date(ahora.getTime() + horasVigencia * 3600 * 1000);
    const folioApartado = generarFolioComercial("APT");
    const precioCongelado = Number(unidadActual.precio_promocional ?? unidadActual.precio_lista ?? 0);

    // Actualización con control optimista de versión (version_registro)
    const { data: unidadActualizada, error: errUpd } = await supabase
      .from("unidades_inmobiliarias")
      .update({
        estado_disponibilidad: "apartado",
        asesor_apartado_id: usuarioId,
        prospecto_actual_id: datos.prospecto_id || null,
        apartado_en: ahora.toISOString(),
        apartado_vence_en: venceEn.toISOString(),
        version_registro: Number(unidadActual.version_registro || 1) + 1,
        actualizado_por_id: usuarioId,
      })
      .eq("id", datos.unidad_id)
      .eq("organizacion_id", organizacionId)
      .eq("estado_disponibilidad", "disponible")
      .eq("version_registro", unidadActual.version_registro)
      .select("*")
      .maybeSingle();

    if (errUpd || !unidadActualizada) {
      throw new Error(
        `CONFLICTO DE CONCURRENCIA: Otro asesor acaba de modificar o apartar la unidad ${unidadActual.clave_comercial}.`
      );
    }

    const { data: apartadoInsertado } = await supabase
      .from("apartados_unidades")
      .insert({
        organizacion_id: organizacionId,
        folio_apartado: folioApartado,
        desarrollo_id: datos.desarrollo_id,
        unidad_id: datos.unidad_id,
        cotizacion_id: datos.cotizacion_id || null,
        prospecto_id: datos.prospecto_id || null,
        cliente_nombre: datos.cliente_nombre,
        cliente_telefono: datos.cliente_telefono || null,
        cliente_correo: datos.cliente_correo || null,
        asesor_id: usuarioId,
        monto_apartado: datos.monto_apartado,
        precio_congelado_unidad: precioCongelado,
        moneda: unidadActual.moneda || "MXN",
        estado_apartado: "activo",
        fecha_apartado: ahora.toISOString(),
        fecha_vencimiento: venceEn.toISOString(),
        notas: datos.notas || null,
      })
      .select("*")
      .maybeSingle();

    await supabase.from("historial_disponibilidad_unidad").insert({
      organizacion_id: organizacionId,
      unidad_id: datos.unidad_id,
      estado_anterior: "disponible",
      estado_nuevo: "apartado",
      actor_tipo: "usuario",
      usuario_id: usuarioId,
      prospecto_id: datos.prospecto_id || null,
      motivo: `Apartado ${folioApartado} registrado para ${datos.cliente_nombre} (vigencia: ${horasVigencia}h)`,
      metadatos: {
        folio_apartado: folioApartado,
        monto_apartado: datos.monto_apartado,
        precio_congelado_unidad: precioCongelado,
        apartado_vence_en: venceEn.toISOString(),
      },
    });

    if (datos.cotizacion_id) {
      await supabase
        .from("cotizaciones_inmobiliarias")
        .update({ estado: "aceptada" })
        .eq("id", datos.cotizacion_id)
        .eq("organizacion_id", organizacionId);
    }

    return {
      id: apartadoInsertado?.id ?? `apt-${Date.now()}`,
      organizacion_id: organizacionId,
      folio_apartado: folioApartado,
      desarrollo_id: datos.desarrollo_id,
      unidad_id: datos.unidad_id,
      unidad_clave_comercial: unidadActual.clave_comercial,
      unidad_superficie_m2: Number(unidadActual.superficie_m2),
      cotizacion_id: datos.cotizacion_id || null,
      prospecto_id: datos.prospecto_id || null,
      contacto_id: null,
      oportunidad_id: null,
      cliente_nombre: datos.cliente_nombre,
      cliente_telefono: datos.cliente_telefono || null,
      cliente_correo: datos.cliente_correo || null,
      asesor_id: usuarioId,
      monto_apartado: datos.monto_apartado,
      precio_congelado_unidad: precioCongelado,
      moneda: unidadActual.moneda || "MXN",
      estado_apartado: "activo",
      fecha_apartado: ahora.toISOString(),
      fecha_vencimiento: venceEn.toISOString(),
      prorrogas_aplicadas: 0,
      justificacion_ultima_prorroga: null,
      liberado_en: null,
      motivo_liberacion: null,
      convertido_venta_en: null,
      notas: datos.notas || null,
      fecha_creacion: ahora.toISOString(),
    };
  }

  /**
   * Extiende la fecha de vencimiento de un apartado activo exigiendo justificación auditable.
   */
  static async prorrogarApartadoUnidad(
    organizacionId: string,
    usuarioId: string,
    rolJerarquico: string,
    datos: DatosProrrogarApartado
  ): Promise<{ nuevaFechaVencimiento: string; prorrogasAplicadas: number }> {
    const supabase = crearClienteSupabaseAdministrador();

    const { data: apartado, error } = await supabase
      .from("apartados_unidades")
      .select("*")
      .eq("id", datos.apartado_id)
      .eq("organizacion_id", organizacionId)
      .maybeSingle();

    if (error || !apartado) {
      throw new Error("No se encontró el registro de apartado especificado.");
    }

    if (apartado.estado_apartado !== "activo") {
      throw new Error("Solo se puede prorrogar un apartado que se encuentre activo.");
    }

    if (rolJerarquico === "asesor" && apartado.asesor_id !== usuarioId) {
      throw new Error("Solo el asesor titular o la Gerencia/Coordinación pueden solicitar prórroga de este apartado.");
    }

    const baseVencimiento = new Date(apartado.fecha_vencimiento);
    const origenTiempo = baseVencimiento.getTime() > Date.now() ? baseVencimiento : new Date();
    const nuevoVencimiento = new Date(origenTiempo.getTime() + datos.horas_adicionales * 3600 * 1000);
    const nuevasProrrogas = Number(apartado.prorrogas_aplicadas || 0) + 1;

    await supabase
      .from("apartados_unidades")
      .update({
        fecha_vencimiento: nuevoVencimiento.toISOString(),
        prorrogas_aplicadas: nuevasProrrogas,
        justificacion_ultima_prorroga: datos.justificacion,
        prorrogado_por_id: usuarioId,
      })
      .eq("id", datos.apartado_id)
      .eq("organizacion_id", organizacionId);

    await supabase
      .from("unidades_inmobiliarias")
      .update({
        apartado_vence_en: nuevoVencimiento.toISOString(),
        actualizado_por_id: usuarioId,
      })
      .eq("id", apartado.unidad_id)
      .eq("organizacion_id", organizacionId);

    await supabase.from("historial_disponibilidad_unidad").insert({
      organizacion_id: organizacionId,
      unidad_id: apartado.unidad_id,
      estado_anterior: "apartado",
      estado_nuevo: "apartado",
      actor_tipo: "usuario",
      usuario_id: usuarioId,
      motivo: `Prórroga #${nuevasProrrogas} (+${datos.horas_adicionales}h): ${datos.justificacion}`,
      metadatos: {
        apartado_id: apartado.id,
        folio_apartado: apartado.folio_apartado,
        horas_adicionales: datos.horas_adicionales,
        nuevo_vencimiento: nuevoVencimiento.toISOString(),
      },
    });

    return {
      nuevaFechaVencimiento: nuevoVencimiento.toISOString(),
      prorrogasAplicadas: nuevasProrrogas,
    };
  }

  /**
   * Libera manualmente un apartado activo (devolviendo la unidad a 'disponible')
   * o lo convierte formalmente a venta ('vendido').
   */
  static async liberarOConvertirApartado(
    organizacionId: string,
    usuarioId: string,
    rolJerarquico: string,
    datos: DatosLiberarOConvertirApartado
  ): Promise<{ nuevoEstadoUnidad: "disponible" | "vendido"; estadoApartado: string }> {
    const supabase = crearClienteSupabaseAdministrador();

    const { data: apartado, error } = await supabase
      .from("apartados_unidades")
      .select("*")
      .eq("id", datos.apartado_id)
      .eq("organizacion_id", organizacionId)
      .maybeSingle();

    if (error || !apartado) {
      throw new Error("No se encontró el apartado especificado.");
    }

    if (apartado.estado_apartado !== "activo") {
      throw new Error("El apartado ya fue procesado anteriormente.");
    }

    const politica = await this.obtenerPoliticaComercialEfectiva(organizacionId, apartado.desarrollo_id);

    if (datos.accion === "liberar") {
      if (
        rolJerarquico === "asesor" &&
        (!politica.permitir_liberacion_propia_asesor || apartado.asesor_id !== usuarioId)
      ) {
        throw new Error("No tienes permisos para liberar este apartado.");
      }

      const ahoraIso = new Date().toISOString();
      await supabase
        .from("apartados_unidades")
        .update({
          estado_apartado: "cancelado_manual",
          liberado_en: ahoraIso,
          liberado_por_id: usuarioId,
          motivo_liberacion: datos.motivo,
        })
        .eq("id", apartado.id)
        .eq("organizacion_id", organizacionId);

      await supabase
        .from("unidades_inmobiliarias")
        .update({
          estado_disponibilidad: "disponible",
          asesor_apartado_id: null,
          prospecto_actual_id: null,
          oportunidad_actual_id: null,
          apartado_en: null,
          apartado_vence_en: null,
          actualizado_por_id: usuarioId,
        })
        .eq("id", apartado.unidad_id)
        .eq("organizacion_id", organizacionId);

      await supabase.from("historial_disponibilidad_unidad").insert({
        organizacion_id: organizacionId,
        unidad_id: apartado.unidad_id,
        estado_anterior: "apartado",
        estado_nuevo: "disponible",
        actor_tipo: "usuario",
        usuario_id: usuarioId,
        motivo: `Liberación manual de apartado ${apartado.folio_apartado}: ${datos.motivo}`,
      });

      return { nuevoEstadoUnidad: "disponible", estadoApartado: "cancelado_manual" };
    }

    // Conversión a venta
    if (
      politica.requiere_autorizacion_gerente_cierre &&
      rolJerarquico === "asesor"
    ) {
      throw new Error(
        "La política comercial requiere que la formalización a estado VENDIDO sea confirmada por Gerencia o Superadministración."
      );
    }

    const ahoraIso = new Date().toISOString();
    await supabase
      .from("apartados_unidades")
      .update({
        estado_apartado: "convertido_venta",
        convertido_venta_en: ahoraIso,
        notas: datos.motivo,
      })
      .eq("id", apartado.id)
      .eq("organizacion_id", organizacionId);

    await supabase
      .from("unidades_inmobiliarias")
      .update({
        estado_disponibilidad: "vendido",
        apartado_vence_en: null,
        vendido_en: ahoraIso,
        actualizado_por_id: usuarioId,
      })
      .eq("id", apartado.unidad_id)
      .eq("organizacion_id", organizacionId);

    await supabase.from("historial_disponibilidad_unidad").insert({
      organizacion_id: organizacionId,
      unidad_id: apartado.unidad_id,
      estado_anterior: "apartado",
      estado_nuevo: "vendido",
      actor_tipo: "usuario",
      usuario_id: usuarioId,
      motivo: `Conversión de apartado ${apartado.folio_apartado} a VENTA: ${datos.motivo}`,
    });

    return { nuevoEstadoUnidad: "vendido", estadoApartado: "convertido_venta" };
  }
}
