// ==============================================================================
// IRIS by WYLEN — PÁGINA SERVIDOR: DESARROLLOS, INVENTARIO Y PLANOS SVG (/desarrollos)
// ==============================================================================

import { obtenerContextoInquilino } from "@/librerias/seguridad/contexto-inquilino";
import { servicioProyectosInmobiliarios, calcularResumenInventario } from "@/servicios/proyectos";
import { VistaProyectos } from "@/componentes/proyectos/vista-proyectos";
import type {
  Desarrolladora,
  DesarrolloInmobiliario,
  EtapaDesarrollo,
  ManzanaDesarrollo,
  UnidadInmobiliaria,
} from "@/tipos/proyectos";

function construirDatosSemillaFallback(organizacionId: string): {
  desarrolladoras: Desarrolladora[];
  desarrollos: DesarrolloInmobiliario[];
  etapas: EtapaDesarrollo[];
  manzanas: ManzanaDesarrollo[];
  unidades: UnidadInmobiliaria[];
} {
  const ahora = new Date().toISOString();
  const desarrolladora: Desarrolladora = {
    id: "d0100000-0000-0000-0000-000000000001",
    organizacion_id: organizacionId,
    nombre: "INDOMO Desarrollos",
    razon_social: "INDOMO Desarrollos Patrimoniales S.A. de C.V.",
    identificador_fiscal: "IDP230510YUC",
    logo_url: null,
    color_marca: "#111827",
    sitio_web: "https://indomo.mx",
    descripcion: "Desarrolladora inmobiliaria especializada en lotes campestres y residenciales.",
    estado: "activo",
    creado_por_id: null,
    fecha_creacion: ahora,
    fecha_actualizacion: ahora,
  };

  const devId = "d0200000-0000-0000-0000-000000000001";
  const etapaId = "e0100000-0000-0000-0000-000000000001";
  const mzaAId = "m0100000-0000-0000-0000-000000000001";
  const mzaBId = "m0200000-0000-0000-0000-000000000002";

  const etapas: EtapaDesarrollo[] = [
    {
      id: etapaId,
      organizacion_id: organizacionId,
      desarrollo_id: devId,
      nombre: "Etapa 1 — Lanzamiento Fundadores",
      codigo: "ETAPA-1",
      orden: 1,
      fecha_entrega_estimada: "2027-12-15",
      precio_m2_base: 1100,
      estado: "activa",
      fecha_creacion: ahora,
      fecha_actualizacion: ahora,
    },
  ];

  const manzanas: ManzanaDesarrollo[] = [
    {
      id: mzaAId,
      organizacion_id: organizacionId,
      desarrollo_id: devId,
      etapa_id: etapaId,
      nombre: "Manzana A (Acceso Principal)",
      codigo: "MZA-A",
      orden: 1,
      fecha_creacion: ahora,
    },
    {
      id: mzaBId,
      organizacion_id: organizacionId,
      desarrollo_id: devId,
      etapa_id: etapaId,
      nombre: "Manzana B (Parque Central)",
      codigo: "MZA-B",
      orden: 2,
      fecha_creacion: ahora,
    },
  ];

  const lotesSemilla: Array<{
    id: string;
    clave: string;
    mzaId: string;
    mzaCodigo: string;
    sup: number;
    precio: number;
    promo: number | null;
    estado: "disponible" | "apartado" | "vendido" | "bloqueado";
  }> = [
    { id: "u0100000-0000-0000-0000-000000000001", clave: "SOL-A01", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 350, precio: 420000, promo: 399000, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000002", clave: "SOL-A02", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 350, precio: 385000, promo: null, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000003", clave: "SOL-A03", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 350, precio: 385000, promo: null, estado: "apartado" },
    { id: "u0100000-0000-0000-0000-000000000004", clave: "SOL-A04", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 350, precio: 385000, promo: null, estado: "vendido" },
    { id: "u0100000-0000-0000-0000-000000000005", clave: "SOL-A05", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 350, precio: 385000, promo: null, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000006", clave: "SOL-A06", mzaId: mzaAId, mzaCodigo: "MZA-A", sup: 385, precio: 462000, promo: 438900, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000007", clave: "SOL-B01", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 350, precio: 437500, promo: 415000, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000008", clave: "SOL-B02", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 350, precio: 413000, promo: null, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000009", clave: "SOL-B03", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 350, precio: 413000, promo: null, estado: "apartado" },
    { id: "u0100000-0000-0000-0000-000000000010", clave: "SOL-B04", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 350, precio: 413000, promo: null, estado: "disponible" },
    { id: "u0100000-0000-0000-0000-000000000011", clave: "SOL-B05", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 350, precio: 413000, promo: null, estado: "bloqueado" },
    { id: "u0100000-0000-0000-0000-000000000012", clave: "SOL-B06", mzaId: mzaBId, mzaCodigo: "MZA-B", sup: 400, precio: 500000, promo: 475000, estado: "disponible" },
  ];

  const unidades: UnidadInmobiliaria[] = lotesSemilla.map((l) => ({
    id: l.id,
    organizacion_id: organizacionId,
    desarrollo_id: devId,
    etapa_id: etapaId,
    manzana_id: l.mzaId,
    clave_comercial: l.clave,
    numero_lote_unidad: l.clave.replace("SOL-", ""),
    identificador_plano_svg: l.clave,
    tipo_unidad: "lote",
    superficie_m2: l.sup,
    frente_m: 10,
    fondo_m: 35,
    orientacion: "Norte-Sur",
    precio_m2: Math.round((l.precio / l.sup) * 100) / 100,
    precio_lista: l.precio,
    precio_promocional: l.promo,
    moneda: "MXN",
    estado_disponibilidad: l.estado,
    asesor_apartado_id: null,
    prospecto_actual_id: null,
    oportunidad_actual_id: null,
    apartado_en: null,
    apartado_vence_en: null,
    vendido_en: null,
    caracteristicas: {},
    documentos_urls: [],
    notas_inventario: null,
    version_registro: 1,
    creado_por_id: null,
    actualizado_por_id: null,
    fecha_creacion: ahora,
    fecha_actualizacion: ahora,
    etapa: { id: etapaId, nombre: "Etapa 1 — Lanzamiento Fundadores", codigo: "ETAPA-1" },
    manzana: { id: l.mzaId, nombre: l.mzaCodigo, codigo: l.mzaCodigo },
  }));

  const desarrollo: DesarrolloInmobiliario = {
    id: devId,
    organizacion_id: organizacionId,
    desarrolladora_id: desarrolladora.id,
    nombre: "SOLHÁ - Lotes Campestres",
    slug: "solha-lotes-campestres",
    tipo_desarrollo: "lotes_campestres",
    descripcion:
      "Proyecto campestre de 167 lotes con dimensiones promedio de 10 × 35 m (350 m²), orientación Norte-Sur, acceso directo a pie de carretera pavimentada y propiedad privada escriturable en Yucatán.",
    ubicacion_texto: "A 25 min del Periférico de Mérida, Yucatán",
    estado_provincia: "Yucatán",
    municipio_ciudad: "Mérida / Conkal",
    direccion: "Carretera Estatal Mérida - Costa Esmeralda Km 18.5",
    latitud: 21.0845,
    longitud: -89.5123,
    moneda: "MXN",
    precio_desde: 385000,
    superficie_total_hectareas: 12.4,
    amenidades: ["Acceso a pie de carretera", "Áreas verdes endémicas (40%)", "Orientación Norte-Sur"],
    portada_url: null,
    galeria_urls: [],
    configuracion_comercial: {},
    estado_publicacion: "activo",
    creado_por_id: null,
    actualizado_por_id: null,
    fecha_creacion: ahora,
    fecha_actualizacion: ahora,
    desarrolladora,
    resumen_inventario: calcularResumenInventario(unidades),
  };

  return {
    desarrolladoras: [desarrolladora],
    desarrollos: [desarrollo],
    etapas,
    manzanas,
    unidades,
  };
}

export default async function PaginaDesarrollosInmobiliarios() {
  const contexto = await obtenerContextoInquilino();
  const organizacionId = contexto?.organizacionId || "11111111-1111-1111-1111-111111111111";

  const correo = (contexto?.usuario?.correo_electronico || "").toLowerCase();
  const rolCodigo = contexto?.rol?.codigo || "";
  const puedeAdministrar =
    correo === "admin@iris.wylen.com" ||
    correo.startsWith("admin@") ||
    rolCodigo === "administrador_organizacion" ||
    rolCodigo === "super_admin" ||
    rolCodigo === "admin_organizacion" ||
    rolCodigo === "gerente_ventas" ||
    Boolean(contexto?.permisos?.includes("organizacion:administrar"));

  const [desarrolladorasBD, desarrollosBD] = await Promise.all([
    servicioProyectosInmobiliarios.listarDesarrolladoras(organizacionId),
    servicioProyectosInmobiliarios.listarDesarrollosConResumen(organizacionId),
  ]);

  const svgDemoFallback = servicioProyectosInmobiliarios.obtenerSvgDemoSolha();

  if (desarrollosBD.length > 0) {
    const estructura = await servicioProyectosInmobiliarios.obtenerEstructuraJerarquicaDesarrollo(
      organizacionId,
      desarrollosBD[0].id
    );

    return (
      <VistaProyectos
        desarrolladorasIniciales={desarrolladorasBD}
        desarrollosIniciales={desarrollosBD}
        estructuraInicial={estructura}
        svgDemoFallback={svgDemoFallback}
        puedeAdministrar={puedeAdministrar}
      />
    );
  }

  const semilla = construirDatosSemillaFallback(organizacionId);

  return (
    <VistaProyectos
      desarrolladorasIniciales={semilla.desarrolladoras}
      desarrollosIniciales={semilla.desarrollos}
      estructuraInicial={{
        desarrollo: semilla.desarrollos[0],
        etapas: semilla.etapas,
        manzanas: semilla.manzanas,
        unidades: semilla.unidades,
        planos: [],
        vinculosPlanoActivo: [],
      }}
      svgDemoFallback={svgDemoFallback}
      puedeAdministrar={puedeAdministrar}
    />
  );
}
