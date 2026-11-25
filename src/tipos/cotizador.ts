// ==============================================================================
// IRIS by WYLEN — TIPOS DE DOMINIO: MOTOR FINANCIERO, COTIZADOR Y APARTADOS
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-011, 012, 014, 015, 016, 017, 018, 019, 024, 025
// ==============================================================================

import type { MonedaInmobiliaria, UnidadInmobiliaria } from "@/tipos/proyectos";

export type TipoTasaInteres = "sin_intereses" | "nominal_anual" | "efectiva_anual";

export type ModoPagosExtraordinarios = "valor_presente_cuota_fija" | "abono_directo_capital";

export type ModalidadEnganche = "porcentaje" | "monto_fijo";

export type EstadoCotizacionInmobiliaria =
  | "borrador"
  | "pendiente_autorizacion"
  | "emitida"
  | "enviada"
  | "aceptada"
  | "expirada"
  | "cancelada";

export type EstadoApartadoUnidad =
  | "activo"
  | "convertido_venta"
  | "vencido_liberado"
  | "cancelado_manual";

export interface PagoExtraordinarioProgramado {
  mes: number;
  monto: number;
  etiqueta?: string;
}

export interface FilaCalendarioEnganche {
  numeroPago: number;
  etiqueta: string;
  monto: number;
  acumulado: number;
  saldoEnganchePendiente: number;
}

export interface FilaAmortizacionFinanciera {
  mes: number;
  saldoInicial: number;
  interes: number;
  cuotaOrdinaria: number;
  capitalOrdinario: number;
  pagoExtraordinario: number;
  capitalTotal: number;
  pagoTotalMes: number;
  saldoInsolutoFinal: number;
}

export interface ParametrosCalculoCorridaFinanciera {
  subtotalLista: number;
  descuentoPorcentaje?: number;
  descuentoMontoFijo?: number;
  modalidadEnganche: ModalidadEnganche;
  enganchePorcentaje?: number;
  engancheMontoFijo?: number;
  mesesEngancheDiferido: number;
  plazoMesesFinanciamiento: number;
  tipoTasaInteres: TipoTasaInteres;
  tasaInteresAnualPorcentaje: number;
  modoPagosExtraordinarios: ModoPagosExtraordinarios;
  pagosExtraordinarios: PagoExtraordinarioProgramado[];
}

export interface ResultadoCorridaFinanciera {
  subtotalLista: number;
  descuentoPorcentajeAplicado: number;
  descuentoMontoAplicado: number;
  precioNetoFinal: number;
  enganchePorcentajeEfectivo: number;
  engancheTotal: number;
  mesesEngancheDiferido: number;
  calendarioEnganche: FilaCalendarioEnganche[];
  saldoFinanciado: number;
  plazoMeses: number;
  tipoTasaInteres: TipoTasaInteres;
  tasaInteresAnualPorcentaje: number;
  tasaMensualEfectivaDecimal: number;
  tasaMensualEfectivaPorcentaje: number;
  modoPagosExtraordinarios: ModoPagosExtraordinarios;
  valorPresentePagosExtraordinarios: number;
  capitalBaseAmortizable: number;
  mensualidadOrdinariaBase: number;
  ultimaMensualidadOrdinaria: number;
  totalPagosExtraordinarios: number;
  totalIntereses: number;
  totalCapitalAmortizado: number;
  totalFinanciamientoConIntereses: number;
  totalInversionGeneral: number;
  mesLiquidacionEfectiva: number;
  tablaAmortizacion: FilaAmortizacionFinanciera[];
}

export interface EsquemaFinanciamientoInmobiliario {
  id: string;
  organizacion_id: string;
  desarrollo_id: string;
  nombre: string;
  descripcion: string | null;
  tipo_tasa_interes: TipoTasaInteres;
  tasa_interes_anual: number;
  modo_pagos_extraordinarios: ModoPagosExtraordinarios;
  porcentaje_enganche_min: number;
  max_meses_enganche_diferido: number;
  plazos_meses_permitidos: number[];
  descuento_maximo_pct: number;
  permite_pagos_extraordinarios: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface PoliticaComercialEfectiva {
  horas_vigencia_apartado: number;
  dias_vigencia_cotizacion: number;
  permitir_apartado_directo_asesor: boolean;
  permitir_liberacion_propia_asesor: boolean;
  requiere_autorizacion_gerente_cierre: boolean;
  descuento_maximo_sin_autorizacion_pct: number;
  modo_pagos_extraordinarios_default: ModoPagosExtraordinarios;
  version_politica_org: number;
  version_politica_desarrollo: number;
}

export interface UnidadCotizadaSnapshot {
  unidad_id: string;
  clave_comercial: string;
  tipo_unidad: string;
  superficie_m2: number;
  precio_lista: number;
  precio_base_aplicado: number;
  etapa_nombre?: string | null;
  manzana_nombre?: string | null;
}

export interface CotizacionInmobiliaria {
  id: string;
  organizacion_id: string;
  folio: string;
  token_publico_ultimos4: string;
  acceso_publico_activo: boolean;
  desarrollo_id: string;
  desarrollo_nombre?: string;
  esquema_financiamiento_id: string | null;
  prospecto_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
  cliente_nombre_libre: string | null;
  cliente_telefono_libre: string | null;
  cliente_correo_libre: string | null;
  asesor_id: string;
  asesor_nombre?: string;
  estado: EstadoCotizacionInmobiliaria;
  requiere_autorizacion: boolean;
  autorizada_por_id: string | null;
  fecha_autorizacion: string | null;
  fecha_vigencia: string;
  moneda: MonedaInmobiliaria;
  subtotal_lista: number;
  descuento_pct: number;
  descuento_monto: number;
  precio_neto_final: number;
  enganche_total: number;
  meses_enganche_diferido: number;
  saldo_financiado: number;
  plazo_meses: number;
  tipo_tasa_interes: TipoTasaInteres;
  tasa_interes_anual: number;
  tasa_mensual_efectiva: number;
  modo_pagos_extraordinarios: ModoPagosExtraordinarios;
  mensualidad_ordinaria_base: number;
  total_pagos_extraordinarios: number;
  total_intereses: number;
  total_a_pagar: number;
  notas_comerciales: string | null;
  unidades: UnidadCotizadaSnapshot[];
  corrida_financiera?: ResultadoCorridaFinanciera;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ApartadoUnidadInmobiliaria {
  id: string;
  organizacion_id: string;
  folio_apartado: string;
  desarrollo_id: string;
  desarrollo_nombre?: string;
  unidad_id: string;
  unidad_clave_comercial?: string;
  unidad_superficie_m2?: number;
  cotizacion_id: string | null;
  cotizacion_folio?: string | null;
  prospecto_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_correo: string | null;
  asesor_id: string;
  asesor_nombre?: string;
  monto_apartado: number;
  precio_congelado_unidad: number;
  moneda: MonedaInmobiliaria;
  estado_apartado: EstadoApartadoUnidad;
  fecha_apartado: string;
  fecha_vencimiento: string;
  prorrogas_aplicadas: number;
  justificacion_ultima_prorroga: string | null;
  liberado_en: string | null;
  motivo_liberacion: string | null;
  convertido_venta_en: string | null;
  notas: string | null;
  fecha_creacion: string;
}

export interface ProspectoResumenSelector {
  id: string;
  nombre: string;
  telefono: string | null;
  correo_electronico: string | null;
  estado: string;
  contacto_convertido_id: string | null;
  oportunidad_convertida_id: string | null;
}

export interface ContextoInicialCotizador {
  desarrolloActivoId: string;
  unidadesDesarrollo: UnidadInmobiliaria[];
  esquemasFinanciamiento: EsquemaFinanciamientoInmobiliario[];
  politicaEfectiva: PoliticaComercialEfectiva;
  cotizacionesRecientes: CotizacionInmobiliaria[];
  apartadosDesarrollo: ApartadoUnidadInmobiliaria[];
  prospectosActivos: ProspectoResumenSelector[];
}
