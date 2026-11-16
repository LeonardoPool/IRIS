// ==============================================================================
// IRIS by WYLEN — FRONTERA DE INTEGRACIÓN CON WYLEN CORE
// ==============================================================================
// Autoridad central para licencias, planes, tenants globales y módulos habilitados
// ==============================================================================

export interface LicenciaOrganizacionWylen {
  organizacionId: string;
  planId: "comercial_base" | "comercial_pro" | "comercial_enterprise";
  estadoSuscripcion: "activo" | "prueba" | "pago_pendiente" | "cancelado";
  fechaVencimiento: string;
  limiteUsuarios: number;
  modulosHabilitados: {
    crm_core: boolean;
    omnicanal_whatsapp: boolean;
    contratos_docusign: boolean;
    ia_nara: boolean;
    automatizacion_sena: boolean;
    analitica_avanzada: boolean;
  };
}

/**
 * Cliente de integración desacoplado con la autoridad central WYLEN CORE.
 * Valida autorizaciones del ecosistema, suscripciones y módulos contratados.
 */
export class ClienteWylenCore {
  private readonly urlBase: string;
  private readonly clavePublica: string | undefined;

  constructor() {
    this.urlBase = process.env.WYLEN_CORE_API_URL || "https://core.wylen.io/api/v1";
    this.clavePublica = process.env.WYLEN_CORE_PUBLIC_KEY;
  }

  /**
   * Consulta las licencias y módulos contratados para la organización dada.
   */
  async obtenerLicenciaOrganizacion(organizacionId: string): Promise<LicenciaOrganizacionWylen> {
    // Si aún no está conectado el endpoint de WYLEN CORE, se retorna el contrato estándar de desarrollo
    if (!process.env.WYLEN_CORE_API_URL || process.env.WYLEN_CORE_API_URL.includes("localhost")) {
      return {
        organizacionId,
        planId: "comercial_enterprise",
        estadoSuscripcion: "activo",
        fechaVencimiento: "2027-12-31T23:59:59Z",
        limiteUsuarios: 50,
        modulosHabilitados: {
          crm_core: true,
          omnicanal_whatsapp: true,
          contratos_docusign: true,
          ia_nara: true,
          automatizacion_sena: true,
          analitica_avanzada: true,
        },
      };
    }

    try {
      const respuesta = await fetch(`${this.urlBase}/organizaciones/${organizacionId}/licencia`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WYLEN_CORE_API_KEY || ""}`,
        },
        next: { revalidate: 3600 }, // Cache de 1 hora
      });

      if (!respuesta.ok) {
        throw new Error(`WYLEN CORE respondió con estado ${respuesta.status}`);
      }

      return (await respuesta.json()) as LicenciaOrganizacionWylen;
    } catch (error) {
      console.warn("[WYLEN CORE] Advertencia al consultar licencia:", error);
      // Degradar de forma segura al plan base operativo
      return {
        organizacionId,
        planId: "comercial_base",
        estadoSuscripcion: "activo",
        fechaVencimiento: new Date(Date.now() + 86400000 * 30).toISOString(),
        limiteUsuarios: 10,
        modulosHabilitados: {
          crm_core: true,
          omnicanal_whatsapp: true,
          contratos_docusign: false,
          ia_nara: false,
          automatizacion_sena: false,
          analitica_avanzada: false,
        },
      };
    }
  }

  /**
   * Comprueba si un módulo específico está habilitado por suscripción en WYLEN CORE.
   */
  async verificarModuloHabilitado(
    organizacionId: string,
    modulo: keyof LicenciaOrganizacionWylen["modulosHabilitados"]
  ): Promise<boolean> {
    const licencia = await this.obtenerLicenciaOrganizacion(organizacionId);
    return Boolean(licencia.modulosHabilitados[modulo]);
  }
}

export const clienteWylenCore = new ClienteWylenCore();
