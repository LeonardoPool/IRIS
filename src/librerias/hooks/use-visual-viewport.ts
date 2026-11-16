// ==============================================================================
// IRIS by WYLEN — HOOK MULTIPLATAFORMA DE VISUAL VIEWPORT (iOS / ANDROID)
// Gestiona el teclado virtual, altura dinámica, offset y safe-areas en tiempo real
// ==============================================================================

"use client";

import * as React from "react";

export interface EstadoVisualViewport {
  altura: number;
  ancho: number;
  alturaTeclado: number;
  tecladoAbierto: boolean;
  desplazamientoSuperior: number;
}

export function useVisualViewport(): EstadoVisualViewport {
  const [estado, setEstado] = React.useState<EstadoVisualViewport>({
    altura: typeof window !== "undefined" ? window.innerHeight : 800,
    ancho: typeof window !== "undefined" ? window.innerWidth : 400,
    alturaTeclado: 0,
    tecladoAbierto: false,
    desplazamientoSuperior: 0,
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const actualizarViewport = () => {
      const vv = window.visualViewport;
      const alturaVentana = window.innerHeight;
      const altura = vv ? vv.height : alturaVentana;
      const ancho = vv ? vv.width : window.innerWidth;
      const desplazamientoSuperior = vv ? vv.offsetTop : 0;

      // Se considera teclado abierto si la altura visible es significativamente menor que la ventana
      // (al menos 140px de diferencia en dispositivos móviles/táctiles)
      const diferencia = Math.max(0, alturaVentana - altura);
      const tecladoAbierto = diferencia > 140;
      const alturaTeclado = tecladoAbierto ? diferencia : 0;

      // Actualizar variables CSS globales para sincronización de maquetado ultra-rápida (0 jank)
      const docEl = document.documentElement;
      docEl.style.setProperty("--visual-viewport-height", `${altura}px`);
      docEl.style.setProperty("--visual-viewport-width", `${ancho}px`);
      docEl.style.setProperty("--keyboard-height", `${alturaTeclado}px`);
      docEl.style.setProperty("--visual-viewport-offset-top", `${desplazamientoSuperior}px`);

      setEstado({
        altura,
        ancho,
        alturaTeclado,
        tecladoAbierto,
        desplazamientoSuperior,
      });

      // En iOS Safari, evitar que el documento principal sufra scroll parasitario
      if (tecladoAbierto && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    };

    // Inicializar inmediatamente
    actualizarViewport();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", actualizarViewport);
      vv.addEventListener("scroll", actualizarViewport);
    }
    window.addEventListener("resize", actualizarViewport);
    window.addEventListener("orientationchange", actualizarViewport);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", actualizarViewport);
        vv.removeEventListener("scroll", actualizarViewport);
      }
      window.removeEventListener("resize", actualizarViewport);
      window.removeEventListener("orientationchange", actualizarViewport);
    };
  }, []);

  return estado;
}
