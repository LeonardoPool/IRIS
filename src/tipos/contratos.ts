// ==============================================================================
// IRIS by WYLEN — TIPOS DEL MÓDULO DE CONTRATOS (DOCUSIGN ESIGN)
// ==============================================================================

export type TipoContrato =
  | "promesa_compraventa"
  | "arrendamiento_residencial"
  | "comision_mercantil"
  | "adendum_modificatorio";

export type EstadoContrato = "borrador" | "enviado_firma" | "firmado" | "declinado" | "vencido";

export interface FirmanteContrato {
  nombre: string;
  correo: string;
  rol: "comprador" | "vendedor" | "testigo" | "apoderado";
  estado_firma: "pendiente" | "completado" | "declinado";
  fecha_firma?: string | null;
}

export interface Contrato {
  id: string;
  organizacion_id: string;
  folio: string;
  titulo: string;
  tipo_contrato: TipoContrato;
  cliente_nombre: string;
  cliente_correo: string;
  agente_cierre: string;
  monto_total: number;
  moneda: string;
  estado: EstadoContrato;
  docusign_envelope_id?: string | null;
  url_documento?: string;
  firmantes: FirmanteContrato[];
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_finalizacion?: string | null;
}
