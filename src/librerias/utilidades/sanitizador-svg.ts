// ==============================================================================
// IRIS by WYLEN — SANITIZADOR Y ANALIZADOR DE PLANOS INTERACTIVOS SVG
// ==============================================================================
// Decisiones implementadas: IRIS-DEC-013
// 1. Elimina cualquier vector XSS (<script>, <foreignObject>, <iframe>, eventos on*, javascript:)
// 2. Extrae o normaliza viewBox para zoom y paneo fluidos
// 3. Detecta polígonos/rectángulos/paths con id o data-unit-id
// 4. Inyecta data-iris-svg-id determinista a figuras sin identificador para asociación manual
// 5. Detecta identificadores duplicados dentro del propio archivo SVG
// ==============================================================================

import type { DiagnosticoIntegridadPlanoSVG, FiguraDetectadaSVG } from "@/tipos/proyectos";

const ETIQUETAS_PELIGROSAS_REGEX =
  /<\s*(script|foreignObject|iframe|object|embed|applet|meta|link|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|foreignObject|iframe|object|embed|applet|meta|link|base)\b[^>]*\/?\s*>/gi;

const ATRIBUTOS_EVENTOS_O_JS_REGEX =
  /\s+(on[a-z]+| href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const ETIQUETAS_FIGURAS_REGEX =
  /<\s*(rect|polygon|path|polyline|circle)\b([^>]*?)(\/?)>/gi;

/**
 * Extrae el valor de un atributo XML/SVG dado el bloque de atributos
 */
function extraerAtributo(atributosTexto: string, nombreAtributo: string): string | undefined {
  const regex = new RegExp(`\\b${nombreAtributo}\\s*=\\s*(?:"([^"]+)"|'([^']+)')`, "i");
  const match = atributosTexto.match(regex);
  return match ? (match[1] ?? match[2])?.trim() : undefined;
}

/**
 * Sanitiza un archivo SVG de cualquier procedencia (Illustrator, AutoCAD, Figma, Inkscape)
 * y extrae el inventario de figuras geométricas asociables con unidades inmobiliarias.
 */
export function sanitizarYAnalizarPlanoSVG(contenidoCrudo: string): DiagnosticoIntegridadPlanoSVG {
  const elementosAmenazasEliminados: string[] = [];

  if (!contenidoCrudo || !contenidoCrudo.includes("<svg")) {
    throw new Error("El archivo proporcionado no contiene una estructura <svg> válida.");
  }

  // 1. Eliminar etiquetas ejecutables o externas peligrosas
  let limpio = contenidoCrudo.replace(ETIQUETAS_PELIGROSAS_REGEX, (match) => {
    const tag = match.match(/<\s*([a-zA-Z0-9]+)/)?.[1] || "tag";
    elementosAmenazasEliminados.push(`<${tag}>`);
    return "";
  });

  // 2. Eliminar atributos de eventos inline (onclick, onload, onerror...) y URIs javascript: / data:text/html
  limpio = limpio.replace(ATRIBUTOS_EVENTOS_O_JS_REGEX, (match, nombreAttr, valDoble, valSimple) => {
    const attrLower = String(nombreAttr).trim().toLowerCase();
    const valor = String(valDoble ?? valSimple ?? "").trim().toLowerCase();

    if (attrLower.startsWith("on")) {
      elementosAmenazasEliminados.push(attrLower);
      return "";
    }
    if (valor.startsWith("javascript:") || valor.startsWith("data:text/html") || valor.startsWith("vbscript:")) {
      elementosAmenazasEliminados.push(`${attrLower}=javascript:...`);
      return "";
    }
    return match;
  });

  // 3. Resolver o normalizar el viewBox del <svg> raíz
  const svgTagMatch = limpio.match(/<\s*svg\b([^>]*)>/i);
  const atributosSvgRaiz = svgTagMatch ? svgTagMatch[1] : "";
  let viewBox = extraerAtributo(atributosSvgRaiz, "viewBox") || "";

  if (!viewBox) {
    const widthRaw = extraerAtributo(atributosSvgRaiz, "width")?.replace(/[^0-9.]/g, "");
    const heightRaw = extraerAtributo(atributosSvgRaiz, "height")?.replace(/[^0-9.]/g, "");
    const w = Number(widthRaw) > 0 ? Number(widthRaw) : 900;
    const h = Number(heightRaw) > 0 ? Number(heightRaw) : 520;
    viewBox = `0 0 ${w} ${h}`;
  }

  // 4. Recorrer todas las figuras vectoriales, detectar IDs o inyectar IDs deterministas
  const conteoIds: Record<string, number> = {};
  const figurasDetectadas: FiguraDetectadaSVG[] = [];
  let contadorAutomatico = 1;

  limpio = limpio.replace(ETIQUETAS_FIGURAS_REGEX, (tagCompleto, nombreTag, atributos, cierreAuto) => {
    const tagLower = String(nombreTag).toLowerCase();
    const x = extraerAtributo(atributos, "x");
    const y = extraerAtributo(atributos, "y");
    const width = extraerAtributo(atributos, "width");
    const height = extraerAtributo(atributos, "height");
    const d = extraerAtributo(atributos, "d");
    const points = extraerAtributo(atributos, "points");
    const rx = extraerAtributo(atributos, "rx");

    // Ignorar el rectángulo de fondo del lienzo completo (si parte en 0,0 y cubre todo el viewBox)
    const partesVb = viewBox.split(/[\s,]+/).map(Number);
    const vbW = partesVb[2] || 900;
    const vbH = partesVb[3] || 520;
    if (
      tagLower === "rect" &&
      (Number(x) === 0 || Number(x) <= 35) &&
      (Number(y) === 0 || Number(y) <= 35) &&
      Number(width) >= vbW * 0.85 &&
      Number(height) >= vbH * 0.85 &&
      !extraerAtributo(atributos, "data-unit-id")
    ) {
      return tagCompleto;
    }

    let idExistente =
      extraerAtributo(atributos, "data-unit-id") ||
      extraerAtributo(atributos, "data-iris-svg-id") ||
      extraerAtributo(atributos, "id");

    let esIdInyectado = false;
    let nuevosAtributos = atributos;

    if (!idExistente) {
      idExistente = `FIGURA-${String(contadorAutomatico).padStart(3, "0")}`;
      contadorAutomatico++;
      esIdInyectado = true;
      nuevosAtributos = `${atributos} id="${idExistente}" data-unit-id="${idExistente}"`;
    } else if (!extraerAtributo(atributos, "data-unit-id")) {
      nuevosAtributos = `${atributos} data-unit-id="${idExistente}"`;
    }

    conteoIds[idExistente] = (conteoIds[idExistente] || 0) + 1;

    const geometriaResumen =
      tagLower === "rect"
        ? `Rect (${x || 0}, ${y || 0} · ${width || 0}×${height || 0})`
        : tagLower === "polygon"
        ? `Polígono (${(points || "").slice(0, 28)}...)`
        : tagLower === "path"
        ? `Trazo Path (${(d || "").slice(0, 28)}...)`
        : `Figura <${tagLower}>`;

    figurasDetectadas.push({
      svgElementId: idExistente,
      etiquetaTag: tagLower,
      geometriaResumen,
      esIdInyectado,
      duplicadoEnArchivo: false,
      AtributosVisuales: { x, y, width, height, d, points, rx },
    });

    return `<${nombreTag}${nuevosAtributos}${cierreAuto}>`;
  });

  // 5. Marcar IDs duplicados si existen
  const idsDuplicadosEnSvg = Object.entries(conteoIds)
    .filter(([, cantidad]) => cantidad > 1)
    .map(([id]) => id);

  const setDuplicados = new Set(idsDuplicadosEnSvg);
  for (const fig of figurasDetectadas) {
    if (setDuplicados.has(fig.svgElementId)) {
      fig.duplicadoEnArchivo = true;
    }
  }

  return {
    viewBox,
    svgSanitizado: limpio,
    figurasDetectadas,
    idsDuplicadosEnSvg,
    elementosAmenazasEliminados: Array.from(new Set(elementosAmenazasEliminados)),
  };
}
