// ==============================================================================
// IRIS by WYLEN — LAYOUT RAÍZ
// ==============================================================================

import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sileo";
import { RegistradorPWA } from "@/componentes/pwa/registrador-sw";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "IRIS by WYLEN — Every relationship, understood.",
  description: "Plataforma operativa comercial, CRM y omnicanalidad de alto rendimiento.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IRIS",
  },
  icons: {
    icon: [
      { url: "/iconos/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/iconos/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/iconos/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-sans">
        {children}
        <Toaster theme="light" position="top-right" />
        <RegistradorPWA />
      </body>
    </html>
  );
}
