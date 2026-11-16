// ==============================================================================
// IRIS by WYLEN — SISTEMA DE NOTIFICACIONES CON LIBRERÍA SILEO
// ==============================================================================
// Notificaciones Toast con física reactiva para alertas y confirmaciones
// ==============================================================================

import { sileo } from "sileo";

export const notificar = {
  exito: (titulo: string, descripcion?: string) => {
    return sileo.success({
      title: titulo,
      description: descripcion,
    });
  },

  error: (titulo: string, descripcion?: string) => {
    return sileo.error({
      title: titulo,
      description: descripcion,
    });
  },

  aviso: (titulo: string, descripcion?: string) => {
    return sileo.warning({
      title: titulo,
      description: descripcion,
    });
  },

  info: (titulo: string, descripcion?: string) => {
    return sileo.info({
      title: titulo,
      description: descripcion,
    });
  },

  promesa: <T>(
    promesa: Promise<T> | (() => Promise<T>),
    mensajes: { cargando: string; exito: string; error: string }
  ) => {
    return sileo.promise(promesa, {
      loading: { title: mensajes.cargando },
      success: { title: mensajes.exito },
      error: { title: mensajes.error },
    });
  },

  limpiar: () => {
    sileo.clear();
  },

  descartar: (id: string) => {
    sileo.dismiss(id);
  },
};
