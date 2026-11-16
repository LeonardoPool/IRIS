// ==============================================================================
// IRIS by WYLEN — VISTA DE CONTACTOS Y PERFIL 360°
// ==============================================================================

"use client";

import * as React from "react";
import { Tarjeta, CabeceraTarjeta, TituloTarjeta, DescripcionTarjeta, ContenidoTarjeta } from "@/componentes/ui/tarjeta";
import { PlacaEstado } from "@/componentes/ui/placa-estado";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Avatar } from "@/componentes/ui/avatar";
import {
  Contact,
  Plus,
  Search,
  Phone,
  Mail,
  Building,
  CheckCircle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { Contacto } from "@/tipos/crm";
import { crearContactoAccion } from "@/acciones/crm";

export function VistaContactos({ contactosIniciales = [] }: { contactosIniciales: Contacto[] }) {
  const [contactos, setContactos] = React.useState<Contacto[]>(contactosIniciales);
  const [busqueda, setBusqueda] = React.useState("");
  const [mostrarModal, setMostrarModal] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [apellidos, setApellidos] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [cargo, setCargo] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [mensajeExito, setMensajeExito] = React.useState<string | null>(null);

  const contactosFiltrados = contactos.filter((c) => {
    if (!busqueda) return true;
    const query = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(query) ||
      c.apellidos?.toLowerCase().includes(query) ||
      c.correo_principal?.toLowerCase().includes(query) ||
      c.telefono_principal?.includes(query) ||
      c.empresa?.nombre.toLowerCase().includes(query)
    );
  });

  const manejarCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensajeExito(null);

    const respuesta = await crearContactoAccion({
      nombre,
      apellidos,
      correoPrincipal: correo,
      telefonoPrincipal: telefono,
      cargo,
    });

    setCargando(false);

    if (respuesta.exito && respuesta.contacto) {
      setContactos([respuesta.contacto, ...contactos]);
      setMostrarModal(false);
      setNombre("");
      setApellidos("");
      setCorreo("");
      setTelefono("");
      setCargo("");
      setMensajeExito("Contacto registrado con éxito en el directorio comercial.");
    } else {
      alert(respuesta.error || "Error al crear contacto.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--azul-apagado)]">
            Directorio Centralizado
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mt-1">
            Contactos y Clientes Unificados
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Registro 360° con resolución de identidad entre canales de WhatsApp, correos y formularios.
          </p>
        </div>

        <Boton variante="primario" tamano="sm" onClick={() => setMostrarModal(true)}>
          <Plus className="h-4 w-4" />
          <span>Nuevo Contacto</span>
        </Boton>
      </div>

      {mensajeExito && (
        <div className="p-4 bg-[var(--success-background)] border border-[var(--success-border)] rounded-[var(--radius-md)] flex items-center gap-2.5 text-xs text-[var(--success)] font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Modal de Registro */}
      {mostrarModal && (
        <Tarjeta className="border-[var(--azul-apagado)] bg-[var(--surface-hover)]/30 animate-in fade-in duration-200">
          <CabeceraTarjeta>
            <TituloTarjeta>Registrar Nuevo Contacto</TituloTarjeta>
            <DescripcionTarjeta>Ingrese los datos de la persona física o representante corporativo.</DescripcionTarjeta>
          </CabeceraTarjeta>
          <ContenidoTarjeta>
            <form onSubmit={manejarCrear} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Nombre(s) *"
                  placeholder="Ej. Sofía"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
                <CampoTexto
                  etiqueta="Apellidos"
                  placeholder="Ej. Navarro Domínguez"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Correo Electrónico"
                  type="email"
                  placeholder="sofia.navarro@empresa.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
                <CampoTexto
                  etiqueta="Teléfono Principal (E.164)"
                  placeholder="+52 55 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <CampoTexto
                etiqueta="Cargo o Puesto"
                placeholder="Ej. Directora de Inversiones"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario" tamano="sm" cargando={cargando}>
                  Guardar Contacto
                </Boton>
              </div>
            </form>
          </ContenidoTarjeta>
        </Tarjeta>
      )}

      {/* Barra de Búsqueda */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 text-[var(--muted-light)] absolute left-3.5 top-3" />
        <input
          className="h-10 w-full pl-9 pr-4 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] placeholder:text-[var(--muted-light)] focus:outline-none focus:ring-1 focus:ring-[var(--azul-apagado)]"
          placeholder="Buscar contacto por nombre, correo, empresa o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Listado de Contactos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contactosFiltrados.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--muted)]">
            No se encontraron contactos en la base de datos.
          </div>
        ) : (
          contactosFiltrados.map((contacto) => (
            <Tarjeta key={contacto.id} className="hover:border-[var(--azul-apagado)]/50 transition-colors">
              <ContenidoTarjeta className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${contacto.nombre} ${contacto.apellidos || ""}`} tamano="md" />
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {contacto.nombre} {contacto.apellidos || ""}
                      </h4>
                      <p className="text-[11px] text-[var(--muted)]">{contacto.cargo || "Inversionista / Cliente"}</p>
                    </div>
                  </div>
                  <PlacaEstado variante="exito" tamano="sm">
                    {contacto.estado}
                  </PlacaEstado>
                </div>

                <div className="space-y-2 text-xs text-[var(--muted)] pt-2 border-t border-[var(--border-subtle)]">
                  {contacto.telefono_principal && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[var(--azul-apagado)]" />
                      <span>{contacto.telefono_principal}</span>
                    </div>
                  )}
                  {contacto.correo_principal && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[var(--azul-apagado)]" />
                      <span className="truncate">{contacto.correo_principal}</span>
                    </div>
                  )}
                  {contacto.empresa && (
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-[var(--muted-light)]" />
                      <span>{contacto.empresa.nombre}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  <span className="text-[var(--muted)]">Omnicanalidad:</span>
                  <div className="flex items-center gap-2 text-[var(--azul-apagado)]">
                    <span title="WhatsApp Vinculado"><MessageCircle className="h-3.5 w-3.5" /></span>
                    <span title="Correo Verificado"><Mail className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </ContenidoTarjeta>
            </Tarjeta>
          ))
        )}
      </div>
    </div>
  );
}
