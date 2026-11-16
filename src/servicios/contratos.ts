// ==============================================================================
// IRIS by WYLEN — SERVICIO DE CONTRATOS Y DOCUSIGN ESIGNATURE
// ==============================================================================

import type { Contrato } from "@/tipos/contratos";

export class ServicioContratos {
  private static contratosMemoria: Record<string, Contrato[]> = {};

  private obtenerDatosBase(organizacionId: string): Contrato[] {
    return [
      {
        id: "ctr-101",
        organizacion_id: organizacionId,
        folio: "CTR-2026-0042",
        titulo: "Promesa de Compraventa — Depto 402 Riviera",
        tipo_contrato: "promesa_compraventa",
        cliente_nombre: "Valeria Domínguez Solís",
        cliente_correo: "valeria.dominguez@ejemplo.com",
        agente_cierre: "Leonardo Pool",
        monto_total: 4850000,
        moneda: "MXN",
        estado: "firmado",
        docusign_envelope_id: "ds-env-9a8b7c6d-5e4f-3a2b",
        url_documento: "https://ejemplo.wylen.io/contratos/ctr-2026-0042-firmado.pdf",
        firmantes: [
          {
            nombre: "Valeria Domínguez Solís",
            correo: "valeria.dominguez@ejemplo.com",
            rol: "comprador",
            estado_firma: "completado",
            fecha_firma: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            nombre: "Rodrigo Morales Alcocer",
            correo: "rodrigo.morales@horizonte.wylen.io",
            rol: "apoderado",
            estado_firma: "completado",
            fecha_firma: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
          },
        ],
        fecha_emision: new Date(Date.now() - 86400000 * 5).toISOString(),
        fecha_vencimiento: new Date(Date.now() + 86400000 * 10).toISOString(),
        fecha_finalizacion: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "ctr-102",
        organizacion_id: organizacionId,
        folio: "CTR-2026-0043",
        titulo: "Promesa de Compraventa — Penthouse 801 Riviera",
        tipo_contrato: "promesa_compraventa",
        cliente_nombre: "Alejandro Garza Tamez",
        cliente_correo: "agarza@grupoindustrial.mx",
        agente_cierre: "Mariana Cantú",
        monto_total: 8200000,
        moneda: "MXN",
        estado: "enviado_firma",
        docusign_envelope_id: "ds-env-11223344-5566-7788",
        url_documento: "https://ejemplo.wylen.io/contratos/ctr-2026-0043-enviado.pdf",
        firmantes: [
          {
            nombre: "Alejandro Garza Tamez",
            correo: "agarza@grupoindustrial.mx",
            rol: "comprador",
            estado_firma: "pendiente",
          },
          {
            nombre: "Rodrigo Morales Alcocer",
            correo: "rodrigo.morales@horizonte.wylen.io",
            rol: "apoderado",
            estado_firma: "pendiente",
          },
        ],
        fecha_emision: new Date(Date.now() - 86400000 * 1).toISOString(),
        fecha_vencimiento: new Date(Date.now() + 86400000 * 6).toISOString(),
      },
      {
        id: "ctr-103",
        organizacion_id: organizacionId,
        folio: "CTR-2026-0044",
        titulo: "Contrato de Arrendamiento Comercial — Local 12",
        tipo_contrato: "arrendamiento_residencial",
        cliente_nombre: "Café de Especialidad Caribe S.A. de C.V.",
        cliente_correo: "finanzas@cafecaribe.mx",
        agente_cierre: "Leonardo Pool",
        monto_total: 780000,
        moneda: "MXN",
        estado: "borrador",
        firmantes: [
          {
            nombre: "Mariana Ochoa Ramos",
            correo: "finanzas@cafecaribe.mx",
            rol: "comprador",
            estado_firma: "pendiente",
          },
        ],
        fecha_emision: new Date().toISOString(),
        fecha_vencimiento: new Date(Date.now() + 86400000 * 14).toISOString(),
      },
    ];
  }

  async listarContratos(organizacionId: string): Promise<Contrato[]> {
    if (!ServicioContratos.contratosMemoria[organizacionId]) {
      ServicioContratos.contratosMemoria[organizacionId] = this.obtenerDatosBase(organizacionId);
    }
    return ServicioContratos.contratosMemoria[organizacionId];
  }

  async crearContrato(
    organizacionId: string,
    datos: {
      titulo: string;
      tipo_contrato: any;
      cliente_nombre: string;
      cliente_correo: string;
      agente_cierre: string;
      monto_total: number;
    }
  ): Promise<Contrato> {
    const consecutivo = Math.floor(Math.random() * 900) + 100;
    const nuevo: Contrato = {
      id: `ctr-${Date.now()}`,
      organizacion_id: organizacionId,
      folio: `CTR-2026-${consecutivo}`,
      titulo: datos.titulo,
      tipo_contrato: datos.tipo_contrato,
      cliente_nombre: datos.cliente_nombre,
      cliente_correo: datos.cliente_correo,
      agente_cierre: datos.agente_cierre,
      monto_total: datos.monto_total,
      moneda: "MXN",
      estado: "borrador",
      firmantes: [
        {
          nombre: datos.cliente_nombre,
          correo: datos.cliente_correo,
          rol: "comprador",
          estado_firma: "pendiente",
        },
      ],
      fecha_emision: new Date().toISOString(),
      fecha_vencimiento: new Date(Date.now() + 86400000 * 15).toISOString(),
    };

    if (!ServicioContratos.contratosMemoria[organizacionId]) {
      ServicioContratos.contratosMemoria[organizacionId] = this.obtenerDatosBase(organizacionId);
    }

    ServicioContratos.contratosMemoria[organizacionId].unshift(nuevo);
    return nuevo;
  }

  async enviarSobreDocuSign(organizacionId: string, contratoId: string): Promise<Contrato> {
    const lista = await this.listarContratos(organizacionId);
    const contrato = lista.find((c) => c.id === contratoId);
    if (!contrato) throw new Error("Contrato no encontrado");

    contrato.estado = "enviado_firma";
    contrato.docusign_envelope_id = `ds-env-${Date.now()}`;
    contrato.firmantes.forEach((f) => (f.estado_firma = "pendiente"));

    return contrato;
  }
}
