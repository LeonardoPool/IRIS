// ==============================================================================
// IRIS by WYLEN — ACCIONES DE AUTENTICACIÓN Y ACCESO MULTICREDENCIAL
// ==============================================================================
// Soporte de acceso para Asesores mediante Correo o CURP + PIN de 4 dígitos
// ==============================================================================

"use server";

import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";
import { hashearPin } from "@/servicios/asesores";

/**
 * Valida el acceso de un asesor comercial mediante su Correo o CURP y su PIN de 4 dígitos.
 * Retorna las credenciales para la creación de la sesión en el navegador.
 */
export async function accionAutenticarConPin({
  identificador,
  pin,
}: {
  identificador: string;
  pin: string;
}) {
  try {
    const idLimpio = identificador.trim();
    const pinLimpio = pin.trim();

    if (!idLimpio) {
      return { exito: false, error: "Ingrese su Correo Electrónico o su CURP." };
    }

    if (!/^\d{4}$/.test(pinLimpio)) {
      return { exito: false, error: "El PIN debe contener exactamente 4 dígitos numéricos." };
    }

    const supabaseAdmin = crearClienteSupabaseAdministrador();
    const hashIngresado = hashearPin(pinLimpio);

    // 1. Buscar al usuario por correo O por CURP
    const { data: usuario, error: errorUsuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre_completo, correo_electronico, curp, pin_hash, estado")
      .or(`correo_electronico.ilike.${idLimpio},curp.ilike.${idLimpio}`)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      return {
        exito: false,
        error: "No se encontró ningún asesor registrado con ese Correo o CURP.",
      };
    }

    if (usuario.estado !== "activo") {
      return {
        exito: false,
        error: "Su cuenta se encuentra inactiva o suspendida. Contacte a su administrador.",
      };
    }

    // 2. Verificar hash del PIN
    if (!usuario.pin_hash || usuario.pin_hash !== hashIngresado) {
      return {
        exito: false,
        error: "El PIN de 4 dígitos ingresado es incorrecto.",
      };
    }

    // 3. Clave sincronizada con Supabase Auth
    const claveAuth = `Iris.${pinLimpio}#2026!`;

    // Asegurar que auth.users tenga esta clave configurada
    try {
      await supabaseAdmin.auth.admin.updateUserById(usuario.id, {
        password: claveAuth,
        email_confirm: true,
      });
    } catch (errAuth) {
      console.warn("Advertencia al actualizar clave de autenticación:", errAuth);
    }

    return {
      exito: true,
      correo: usuario.correo_electronico,
      clave: claveAuth,
      nombre: usuario.nombre_completo,
    };
  } catch (error: any) {
    console.error("Error en accionAutenticarConPin:", error);
    return {
      exito: false,
      error: error.message || "Error al autenticar credencial PIN.",
    };
  }
}
