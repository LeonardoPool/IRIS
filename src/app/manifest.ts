// ==============================================================================
// IRIS by WYLEN — MANIFEST PWA (APLICACIÓN WEB PROGRESIVA)
// ==============================================================================

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IRIS — CRM Inmobiliario & Ventas",
    short_name: "IRIS",
    description: "Plataforma Omnicanal y CRM Inmobiliario de Alto Rendimiento por WYLEN",
    start_url: "/panel-control",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fa",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/iconos/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/iconos/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
