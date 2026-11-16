// ==============================================================================
// IRIS by WYLEN — SERVICIO DE RECURSOS DIGITALES Y RESPUESTAS RÁPIDAS
// ==============================================================================

import type { RespuestaRapida, ArchivoDigital } from "@/tipos/recursos";

export class ServicioRecursos {
  private static respuestasMemoria: Record<string, RespuestaRapida[]> = {};
  private static archivosMemoria: Record<string, ArchivoDigital[]> = {};

  private obtenerDatosBaseRespuestas(organizacionId: string): RespuestaRapida[] {
    return [
      {
        id: "rr-1",
        organizacion_id: organizacionId,
        titulo: "Saludo y Bienvenida Inmediata",
        atajo: "/bienvenida",
        categoria: "saludo",
        contenido:
          "¡Hola {{nombre_contacto}}! Bienvenido a {{empresa}}. Mi nombre es {{nombre_agente}}, es un placer atenderte. ¿En qué tipo de propiedad estás interesado el día de hoy?",
        contador_uso: 38,
        fecha_creacion: new Date(Date.now() - 86400000 * 5).toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      },
      {
        id: "rr-2",
        organizacion_id: organizacionId,
        titulo: "Envío de Ficha Técnica Residencial",
        atajo: "/ficha",
        categoria: "propiedad",
        contenido:
          "Estimado/a {{nombre_contacto}}, te comparto la ficha técnica de Residencial Riviera: cuenta con 3 recámaras, acabados de mármol y amenidades exclusivas. ¿Te gustaría agendar una videollamada para revisar planos y opciones de financiamiento?",
        contador_uso: 64,
        fecha_creacion: new Date(Date.now() - 86400000 * 4).toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      },
      {
        id: "rr-3",
        organizacion_id: organizacionId,
        titulo: "Seguimiento tras Envío de Propuesta",
        atajo: "/seguimiento",
        categoria: "seguimiento",
        contenido:
          "Hola {{nombre_contacto}}, espero te encuentres muy bien. Quería dar seguimiento a la cotización que te enviamos ayer. ¿Tuviste oportunidad de revisarla o tienes alguna duda sobre las fechas de entrega?",
        contador_uso: 29,
        fecha_creacion: new Date(Date.now() - 86400000 * 3).toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      },
      {
        id: "rr-4",
        organizacion_id: organizacionId,
        titulo: "Confirmación de Reunión en Google Meet",
        atajo: "/meet",
        categoria: "cierre",
        contenido:
          "Perfecto {{nombre_contacto}}, te he agendado una cita por Google Meet para revisar los detalles del contrato. El enlace de la sesión te llegará por correo electrónico.",
        contador_uso: 15,
        fecha_creacion: new Date(Date.now() - 86400000 * 2).toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      },
    ];
  }

  private obtenerDatosBaseArchivos(organizacionId: string): ArchivoDigital[] {
    return [
      {
        id: "ad-1",
        organizacion_id: organizacionId,
        nombre: "Brochure Maestro - Residencial Riviera 2026.pdf",
        descripcion: "Catálogo completo con fotografías de renders, amenidades y planos arquitectónicos.",
        categoria: "Brochures y Catálogos",
        tipo_archivo: "pdf",
        tamano_bytes: 14850000,
        url_descarga: "https://ejemplo.wylen.io/archivos/brochure-riviera-2026.pdf",
        es_publico: true,
        contador_descargas: 142,
        fecha_creacion: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: "ad-2",
        organizacion_id: organizacionId,
        nombre: "Lista de Precios y Disponibilidad - Noviembre 2026.xlsx",
        descripcion: "Precios de lista, esquemas de enganche diferido y descuentos por pago de contado.",
        categoria: "Precios y Cotizadores",
        tipo_archivo: "hoja_calculo",
        tamano_bytes: 420000,
        url_descarga: "https://ejemplo.wylen.io/archivos/precios-nov-2026.xlsx",
        es_publico: false,
        contador_descargas: 89,
        fecha_creacion: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "ad-3",
        organizacion_id: organizacionId,
        nombre: "Master Plan y Ubicación Satelital.pdf",
        descripcion: "Plano de zonificación, accesos viales y cercanía a centros comerciales y playas.",
        categoria: "Planos y Renders",
        tipo_archivo: "pdf",
        tamano_bytes: 5200000,
        url_descarga: "https://ejemplo.wylen.io/archivos/master-plan-riviera.pdf",
        es_publico: true,
        contador_descargas: 76,
        fecha_creacion: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: "ad-4",
        organizacion_id: organizacionId,
        nombre: "Contrato Tipo de Promesa de Compraventa.pdf",
        descripcion: "Plantilla legal marco para revisión de clientes antes de la firma en DocuSign.",
        categoria: "Legal y Contratos",
        tipo_archivo: "documento",
        tamano_bytes: 850000,
        url_descarga: "https://ejemplo.wylen.io/archivos/contrato-promesa-tipo.pdf",
        es_publico: false,
        contador_descargas: 34,
        fecha_creacion: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ];
  }

  async listarRespuestasRapidas(organizacionId: string): Promise<RespuestaRapida[]> {
    if (!ServicioRecursos.respuestasMemoria[organizacionId]) {
      ServicioRecursos.respuestasMemoria[organizacionId] = this.obtenerDatosBaseRespuestas(organizacionId);
    }
    return ServicioRecursos.respuestasMemoria[organizacionId];
  }

  async crearRespuestaRapida(
    organizacionId: string,
    datos: { titulo: string; atajo: string; categoria: any; contenido: string }
  ): Promise<RespuestaRapida> {
    const nueva: RespuestaRapida = {
      id: `rr-${Date.now()}`,
      organizacion_id: organizacionId,
      titulo: datos.titulo,
      atajo: datos.atajo.startsWith("/") ? datos.atajo : `/${datos.atajo}`,
      categoria: datos.categoria,
      contenido: datos.contenido,
      contador_uso: 0,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    };

    if (!ServicioRecursos.respuestasMemoria[organizacionId]) {
      ServicioRecursos.respuestasMemoria[organizacionId] = this.obtenerDatosBaseRespuestas(organizacionId);
    }

    ServicioRecursos.respuestasMemoria[organizacionId].unshift(nueva);
    return nueva;
  }

  async eliminarRespuestaRapida(organizacionId: string, id: string): Promise<void> {
    if (ServicioRecursos.respuestasMemoria[organizacionId]) {
      ServicioRecursos.respuestasMemoria[organizacionId] = ServicioRecursos.respuestasMemoria[
        organizacionId
      ].filter((r) => r.id !== id);
    }
  }

  async listarArchivosDigitales(organizacionId: string): Promise<ArchivoDigital[]> {
    if (!ServicioRecursos.archivosMemoria[organizacionId]) {
      ServicioRecursos.archivosMemoria[organizacionId] = this.obtenerDatosBaseArchivos(organizacionId);
    }
    return ServicioRecursos.archivosMemoria[organizacionId];
  }
}
