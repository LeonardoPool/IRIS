// ==============================================================================
// IRIS by WYLEN — LAYOUT RAÍZ
// ==============================================================================

import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sileo";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IRIS by WYLEN — Every relationship, understood.",
  description: "Plataforma operativa comercial, CRM y omnicanalidad de alto rendimiento.",
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
      </body>
    </html>
  );
}
