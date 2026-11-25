// ==============================================================================
// IRIS by WYLEN — MOTOR FINANCIERO INMOBILIARIO CON ARITMÉTICA DECIMAL EXACTA
// ==============================================================================
// Decisiones implementadas:
// • IRIS-DEC-015: Enganche (% o monto), enganche diferido con ajuste de centavos
//                 y amortización mensual exacta.
// • IRIS-DEC-016: Conversión estricta entre tasa nominal anual (j_12 / 12) y
//                 tasa efectiva anual ((1 + i_EA)^(1/12) - 1).
// • IRIS-DEC-017: Tratamiento de anualidades y pagos extraordinarios programados
//                 bajo ambas modalidades ('valor_presente_cuota_fija' y
//                 'abono_directo_capital') con prelación Interés -> Capital Ord -> Extra.
// • IRIS-DEC-018: Aritmética decimal fija con BigInt a escala 10^12 y redondeo
//                 ROUND_HALF_UP exacto al centavo; ajuste en el último período
//                 para garantizar Saldo_N = $0.00 sin pérdida ni ganancia fantasma.
// ==============================================================================

import type {
  FilaAmortizacionFinanciera,
  FilaCalendarioEnganche,
  ModoPagosExtraordinarios,
  ParametrosCalculoCorridaFinanciera,
  ResultadoCorridaFinanciera,
  TipoTasaInteres,
} from "@/tipos/cotizador";

const CERO = BigInt(0);
const UNO = BigInt(1);
const MENOS_UNO = BigInt(-1);
const ESCALA = BigInt("1000000000000"); // 10^12
const MITAD_ESCALA = BigInt("500000000000"); // 0.5 * 10^12 para ROUND_HALF_UP exacto

export class ErrorMotorFinanciero extends Error {
  public readonly codigo: string;
  public readonly detalles?: Record<string, unknown>;

  constructor(codigo: string, mensaje: string, detalles?: Record<string, unknown>) {
    super(mensaje);
    this.name = "ErrorMotorFinanciero";
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function redondearEscaladoACentavos(valorEscalado: bigint): bigint {
  if (valorEscalado >= CERO) {
    return (valorEscalado + MITAD_ESCALA) / ESCALA;
  }
  return -((-valorEscalado + MITAD_ESCALA) / ESCALA);
}

export function decimalAEscalado12(valor: number): bigint {
  if (!Number.isFinite(valor)) {
    throw new ErrorMotorFinanciero("VALOR_NO_FINITO", "El valor numérico proporcionado no es finito.");
  }
  const signo = valor < 0 ? MENOS_UNO : UNO;
  const [entero, decimal = ""] = Math.abs(valor).toFixed(12).split(".");
  return signo * (BigInt(entero) * ESCALA + BigInt(decimal.padEnd(12, "0").slice(0, 12)));
}

export function montoACentavos(monto: number): bigint {
  if (!Number.isFinite(monto)) {
    throw new ErrorMotorFinanciero("MONTO_INVALIDO", "El monto monetario debe ser un número finito.");
  }
  return redondearEscaladoACentavos(decimalAEscalado12(monto * 100));
}

export function centavosAMonto(centavos: bigint): number {
  return Number(centavos) / 100;
}

/**
 * Convierte la tasa anual (en porcentaje, ej. 12 para 12%) a tasa mensual efectiva en decimal.
 * - sin_intereses: r = 0
 * - nominal_anual: r = (i_anual / 100) / 12
 * - efectiva_anual: r = (1 + i_anual / 100)^(1/12) - 1
 */
export function convertirTasaAnualAMensualEfectiva(
  tipoTasa: TipoTasaInteres,
  tasaInteresAnualPorcentaje: number
): number {
  if (tipoTasa === "sin_intereses" || tasaInteresAnualPorcentaje <= 0) {
    return 0;
  }
  const iAnualDecimal = tasaInteresAnualPorcentaje / 100;
  if (tipoTasa === "nominal_anual") {
    return iAnualDecimal / 12;
  }
  return Math.pow(1 + iAnualDecimal, 1 / 12) - 1;
}

/**
 * Genera el calendario de enganche diferido en K pagos mensuales con ajuste
 * exacto de centavos en el último pago de enganche.
 */
export function generarCalendarioEngancheExacto(
  engancheTotalCentavos: bigint,
  mesesEngancheDiferido: number
): FilaCalendarioEnganche[] {
  const k = Math.max(1, Math.trunc(mesesEngancheDiferido || 1));
  if (engancheTotalCentavos <= CERO) {
    return [];
  }

  const cuotaBaseCentavos = redondearEscaladoACentavos((engancheTotalCentavos * ESCALA) / BigInt(k));
  const calendario: FilaCalendarioEnganche[] = [];
  let acumuladoCentavos = CERO;

  for (let i = 1; i <= k; i++) {
    const montoPagoCentavos =
      i < k ? cuotaBaseCentavos : engancheTotalCentavos - acumuladoCentavos;
    acumuladoCentavos += montoPagoCentavos;
    const saldoPendiente = engancheTotalCentavos - acumuladoCentavos;

    calendario.push({
      numeroPago: i,
      etiqueta:
        k === 1
          ? "Enganche único a la firma"
          : i === 1
            ? `Enganche inicial (Pago 1/${k})`
            : `Enganche diferido (Pago ${i}/${k})`,
      monto: centavosAMonto(montoPagoCentavos),
      acumulado: centavosAMonto(acumuladoCentavos),
      saldoEnganchePendiente: centavosAMonto(saldoPendiente),
    });
  }

  return calendario;
}

/**
 * Núcleo de generación de tabla de amortización en BigInt (Escala 10^12).
 * Cumple los 14 escenarios extremos de IRIS_TEST_STRATEGY.md.
 */
export function generarTablaAmortizacionExacta(params: {
  saldoFinanciadoCentavos: bigint;
  plazoMeses: number;
  tasaMensualEfectiva: number;
  modalidad: ModoPagosExtraordinarios;
  pagosExtraPorMesCentavos: Record<number, bigint>;
}) {
  const {
    saldoFinanciadoCentavos: sf,
    plazoMeses: n,
    tasaMensualEfectiva: r,
    modalidad,
    pagosExtraPorMesCentavos,
  } = params;

  if (sf < CERO) {
    throw new ErrorMotorFinanciero("SALDO_FINANCIADO_NEGATIVO", "El saldo financiado no puede ser negativo.");
  }

  if (sf === CERO || n === 0) {
    return {
      mBaseCentavos: CERO,
      vpExtraCentavos: CERO,
      capitalBaseCentavos: CERO,
      totalInteresesCentavos: CERO,
      totalPagosExtraCentavos: CERO,
      totalPagadoCentavos: CERO,
      mesLiquidacionEfectiva: 0,
      filas: [] as Array<{
        mes: number;
        saldoInicial: bigint;
        interes: bigint;
        cuotaOrdinaria: bigint;
        capitalOrdinario: bigint;
        pagoExtra: bigint;
        capitalTotal: bigint;
        pagoTotal: bigint;
        saldoFinal: bigint;
      }>,
    };
  }

  if (n < 0 || !Number.isInteger(n)) {
    throw new ErrorMotorFinanciero("PLAZO_INVALIDO", "El plazo en meses debe ser un entero positivo.");
  }

  // Validar que ningún pago extraordinario esté fuera del rango 1..n
  for (const [mesStr, montoExtra] of Object.entries(pagosExtraPorMesCentavos)) {
    const t = Number(mesStr);
    if (!Number.isInteger(t) || t < 1 || t > n) {
      throw new ErrorMotorFinanciero(
        "MES_PAGO_EXTRA_FUERA_DE_PLAZO",
        `El pago extraordinario programado en el mes ${mesStr} está fuera del plazo de ${n} meses.`,
        { mes: t, plazoMeses: n }
      );
    }
    if (montoExtra < CERO) {
      throw new ErrorMotorFinanciero(
        "MONTO_PAGO_EXTRA_NEGATIVO",
        `El pago extraordinario del mes ${t} no puede ser negativo.`
      );
    }
  }

  const rEscalado = decimalAEscalado12(r);
  let vpExtraCentavos = CERO;

  if (modalidad === "valor_presente_cuota_fija") {
    for (const [mesStr, montoExtra] of Object.entries(pagosExtraPorMesCentavos)) {
      if (montoExtra <= CERO) continue;
      const t = Number(mesStr);
      const factorDescuento = decimalAEscalado12(1 / Math.pow(1 + r, t));
      vpExtraCentavos += redondearEscaladoACentavos(montoExtra * factorDescuento);
    }
    if (vpExtraCentavos >= sf) {
      throw new ErrorMotorFinanciero(
        "VP_PAGOS_EXTRA_EXCEDE_SALDO_FINANCIADO",
        "El valor presente de las anualidades o pagos extraordinarios iguala o excede el saldo financiado total.",
        {
          vpExtra: centavosAMonto(vpExtraCentavos),
          saldoFinanciado: centavosAMonto(sf),
        }
      );
    }
  }

  const capitalBaseCentavos = modalidad === "valor_presente_cuota_fija" ? sf - vpExtraCentavos : sf;

  const mBaseCentavos =
    rEscalado === CERO
      ? redondearEscaladoACentavos((capitalBaseCentavos * ESCALA) / BigInt(n))
      : redondearEscaladoACentavos(
          capitalBaseCentavos *
            decimalAEscalado12((r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
        );

  let saldo = sf;
  let totalInteresesCentavos = CERO;
  let totalPagosExtraCentavos = CERO;
  let totalPagadoCentavos = CERO;
  let mesLiquidacionEfectiva = n;
  const filas: Array<{
    mes: number;
    saldoInicial: bigint;
    interes: bigint;
    cuotaOrdinaria: bigint;
    capitalOrdinario: bigint;
    pagoExtra: bigint;
    capitalTotal: bigint;
    pagoTotal: bigint;
    saldoFinal: bigint;
  }> = [];

  for (let t = 1; t <= n; t++) {
    if (saldo === CERO) {
      const extraPendiente = pagosExtraPorMesCentavos[t] ?? CERO;
      if (extraPendiente > CERO) {
        throw new ErrorMotorFinanciero(
          "PAGO_EXTRA_EXCEDE_SALDO",
          `El crédito ya se encuentra liquidado antes del mes ${t}; no se puede aplicar un pago extraordinario de $${centavosAMonto(extraPendiente).toFixed(2)}.`,
          { mes: t, montoMaximoPermitido: 0, exceso: centavosAMonto(extraPendiente) }
        );
      }
      filas.push({
        mes: t,
        saldoInicial: CERO,
        interes: CERO,
        cuotaOrdinaria: CERO,
        capitalOrdinario: CERO,
        pagoExtra: CERO,
        capitalTotal: CERO,
        pagoTotal: CERO,
        saldoFinal: CERO,
      });
      continue;
    }

    const interes = redondearEscaladoACentavos(saldo * rEscalado);
    const pagoExtraProgramado = pagosExtraPorMesCentavos[t] ?? CERO;
    let cuotaOrdinaria = mBaseCentavos;
    let capitalOrdinario = CERO;
    let pagoExtra = CERO;

    if (t === n) {
      if (pagoExtraProgramado > saldo) {
        throw new ErrorMotorFinanciero(
          "PAGO_EXTRA_ULTIMO_PERIODO_EXCEDE_SALDO",
          `El pago extraordinario del último mes (${t}) excede el saldo insoluto disponible ($${centavosAMonto(saldo).toFixed(2)}).`,
          {
            mes: t,
            montoMaximoPermitido: centavosAMonto(saldo),
            exceso: centavosAMonto(pagoExtraProgramado - saldo),
          }
        );
      }
      pagoExtra = pagoExtraProgramado;
      capitalOrdinario = saldo - pagoExtra;
      cuotaOrdinaria = interes + capitalOrdinario;
    } else {
      if (mBaseCentavos <= interes) {
        throw new ErrorMotorFinanciero(
          "CUOTA_INSUFICIENTE_PARA_INTERESES",
          `La mensualidad ordinaria ($${centavosAMonto(mBaseCentavos).toFixed(2)}) no cubre los intereses devengados del mes ${t} ($${centavosAMonto(interes).toFixed(2)}).`,
          { mes: t, cuotaOrdinaria: centavosAMonto(mBaseCentavos), interes: centavosAMonto(interes) }
        );
      }

      const candidatoCapOrd = mBaseCentavos - interes;
      if (candidatoCapOrd >= saldo) {
        if (pagoExtraProgramado > CERO) {
          throw new ErrorMotorFinanciero(
            "PAGO_EXTRA_EXCEDE_SALDO_EN_LIQUIDACION",
            `En el mes ${t} la cuota ordinaria liquida la totalidad del saldo ($${centavosAMonto(saldo).toFixed(2)}); el pago extraordinario programado excede el saldo restante.`,
            { mes: t, montoMaximoPermitido: 0, exceso: centavosAMonto(pagoExtraProgramado) }
          );
        }
        capitalOrdinario = saldo;
        cuotaOrdinaria = interes + capitalOrdinario;
        pagoExtra = CERO;
      } else {
        capitalOrdinario = candidatoCapOrd;
        cuotaOrdinaria = mBaseCentavos;
        const saldoPostOrdinario = saldo - capitalOrdinario;
        if (pagoExtraProgramado > saldoPostOrdinario) {
          throw new ErrorMotorFinanciero(
            "PAGO_EXTRA_EXCEDE_SALDO",
            `El pago extraordinario del mes ${t} ($${centavosAMonto(pagoExtraProgramado).toFixed(2)}) supera el saldo insoluto posterior a la cuota ordinaria ($${centavosAMonto(saldoPostOrdinario).toFixed(2)}).`,
            {
              mes: t,
              montoMaximoPermitido: centavosAMonto(saldoPostOrdinario),
              exceso: centavosAMonto(pagoExtraProgramado - saldoPostOrdinario),
            }
          );
        }
        pagoExtra = pagoExtraProgramado;
      }
    }

    const capitalTotal = capitalOrdinario + pagoExtra;
    const pagoTotal = cuotaOrdinaria + pagoExtra;
    const saldoFinal = saldo - capitalTotal;

    if (saldo > CERO && saldoFinal === CERO && mesLiquidacionEfectiva === n) {
      mesLiquidacionEfectiva = t;
    }

    totalInteresesCentavos += interes;
    totalPagosExtraCentavos += pagoExtra;
    totalPagadoCentavos += pagoTotal;

    filas.push({
      mes: t,
      saldoInicial: saldo,
      interes,
      cuotaOrdinaria,
      capitalOrdinario,
      pagoExtra,
      capitalTotal,
      pagoTotal,
      saldoFinal,
    });

    saldo = saldoFinal;
  }

  return {
    mBaseCentavos,
    vpExtraCentavos,
    capitalBaseCentavos,
    totalInteresesCentavos,
    totalPagosExtraCentavos,
    totalPagadoCentavos,
    mesLiquidacionEfectiva,
    filas,
  };
}

/**
 * Calcula una corrida financiera inmobiliaria completa (Descuento, Enganche Diferido y Tabla de Amortización).
 */
export function calcularCorridaFinancieraInmobiliaria(
  params: ParametrosCalculoCorridaFinanciera
): ResultadoCorridaFinanciera {
  const subtotalCentavos = montoACentavos(params.subtotalLista);
  if (subtotalCentavos <= CERO) {
    throw new ErrorMotorFinanciero(
      "SUBTOTAL_INVALIDO",
      "El subtotal de las unidades a cotizar debe ser mayor a $0.00."
    );
  }

  // 1. Cálculo de descuento comercial
  let descuentoCentavos = CERO;
  let descuentoPctAplicado = 0;

  if (params.descuentoMontoFijo && params.descuentoMontoFijo > 0) {
    descuentoCentavos = montoACentavos(params.descuentoMontoFijo);
    descuentoPctAplicado =
      Math.round((Number(descuentoCentavos) / Number(subtotalCentavos)) * 10000) / 100;
  } else if (params.descuentoPorcentaje && params.descuentoPorcentaje > 0) {
    descuentoPctAplicado = Math.min(100, Math.max(0, params.descuentoPorcentaje));
    const factorDescuento = decimalAEscalado12(descuentoPctAplicado / 100);
    descuentoCentavos = redondearEscaladoACentavos(subtotalCentavos * factorDescuento);
  }

  if (descuentoCentavos > subtotalCentavos) {
    throw new ErrorMotorFinanciero(
      "DESCUENTO_EXCEDE_SUBTOTAL",
      "El descuento aplicado no puede superar el subtotal de lista."
    );
  }

  const precioNetoCentavos = subtotalCentavos - descuentoCentavos;

  // 2. Cálculo de enganche (porcentaje o monto fijo)
  let engancheCentavos = CERO;
  let enganchePctEfectivo = 0;

  if (params.modalidadEnganche === "monto_fijo") {
    engancheCentavos = montoACentavos(params.engancheMontoFijo ?? 0);
    if (engancheCentavos > precioNetoCentavos) {
      throw new ErrorMotorFinanciero(
        "ENGANCHE_EXCEDE_PRECIO_NETO",
        "El monto de enganche no puede ser mayor al precio neto final."
      );
    }
    enganchePctEfectivo =
      precioNetoCentavos > CERO
        ? Math.round((Number(engancheCentavos) / Number(precioNetoCentavos)) * 10000) / 100
        : 0;
  } else {
    const pct = Math.min(100, Math.max(0, params.enganchePorcentaje ?? 0));
    enganchePctEfectivo = pct;
    const factorEnganche = decimalAEscalado12(pct / 100);
    engancheCentavos = redondearEscaladoACentavos(precioNetoCentavos * factorEnganche);
  }

  const mesesEnganche = Math.max(1, Math.trunc(params.mesesEngancheDiferido || 1));
  const calendarioEnganche = generarCalendarioEngancheExacto(engancheCentavos, mesesEnganche);

  // 3. Saldo financiado y conversión de tasa
  const saldoFinanciadoCentavos = precioNetoCentavos - engancheCentavos;
  const plazoMeses =
    saldoFinanciadoCentavos === CERO ? 0 : Math.max(1, Math.trunc(params.plazoMesesFinanciamiento || 1));

  const tasaAnualPct =
    params.tipoTasaInteres === "sin_intereses"
      ? 0
      : Math.max(0, params.tasaInteresAnualPorcentaje || 0);

  const tasaMensualEfectivaDecimal = convertirTasaAnualAMensualEfectiva(
    params.tipoTasaInteres,
    tasaAnualPct
  );

  // Consolidar pagos extraordinarios por mes
  const pagosExtraPorMesCentavos: Record<number, bigint> = {};
  for (const item of params.pagosExtraordinarios || []) {
    if (!item || item.monto <= 0 || item.mes < 1) continue;
    const mes = Math.trunc(item.mes);
    pagosExtraPorMesCentavos[mes] = (pagosExtraPorMesCentavos[mes] ?? CERO) + montoACentavos(item.monto);
  }

  const resultadoAmortizacion = generarTablaAmortizacionExacta({
    saldoFinanciadoCentavos,
    plazoMeses,
    tasaMensualEfectiva: tasaMensualEfectivaDecimal,
    modalidad: params.modoPagosExtraordinarios,
    pagosExtraPorMesCentavos,
  });

  const tablaAmortizacion: FilaAmortizacionFinanciera[] = resultadoAmortizacion.filas.map((f) => ({
    mes: f.mes,
    saldoInicial: centavosAMonto(f.saldoInicial),
    interes: centavosAMonto(f.interes),
    cuotaOrdinaria: centavosAMonto(f.cuotaOrdinaria),
    capitalOrdinario: centavosAMonto(f.capitalOrdinario),
    pagoExtraordinario: centavosAMonto(f.pagoExtra),
    capitalTotal: centavosAMonto(f.capitalTotal),
    pagoTotalMes: centavosAMonto(f.pagoTotal),
    saldoInsolutoFinal: centavosAMonto(f.saldoFinal),
  }));

  const filaLiquidacion =
    [...resultadoAmortizacion.filas].reverse().find((f) => f.cuotaOrdinaria > CERO) ?? null;

  const totalCapitalCentavos = saldoFinanciadoCentavos;
  const totalInversionCentavos = engancheCentavos + resultadoAmortizacion.totalPagadoCentavos;

  return {
    subtotalLista: centavosAMonto(subtotalCentavos),
    descuentoPorcentajeAplicado: descuentoPctAplicado,
    descuentoMontoAplicado: centavosAMonto(descuentoCentavos),
    precioNetoFinal: centavosAMonto(precioNetoCentavos),
    enganchePorcentajeEfectivo: enganchePctEfectivo,
    engancheTotal: centavosAMonto(engancheCentavos),
    mesesEngancheDiferido: mesesEnganche,
    calendarioEnganche,
    saldoFinanciado: centavosAMonto(saldoFinanciadoCentavos),
    plazoMeses,
    tipoTasaInteres: params.tipoTasaInteres,
    tasaInteresAnualPorcentaje: tasaAnualPct,
    tasaMensualEfectivaDecimal,
    tasaMensualEfectivaPorcentaje: Math.round(tasaMensualEfectivaDecimal * 100 * 1_000_000) / 1_000_000,
    modoPagosExtraordinarios: params.modoPagosExtraordinarios,
    valorPresentePagosExtraordinarios: centavosAMonto(resultadoAmortizacion.vpExtraCentavos),
    capitalBaseAmortizable: centavosAMonto(resultadoAmortizacion.capitalBaseCentavos),
    mensualidadOrdinariaBase: centavosAMonto(resultadoAmortizacion.mBaseCentavos),
    ultimaMensualidadOrdinaria: filaLiquidacion ? centavosAMonto(filaLiquidacion.cuotaOrdinaria) : 0,
    totalPagosExtraordinarios: centavosAMonto(resultadoAmortizacion.totalPagosExtraCentavos),
    totalIntereses: centavosAMonto(resultadoAmortizacion.totalInteresesCentavos),
    totalCapitalAmortizado: centavosAMonto(totalCapitalCentavos),
    totalFinanciamientoConIntereses: centavosAMonto(resultadoAmortizacion.totalPagadoCentavos),
    totalInversionGeneral: centavosAMonto(totalInversionCentavos),
    mesLiquidacionEfectiva: resultadoAmortizacion.mesLiquidacionEfectiva,
    tablaAmortizacion,
  };
}
