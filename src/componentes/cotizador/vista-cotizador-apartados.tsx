// ==============================================================================
// IRIS by WYLEN — VISTA PRINCIPAL: COTIZADOR INMOBILIARIO Y GESTIÓN DE APARTADOS
// ==============================================================================
// Decisiones implementadas:
// • IRIS-DEC-011 / 012: Reserva transaccional de unidades, prórrogas con justificación
//                       obligatoria, liberación manual/automática y conversión a venta.
// • IRIS-DEC-014 / 015 / 016 / 017 / 018: Motor financiero decimal exacto en tiempo real
//                       (tasas nominales/efectivas, enganche diferido, anualidades en
//                       valor presente o abono directo a capital).
// • IRIS-DEC-024: Bloqueo de conversión de cotizaciones vencidas sin revalidación.
// ==============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calculator,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  ArrowRight,
  CalendarClock,
  BadgeDollarSign,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/librerias/utilidades/cn";
import { notificar } from "@/librerias/notificaciones/sileo";
import {
  calcularCorridaFinancieraInmobiliaria,
  ErrorMotorFinanciero,
} from "@/librerias/financiero/motor-cotizador";
import {
  accionCrearApartadoUnidad,
  accionEmitirCotizacionInmobiliaria,
  accionLiberarOConvertirApartado,
  accionObtenerContextoCotizador,
  accionProrrogarApartadoUnidad,
} from "@/acciones/cotizador";
import type { DesarrolloInmobiliario } from "@/tipos/proyectos";
import type {
  ApartadoUnidadInmobiliaria,
  ContextoInicialCotizador,
  CotizacionInmobiliaria,
  ModalidadEnganche,
  ModoPagosExtraordinarios,
  PagoExtraordinarioProgramado,
  ResultadoCorridaFinanciera,
  TipoTasaInteres,
} from "@/tipos/cotizador";

interface PropiedadesVistaCotizadorApartados {
  desarrollos: DesarrolloInmobiliario[];
  contextoInicial: ContextoInicialCotizador;
  unidadesPreseleccionadasIds?: string[];
  pestanaInicial?: "resumen" | "simulador" | "cotizaciones" | "apartados";
  rolUsuario: string;
}

function formatearMoneda(monto: number, moneda: "MXN" | "USD" = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(monto) ? monto : 0);
}

export function VistaCotizadorApartados({
  desarrollos,
  contextoInicial,
  unidadesPreseleccionadasIds = [],
  pestanaInicial = "simulador",
  rolUsuario,
}: PropiedadesVistaCotizadorApartados) {
  const [pestanaActiva, setPestanaActiva] = React.useState<
    "resumen" | "simulador" | "cotizaciones" | "apartados"
  >(pestanaInicial);
  const [desarrolloActivoId, setDesarrolloActivoId] = React.useState<string>(
    contextoInicial.desarrolloActivoId
  );
  const [unidadesDesarrollo, setUnidadesDesarrollo] = React.useState(
    contextoInicial.unidadesDesarrollo
  );
  const [esquemas, setEsquemas] = React.useState(contextoInicial.esquemasFinanciamiento);
  const [politica, setPolitica] = React.useState(contextoInicial.politicaEfectiva);
  const [cotizaciones, setCotizaciones] = React.useState<CotizacionInmobiliaria[]>(
    contextoInicial.cotizacionesRecientes
  );
  const [apartados, setApartados] = React.useState<ApartadoUnidadInmobiliaria[]>(
    contextoInicial.apartadosDesarrollo
  );
  const [prospectos, setProspectos] = React.useState(contextoInicial.prospectosActivos);
  const [cargandoContexto, setCargandoContexto] = React.useState(false);

  // Selección de unidades para cotizar
  const [unidadesSeleccionadasIds, setUnidadesSeleccionadasIds] = React.useState<string[]>(() => {
    if (unidadesPreseleccionadasIds.length > 0) {
      return unidadesPreseleccionadasIds;
    }
    const primeraDisponible = contextoInicial.unidadesDesarrollo.find(
      (u) => u.estado_disponibilidad === "disponible"
    );
    return primeraDisponible ? [primeraDisponible.id] : [];
  });

  // Datos del cliente / prospecto
  const [prospectoId, setProspectoId] = React.useState<string>("");
  const [clienteNombre, setClienteNombre] = React.useState<string>("Roberto Méndez Garza");
  const [clienteTelefono, setClienteTelefono] = React.useState<string>("+52 999 314 8820");
  const [clienteCorreo, setClienteCorreo] = React.useState<string>("roberto.mendez@inversiones.mx");
  const [notasComerciales, setNotasComerciales] = React.useState<string>("");

  // Parámetros del Motor Financiero
  const [esquemaId, setEsquemaId] = React.useState<string>(
    contextoInicial.esquemasFinanciamiento[1]?.id ??
      contextoInicial.esquemasFinanciamiento[0]?.id ??
      ""
  );
  const [descuentoPorcentaje, setDescuentoPorcentaje] = React.useState<number>(0);
  const [modalidadEnganche, setModalidadEnganche] = React.useState<ModalidadEnganche>("porcentaje");
  const [enganchePorcentaje, setEnganchePorcentaje] = React.useState<number>(20);
  const [engancheMontoFijo, setEngancheMontoFijo] = React.useState<number>(100000);
  const [mesesEngancheDiferido, setMesesEngancheDiferido] = React.useState<number>(1);
  const [plazoMeses, setPlazoMeses] = React.useState<number>(36);
  const [tipoTasaInteres, setTipoTasaInteres] = React.useState<TipoTasaInteres>("sin_intereses");
  const [tasaInteresAnual, setTasaInteresAnual] = React.useState<number>(0);
  const [modoPagosExtraordinarios, setModoPagosExtraordinarios] =
    React.useState<ModoPagosExtraordinarios>("valor_presente_cuota_fija");
  const [pagosExtraordinarios, setPagosExtraordinarios] = React.useState<
    PagoExtraordinarioProgramado[]
  >([]);

  // Nuevo pago extraordinario temporal
  const [nuevoExtraMes, setNuevoExtraMes] = React.useState<number>(12);
  const [nuevoExtraMonto, setNuevoExtraMonto] = React.useState<number>(50000);
  const [nuevoExtraEtiqueta, setNuevoExtraEtiqueta] = React.useState<string>("Anualidad Diciembre");

  // Estados de emisión y modales de Apartado / Prórroga / Liberación
  const [emitiendoCotizacion, setEmitiendoCotizacion] = React.useState(false);
  const [modalApartadoAbierto, setModalApartadoAbierto] = React.useState(false);
  const [unidadParaApartarId, setUnidadParaApartarId] = React.useState<string>("");
  const [cotizacionOrigenApartadoId, setCotizacionOrigenApartadoId] = React.useState<string | null>(
    null
  );
  const [montoApartadoInput, setMontoApartadoInput] = React.useState<number>(10000);
  const [horasVigenciaApartadoInput, setHorasVigenciaApartadoInput] = React.useState<number>(
    contextoInicial.politicaEfectiva.horas_vigencia_apartado || 72
  );
  const [procesandoApartado, setProcesandoApartado] = React.useState(false);

  // Modal de prórroga
  const [apartadoEnProrroga, setApartadoEnProrroga] =
    React.useState<ApartadoUnidadInmobiliaria | null>(null);
  const [horasProrrogaInput, setHorasProrrogaInput] = React.useState<number>(48);
  const [justificacionProrrogaInput, setJustificacionProrrogaInput] = React.useState<string>("");

  // Modal de liberación o conversión a venta
  const [apartadoEnResolucion, setApartadoEnResolucion] = React.useState<{
    apartado: ApartadoUnidadInmobiliaria;
    accion: "liberar" | "convertir_venta";
  } | null>(null);
  const [motivoResolucionInput, setMotivoResolucionInput] = React.useState<string>("");

  const desarrolloActivo = React.useMemo(
    () => desarrollos.find((d) => d.id === desarrolloActivoId) ?? desarrollos[0],
    [desarrollos, desarrolloActivoId]
  );

  const monedaActiva = desarrolloActivo?.moneda ?? "MXN";

  // Cambiar de desarrollo
  const cambiarDesarrolloActivo = async (nuevoDesarrolloId: string) => {
    setDesarrolloActivoId(nuevoDesarrolloId);
    setCargandoContexto(true);
    try {
      const res = await accionObtenerContextoCotizador(nuevoDesarrolloId);
      if (res.exito && res.datos) {
        setUnidadesDesarrollo(res.datos.unidadesDesarrollo);
        setEsquemas(res.datos.esquemasFinanciamiento);
        setPolitica(res.datos.politicaEfectiva);
        setCotizaciones(res.datos.cotizacionesRecientes);
        setApartados(res.datos.apartadosDesarrollo);
        setProspectos(res.datos.prospectosActivos);
        const disp = res.datos.unidadesDesarrollo.find(
          (u) => u.estado_disponibilidad === "disponible"
        );
        setUnidadesSeleccionadasIds(disp ? [disp.id] : []);
      }
    } finally {
      setCargandoContexto(false);
    }
  };

  // Aplicar plantilla de esquema de financiamiento
  const seleccionarEsquemaFinanciamiento = (idEsquema: string) => {
    setEsquemaId(idEsquema);
    const esq = esquemas.find((e) => e.id === idEsquema);
    if (!esq) return;
    setTipoTasaInteres(esq.tipo_tasa_interes);
    setTasaInteresAnual(esq.tasa_interes_anual);
    setModoPagosExtraordinarios(esq.modo_pagos_extraordinarios);
    setEnganchePorcentaje(Math.max(enganchePorcentaje, esq.porcentaje_enganche_min));
    if (
      esq.plazos_meses_permitidos.length > 0 &&
      !esq.plazos_meses_permitidos.includes(plazoMeses)
    ) {
      setPlazoMeses(esq.plazos_meses_permitidos[esq.plazos_meses_permitidos.length - 1]);
    }
    if (!esq.permite_pagos_extraordinarios) {
      setPagosExtraordinarios([]);
    }
  };

  // Seleccionar prospecto del CRM
  const seleccionarProspectoCrm = (idProspecto: string) => {
    setProspectoId(idProspecto);
    const encontrado = prospectos.find((p) => p.id === idProspecto);
    if (encontrado) {
      setClienteNombre(encontrado.nombre);
      setClienteTelefono(encontrado.telefono || "");
      setClienteCorreo(encontrado.correo_electronico || "");
    }
  };

  const alternarSeleccionUnidad = (idUnidad: string) => {
    setUnidadesSeleccionadasIds((prev) =>
      prev.includes(idUnidad) ? prev.filter((id) => id !== idUnidad) : [...prev, idUnidad]
    );
  };

  const unidadesSeleccionadas = React.useMemo(
    () => unidadesDesarrollo.filter((u) => unidadesSeleccionadasIds.includes(u.id)),
    [unidadesDesarrollo, unidadesSeleccionadasIds]
  );

  const subtotalSeleccionado = React.useMemo(
    () =>
      unidadesSeleccionadas.reduce(
        (acc, u) => acc + Number(u.precio_promocional ?? u.precio_lista ?? 0),
        0
      ),
    [unidadesSeleccionadas]
  );

  const superficieTotalSeleccionada = React.useMemo(
    () => unidadesSeleccionadas.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0),
    [unidadesSeleccionadas]
  );

  // Cálculo reactivo de la corrida financiera con captura limpia de errores matemáticos
  const estadoCalculo = React.useMemo<{
    corrida: ResultadoCorridaFinanciera | null;
    error: string | null;
  }>(() => {
    if (subtotalSeleccionado <= 0) {
      return {
        corrida: null,
        error: "Selecciona al menos una unidad disponible del inventario para calcular la corrida.",
      };
    }

    try {
      const corrida = calcularCorridaFinancieraInmobiliaria({
        subtotalLista: subtotalSeleccionado,
        descuentoPorcentaje,
        modalidadEnganche,
        enganchePorcentaje,
        engancheMontoFijo,
        mesesEngancheDiferido,
        plazoMesesFinanciamiento: plazoMeses,
        tipoTasaInteres,
        tasaInteresAnualPorcentaje: tasaInteresAnual,
        modoPagosExtraordinarios,
        pagosExtraordinarios,
      });
      return { corrida, error: null };
    } catch (err) {
      if (err instanceof ErrorMotorFinanciero) {
        return { corrida: null, error: `${err.codigo}: ${err.message}` };
      }
      return {
        corrida: null,
        error: err instanceof Error ? err.message : "Error en parámetros financieros.",
      };
    }
  }, [
    subtotalSeleccionado,
    descuentoPorcentaje,
    modalidadEnganche,
    enganchePorcentaje,
    engancheMontoFijo,
    mesesEngancheDiferido,
    plazoMeses,
    tipoTasaInteres,
    tasaInteresAnual,
    modoPagosExtraordinarios,
    pagosExtraordinarios,
  ]);

  const agregarPagoExtraordinario = () => {
    if (nuevoExtraMes < 1 || nuevoExtraMes > plazoMeses) {
      notificar.error(`El mes del pago extraordinario debe estar entre 1 y ${plazoMeses}.`);
      return;
    }
    if (nuevoExtraMonto <= 0) {
      notificar.error("El monto del pago extraordinario debe ser mayor a $0.00.");
      return;
    }
    setPagosExtraordinarios((prev) =>
      [
        ...prev,
        {
          mes: Math.trunc(nuevoExtraMes),
          monto: Number(nuevoExtraMonto),
          etiqueta: nuevoExtraEtiqueta.trim() || `Anualidad Mes ${nuevoExtraMes}`,
        },
      ].sort((a, b) => a.mes - b.mes)
    );
  };

  const eliminarPagoExtraordinario = (indice: number) => {
    setPagosExtraordinarios((prev) => prev.filter((_, idx) => idx !== indice));
  };

  const manejarEmitirCotizacion = async () => {
    if (!estadoCalculo.corrida) {
      notificar.error(estadoCalculo.error || "Verifica los parámetros financieros.");
      return;
    }
    if (!clienteNombre.trim()) {
      notificar.error("Ingresa el nombre del cliente o selecciona un prospecto.");
      return;
    }

    setEmitiendoCotizacion(true);
    try {
      const res = await accionEmitirCotizacionInmobiliaria({
        desarrollo_id: desarrolloActivoId,
        unidades_ids: unidadesSeleccionadasIds,
        esquema_financiamiento_id: esquemaId || null,
        prospecto_id: prospectoId || null,
        cliente_nombre_libre: clienteNombre.trim(),
        cliente_telefono_libre: clienteTelefono.trim() || null,
        cliente_correo_libre: clienteCorreo.trim() || null,
        descuento_porcentaje: descuentoPorcentaje,
        modalidad_enganche: modalidadEnganche,
        enganche_porcentaje: enganchePorcentaje,
        enganche_monto_fijo: engancheMontoFijo,
        meses_enganche_diferido: mesesEngancheDiferido,
        plazo_meses: plazoMeses,
        tipo_tasa_interes: tipoTasaInteres,
        tasa_interes_anual: tasaInteresAnual,
        modo_pagos_extraordinarios: modoPagosExtraordinarios,
        pagos_extraordinarios: pagosExtraordinarios,
        notas_comerciales: notasComerciales.trim() || null,
      });

      if (!res.exito || !res.datos) {
        notificar.error(res.mensaje);
        return;
      }

      setCotizaciones((prev) => [res.datos!, ...prev]);
      notificar.exito(res.mensaje);
    } finally {
      setEmitiendoCotizacion(false);
    }
  };

  const abrirModalApartadoDirecto = (unidadId?: string, cotizacion?: CotizacionInmobiliaria) => {
    const idObjetivo =
      unidadId ||
      cotizacion?.unidades[0]?.unidad_id ||
      unidadesSeleccionadasIds[0] ||
      unidadesDesarrollo.find((u) => u.estado_disponibilidad === "disponible")?.id ||
      "";

    if (!idObjetivo) {
      notificar.error("No hay ninguna unidad disponible seleccionada para apartar.");
      return;
    }

    if (cotizacion) {
      setClienteNombre(cotizacion.cliente_nombre_libre || clienteNombre);
      setClienteTelefono(cotizacion.cliente_telefono_libre || clienteTelefono);
      setClienteCorreo(cotizacion.cliente_correo_libre || clienteCorreo);
      setProspectoId(cotizacion.prospecto_id || "");
      setCotizacionOrigenApartadoId(cotizacion.id);
    } else {
      setCotizacionOrigenApartadoId(null);
    }

    setUnidadParaApartarId(idObjetivo);
    setHorasVigenciaApartadoInput(politica.horas_vigencia_apartado || 72);
    setModalApartadoAbierto(true);
  };

  const confirmarApartadoUnidad = async () => {
    if (!unidadParaApartarId || !clienteNombre.trim()) {
      notificar.error("Selecciona una unidad disponible e indica el nombre del titular.");
      return;
    }
    setProcesandoApartado(true);
    try {
      const res = await accionCrearApartadoUnidad({
        desarrollo_id: desarrolloActivoId,
        unidad_id: unidadParaApartarId,
        cotizacion_id: cotizacionOrigenApartadoId,
        prospecto_id: prospectoId || null,
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim() || null,
        cliente_correo: clienteCorreo.trim() || null,
        monto_apartado: montoApartadoInput,
        horas_vigencia: horasVigenciaApartadoInput,
        notas: notasComerciales.trim() || null,
      });

      if (!res.exito || !res.datos) {
        notificar.error(res.mensaje);
        return;
      }

      setApartados((prev) => [res.datos!, ...prev]);
      setUnidadesDesarrollo((prev) =>
        prev.map((u) =>
          u.id === unidadParaApartarId
            ? {
                ...u,
                estado_disponibilidad: "apartado",
                apartado_en: res.datos!.fecha_apartado,
                apartado_vence_en: res.datos!.fecha_vencimiento,
              }
            : u
        )
      );
      setModalApartadoAbierto(false);
      setPestanaActiva("apartados");
      notificar.exito(res.mensaje);
    } finally {
      setProcesandoApartado(false);
    }
  };

  const confirmarProrrogaApartado = async () => {
    if (!apartadoEnProrroga) return;
    if (justificacionProrrogaInput.trim().length < 8) {
      notificar.error("La justificación de prórroga debe tener al menos 8 caracteres.");
      return;
    }

    setProcesandoApartado(true);
    try {
      const res = await accionProrrogarApartadoUnidad({
        apartado_id: apartadoEnProrroga.id,
        horas_adicionales: horasProrrogaInput,
        justificacion: justificacionProrrogaInput.trim(),
      });

      if (!res.exito || !res.datos) {
        notificar.error(res.mensaje);
        return;
      }

      setApartados((prev) =>
        prev.map((a) =>
          a.id === apartadoEnProrroga.id
            ? {
                ...a,
                fecha_vencimiento: res.datos!.nuevaFechaVencimiento,
                prorrogas_aplicadas: res.datos!.prorrogasAplicadas,
                justificacion_ultima_prorroga: justificacionProrrogaInput.trim(),
              }
            : a
        )
      );
      setApartadoEnProrroga(null);
      setJustificacionProrrogaInput("");
      notificar.exito(res.mensaje);
    } finally {
      setProcesandoApartado(false);
    }
  };

  const confirmarResolucionApartado = async () => {
    if (!apartadoEnResolucion) return;
    if (motivoResolucionInput.trim().length < 4) {
      notificar.error("Indica el motivo o folio de contrato para continuar.");
      return;
    }

    setProcesandoApartado(true);
    try {
      const res = await accionLiberarOConvertirApartado({
        apartado_id: apartadoEnResolucion.apartado.id,
        accion: apartadoEnResolucion.accion,
        motivo: motivoResolucionInput.trim(),
      });

      if (!res.exito || !res.datos) {
        notificar.error(res.mensaje);
        return;
      }

      const idUnidad = apartadoEnResolucion.apartado.unidad_id;
      const nuevoEstadoUnidad = res.datos.nuevoEstadoUnidad;

      setApartados((prev) =>
        prev.map((a) =>
          a.id === apartadoEnResolucion.apartado.id
            ? {
                ...a,
                estado_apartado: res.datos!.estadoApartado as ApartadoUnidadInmobiliaria["estado_apartado"],
              }
            : a
        )
      );
      setUnidadesDesarrollo((prev) =>
        prev.map((u) =>
          u.id === idUnidad
            ? {
                ...u,
                estado_disponibilidad: nuevoEstadoUnidad,
                apartado_vence_en: null,
              }
            : u
        )
      );

      setApartadoEnResolucion(null);
      setMotivoResolucionInput("");
      notificar.exito(res.mensaje);
    } finally {
      setProcesandoApartado(false);
    }
  };

  const requiereAutorizacionDescuento =
    descuentoPorcentaje > politica.descuento_maximo_sin_autorizacion_pct &&
    rolUsuario !== "superadministrador" &&
    rolUsuario !== "gerente";

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Editorial Sobrio */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            <span>Motor Financiero Decimal Exacto (Escala 10¹²)</span>
            <span>•</span>
            <span>Vigencia Apartado: {politica.horas_vigencia_apartado}h</span>
            <span>•</span>
            <span>Vigencia Cotización: {politica.dias_vigencia_cotizacion} días</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Cotizador Inmobiliario y Control de Apartados
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de desarrollo */}
          <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 shadow-2xs">
            <Building2 className="h-4 w-4 text-neutral-500" />
            <select
              value={desarrolloActivoId}
              onChange={(e) => cambiarDesarrolloActivo(e.target.value)}
              disabled={cargandoContexto}
              aria-label="Seleccionar desarrollo inmobiliario"
              className="bg-transparent text-sm font-medium text-neutral-900 focus:outline-none"
            >
              {desarrollos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.moneda})
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/desarrollos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Layers className="h-3.5 w-3.5" />
            Ver Plano Interactivo SVG
          </Link>

          <button
            type="button"
            onClick={() => abrirModalApartadoDirecto()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            <Lock className="h-3.5 w-3.5" />
            Nuevo Apartado Directo
          </button>
        </div>
      </div>

      {/* Pestañas principales */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPestanaActiva("resumen")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
              pestanaActiva === "resumen"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <BadgeDollarSign className="h-4 w-4" />
            Resumen
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("simulador")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              pestanaActiva === "simulador"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <Calculator className="h-4 w-4" />
            Simulador y Corrida Financiera
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("cotizaciones")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              pestanaActiva === "cotizaciones"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <FileText className="h-4 w-4" />
            Cotizaciones Emitidas
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
              {cotizaciones.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("apartados")}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              pestanaActiva === "apartados"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            )}
          >
            <Clock className="h-4 w-4" />
            Apartados y Vigencias
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {apartados.filter((a) => a.estado_apartado === "activo").length} activos
            </span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 0: RESUMEN DEL COTIZADOR */}
      {pestanaActiva === "resumen" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Unidades Disponibles</span>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {unidadesDesarrollo.filter((u) => u.estado_disponibilidad === "disponible").length}
              </p>
              <button
                type="button"
                onClick={() => setPestanaActiva("simulador")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-800 hover:underline cursor-pointer"
              >
                Crear nueva cotización <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Cotizaciones Emitidas</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{cotizaciones.length}</p>
              <button
                type="button"
                onClick={() => setPestanaActiva("cotizaciones")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-800 hover:underline cursor-pointer"
              >
                Ver historial <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Apartados Activos</span>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {apartados.filter((a) => a.estado_apartado === "activo").length}
              </p>
              <button
                type="button"
                onClick={() => setPestanaActiva("apartados")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-800 hover:underline cursor-pointer"
              >
                Administrar vigencias <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-medium text-neutral-500">Pendientes de Autorización</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {cotizaciones.filter((c) => c.estado === "pendiente_autorizacion").length}
              </p>
              <span className="mt-2 block text-[11px] text-neutral-500">
                Descuento máximo asesor: {politica.descuento_maximo_sin_autorizacion_pct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 1: SIMULADOR Y CORRIDA FINANCIERA */}
      {pestanaActiva === "simulador" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Columna izquierda: Configuración Comercial y Financiera (5 cols) */}
          <div className="space-y-5 xl:col-span-5">
            {/* 1. Cliente / Prospecto */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">
                  1. Titular de la Propuesta Comercial
                </h2>
                <UserCheck className="h-4 w-4 text-neutral-400" />
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600">
                    Vincular con Prospecto del CRM (Opcional)
                  </label>
                  <select
                    value={prospectoId}
                    onChange={(e) => seleccionarProspectoCrm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">— Captura manual libre —</option>
                    {prospectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.telefono ? `(${p.telefono})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-600">
                      Nombre completo del cliente *
                    </label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Ej. Roberto Méndez Garza"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Teléfono (E.164 / Nacional)
                    </label>
                    <input
                      type="text"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="+52 999 000 0000"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={clienteCorreo}
                      onChange={(e) => setClienteCorreo(e.target.value)}
                      placeholder="cliente@dominio.com"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Selección Multiunidad (Paquete o Unidad Individual) */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    2. Unidades a Cotizar ({unidadesSeleccionadas.length})
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Selecciona una o varias unidades para cotización individual o paquete multiunidad.
                  </p>
                </div>
                <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800">
                  {superficieTotalSeleccionada.toFixed(2)} m²
                </span>
              </div>

              <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {unidadesDesarrollo.map((u) => {
                  const seleccionada = unidadesSeleccionadasIds.includes(u.id);
                  const bloqueadaOVendida =
                    u.estado_disponibilidad === "vendido" ||
                    u.estado_disponibilidad === "bloqueado";
                  const precioEfectivo = Number(u.precio_promocional ?? u.precio_lista ?? 0);

                  return (
                    <label
                      key={u.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors",
                        seleccionada
                          ? "border-neutral-900 bg-neutral-900/5 font-medium"
                          : "border-neutral-200 hover:bg-neutral-50",
                        bloqueadaOVendida && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          disabled={bloqueadaOVendida}
                          onChange={() => alternarSeleccionUnidad(u.id)}
                          className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <div>
                          <span className="font-semibold text-neutral-900">
                            {u.clave_comercial}
                          </span>
                          <span className="ml-2 text-neutral-500">
                            {Number(u.superficie_m2).toFixed(2)} m²
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                            u.estado_disponibilidad === "disponible" &&
                              "bg-emerald-100 text-emerald-800",
                            u.estado_disponibilidad === "apartado" &&
                              "bg-amber-100 text-amber-800",
                            u.estado_disponibilidad === "vendido" && "bg-red-100 text-red-800",
                            u.estado_disponibilidad === "bloqueado" &&
                              "bg-neutral-200 text-neutral-700"
                          )}
                        >
                          {u.estado_disponibilidad}
                        </span>
                        <span className="font-mono font-semibold text-neutral-900">
                          {formatearMoneda(precioEfectivo, monedaActiva)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* 3. Esquema y Parámetros del Motor Financiero */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-neutral-900">
                3. Esquema Financiero, Tasas y Enganche Diferido
              </h2>

              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600">
                    Plantilla Comercial del Desarrollo
                  </label>
                  <select
                    value={esquemaId}
                    onChange={(e) => seleccionarEsquemaFinanciamiento(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="">— Configuración Financiera Personalizada —</option>
                    {esquemas.map((esq) => (
                      <option key={esq.id} value={esq.id}>
                        {esq.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descuento y Modalidad de Enganche */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Descuento Comercial (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={descuentoPorcentaje}
                      onChange={(e) => setDescuentoPorcentaje(Math.max(0, Number(e.target.value)))}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                    />
                    <span className="mt-0.5 block text-[11px] text-neutral-500">
                      Máx. sin autorización: {politica.descuento_maximo_sin_autorizacion_pct}%
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Modalidad de Enganche
                    </label>
                    <select
                      value={modalidadEnganche}
                      onChange={(e) => setModalidadEnganche(e.target.value as ModalidadEnganche)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900"
                    >
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="monto_fijo">Monto fijo ($)</option>
                    </select>
                  </div>
                </div>

                {requiereAutorizacionDescuento && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>
                      El descuento de <strong>{descuentoPorcentaje}%</strong> excede el límite
                      autorizado para asesor ({politica.descuento_maximo_sin_autorizacion_pct}%). La
                      cotización se guardará como <strong>Pendiente de Autorización Gerencial</strong>.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {modalidadEnganche === "porcentaje" ? (
                    <div>
                      <label className="block text-xs font-medium text-neutral-600">
                        Porcentaje de Enganche (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={enganchePorcentaje}
                        onChange={(e) =>
                          setEnganchePorcentaje(
                            Math.min(100, Math.max(0, Number(e.target.value)))
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-neutral-600">
                        Monto de Enganche ({monedaActiva})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={engancheMontoFijo}
                        onChange={(e) => setEngancheMontoFijo(Math.max(0, Number(e.target.value)))}
                        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Diferimiento de Enganche (Meses)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      value={mesesEngancheDiferido}
                      onChange={(e) =>
                        setMesesEngancheDiferido(Math.max(1, Math.trunc(Number(e.target.value))))
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                    />
                  </div>
                </div>

                {/* Plazo y Tipo de Tasa */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Plazo Financiamiento (Meses)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={240}
                      value={plazoMeses}
                      onChange={(e) =>
                        setPlazoMeses(Math.max(0, Math.trunc(Number(e.target.value))))
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Modalidad de Tasa
                    </label>
                    <select
                      value={tipoTasaInteres}
                      onChange={(e) => {
                        const nuevoTipo = e.target.value as TipoTasaInteres;
                        setTipoTasaInteres(nuevoTipo);
                        if (nuevoTipo === "sin_intereses") {
                          setTasaInteresAnual(0);
                        } else if (tasaInteresAnual === 0) {
                          setTasaInteresAnual(12);
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900"
                    >
                      <option value="sin_intereses">Sin Intereses (0%)</option>
                      <option value="nominal_anual">Tasa Nominal Anual (j₁₂ / 12)</option>
                      <option value="efectiva_anual">Tasa Efectiva Anual ((1+i)^¹/₁₂ - 1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Tasa Anual (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.25}
                      disabled={tipoTasaInteres === "sin_intereses"}
                      value={tipoTasaInteres === "sin_intereses" ? 0 : tasaInteresAnual}
                      onChange={(e) => setTasaInteresAnual(Math.max(0, Number(e.target.value)))}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 disabled:bg-neutral-100"
                    />
                  </div>
                </div>

                {/* Tratamiento de Anualidades y Pagos Extraordinarios */}
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-neutral-800">
                      Anualidades y Pagos Extraordinarios Programados
                    </label>
                    <select
                      value={modoPagosExtraordinarios}
                      onChange={(e) =>
                        setModoPagosExtraordinarios(e.target.value as ModoPagosExtraordinarios)
                      }
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-800"
                    >
                      <option value="valor_presente_cuota_fija">
                        Descontar en Valor Presente (Reduce Cuota Fija)
                      </option>
                      <option value="abono_directo_capital">
                        Abono Directo a Capital (Reduce Plazo/Intereses)
                      </option>
                    </select>
                  </div>

                  <div className="mt-2.5 grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <input
                        type="number"
                        min={1}
                        max={plazoMeses || 240}
                        value={nuevoExtraMes}
                        onChange={(e) => setNuevoExtraMes(Number(e.target.value))}
                        placeholder="Mes"
                        className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={nuevoExtraMonto}
                        onChange={(e) => setNuevoExtraMonto(Number(e.target.value))}
                        placeholder="Monto $"
                        className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={nuevoExtraEtiqueta}
                        onChange={(e) => setNuevoExtraEtiqueta(e.target.value)}
                        placeholder="Concepto"
                        className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={agregarPagoExtraordinario}
                        className="flex h-full w-full items-center justify-center rounded-lg bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {pagosExtraordinarios.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {pagosExtraordinarios.map((pe, idx) => (
                        <div
                          key={`${pe.mes}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-neutral-900">Mes {pe.mes}:</span>{" "}
                            <span className="text-neutral-600">{pe.etiqueta}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-neutral-900">
                              {formatearMoneda(pe.monto, monedaActiva)}
                            </span>
                            <button
                              type="button"
                              onClick={() => eliminarPagoExtraordinario(idx)}
                              className="text-neutral-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Columna derecha: Resumen Ejecutivo y Tabla de Corrida Financiera (7 cols) */}
          <div className="space-y-5 xl:col-span-7">
            {estadoCalculo.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-5 w-5 text-red-700" />
                  Validación del Motor Financiero
                </div>
                <p className="mt-1 text-xs text-red-800">{estadoCalculo.error}</p>
              </div>
            ) : (
              estadoCalculo.corrida && (
                <>
                  {/* Tarjeta de Resumen Financiero Ejecutivo */}
                  <section className="rounded-xl border border-neutral-200 bg-white p-6">
                    <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Propuesta Financiera • {desarrolloActivo?.nombre}
                        </span>
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {clienteNombre || "Cliente Comercial"} —{" "}
                          {unidadesSeleccionadas.map((u) => u.clave_comercial).join(", ")}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Imprimir / PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirModalApartadoDirecto(unidadesSeleccionadas[0]?.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-900 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Apartar Unidad
                        </button>

                        <button
                          type="button"
                          disabled={emitiendoCotizacion}
                          onClick={manejarEmitirCotizacion}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {emitiendoCotizacion ? "Emitiendo..." : "Emitir Cotización"}
                        </button>
                      </div>
                    </div>

                    {/* KPIs Financieros */}
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                        <span className="text-[11px] font-medium text-neutral-500">
                          Precio Neto Final
                        </span>
                        <p className="mt-1 font-mono text-base font-semibold text-neutral-900">
                          {formatearMoneda(estadoCalculo.corrida.precioNetoFinal, monedaActiva)}
                        </p>
                        {estadoCalculo.corrida.descuentoMontoAplicado > 0 && (
                          <span className="text-[11px] text-emerald-700">
                            Dto. -{estadoCalculo.corrida.descuentoPorcentajeAplicado}% (
                            {formatearMoneda(
                              estadoCalculo.corrida.descuentoMontoAplicado,
                              monedaActiva
                            )}
                            )
                          </span>
                        )}
                      </div>

                      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                        <span className="text-[11px] font-medium text-neutral-500">
                          Enganche ({estadoCalculo.corrida.enganchePorcentajeEfectivo}%)
                        </span>
                        <p className="mt-1 font-mono text-base font-semibold text-neutral-900">
                          {formatearMoneda(estadoCalculo.corrida.engancheTotal, monedaActiva)}
                        </p>
                        <span className="text-[11px] text-neutral-500">
                          En {estadoCalculo.corrida.mesesEngancheDiferido} pago(s)
                        </span>
                      </div>

                      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                        <span className="text-[11px] font-medium text-neutral-500">
                          Saldo a Financiar
                        </span>
                        <p className="mt-1 font-mono text-base font-semibold text-neutral-900">
                          {formatearMoneda(estadoCalculo.corrida.saldoFinanciado, monedaActiva)}
                        </p>
                        <span className="text-[11px] text-neutral-500">
                          Plazo: {estadoCalculo.corrida.plazoMeses} meses (r ={" "}
                          {estadoCalculo.corrida.tasaMensualEfectivaPorcentaje.toFixed(4)}%)
                        </span>
                      </div>

                      <div className="rounded-lg border border-neutral-900 bg-neutral-900 p-3 text-white">
                        <span className="text-[11px] font-medium text-neutral-300">
                          Mensualidad Ordinaria
                        </span>
                        <p className="mt-1 font-mono text-base font-semibold text-white">
                          {formatearMoneda(
                            estadoCalculo.corrida.mensualidadOrdinariaBase,
                            monedaActiva
                          )}
                        </p>
                        <span className="text-[11px] text-neutral-300">
                          Última cuota:{" "}
                          {formatearMoneda(
                            estadoCalculo.corrida.ultimaMensualidadOrdinaria,
                            monedaActiva
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Calendario de Enganche Diferido */}
                    {estadoCalculo.corrida.calendarioEnganche.length > 0 && (
                      <div className="mt-5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                          Calendario de Enganche ({estadoCalculo.corrida.calendarioEnganche.length}{" "}
                          pagos)
                        </h4>
                        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                              <tr>
                                <th className="px-3 py-2 font-medium">#</th>
                                <th className="px-3 py-2 font-medium">Concepto</th>
                                <th className="px-3 py-2 text-right font-medium">Monto</th>
                                <th className="px-3 py-2 text-right font-medium">Acumulado</th>
                                <th className="px-3 py-2 text-right font-medium">
                                  Por Liquidar Enganche
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {estadoCalculo.corrida.calendarioEnganche.map((fe) => (
                                <tr key={fe.numeroPago}>
                                  <td className="px-3 py-1.5 font-mono text-neutral-500">
                                    {fe.numeroPago}
                                  </td>
                                  <td className="px-3 py-1.5 font-medium text-neutral-900">
                                    {fe.etiqueta}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-neutral-900">
                                    {formatearMoneda(fe.monto, monedaActiva)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-neutral-600">
                                    {formatearMoneda(fe.acumulado, monedaActiva)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-neutral-600">
                                    {formatearMoneda(fe.saldoEnganchePendiente, monedaActiva)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Tabla de Amortización Completa */}
                    <div className="mt-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                          Tabla de Amortización ({estadoCalculo.corrida.tablaAmortizacion.length}{" "}
                          períodos)
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-neutral-600">
                          <span>
                            Total Intereses:{" "}
                            <strong className="font-mono text-neutral-900">
                              {formatearMoneda(estadoCalculo.corrida.totalIntereses, monedaActiva)}
                            </strong>
                          </span>
                          <span>
                            Total Pagos Extra:{" "}
                            <strong className="font-mono text-neutral-900">
                              {formatearMoneda(
                                estadoCalculo.corrida.totalPagosExtraordinarios,
                                monedaActiva
                              )}
                            </strong>
                          </span>
                          <span>
                            Inversión Total:{" "}
                            <strong className="font-mono text-neutral-900">
                              {formatearMoneda(
                                estadoCalculo.corrida.totalInversionGeneral,
                                monedaActiva
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-neutral-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-100 text-neutral-700">
                            <tr>
                              <th className="px-2.5 py-2 font-medium">Mes</th>
                              <th className="px-2.5 py-2 text-right font-medium">Saldo Inicial</th>
                              <th className="px-2.5 py-2 text-right font-medium">Interés</th>
                              <th className="px-2.5 py-2 text-right font-medium">Cuota Ord.</th>
                              <th className="px-2.5 py-2 text-right font-medium">Capital Ord.</th>
                              <th className="px-2.5 py-2 text-right font-medium">Anualidad/Extra</th>
                              <th className="px-2.5 py-2 text-right font-medium">Pago Total Mes</th>
                              <th className="px-2.5 py-2 text-right font-medium">Saldo Final</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {estadoCalculo.corrida.tablaAmortizacion.map((fila) => (
                              <tr
                                key={fila.mes}
                                className={cn(
                                  fila.pagoExtraordinario > 0 && "bg-amber-50/70",
                                  fila.saldoInsolutoFinal === 0 &&
                                    fila.pagoTotalMes > 0 &&
                                    "bg-emerald-50/60 font-medium"
                                )}
                              >
                                <td className="px-2.5 py-1.5 font-mono text-neutral-600">
                                  {fila.mes}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono text-neutral-700">
                                  {formatearMoneda(fila.saldoInicial, monedaActiva)}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono text-neutral-600">
                                  {formatearMoneda(fila.interes, monedaActiva)}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono text-neutral-900">
                                  {formatearMoneda(fila.cuotaOrdinaria, monedaActiva)}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono text-neutral-700">
                                  {formatearMoneda(fila.capitalOrdinario, monedaActiva)}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-amber-800">
                                  {fila.pagoExtraordinario > 0
                                    ? formatearMoneda(fila.pagoExtraordinario, monedaActiva)
                                    : "—"}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-neutral-900">
                                  {formatearMoneda(fila.pagoTotalMes, monedaActiva)}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-neutral-900">
                                  {formatearMoneda(fila.saldoInsolutoFinal, monedaActiva)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE COTIZACIONES EMITIDAS */}
      {pestanaActiva === "cotizaciones" && (
        <section className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Cotizaciones Inmobiliarias Emitidas
              </h2>
              <p className="text-xs text-neutral-500">
                Snapshots financieros congelados con validación de vigencia antes de conversión a
                apartado (IRIS-DEC-024).
              </p>
            </div>
          </div>

          {cotizaciones.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              Aún no se han emitido cotizaciones en este desarrollo. Utiliza el Simulador para
              generar la primera propuesta comercial.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Folio</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Unidades</th>
                    <th className="px-4 py-3 text-right font-medium">Precio Neto</th>
                    <th className="px-4 py-3 text-right font-medium">Enganche</th>
                    <th className="px-4 py-3 text-right font-medium">Mensualidad</th>
                    <th className="px-4 py-3 font-medium">Vigencia</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {cotizaciones.map((cot) => {
                    const hoyStr = new Date().toISOString().split("T")[0];
                    const estaVencida = cot.fecha_vigencia < hoyStr || cot.estado === "expirada";

                    return (
                      <tr key={cot.id} className="hover:bg-neutral-50/80">
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-900">
                          {cot.folio}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {cot.cliente_nombre_libre || "Cliente Comercial"}
                          </div>
                          {cot.cliente_telefono_libre && (
                            <div className="text-[11px] text-neutral-500">
                              {cot.cliente_telefono_libre}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cot.unidades.map((u) => (
                              <span
                                key={u.unidad_id}
                                className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-800"
                              >
                                {u.clave_comercial}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">
                          {formatearMoneda(cot.precio_neto_final, cot.moneda)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-700">
                          {formatearMoneda(cot.enganche_total, cot.moneda)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">
                          {formatearMoneda(cot.mensualidad_ordinaria_base, cot.moneda)}
                          <span className="block text-[10px] font-normal text-neutral-500">
                            {cot.plazo_meses} meses
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-700">
                          {cot.fecha_vigencia}
                          {estaVencida && (
                            <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                              VENCIDA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              cot.estado === "emitida" && "bg-emerald-100 text-emerald-800",
                              cot.estado === "aceptada" && "bg-blue-100 text-blue-800",
                              cot.estado === "pendiente_autorizacion" &&
                                "bg-amber-100 text-amber-800",
                              (cot.estado === "expirada" || cot.estado === "cancelada") &&
                                "bg-neutral-200 text-neutral-700"
                            )}
                          >
                            {cot.estado.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={
                              estaVencida ||
                              cot.estado === "pendiente_autorizacion" ||
                              cot.estado === "aceptada"
                            }
                            onClick={() => abrirModalApartadoDirecto(cot.unidades[0]?.unidad_id, cot)}
                            className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Lock className="h-3 w-3" />
                            Convertir a Apartado
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA 3: ADMINISTRACIÓN DE APARTADOS Y VIGENCIAS */}
      {pestanaActiva === "apartados" && (
        <section className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Control de Apartados, Prórrogas y Liberación Automática
              </h2>
              <p className="text-xs text-neutral-500">
                Todo cambio de disponibilidad sincroniza inmediatamente el Inventario y el Plano
                Interactivo SVG (IRIS-DEC-009 / IRIS-DEC-011).
              </p>
            </div>
            <button
              type="button"
              onClick={() => abrirModalApartadoDirecto()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar Apartado
            </button>
          </div>

          {apartados.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No hay apartados registrados para este desarrollo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Folio</th>
                    <th className="px-4 py-3 font-medium">Unidad</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 text-right font-medium">Monto Apartado</th>
                    <th className="px-4 py-3 text-right font-medium">Precio Congelado</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 font-medium">Prórrogas</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Operaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {apartados.map((apt) => {
                    const venceDate = new Date(apt.fecha_vencimiento);
                    const horasRestantes = Math.round(
                      (venceDate.getTime() - Date.now()) / (3600 * 1000)
                    );

                    return (
                      <tr key={apt.id} className="hover:bg-neutral-50/80">
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-900">
                          {apt.folio_apartado}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                            {apt.unidad_clave_comercial}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">{apt.cliente_nombre}</div>
                          {apt.cliente_telefono && (
                            <div className="text-[11px] text-neutral-500">
                              {apt.cliente_telefono}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">
                          {formatearMoneda(apt.monto_apartado, apt.moneda)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-700">
                          {formatearMoneda(apt.precio_congelado_unidad, apt.moneda)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-neutral-800">
                            {venceDate.toLocaleString("es-MX", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </div>
                          {apt.estado_apartado === "activo" && (
                            <span
                              className={cn(
                                "text-[11px] font-medium",
                                horasRestantes <= 12 ? "text-red-600" : "text-amber-700"
                              )}
                            >
                              {horasRestantes > 0
                                ? `Restan ${horasRestantes}h`
                                : "Por liberar (vencido)"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-neutral-800">
                            {apt.prorrogas_aplicadas}
                          </span>
                          {apt.justificacion_ultima_prorroga && (
                            <p
                              className="max-w-44 truncate text-[11px] text-neutral-500"
                              title={apt.justificacion_ultima_prorroga}
                            >
                              {apt.justificacion_ultima_prorroga}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              apt.estado_apartado === "activo" && "bg-amber-100 text-amber-800",
                              apt.estado_apartado === "convertido_venta" &&
                                "bg-emerald-100 text-emerald-800",
                              (apt.estado_apartado === "vencido_liberado" ||
                                apt.estado_apartado === "cancelado_manual") &&
                                "bg-neutral-200 text-neutral-700"
                            )}
                          >
                            {apt.estado_apartado.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {apt.estado_apartado === "activo" && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setApartadoEnProrroga(apt);
                                  setHorasProrrogaInput(48);
                                  setJustificacionProrrogaInput("");
                                }}
                                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
                              >
                                Prorrogar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setApartadoEnResolucion({ apartado: apt, accion: "liberar" });
                                  setMotivoResolucionInput("");
                                }}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                              >
                                Liberar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setApartadoEnResolucion({
                                    apartado: apt,
                                    accion: "convertir_venta",
                                  });
                                  setMotivoResolucionInput("");
                                }}
                                className="rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-800"
                              >
                                Formalizar Venta
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: CREAR APARTADO TRANSACCIONAL */}
      {modalApartadoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-semibold text-neutral-900">
                Apartar Unidad Inmobiliaria
              </h3>
              <button
                type="button"
                onClick={() => setModalApartadoAbierto(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700">
                  Unidad Disponible a Apartar *
                </label>
                <select
                  value={unidadParaApartarId}
                  onChange={(e) => setUnidadParaApartarId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900"
                >
                  {unidadesDesarrollo
                    .filter((u) => u.estado_disponibilidad === "disponible")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.clave_comercial} — {Number(u.superficie_m2).toFixed(2)} m² (
                        {formatearMoneda(
                          Number(u.precio_promocional ?? u.precio_lista),
                          monedaActiva
                        )}
                        )
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700">Nombre del Cliente *</label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700">
                    Monto de Apartado ({monedaActiva})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={montoApartadoInput}
                    onChange={(e) => setMontoApartadoInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700">Vigencia (Horas)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={horasVigenciaApartadoInput}
                    onChange={(e) => setHorasVigenciaApartadoInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalApartadoAbierto(false)}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoApartado}
                onClick={confirmarApartadoUnidad}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {procesandoApartado ? "Reservando..." : "Confirmar Apartado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRORROGAR APARTADO CON JUSTIFICACIÓN OBLIGATORIA */}
      {apartadoEnProrroga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">
              Prorrogar Apartado {apartadoEnProrroga.folio_apartado} (
              {apartadoEnProrroga.unidad_clave_comercial})
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Toda prórroga exige justificación obligatoria y queda registrada en la bitácora de la
              unidad (IRIS-DEC-012).
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700">
                  Horas adicionales de vigencia
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={horasProrrogaInput}
                  onChange={(e) => setHorasProrrogaInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700">
                  Justificación de la prórroga *
                </label>
                <textarea
                  rows={3}
                  value={justificacionProrrogaInput}
                  onChange={(e) => setJustificacionProrrogaInput(e.target.value)}
                  placeholder="Ej. Cliente en validación bancaria de transferencia SPEI..."
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApartadoEnProrroga(null)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoApartado}
                onClick={confirmarProrrogaApartado}
                className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Aplicar Prórroga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LIBERAR O FORMALIZAR VENTA */}
      {apartadoEnResolucion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">
              {apartadoEnResolucion.accion === "liberar"
                ? `Liberar Apartado ${apartadoEnResolucion.apartado.folio_apartado}`
                : `Formalizar Venta de Unidad ${apartadoEnResolucion.apartado.unidad_clave_comercial}`}
            </h3>

            <div className="mt-4 text-xs">
              <label className="block font-medium text-neutral-700">
                {apartadoEnResolucion.accion === "liberar"
                  ? "Motivo de liberación *"
                  : "Referencia de contrato / cierre de venta *"}
              </label>
              <textarea
                rows={3}
                value={motivoResolucionInput}
                onChange={(e) => setMotivoResolucionInput(e.target.value)}
                placeholder={
                  apartadoEnResolucion.accion === "liberar"
                    ? "Ej. Cliente desistió o cambió por lote de esquina..."
                    : "Ej. Contrato de promesa firmado y enganche inicial acreditado..."
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-xs"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApartadoEnResolucion(null)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoApartado}
                onClick={confirmarResolucionApartado}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-semibold text-white",
                  apartadoEnResolucion.accion === "liberar"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-700 hover:bg-emerald-800"
                )}
              >
                {apartadoEnResolucion.accion === "liberar"
                  ? "Confirmar Liberación"
                  : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
