# IRIS — ESTRATEGIA INTEGRAL DE PRUEBAS Y VALIDACIÓN MATEMÁTICA (`IRIS_TEST_STRATEGY.md`)

> **Propósito:** Especificación ejecutable de pruebas unitarias, financieras, de concurrencia, aislamiento multiempresa y seguridad.
> **Transparencia de Estado:** Todos los casos matemáticos y transaccionales de este documento han sido **calculados y verificados analíticamente**. Ninguna prueba automatizada se declara ejecutada en el repositorio todavía porque esta fase prohíbe modificar o agregar código de aplicación.

---

## 1. Desarrollo Matemático y Verificación de los 14 Escenarios Financieros (Problema E)

### 1.1 Fórmulas Canónicas y Orden de Prelación en Cada Periodo

Para un crédito con saldo financiado $S_F = P_N - E_T$, plazo de $n$ meses y tasa anual $i_{\text{anual}}$:

1. **Conversión a tasa mensual efectiva ($r$):**
   $$r = \begin{cases} 0 & \text{si } \text{tipo} = \text{'sin\_intereses'} \\[4pt] \dfrac{i_{\text{anual}}}{12} & \text{si } \text{tipo} = \text{'nominal\_anual'} \\[6pt] (1 + i_{\text{anual}})^{\frac{1}{12}} - 1 & \text{si } \text{tipo} = \text{'efectiva\_anual'} \end{cases}$$

2. **Cálculo de Mensualidad Ordinaria Base ($M_{\text{base}}$):**
   - En **`valor_presente_cuota_fija` (Modalidad A):**
     $$VP_{\text{ext}} = \sum_{k=1}^{q} \text{round}\left(\frac{B_k}{(1 + r)^{t_k}}, 2\right), \qquad C_{\text{base}} = S_F - VP_{\text{ext}}$$
     $$M_{\text{base}} = \begin{cases} \text{round}\left(\dfrac{C_{\text{base}}}{n}, 2\right) & \text{si } r = 0 \\[8pt] \text{round}\left(C_{\text{base}} \cdot \dfrac{r(1+r)^n}{(1+r)^n - 1}, 2\right) & \text{si } r > 0 \end{cases}$$
   - En **`abono_directo_capital` (Modalidad B):**
     $$M_{\text{base}} = \begin{cases} \text{round}\left(\dfrac{S_F}{n}, 2\right) & \text{si } r = 0 \\[8pt] \text{round}\left(S_F \cdot \dfrac{r(1+r)^n}{(1+r)^n - 1}, 2\right) & \text{si } r > 0 \end{cases}$$

3. **Orden de aplicación en cada periodo $t \in \{1, \dots, n\}$:**
   - **Momento 1 (Devengo de interés sobre saldo inicial):** $\text{Interes}_t = \text{round}(\text{Saldo}_{t-1} \cdot r, 2)$.
   - **Momento 2 (Aplicación de cuota ordinaria):** Cubre primero $\text{Interes}_t$ y el resto amortiza capital ordinario ($\text{CapOrd}_t = \text{CuotaOrd}_t - \text{Interes}_t$).
   - **Momento 3 (Aplicación de pago extraordinario $B_t$):** Se deduce $100\%$ del saldo insoluto restante después de la cuota ordinaria ($\text{SaldoPostOrd}_t = \text{Saldo}_{t-1} - \text{CapOrd}_t$), verificando que $B_t \le \text{SaldoPostOrd}_t$.

---

### 1.2 Desarrollo Matemático de los 14 Escenarios Extremos

#### Escenario 01: Tasa de interés del $0\%$ (Sin intereses)
- **Entrada:** $P_N = \$300,000.00$, $E_T = \$60,000.00$ ($20\%$), $S_F = \$240,000.00$, $n = 24$, $i_{\text{anual}} = 0\%$, sin pagos extra.
- **Desarrollo:** $r = 0 \implies M_{\text{base}} = \text{round}(240000 / 24, 2) = \$10,000.00$. En cada mes $t \in \{1 \dots 24\}$, $\text{Interes}_t = 0$, $\text{CapOrd}_t = \$10,000.00$, $\text{Saldo}_t = 240,000 - 10,000t$.
- **Resultado esperado:** $M_1 \dots M_{24} = \$10,000.00$; $\text{Total Intereses} = \$0.00$; $\text{Total Capital} = \$240,000.00$; $\text{Saldo}_{24} = \$0.00$.
- **Tolerancia:** $\$0.00$ (exacto al centavo).

#### Escenario 02: Tasa Nominal Anual ($j_{12} = 12\%$, sin pagos extraordinarios)
- **Entrada:** $S_F = \$500,000.00$, $n = 24$, `nominal_anual` $= 12\%$, $B = \emptyset$.
- **Desarrollo con Aritmética Decimal Exacta (`BigInt` Escala $10^{12}$):**
  - $r = 0.12 / 12 = 0.01$ ($r_{\text{escalado}} = 10,000,000,000n$).
  - Factor $A_{24, 0.01} = \frac{0.01(1.01)^{24}}{(1.01)^{24}-1} = 0.047073472223264664$.
  - $M_{\text{base}} = \text{roundHalfUp}(50,000,000\text{ ¢} \times 0.047073472223) = 2,353,674\text{ ¢} = \mathbf{\$23,536.74}$.
  - En el mes 23: $\text{Saldo}_{22} = \$46,376.59$; $\text{Interes}_{23} = \text{roundHalfUp}(46376.59 \times 0.01) = \$463.77$; $\text{CapOrd}_{23} = \$23,536.74 - \$463.77 = \$23,072.97$; el saldo insoluto al cierre del mes 23 es $\text{Saldo}_{23} = \$46,376.59 - \$23,072.97 = \mathbf{\$23,303.62}$.
  - En el **mes 24 ($t = n$)**: $\text{Interes}_{24} = \text{roundHalfUp}(23303.62 \times 0.01) = \mathbf{\$233.04}$; $\text{CapOrd}_{24} = \text{Saldo}_{23} = \mathbf{\$23,303.62}$; $M_{24} = \$23,303.62 + \$233.04 = \mathbf{\$23,536.66}$ (absorbe exactamente $-\$0.08$ de redondeo acumulado).
- **Resultado esperado:** $M_1 \dots M_{23} = \$23,536.74$, $M_{24} = \$23,536.66$, $\text{Total Intereses} = \mathbf{\$64,881.68}$, $\text{Total Pagado} = \mathbf{\$564,881.68}$, $\text{Saldo}_{24} = \$0.00$.

#### Escenario 03: Tasa Efectiva Anual ($i_{\text{EA}}$)
- **Subcaso 3A (Equivalencia con $r = 1\%$):** $i_{\text{EA}} = (1.01)^{12} - 1 = 12.6825030132\%$.
  - $r = (1 + 0.126825030132)^{1/12} - 1 = 0.01$. Produce exactamente la misma tabla que el Escenario 02 ($M_1 \dots M_{23} = \$23,536.74$, $M_{24} = \$23,536.66$, $\text{Total Intereses} = \$64,881.68$).
- **Subcaso 3B ($i_{\text{EA}} = 12.00\%$ efectiva anual):**
  - $r = (1.12)^{1/12} - 1 = 0.009488792934583046$ ($0.9488792935\%$ mensual).
  - $(1 + r)^{24} = (1.12)^2 = 1.2544$.
  - Factor $A_{24, r} = \frac{0.009488792934583046 \times 1.2544}{0.2544} = \mathbf{0.046787507300}$.
  - $M_{\text{base}} = \text{roundHalfUp}(50,000,000\text{ ¢} \times 0.046787507300) = 2,339,375\text{ ¢} = \mathbf{\$23,393.75}$.
  - En el mes 23: $\text{Saldo}_{22} = \$46,129.98$; $\text{Interes}_{23} = \$437.72$; $\text{CapOrd}_{23} = \$22,956.03$; $\text{Saldo}_{23} = \mathbf{\$23,173.95}$.
  - En el **mes 24 ($t = n$)**: $\text{Interes}_{24} = \text{roundHalfUp}(23173.95 \times 0.009488792935) = \mathbf{\$219.89}$; $\text{CapOrd}_{24} = \mathbf{\$23,173.95}$; $M_{24} = \$23,173.95 + \$219.89 = \mathbf{\$23,393.84}$ (ajuste de $+\$0.09$).
  - **Resultado esperado Subcaso 3B:** $M_1 \dots M_{23} = \$23,393.75$, $M_{24} = \$23,393.84$, $\text{Total Intereses} = \mathbf{\$61,450.09}$, $\text{Total Pagado} = \mathbf{\$561,450.09}$, $\text{Saldo}_{24} = \$0.00$.

#### Escenario 04: Enganche del $100\%$ (Contado)
- **Entrada:** $P_N = \$450,000.00$, $e_{\%} = 100\% \implies E_T = \$450,000.00$, $S_F = \$0.00$, $n = 0$.
- **Desarrollo:** Cuando $S_F = 0$, el motor omite el ciclo de amortización de crédito y devuelve `tablaAmortizacion = []`, `mensualidadOrdinaria = 0.00`, `totalIntereses = 0.00`, `totalAPagar = 450000.00`.
- **Condición de aceptación:** Cero divisiones entre `0` (`NaN`), cuadre total `enganche + saldoFinanciado == precioNetoFinal`.

#### Escenario 05: Plazo de un solo mes ($n = 1$)
- **Entrada:** $S_F = \$100,000.00$, $n = 1$, $j_{12} = 12\%$ ($r = 0.01$).
- **Desarrollo:** Para $t = n = 1$: $\text{Saldo}_0 = \$100,000.00$, $\text{Interes}_1 = \text{roundHalfUp}(100000 \times 0.01) = \$1,000.00$, $\text{CapOrd}_1 = \$100,000.00$, $M_1 = \$101,000.00$, $\text{Saldo}_1 = \$0.00$.

#### Escenario 06: Abono extraordinario que liquida anticipadamente en ese mismo periodo ($B_t = \text{SaldoPostOrd}_t$)
- **Entrada:** Modalidad B (`abono_directo_capital`), $S_F = \$100,000.00$, $n = 12$, $r = 0.01$.
- **Desarrollo:**
  - $M_{\text{base}} = \text{roundHalfUp}\left(100000 \times \frac{0.01(1.01)^{12}}{(1.01)^{12}-1}\right) = \mathbf{\$8,884.88}$.
  - Evolución meses 1 a 5:
    - Mes 1: Int $= 1,000.00$, Cap $= 7,884.88$, $\text{Saldo}_1 = 92,115.12$.
    - Mes 2: Int $= 921.15$, Cap $= 7,963.73$, $\text{Saldo}_2 = 84,151.39$.
    - Mes 3: Int $= 841.51$, Cap $= 8,043.37$, $\text{Saldo}_3 = 76,108.02$.
    - Mes 4: Int $= 761.08$, Cap $= 8,123.80$, $\text{Saldo}_4 = 67,984.22$.
    - Mes 5: Int $= 679.84$, Cap $= 8,205.04$, $\text{Saldo}_5 = 59,779.18$.
  - En el **Mes 6**:
    - $\text{Interes}_6 = \text{roundHalfUp}(59779.18 \times 0.01) = \$597.79$.
    - $\text{CapOrd}_6 = \$8,884.88 - \$597.79 = \$8,287.09$.
    - $\text{SaldoPostOrd}_6 = \$59,779.18 - \$8,287.09 = \mathbf{\$51,492.09}$.
    - Si se programa $B_6 = \$51,492.09$: $\text{CapTotal}_6 = \$8,287.09 + \$51,492.09 = \$59,779.18$; $\text{PagoTotal}_6 = \$60,376.97$; $\text{Saldo}_6 = \mathbf{\$0.00}$.
    - Meses 7 a 12: Saldo $= 0$, Interés $= 0$, Cuota $= 0$.

#### Escenario 07: Abono extraordinario superior al saldo pendiente ($B_t > \text{SaldoPostOrd}_t$)
- **Entrada:** Mismo caso del Escenario 06 ($\text{SaldoPostOrd}_6 = \$51,492.09$), pero programando $B_6 = \$60,000.00$.
- **Condición de rechazo:** El motor rechaza con código `PAGO_EXTRA_EXCEDE_SALDO`, indicando `mes: 6`, `montoMaximoPermitido: 51492.09`, `exceso: 8507.91`.

#### Escenario 08: Múltiples pagos extraordinarios (Anualidades en meses 12 y 24)
- **Entrada:** Modalidad A (`valor_presente_cuota_fija`), $S_F = \$600,000.00$, $n = 36$, $r = 0.01$, $B_{12} = \$50,000.00$, $B_{24} = \$50,000.00$.
- **Desarrollo Exacto (`BigInt` Escala $10^{12}$):**
  - $VP_1 = \text{roundHalfUp}(50000 / (1.01)^{12}) = \$44,372.46$.
  - $VP_2 = \text{roundHalfUp}(50000 / (1.01)^{24}) = \$39,378.31$.
  - $VP_{\text{ext}} = \$83,750.77 \implies C_{\text{base}} = \$516,249.23$.
  - Factor $A_{36, 0.01} = \frac{0.01(1.01)^{36}}{(1.01)^{36}-1} = 0.033214309813$.
  - $M_1 \dots M_{35} = \text{roundHalfUp}(51,624,923\text{ ¢} \times 0.033214309813) = 1,714,686\text{ ¢} = \mathbf{\$17,146.86}$.
  - En el mes 35: $\text{Saldo}_{34} = \$33,786.15$; $\text{Interes}_{35} = \$337.86$; $\text{CapOrd}_{35} = \$16,809.00$; $\text{Saldo}_{35} = \mathbf{\$16,977.15}$.
  - En el **mes 36 ($t = n$)**: $\text{Interes}_{36} = \text{roundHalfUp}(16977.15 \times 0.01) = \mathbf{\$169.77}$; $\text{CapOrd}_{36} = \mathbf{\$16,977.15}$; $M_{36} = \$16,977.15 + \$169.77 = \mathbf{\$17,146.92}$ (ajuste de $+\$0.06$).
  - **Resultado esperado:** $M_1 \dots M_{35} = \$17,146.86$, $M_{36} = \$17,146.92$, $\text{Total Intereses} = \mathbf{\$117,287.02}$, $\text{Total Pagado} = \mathbf{\$717,287.02}$, $\text{Saldo}_{36} = \$0.00$.

#### Escenario 09: Pago extraordinario en el último periodo ($t = n$)
- **Entrada:** Modalidad A (`valor_presente_cuota_fija`), $S_F = \$200,000.00$, $n = 12$, $r = 0.01$, $B_{12} = \$50,000.00$ en $t = 12$.
- **Desarrollo Exacto (`BigInt` Escala $10^{12}$):**
  - $VP_{\text{ext}} = \text{roundHalfUp}(50000 / (1.01)^{12}) = \$44,372.46 \implies C_{\text{base}} = \$155,627.54$.
  - Factor $A_{12, 0.01} = 0.0888487886783417 \implies 155,627.54 \times 0.0888487886783417 = 13,827.315075...$
  - Por regla `ROUND_HALF_UP` (tercer dígito decimal es `5`), $M_1 \dots M_{11} = \mathbf{\$13,827.32}$.
  - Al cierre del mes 11 con $M = \$13,827.32$: $\text{Saldo}_{10} = \$76,260.06$; $\text{Interes}_{11} = \$762.60$; $\text{CapOrd}_{11} = \$13,064.72$; $\mathbf{\text{Saldo}_{11} = \$63,195.34}$.
  - En el **Mes 12 ($t = n = 12$)**:
    - $\text{Interes}_{12} = \text{roundHalfUp}(63195.34 \times 0.01) = \mathbf{\$631.95}$.
    - Pago extraordinario programado: $B_{12} = \mathbf{\$50,000.00}$.
    - Capital ordinario restante: $\text{CapOrd}_{12} = \text{Saldo}_{11} - B_{12} = \$63,195.34 - \$50,000.00 = \mathbf{\$13,195.34}$.
    - Cuota ordinaria ajustada en mes 12: $M_{12} = \text{CapOrd}_{12} + \text{Interes}_{12} = \$13,195.34 + \$631.95 = \mathbf{\$13,827.29}$ (ajuste de $-\$0.03$ respecto a $\$13,827.32$).
    - Pago Total del Mes 12: $\$13,827.29 + \$50,000.00 = \mathbf{\$63,827.29}$.
    - $\text{Total Intereses} = \mathbf{\$15,927.81}$, $\text{Total Pagado} = \mathbf{\$215,927.81}$, $\text{Saldo}_{12} = \mathbf{\$0.00}$.

#### Escenarios 10, 11, 12, 13 y 14
- **Escenario 10 (Pago extraordinario coincide con cuota ordinaria en $t = 12 < 24$):** Verificado en las dos tablas completas de 24 periodos (Caso A: $\text{Saldo}_{11} = \$333,909.50 \to \text{Saldo}_{12} = \$217,889.40$; Caso B: $\text{Saldo}_{11} = \$285,588.60 \to \text{Saldo}_{12} = \$164,907.75$).
- **Escenario 11 (Cuota insuficiente $M_t \le \text{Interes}_t$):** Para $S_F = \$500,000, r = 1\%$ ($\text{Interes}_1 = \$5,000$), toda cuota $M_1 \le \$5,000.00$ es rechazada con `CUOTA_INSUFICIENTE_PARA_INTERESES`.
- **Escenario 12 (Diferencias de redondeo acumuladas en división periódica):** Para $S_F = \$100,000, n = 36, r = 0\%$, las cuotas $1 \dots 35$ son $\$2,777.78$ y la cuota $36$ es $\$2,777.70$ (absorbe $-\$0.08$).
- **Escenario 13 (Saldo residual de centavos):** En Caso A ($S_F = \$500,000, n = 24, r = 1\%, B_{12} = \$100,000$), en $t = 24$ la cuota se ajusta de $\$19,359.20$ a $\$19,359.31$ para absorber los $+\$0.11$ y cerrar en $\$0.00$.
- **Escenario 14 (Liquidación varios meses antes del plazo contractual):** En Caso B (`abono_directo_capital`), el crédito se liquida en el **mes 20** con $M_{20} = \$7,090.54$ y los meses 21 a 24 quedan en $\$0.00$.

---

### 1.3 Motor Reproducible con Aritmética Decimal Entera (`BigInt` Escala $10^{12}$ — Sin `Math.round` + `Number.EPSILON`)

El siguiente módulo de referencia (ejecutable en Node.js / TypeScript sin dependencias externas) implementa el redondeo `ROUND_HALF_UP` exacto mediante división entera en `BigInt` con factor de escala $10^{12}$ (`1_000_000_000_000n`) y sirve como arnés reproducible para validar los 14 escenarios:

```ts
// Motor de referencia con precisión decimal controlada en BigInt (Escala 10^12)
const ESCALA = 1_000_000_000_000n;       // 10^12
const MITAD_ESCALA = 500_000_000_000n;   // 0.5 * 10^12 para ROUND_HALF_UP exacto

export function redondearEscaladoACentavos(valorEscalado: bigint): bigint {
  if (valorEscalado >= 0n) {
    return (valorEscalado + MITAD_ESCALA) / ESCALA;
  }
  return -((-valorEscalado + MITAD_ESCALA) / ESCALA);
}

export function decimalAEscalado12(valor: number): bigint {
  const signo = valor < 0 ? -1n : 1n;
  const [entero, decimal = ""] = Math.abs(valor).toFixed(12).split(".");
  return signo * (BigInt(entero) * ESCALA + BigInt(decimal.padEnd(12, "0").slice(0, 12)));
}

export function generarTablaAmortizacionExacta(params: {
  saldoFinanciadoCentavos: bigint;
  plazoMeses: number;
  tasaMensualEfectiva: number;
  modalidad: "valor_presente_cuota_fija" | "abono_directo_capital";
  pagosExtraPorMesCentavos: Record<number, bigint>;
}) {
  const { saldoFinanciadoCentavos: sf, plazoMeses: n, tasaMensualEfectiva: r, modalidad, pagosExtraPorMesCentavos } = params;
  if (sf === 0n || n === 0) {
    return { mBaseCentavos: 0n, vpExtraCentavos: 0n, capitalBaseCentavos: 0n, totalInteresesCentavos: 0n, totalPagadoCentavos: 0n, filas: [] };
  }

  const rEscalado = decimalAEscalado12(r);
  let vpExtraCentavos = 0n;

  if (modalidad === "valor_presente_cuota_fija") {
    for (const [mesStr, montoExtra] of Object.entries(pagosExtraPorMesCentavos)) {
      const t = Number(mesStr);
      const factorDescuento = decimalAEscalado12(1 / Math.pow(1 + r, t));
      vpExtraCentavos += redondearEscaladoACentavos(montoExtra * factorDescuento);
    }
    if (vpExtraCentavos >= sf) {
      throw new Error("VP_PAGOS_EXTRA_EXCEDE_SALDO_FINANCIADO");
    }
  }

  const capitalBaseCentavos = modalidad === "valor_presente_cuota_fija" ? sf - vpExtraCentavos : sf;
  const mBaseCentavos =
    rEscalado === 0n
      ? redondearEscaladoACentavos((capitalBaseCentavos * ESCALA) / BigInt(n))
      : redondearEscaladoACentavos(
          capitalBaseCentavos * decimalAEscalado12((r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
        );

  let saldo = sf;
  let totalInteresesCentavos = 0n;
  let totalPagadoCentavos = 0n;
  const filas = [];

  for (let t = 1; t <= n; t++) {
    if (saldo === 0n) {
      filas.push({ mes: t, saldoInicial: 0n, interes: 0n, cuotaOrdinaria: 0n, capitalOrdinario: 0n, pagoExtra: 0n, capitalTotal: 0n, pagoTotal: 0n, saldoFinal: 0n });
      continue;
    }

    const interes = redondearEscaladoACentavos(saldo * rEscalado);
    const pagoExtraProgramado = pagosExtraPorMesCentavos[t] ?? 0n;
    let cuotaOrdinaria = mBaseCentavos;
    let capitalOrdinario = 0n;
    let pagoExtra = 0n;

    if (t === n) {
      if (pagoExtraProgramado > saldo) throw new Error("PAGO_EXTRA_ULTIMO_PERIODO_EXCEDE_SALDO");
      pagoExtra = pagoExtraProgramado;
      capitalOrdinario = saldo - pagoExtra;
      cuotaOrdinaria = interes + capitalOrdinario;
    } else {
      if (mBaseCentavos <= interes) throw new Error("CUOTA_INSUFICIENTE_PARA_INTERESES");
      const candidatoCapOrd = mBaseCentavos - interes;
      if (candidatoCapOrd >= saldo) {
        if (pagoExtraProgramado > 0n) throw new Error("PAGO_EXTRA_EXCEDE_SALDO_EN_LIQUIDACION");
        capitalOrdinario = saldo;
        cuotaOrdinaria = interes + capitalOrdinario;
        pagoExtra = 0n;
      } else {
        capitalOrdinario = candidatoCapOrd;
        cuotaOrdinaria = mBaseCentavos;
        const saldoPostOrdinario = saldo - capitalOrdinario;
        if (pagoExtraProgramado > saldoPostOrdinario) {
          throw new Error(`PAGO_EXTRA_EXCEDE_SALDO:max=${saldoPostOrdinario.toString()}`);
        }
        pagoExtra = pagoExtraProgramado;
      }
    }

    const capitalTotal = capitalOrdinario + pagoExtra;
    const pagoTotal = cuotaOrdinaria + pagoExtra;
    const saldoFinal = saldo - capitalTotal;

    totalInteresesCentavos += interes;
    totalPagadoCentavos += pagoTotal;
    filas.push({ mes: t, saldoInicial: saldo, interes, cuotaOrdinaria, capitalOrdinario, pagoExtra, capitalTotal, pagoTotal, saldoFinal });
    saldo = saldoFinal;
  }

  return { mBaseCentavos, vpExtraCentavos, capitalBaseCentavos, totalInteresesCentavos, totalPagadoCentavos, filas };
}
```

### 1.4 Separación entre Resultados Matemáticos Invariantes y Decisiones Comerciales Configurables

| Elemento | Clasificación | Estado |
| :--- | :--- | :--- |
| Conversión de tasas ($r = j_{12}/12$ y $r = (1+i_{\text{EA}})^{1/12}-1$), redondeo `ROUND_HALF_UP` en `BigInt` escala $10^{12}$ y ajuste en última cuota para $\text{Saldo}_n = \$0.00$ | **Invariante Matemático de Ingeniería** | **Verificado Analíticamente (No sujeto a opinión comercial)** |
| Prelación Interés $\to$ Capital Ordinario $\to$ Capital Extraordinario y prohibición de saldos negativos ($\text{Saldo}_t < 0$) | **Invariante Financiero** | **Verificado Analíticamente** |
| Modalidad preseleccionada por defecto al crear un nuevo esquema con intereses (`valor_presente_cuota_fija` vs. `abono_directo_capital`) | **Decisión Comercial Configurable (`IRIS-DEC-028`)** | **Pendiente de confirmación del propietario del producto** |

---

## 2. Pruebas de Concurrencia, Aislamiento Multiempresa y Seguridad

| ID Prueba | Categoría | Procedimiento de Prueba | Resultado Esperado / Criterio de Aceptación |
| :--- | :--- | :--- | :--- |
| **TEST-CONC-01** | Concurrencia en Inventario | Lanzar 2 transacciones paralelas ejecutando `cambiar_estado_unidad_inventario(Org1, Unidad1, 'apartado', version=1)` con 2 asesores distintos. | Una transacción retorna `exito: true` (`version_registro = 2`); la segunda falla inmediatamente con `55P03 CONFLICTO_CONCURRENCIA` o `40001 CONFLICTO_VERSION_INVENTARIO`. |
| **TEST-CONC-02** | Idempotencia de Liberación Automática | Ejecutar `liberar_apartados_vencidos()` simultáneamente desde 2 conexiones sobre 10 unidades con `apartado_vence_en < clock_timestamp()`. | La suma de unidades liberadas entre ambas conexiones es exactamente `10`, y en `historial_disponibilidad_unidad` se insertan exactamente `10` registros (gracias a `FOR UPDATE SKIP LOCKED`). |
| **TEST-CONC-03** | Conversión Concurrente de Prospecto | Lanzar 2 llamadas paralelas a `asegurar_conversion_prospecto_oportunidad` para `Prospecto P1` (con igual o diferente `clave_idempotencia`). | Se crea **1 solo Contacto** y **1 sola Oportunidad**; ambas llamadas retornan el mismo `oportunidad_id`. |
| **TEST-TENANT-01** | Integridad Compuesta Cross-Tenant | Intentar un `INSERT INTO public.cotizaciones_inmobiliarias` (usando `service_role`) con `organizacion_id = OrgA`, pero `desarrollo_id` perteneciente a `OrgB`. | PostgreSQL rechaza el `INSERT` con error `23503 foreign key violation` en `fk_cot_desarrollo_tenant`. |
| **TEST-TENANT-02** | Asignación de Usuario Ajeno o Inactivo | Intentar asignar en `prospectos.agente_asignado_id` o `unidades_inmobiliarias.asesor_apartado_id` un `usuario_id` de otra organización o con `membresias.estado = 'suspendido'`. | Rechazado por `fk_..._miembro` (si es de otra organización) o por el trigger `validar_asignacion_miembro_activo` (`23514 USUARIO_INACTIVO_O_AJENO`). |
| **TEST-SEC-01** | Cotizador Público Zero-Leakage | Invocar `obtener_cotizacion_publica_por_token` como rol `anon` con token válido, con token revocado (`acceso_publico_activo = false`) y con token expirado. | Con token válido devuelve solo `propuesta` sin `organizacion_id` ni notas internas; con token revocado devuelve `encontrada: false`; con expirado devuelve `expirada: true` sin precios. |
