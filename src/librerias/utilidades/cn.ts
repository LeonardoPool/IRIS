// ==============================================================================
// IRIS by WYLEN — UTILIDAD DE CLASES CSS
// ==============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
