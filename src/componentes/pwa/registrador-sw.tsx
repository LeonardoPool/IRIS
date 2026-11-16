// ==============================================================================
// IRIS by WYLEN — REGISTRADOR CLIENTE DEL SERVICE WORKER (PWA)
// ==============================================================================

"use client";

import * as React from "react";

export function RegistradorPWA() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registro) => {
            console.log("PWA Service Worker registrado con éxito:", registro.scope);
          })
          .catch((error) => {
            console.error("Fallo al registrar Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}
