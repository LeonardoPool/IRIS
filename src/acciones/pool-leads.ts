// ==============================================================================
// IRIS by WYLEN — ACCIONES DE SERVIDOR: POOL DE LEADS
// ==============================================================================

"use server";

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioPoolLeads } from "@/servicios/pool-leads";
import type { FiltrosPoolLeads } from "@/tipos/leads";

export async function accionListarPoolLeads(filtros: FiltrosPoolLeads = {}) {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const resultado = await servicioPoolLeads.listarPoolLeadsPaginado(
      contexto.organizacionId,
      filtros
    );

    return { exito: true, resultado };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al listar leads del pool." };
  }
}

export async function accionObtenerCategoriasLeads() {
  try {
    const contexto = await obtenerContextoInquilino();
    if (!contexto?.organizacionId) {
      return { exito: false, error: "No hay sesión activa." };
    }

    const categorias = await servicioPoolLeads.obtenerCategoriasDisponibles(
      contexto.organizacionId
    );

    return { exito: true, categorias };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al obtener categorías." };
  }
}
