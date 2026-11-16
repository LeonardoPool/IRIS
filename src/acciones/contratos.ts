// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR PARA CONTRATOS
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { ServicioContratos } from "@/servicios/contratos";

const servicioContratos = new ServicioContratos();

export async function accionCrearContrato(datos: {
  titulo: string;
  tipo_contrato: any;
  cliente_nombre: string;
  cliente_correo: string;
  agente_cierre: string;
  monto_total: number;
}) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const contrato = await servicioContratos.crearContrato(contexto.organizacionId, datos);
  revalidatePath("/contratos");
  return { exito: true, contrato };
}

export async function accionEnviarDocuSign(contratoId: string) {
  const contexto = await obtenerContextoInquilino();
  if (!contexto) throw new Error("No autenticado");

  const contrato = await servicioContratos.enviarSobreDocuSign(contexto.organizacionId, contratoId);
  revalidatePath("/contratos");
  return { exito: true, contrato };
}
