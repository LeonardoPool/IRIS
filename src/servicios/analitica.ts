// ==============================================================================
// IRIS by WYLEN — SERVICIO DE ANALÍTICA Y REPORTES COMERCIALES
// ==============================================================================

import type { ReporteAnaliticaComercial } from "@/tipos/analitica";

export class ServicioAnalitica {
  async obtenerReporteGeneral(organizacionId: string, periodo: string = "30d"): Promise<ReporteAnaliticaComercial> {
    return {
      periodo,
      totalProspectos: 284,
      totalContratosFirmados: 18,
      volumenVentasTotal: 84650000,
      tiempoPromedioRespuestaMinutos: 4.8,
      cumplimientoSlaGlobal: 96.4,
      embudo: [
        { etapa: "1. Captación de Leads", total: 284, porcentaje: 100 },
        { etapa: "2. Contacto Calificado", total: 198, porcentaje: 69.7 },
        { etapa: "3. Reunión Realizada (Meet/Presencial)", total: 112, porcentaje: 39.4 },
        { etapa: "4. Propuesta Comercial", total: 64, porcentaje: 22.5 },
        { etapa: "5. Firma de Contrato (DocuSign)", total: 18, porcentaje: 6.3, valorMonetario: 84650000 },
      ],
      rendimientoAgentes: [
        {
          agenteId: "ag-1",
          nombre: "Leonardo Pool",
          prospectosAsignados: 110,
          reunionesRealizadas: 48,
          contratosCerrados: 8,
          cumplimientoSlaPorcentaje: 98.2,
          montoVentasCerradas: 38500000,
        },
        {
          agenteId: "ag-2",
          nombre: "Mariana Cantú",
          prospectosAsignados: 94,
          reunionesRealizadas: 40,
          contratosCerrados: 6,
          cumplimientoSlaPorcentaje: 95.8,
          montoVentasCerradas: 28200000,
        },
        {
          agenteId: "ag-3",
          nombre: "Rodrigo Morales",
          prospectosAsignados: 80,
          reunionesRealizadas: 24,
          contratosCerrados: 4,
          cumplimientoSlaPorcentaje: 94.1,
          montoVentasCerradas: 17950000,
        },
      ],
      canalesAtribucion: [
        { canal: "Meta Ads (Facebook & IG)", totalLeads: 136, porcentaje: 47.8, tasaConversion: 7.3 },
        { canal: "WhatsApp Business Directo", totalLeads: 74, porcentaje: 26.0, tasaConversion: 8.1 },
        { canal: "Formulario Web Institucional", totalLeads: 52, porcentaje: 18.3, tasaConversion: 5.8 },
        { canal: "Recomendados y Referidos", totalLeads: 22, porcentaje: 7.9, tasaConversion: 18.2 },
      ],
    };
  }
}
