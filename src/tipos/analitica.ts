// ==============================================================================
// IRIS by WYLEN — TIPOS DEL MÓDULO DE ANALÍTICA Y REPORTES
// ==============================================================================

export interface MetricasEmbudoConversion {
  etapa: string;
  total: number;
  porcentaje: number;
  valorMonetario?: number;
}

export interface RendimientoAgenteComercial {
  agenteId: string;
  nombre: string;
  avatarUrl?: string | null;
  prospectosAsignados: number;
  reunionesRealizadas: number;
  contratosCerrados: number;
  cumplimientoSlaPorcentaje: number;
  montoVentasCerradas: number;
}

export interface DistribucionCanalAtribucion {
  canal: string;
  totalLeads: number;
  porcentaje: number;
  tasaConversion: number;
}

export interface ReporteAnaliticaComercial {
  periodo: string;
  totalProspectos: number;
  totalContratosFirmados: number;
  volumenVentasTotal: number;
  tiempoPromedioRespuestaMinutos: number;
  cumplimientoSlaGlobal: number;
  embudo: MetricasEmbudoConversion[];
  rendimientoAgentes: RendimientoAgenteComercial[];
  canalesAtribucion: DistribucionCanalAtribucion[];
}
