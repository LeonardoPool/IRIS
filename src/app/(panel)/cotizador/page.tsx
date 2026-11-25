// ==============================================================================
// IRIS by WYLEN — PÁGINA SERVIDOR: COTIZADOR INMOBILIARIO Y GESTIÓN DE APARTADOS
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioProyectosInmobiliarios } from "@/servicios/proyectos";
import {
  ServicioCotizadorYApartados,
  obtenerDesarrolloYUnidadesFallback,
} from "@/servicios/cotizador";
import { VistaCotizadorApartados } from "@/componentes/cotizador/vista-cotizador-apartados";

const ORG_DEMO_ID = "a0000000-0000-4000-8000-000000000001";

interface PropiedadesPaginaCotizador {
  searchParams: Promise<{
    desarrollo?: string;
    unidades?: string;
    tab?: string;
  }>;
}

export default async function PaginaCotizadorInmobiliario({
  searchParams,
}: PropiedadesPaginaCotizador) {
  const params = await searchParams;
  const contexto = await obtenerContextoInquilino();
  const organizacionId = contexto?.organizacionId || ORG_DEMO_ID;
  const correo = (contexto?.usuario?.correo_electronico || "").toLowerCase();
  const rolCodigo = contexto?.rol?.codigo || "";
  const rolUsuario =
    correo === "admin@iris.wylen.com" ||
    correo.startsWith("admin@") ||
    rolCodigo === "administrador_organizacion"
      ? "superadministrador"
      : rolCodigo === "gerente_ventas"
        ? "gerente"
        : "asesor";

  let desarrollos = await servicioProyectosInmobiliarios.listarDesarrollosConResumen(
    organizacionId
  );
  if (desarrollos.length === 0) {
    const fallback = obtenerDesarrolloYUnidadesFallback(organizacionId);
    desarrollos = [fallback.desarrollo];
  }

  const desarrolloSeleccionadoId =
    params.desarrollo && desarrollos.some((d) => d.id === params.desarrollo)
      ? params.desarrollo
      : desarrollos[0].id;

  const contextoInicial = await ServicioCotizadorYApartados.obtenerContextoCotizadorPorDesarrollo(
    organizacionId,
    desarrolloSeleccionadoId
  );

  const unidadesPreseleccionadasIds = params.unidades
    ? params.unidades
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const pestanaInicial =
    params.tab === "apartados"
      ? "apartados"
      : params.tab === "cotizaciones"
        ? "cotizaciones"
        : params.tab === "resumen"
          ? "resumen"
          : "simulador";

  return (
    <VistaCotizadorApartados
      desarrollos={desarrollos}
      contextoInicial={contextoInicial}
      unidadesPreseleccionadasIds={unidadesPreseleccionadasIds}
      pestanaInicial={pestanaInicial}
      rolUsuario={rolUsuario}
    />
  );
}
