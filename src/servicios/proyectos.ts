// ==============================================================================
// IRIS by WYLEN — SERVICIO DE DOMINIO: PROYECTOS, INVENTARIO Y PLANOS SVG
// ==============================================================================
// Decisiones implementadas:
// • IRIS-DEC-001 / 006: Aislamiento estricto por organizacion_id
// • IRIS-DEC-005: Desarrolladora -> Desarrollo -> Etapas -> Manzanas -> Unidades
// • IRIS-DEC-009: unidades_inmobiliarias como única fuente de verdad de disponibilidad
// • IRIS-DEC-010: Importación masiva CSV/Excel con prevalidación y cero sobrescritura
// • IRIS-DEC-013: Planos interactivos SVG sanitizados, versionados y vinculados por unit_id
// ==============================================================================

import { crearClienteSupabaseAdministrador } from "@/librerias/supabase/servidor";
import { sanitizarYAnalizarPlanoSVG } from "@/librerias/utilidades/sanitizador-svg";
import type {
  Desarrolladora,
  DesarrolloInmobiliario,
  EtapaDesarrollo,
  ManzanaDesarrollo,
  UnidadInmobiliaria,
  HistorialDisponibilidadUnidad,
  DocumentoDesarrollo,
  PlanoInteractivo,
  VinculoPlanoUnidad,
  FilaImportacionUnidadCruda,
  FilaPrevalidadaImportacion,
  ResultadoPrevalidacionImportacion,
  ResumenInventarioDesarrollo,
} from "@/tipos/proyectos";
import type {
  DatosCrearDesarrolladora,
  DatosGuardarDesarrollo,
  DatosCrearEtapaDesarrollo,
  DatosCrearManzanaDesarrollo,
  DatosGuardarUnidadInmobiliaria,
  DatosGuardarPlanoInteractivo,
} from "@/librerias/validaciones/proyectos";

const SVG_DEMO_SOLHA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
  <rect x="0" y="0" width="900" height="520" fill="#f8fafc" rx="16"/>
  <rect x="30" y="30" width="840" height="460" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" rx="12"/>
  <rect x="60" y="225" width="780" height="70" fill="#e2e8f0" rx="8"/>
  <rect x="240" y="242" width="420" height="36" fill="#dcfce7" stroke="#86efac" stroke-width="1.5" rx="18"/>
  <g id="GRUPO-MZA-A">
    <rect id="SOL-A01" data-unit-id="SOL-A01" x="75" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-A02" data-unit-id="SOL-A02" x="200" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-A03" data-unit-id="SOL-A03" x="325" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-A04" data-unit-id="SOL-A04" x="450" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-A05" data-unit-id="SOL-A05" x="575" y="65" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-A06" data-unit-id="SOL-A06" x="700" y="65" width="125" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
  </g>
  <g id="GRUPO-MZA-B">
    <rect id="SOL-B01" data-unit-id="SOL-B01" x="75" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-B02" data-unit-id="SOL-B02" x="200" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-B03" data-unit-id="SOL-B03" x="325" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-B04" data-unit-id="SOL-B04" x="450" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-B05" data-unit-id="SOL-B05" x="575" y="315" width="115" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
    <rect id="SOL-B06" data-unit-id="SOL-B06" x="700" y="315" width="125" height="140" rx="6" stroke="#ffffff" stroke-width="2"/>
  </g>
</svg>`;

function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function calcularResumenInventario(unidades: UnidadInmobiliaria[]): ResumenInventarioDesarrollo {
  const resumen: ResumenInventarioDesarrollo = {
    total_unidades: unidades.length,
    disponibles: 0,
    apartadas: 0,
    vendidas: 0,
    bloqueadas: 0,
    valor_total_inventario: 0,
    valor_disponible: 0,
    superficie_promedio_m2: 0,
  };

  let sumaSuperficie = 0;
  for (const u of unidades) {
    const precioEfectivo = Number(u.precio_promocional ?? u.precio_lista ?? 0);
    resumen.valor_total_inventario += precioEfectivo;
    sumaSuperficie += Number(u.superficie_m2 || 0);

    if (u.estado_disponibilidad === "disponible") {
      resumen.disponibles++;
      resumen.valor_disponible += precioEfectivo;
    } else if (u.estado_disponibilidad === "apartado") {
      resumen.apartadas++;
    } else if (u.estado_disponibilidad === "vendido") {
      resumen.vendidas++;
    } else if (u.estado_disponibilidad === "bloqueado") {
      resumen.bloqueadas++;
    }
  }

  resumen.superficie_promedio_m2 =
    unidades.length > 0 ? Math.round((sumaSuperficie / unidades.length) * 100) / 100 : 0;

  return resumen;
}

export class ServicioProyectosInmobiliarios {
  // ----------------------------------------------------------------------------
  // 1. DESARROLLADORAS
  // ----------------------------------------------------------------------------
  async listarDesarrolladoras(organizacionId: string): Promise<Desarrolladora[]> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data, error } = await supabase
      .from("desarrolladoras")
      .select("*")
      .eq("organizacion_id", organizacionId)
      .order("nombre", { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as Desarrolladora[];
  }

  async crearDesarrolladora(
    organizacionId: string,
    usuarioId: string,
    datos: DatosCrearDesarrolladora
  ): Promise<Desarrolladora> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data, error } = await supabase
      .from("desarrolladoras")
      .insert({
        organizacion_id: organizacionId,
        nombre: datos.nombre.trim(),
        razon_social: datos.razonSocial?.trim() || null,
        identificador_fiscal: datos.identificadorFiscal?.trim().toUpperCase() || null,
        color_marca: datos.colorMarca || "#111827",
        sitio_web: datos.sitioWeb?.trim() || null,
        descripcion: datos.descripcion?.trim() || null,
        estado: "activo",
        creado_por_id: usuarioId,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo registrar la desarrolladora: ${error?.message || "Error desconocido"}`);
    }
    return data as Desarrolladora;
  }

  // ----------------------------------------------------------------------------
  // 2. DESARROLLOS (PROYECTOS)
  // ----------------------------------------------------------------------------
  async listarDesarrollosConResumen(organizacionId: string): Promise<DesarrolloInmobiliario[]> {
    const supabase = crearClienteSupabaseAdministrador();

    const { data: desarrollos, error } = await supabase
      .from("desarrollos")
      .select(`
        *,
        desarrolladora:desarrolladoras(*)
      `)
      .eq("organizacion_id", organizacionId)
      .order("fecha_creacion", { ascending: false });

    if (error || !desarrollos) {
      return [];
    }

    const { data: todasUnidades } = await supabase
      .from("unidades_inmobiliarias")
      .select("id, desarrollo_id, superficie_m2, precio_lista, precio_promocional, estado_disponibilidad")
      .eq("organizacion_id", organizacionId);

    const unidadesPorDesarrollo: Record<string, UnidadInmobiliaria[]> = {};
    if (todasUnidades) {
      for (const u of todasUnidades as UnidadInmobiliaria[]) {
        if (!unidadesPorDesarrollo[u.desarrollo_id]) {
          unidadesPorDesarrollo[u.desarrollo_id] = [];
        }
        unidadesPorDesarrollo[u.desarrollo_id].push(u);
      }
    }

    return (desarrollos as any[]).map((d) => ({
      ...d,
      amenidades: Array.isArray(d.amenidades) ? d.amenidades : [],
      galeria_urls: Array.isArray(d.galeria_urls) ? d.galeria_urls : [],
      resumen_inventario: calcularResumenInventario(unidadesPorDesarrollo[d.id] || []),
    }));
  }

  async guardarDesarrollo(
    organizacionId: string,
    usuarioId: string,
    datos: DatosGuardarDesarrollo
  ): Promise<DesarrolloInmobiliario> {
    const supabase = crearClienteSupabaseAdministrador();
    const slugBase = generarSlug(datos.nombre);

    const payload = {
      organizacion_id: organizacionId,
      desarrolladora_id: datos.desarrolladoraId,
      nombre: datos.nombre.trim(),
      tipo_desarrollo: datos.tipoDesarrollo,
      descripcion: datos.descripcion?.trim() || null,
      ubicacion_texto: datos.ubicacionTexto?.trim() || null,
      estado_provincia: datos.estadoProvincia?.trim() || null,
      municipio_ciudad: datos.municipioCiudad?.trim() || null,
      direccion: datos.direccion?.trim() || null,
      latitud: datos.latitud ?? null,
      longitud: datos.longitud ?? null,
      moneda: datos.moneda,
      precio_desde: datos.precioDesde ?? null,
      superficie_total_hectareas: datos.superficieTotalHectareas ?? null,
      amenidades: datos.amenidades || [],
      estado_publicacion: datos.estadoPublicacion,
      actualizado_por_id: usuarioId,
    };

    if (datos.id) {
      const { data, error } = await supabase
        .from("desarrollos")
        .update(payload)
        .eq("id", datos.id)
        .eq("organizacion_id", organizacionId)
        .select(`*, desarrolladora:desarrolladoras(*)`)
        .single();

      if (error || !data) {
        throw new Error(`Error al actualizar el desarrollo: ${error?.message}`);
      }
      return data as any;
    }

    const { data, error } = await supabase
      .from("desarrollos")
      .insert({
        ...payload,
        slug: `${slugBase}-${Date.now().toString(36).slice(-4)}`,
        creado_por_id: usuarioId,
      })
      .select(`*, desarrolladora:desarrolladoras(*)`)
      .single();

    if (error || !data) {
      throw new Error(`Error al crear el desarrollo: ${error?.message}`);
    }
    return data as any;
  }

  // ----------------------------------------------------------------------------
  // 3. ESTRUCTURA JERÁRQUICA COMPLETA DE UN DESARROLLO
  // ----------------------------------------------------------------------------
  async obtenerEstructuraJerarquicaDesarrollo(
    organizacionId: string,
    desarrolloId: string
  ): Promise<{
    desarrollo: DesarrolloInmobiliario | null;
    etapas: EtapaDesarrollo[];
    manzanas: ManzanaDesarrollo[];
    unidades: UnidadInmobiliaria[];
    documentos: DocumentoDesarrollo[];
    planos: PlanoInteractivo[];
    vinculosPlanoActivo: VinculoPlanoUnidad[];
  }> {
    const supabase = crearClienteSupabaseAdministrador();

    const [
      { data: desarrollo },
      { data: etapas },
      { data: manzanas },
      { data: unidades },
      { data: documentos },
      { data: planos },
    ] = await Promise.all([
      supabase
        .from("desarrollos")
        .select(`*, desarrolladora:desarrolladoras(*)`)
        .eq("id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .maybeSingle(),
      supabase
        .from("etapas_desarrollo")
        .select("*")
        .eq("desarrollo_id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .order("orden", { ascending: true }),
      supabase
        .from("manzanas_desarrollo")
        .select("*")
        .eq("desarrollo_id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .order("orden", { ascending: true }),
      supabase
        .from("unidades_inmobiliarias")
        .select(`
          *,
          etapa:etapas_desarrollo(id, nombre, codigo),
          manzana:manzanas_desarrollo(id, nombre, codigo)
        `)
        .eq("desarrollo_id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .order("clave_comercial", { ascending: true }),
      supabase
        .from("documentos_desarrollo")
        .select("*")
        .eq("desarrollo_id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .order("fecha_creacion", { ascending: false }),
      supabase
        .from("planos_interactivos")
        .select("*")
        .eq("desarrollo_id", desarrolloId)
        .eq("organizacion_id", organizacionId)
        .order("version", { ascending: false }),
    ]);

    const listaPlanos = (planos as PlanoInteractivo[]) || [];
    const planoActivo = listaPlanos.find((p) => p.es_activo) || listaPlanos[0] || null;

    let vinculosPlanoActivo: VinculoPlanoUnidad[] = [];
    if (planoActivo) {
      const { data: vinculos } = await supabase
        .from("vinculos_plano_unidad")
        .select("*")
        .eq("plano_id", planoActivo.id)
        .eq("organizacion_id", organizacionId);
      vinculosPlanoActivo = (vinculos as VinculoPlanoUnidad[]) || [];
    }

    const listaUnidades = (unidades as UnidadInmobiliaria[]) || [];
    const desarrolloFormateado = desarrollo
      ? ({
          ...desarrollo,
          amenidades: Array.isArray(desarrollo.amenidades) ? desarrollo.amenidades : [],
          resumen_inventario: calcularResumenInventario(listaUnidades),
        } as DesarrolloInmobiliario)
      : null;

    return {
      desarrollo: desarrolloFormateado,
      etapas: (etapas as EtapaDesarrollo[]) || [],
      manzanas: (manzanas as ManzanaDesarrollo[]) || [],
      unidades: listaUnidades,
      documentos: (documentos as DocumentoDesarrollo[]) || [],
      planos: listaPlanos,
      vinculosPlanoActivo,
    };
  }

  // ----------------------------------------------------------------------------
  // 4. ETAPAS Y MANZANAS
  // ----------------------------------------------------------------------------
  async crearEtapaDesarrollo(
    organizacionId: string,
    datos: DatosCrearEtapaDesarrollo
  ): Promise<EtapaDesarrollo> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data, error } = await supabase
      .from("etapas_desarrollo")
      .insert({
        organizacion_id: organizacionId,
        desarrollo_id: datos.desarrolloId,
        nombre: datos.nombre.trim(),
        codigo: datos.codigo.trim().toUpperCase(),
        orden: datos.orden,
        fecha_entrega_estimada: datos.fechaEntregaEstimada || null,
        precio_m2_base: datos.precioM2Base ?? null,
        estado: datos.estado,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la etapa: ${error?.message}`);
    }
    return data as EtapaDesarrollo;
  }

  async crearManzanaDesarrollo(
    organizacionId: string,
    datos: DatosCrearManzanaDesarrollo
  ): Promise<ManzanaDesarrollo> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data, error } = await supabase
      .from("manzanas_desarrollo")
      .insert({
        organizacion_id: organizacionId,
        desarrollo_id: datos.desarrolloId,
        etapa_id: datos.etapaId,
        nombre: datos.nombre.trim(),
        codigo: datos.codigo.trim().toUpperCase(),
        orden: datos.orden,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la manzana: ${error?.message}`);
    }
    return data as ManzanaDesarrollo;
  }

  // ----------------------------------------------------------------------------
  // 5. UNIDADES INMOBILIARIAS E HISTORIAL AUDITABLE DE DISPONIBILIDAD
  // ----------------------------------------------------------------------------
  async guardarUnidadInmobiliaria(
    organizacionId: string,
    usuarioId: string,
    datos: DatosGuardarUnidadInmobiliaria
  ): Promise<UnidadInmobiliaria> {
    const supabase = crearClienteSupabaseAdministrador();

    if (datos.precioPromocional && datos.precioPromocional > datos.precioLista) {
      throw new Error("El precio promocional no puede ser mayor al precio de lista.");
    }

    const precioM2 =
      datos.superficieM2 > 0
        ? Math.round(((datos.precioPromocional ?? datos.precioLista) / datos.superficieM2) * 100) / 100
        : null;

    if (datos.id) {
      // Obtener estado anterior para bitácora auditable
      const { data: unidadActual } = await supabase
        .from("unidades_inmobiliarias")
        .select("*")
        .eq("id", datos.id)
        .eq("organizacion_id", organizacionId)
        .single();

      if (!unidadActual) {
        throw new Error("La unidad inmobiliaria no existe en la organización.");
      }

      const { data: actualizada, error } = await supabase
        .from("unidades_inmobiliarias")
        .update({
          etapa_id: datos.etapaId || null,
          manzana_id: datos.manzanaId || null,
          clave_comercial: datos.claveComercial.trim().toUpperCase(),
          numero_lote_unidad: datos.numeroLoteUnidad?.trim() || null,
          identificador_plano_svg: datos.identificadorPlanoSvg?.trim() || datos.claveComercial.trim().toUpperCase(),
          tipo_unidad: datos.tipoUnidad,
          superficie_m2: datos.superficieM2,
          frente_m: datos.frenteM ?? null,
          fondo_m: datos.fondoM ?? null,
          orientacion: datos.orientacion?.trim() || null,
          precio_m2: precioM2,
          precio_lista: datos.precioLista,
          precio_promocional: datos.precioPromocional ?? null,
          moneda: datos.moneda,
          estado_disponibilidad: datos.estadoDisponibilidad,
          notas_inventario: datos.notasInventario?.trim() || null,
          version_registro: Number(unidadActual.version_registro || 1) + 1,
          actualizado_por_id: usuarioId,
        })
        .eq("id", datos.id)
        .eq("organizacion_id", organizacionId)
        .select(`
          *,
          etapa:etapas_desarrollo(id, nombre, codigo),
          manzana:manzanas_desarrollo(id, nombre, codigo)
        `)
        .single();

      if (error || !actualizada) {
        throw new Error(`Error al actualizar la unidad: ${error?.message}`);
      }

      // Registrar en historial si cambió disponibilidad o precio
      if (
        unidadActual.estado_disponibilidad !== datos.estadoDisponibilidad ||
        Number(unidadActual.precio_lista) !== Number(datos.precioLista)
      ) {
        await supabase.from("historial_disponibilidad_unidad").insert({
          organizacion_id: organizacionId,
          unidad_id: datos.id,
          estado_anterior: unidadActual.estado_disponibilidad,
          estado_nuevo: datos.estadoDisponibilidad,
          actor_tipo: "usuario",
          usuario_id: usuarioId,
          motivo:
            datos.motivoCambioEstado?.trim() ||
            `Actualización administrativa (${unidadActual.estado_disponibilidad} -> ${datos.estadoDisponibilidad})`,
          metadatos: {
            precio_lista_anterior: unidadActual.precio_lista,
            precio_lista_nuevo: datos.precioLista,
          },
        });
      }

      return actualizada as UnidadInmobiliaria;
    }

    // Crear nueva unidad
    const claveNormalizada = datos.claveComercial.trim().toUpperCase();
    const { data: creada, error } = await supabase
      .from("unidades_inmobiliarias")
      .insert({
        organizacion_id: organizacionId,
        desarrollo_id: datos.desarrolloId,
        etapa_id: datos.etapaId || null,
        manzana_id: datos.manzanaId || null,
        clave_comercial: claveNormalizada,
        numero_lote_unidad: datos.numeroLoteUnidad?.trim() || claveNormalizada,
        identificador_plano_svg: datos.identificadorPlanoSvg?.trim() || claveNormalizada,
        tipo_unidad: datos.tipoUnidad,
        superficie_m2: datos.superficieM2,
        frente_m: datos.frenteM ?? null,
        fondo_m: datos.fondoM ?? null,
        orientacion: datos.orientacion?.trim() || null,
        precio_m2: precioM2,
        precio_lista: datos.precioLista,
        precio_promocional: datos.precioPromocional ?? null,
        moneda: datos.moneda,
        estado_disponibilidad: datos.estadoDisponibilidad,
        notas_inventario: datos.notasInventario?.trim() || null,
        creado_por_id: usuarioId,
        actualizado_por_id: usuarioId,
      })
      .select(`
        *,
        etapa:etapas_desarrollo(id, nombre, codigo),
        manzana:manzanas_desarrollo(id, nombre, codigo)
      `)
      .single();

    if (error || !creada) {
      throw new Error(`Error al registrar la unidad: ${error?.message}`);
    }

    await supabase.from("historial_disponibilidad_unidad").insert({
      organizacion_id: organizacionId,
      unidad_id: creada.id,
      estado_anterior: null,
      estado_nuevo: datos.estadoDisponibilidad,
      actor_tipo: "usuario",
      usuario_id: usuarioId,
      motivo: "Alta inicial de unidad en inventario",
      metadatos: { precio_lista: datos.precioLista, superficie_m2: datos.superficieM2 },
    });

    return creada as UnidadInmobiliaria;
  }

  async listarHistorialUnidad(
    organizacionId: string,
    unidadId: string
  ): Promise<HistorialDisponibilidadUnidad[]> {
    const supabase = crearClienteSupabaseAdministrador();
    const { data, error } = await supabase
      .from("historial_disponibilidad_unidad")
      .select(`
        *,
        usuario:usuarios(id, nombre_completo, correo_electronico)
      `)
      .eq("organizacion_id", organizacionId)
      .eq("unidad_id", unidadId)
      .order("fecha_cambio", { ascending: false });

    if (error || !data) {
      return [];
    }
    return data as any[];
  }

  // ----------------------------------------------------------------------------
  // 6. IMPORTACIÓN MASIVA DE INVENTARIO (CSV / EXCEL) CON CERO SOBRESCRITURA
  // ----------------------------------------------------------------------------
  async prevalidarImportacionMasiva(
    organizacionId: string,
    desarrolloId: string,
    filasCrudas: FilaImportacionUnidadCruda[]
  ): Promise<ResultadoPrevalidacionImportacion> {
    const supabase = crearClienteSupabaseAdministrador();

    const { data: existentes } = await supabase
      .from("unidades_inmobiliarias")
      .select("clave_comercial")
      .eq("organizacion_id", organizacionId)
      .eq("desarrollo_id", desarrolloId);

    const setExistentesBD = new Set(
      (existentes || []).map((e: any) => String(e.clave_comercial).trim().toUpperCase())
    );

    const vistasEnArchivo = new Set<string>();
    const filas: FilaPrevalidadaImportacion[] = [];

    let nuevasValidas = 0;
    let duplicadasEnArchivo = 0;
    let existentesEnBaseDatos = 0;
    let conErrores = 0;

    filasCrudas.forEach((fila, idx) => {
      const clave = String(fila.clave_comercial || "").trim().toUpperCase();
      const sup = Number(fila.superficie_m2);
      const precio = Number(fila.precio_lista);
      const promo = fila.precio_promocional ? Number(fila.precio_promocional) : null;

      if (!clave) {
        conErrores++;
        filas.push({
          ...fila,
          clave_comercial: "",
          indiceFila: idx + 1,
          clasificacion: "error_validacion",
          mensajeValidacion: "Falta la clave comercial de la unidad.",
        });
        return;
      }

      if (!Number.isFinite(sup) || sup <= 0) {
        conErrores++;
        filas.push({
          ...fila,
          clave_comercial: clave,
          indiceFila: idx + 1,
          clasificacion: "error_validacion",
          mensajeValidacion: "La superficie (m²) debe ser un número mayor a 0.",
        });
        return;
      }

      if (!Number.isFinite(precio) || precio < 0) {
        conErrores++;
        filas.push({
          ...fila,
          clave_comercial: clave,
          indiceFila: idx + 1,
          clasificacion: "error_validacion",
          mensajeValidacion: "El precio de lista es inválido o negativo.",
        });
        return;
      }

      if (promo !== null && promo > precio) {
        conErrores++;
        filas.push({
          ...fila,
          clave_comercial: clave,
          indiceFila: idx + 1,
          clasificacion: "error_validacion",
          mensajeValidacion: "El precio promocional supera al precio de lista.",
        });
        return;
      }

      if (vistasEnArchivo.has(clave)) {
        duplicadasEnArchivo++;
        filas.push({
          ...fila,
          clave_comercial: clave,
          indiceFila: idx + 1,
          clasificacion: "duplicada_en_archivo",
          mensajeValidacion: `Clave '${clave}' repetida dentro del mismo archivo CSV.`,
        });
        return;
      }

      vistasEnArchivo.add(clave);

      if (setExistentesBD.has(clave)) {
        existentesEnBaseDatos++;
        filas.push({
          ...fila,
          clave_comercial: clave,
          indiceFila: idx + 1,
          clasificacion: "existente_en_bd",
          mensajeValidacion: `La unidad '${clave}' ya existe en IRIS; se omitirá para no sobrescribir su estado.`,
        });
        return;
      }

      nuevasValidas++;
      filas.push({
        ...fila,
        clave_comercial: clave,
        indiceFila: idx + 1,
        clasificacion: "nueva_valida",
        mensajeValidacion: "Lista para importar",
      });
    });

    return {
      totalFilasLeidas: filasCrudas.length,
      nuevasValidas,
      duplicadasEnArchivo,
      existentesEnBaseDatos,
      conErrores,
      filas,
    };
  }

  async confirmarImportacionMasiva(
    organizacionId: string,
    usuarioId: string,
    desarrolloId: string,
    filasCrudas: FilaImportacionUnidadCruda[]
  ): Promise<{ insertadas: number; omitidas: number }> {
    const prevalidacion = await this.prevalidarImportacionMasiva(
      organizacionId,
      desarrolloId,
      filasCrudas
    );

    const filasParaInsertar = prevalidacion.filas.filter(
      (f) => f.clasificacion === "nueva_valida"
    );

    if (filasParaInsertar.length === 0) {
      return { insertadas: 0, omitidas: prevalidacion.totalFilasLeidas };
    }

    const supabase = crearClienteSupabaseAdministrador();

    // Resolver etapas y manzanas existentes del desarrollo por código
    const [{ data: etapas }, { data: manzanas }] = await Promise.all([
      supabase
        .from("etapas_desarrollo")
        .select("id, codigo")
        .eq("organizacion_id", organizacionId)
        .eq("desarrollo_id", desarrolloId),
      supabase
        .from("manzanas_desarrollo")
        .select("id, codigo, etapa_id")
        .eq("organizacion_id", organizacionId)
        .eq("desarrollo_id", desarrolloId),
    ]);

    const mapaEtapas = new Map<string, string>();
    (etapas || []).forEach((e: any) => mapaEtapas.set(String(e.codigo).toUpperCase(), e.id));

    const mapaManzanas = new Map<string, { id: string; etapa_id: string }>();
    (manzanas || []).forEach((m: any) =>
      mapaManzanas.set(String(m.codigo).toUpperCase(), { id: m.id, etapa_id: m.etapa_id })
    );

    const registrosInsertar = filasParaInsertar.map((f) => {
      const mzaInfo = f.manzana_codigo
        ? mapaManzanas.get(f.manzana_codigo.trim().toUpperCase())
        : undefined;
      const etapaId =
        (f.etapa_codigo ? mapaEtapas.get(f.etapa_codigo.trim().toUpperCase()) : undefined) ||
        mzaInfo?.etapa_id ||
        null;

      const sup = Number(f.superficie_m2);
      const precio = Number(f.precio_lista);
      const promo = f.precio_promocional ? Number(f.precio_promocional) : null;

      return {
        organizacion_id: organizacionId,
        desarrollo_id: desarrolloId,
        etapa_id: etapaId,
        manzana_id: mzaInfo?.id || null,
        clave_comercial: f.clave_comercial,
        numero_lote_unidad: f.numero_lote_unidad?.trim() || f.clave_comercial,
        identificador_plano_svg: f.identificador_plano_svg?.trim() || f.clave_comercial,
        tipo_unidad: f.tipo_unidad || "lote",
        superficie_m2: sup,
        frente_m: f.frente_m ? Number(f.frente_m) : null,
        fondo_m: f.fondo_m ? Number(f.fondo_m) : null,
        orientacion: f.orientacion?.trim() || null,
        precio_m2: sup > 0 ? Math.round(((promo ?? precio) / sup) * 100) / 100 : null,
        precio_lista: precio,
        precio_promocional: promo,
        moneda: f.moneda || "MXN",
        estado_disponibilidad: f.estado_disponibilidad || "disponible",
        creado_por_id: usuarioId,
        actualizado_por_id: usuarioId,
      };
    });

    const { data: insertadasData, error } = await supabase
      .from("unidades_inmobiliarias")
      .insert(registrosInsertar)
      .select("id, clave_comercial, identificador_plano_svg, estado_disponibilidad, precio_lista, superficie_m2");

    if (error) {
      throw new Error(`Error durante la importación masiva: ${error.message}`);
    }

    const insertadas = insertadasData || [];

    if (insertadas.length > 0) {
      const historiales = insertadas.map((u: any) => ({
        organizacion_id: organizacionId,
        unidad_id: u.id,
        estado_anterior: null,
        estado_nuevo: u.estado_disponibilidad,
        actor_tipo: "usuario",
        usuario_id: usuarioId,
        motivo: "Importación masiva de inventario (CSV/Excel)",
        metadatos: { clave_comercial: u.clave_comercial, precio_lista: u.precio_lista },
      }));

      await supabase.from("historial_disponibilidad_unidad").insert(historiales);
    }

    return {
      insertadas: insertadas.length,
      omitidas: prevalidacion.totalFilasLeidas - insertadas.length,
    };
  }

  // ----------------------------------------------------------------------------
  // 7. PLANOS INTERACTIVOS SVG Y VINCULACIÓN DE POLÍGONOS (unit_id)
  // ----------------------------------------------------------------------------
  async guardarPlanoInteractivoSVG(
    organizacionId: string,
    usuarioId: string,
    datos: DatosGuardarPlanoInteractivo
  ): Promise<{
    plano: PlanoInteractivo;
    vinculosCreadosAutomaticamente: number;
    diagnostico: ReturnType<typeof sanitizarYAnalizarPlanoSVG>;
  }> {
    const diagnostico = sanitizarYAnalizarPlanoSVG(datos.contenidoSvg);

    if (diagnostico.idsDuplicadosEnSvg.length > 0) {
      throw new Error(
        `El plano SVG contiene identificadores duplicados (${diagnostico.idsDuplicadosEnSvg.join(", ")}). Corríjalos antes de guardar la versión.`
      );
    }

    const supabase = crearClienteSupabaseAdministrador();

    // Calcular siguiente versión del plano para este desarrollo
    const { data: ultimoPlano } = await supabase
      .from("planos_interactivos")
      .select("version")
      .eq("organizacion_id", organizacionId)
      .eq("desarrollo_id", datos.desarrolloId)
      .order("version", { ascending: false })
      .limit(1);

    const siguienteVersion = (ultimoPlano?.[0]?.version || 0) + 1;

    // Desactivar versiones anteriores
    await supabase
      .from("planos_interactivos")
      .update({ es_activo: false })
      .eq("organizacion_id", organizacionId)
      .eq("desarrollo_id", datos.desarrolloId);

    const { data: nuevoPlano, error } = await supabase
      .from("planos_interactivos")
      .insert({
        organizacion_id: organizacionId,
        desarrollo_id: datos.desarrolloId,
        etapa_id: datos.etapaId || null,
        manzana_id: datos.manzanaId || null,
        nombre: datos.nombre.trim(),
        version: siguienteVersion,
        contenido_svg: diagnostico.svgSanitizado,
        viewbox: diagnostico.viewBox,
        configuracion_colores: datos.configuracionColores || {
          disponible: "#10b981",
          apartado: "#f59e0b",
          vendido: "#ef4444",
          bloqueado: "#64748b",
          sin_vincular: "#d1d5db",
        },
        es_activo: true,
        creado_por_id: usuarioId,
      })
      .select("*")
      .single();

    if (error || !nuevoPlano) {
      throw new Error(`No se pudo guardar el plano interactivo: ${error?.message}`);
    }

    // Auto-emparejar figuras cuyo svgElementId coincida con clave_comercial o identificador_plano_svg
    const { data: unidadesDesarrollo } = await supabase
      .from("unidades_inmobiliarias")
      .select("id, clave_comercial, identificador_plano_svg")
      .eq("organizacion_id", organizacionId)
      .eq("desarrollo_id", datos.desarrolloId);

    const mapaUnidadesPorClave = new Map<string, string>();
    (unidadesDesarrollo || []).forEach((u: any) => {
      if (u.clave_comercial) {
        mapaUnidadesPorClave.set(String(u.clave_comercial).trim().toUpperCase(), u.id);
      }
      if (u.identificador_plano_svg) {
        mapaUnidadesPorClave.set(String(u.identificador_plano_svg).trim().toUpperCase(), u.id);
      }
    });

    const unidadesYaEmparejadas = new Set<string>();
    const vinculosAuto: Array<{
      organizacion_id: string;
      desarrollo_id: string;
      plano_id: string;
      svg_element_id: string;
      unidad_id: string;
    }> = [];

    for (const fig of diagnostico.figurasDetectadas) {
      const claveCandidata = fig.svgElementId.trim().toUpperCase();
      const unidadId = mapaUnidadesPorClave.get(claveCandidata);
      if (unidadId && !unidadesYaEmparejadas.has(unidadId)) {
        unidadesYaEmparejadas.add(unidadId);
        vinculosAuto.push({
          organizacion_id: organizacionId,
          desarrollo_id: datos.desarrolloId,
          plano_id: nuevoPlano.id,
          svg_element_id: fig.svgElementId,
          unidad_id: unidadId,
        });
      }
    }

    if (vinculosAuto.length > 0) {
      await supabase.from("vinculos_plano_unidad").insert(vinculosAuto);
    }

    return {
      plano: nuevoPlano as PlanoInteractivo,
      vinculosCreadosAutomaticamente: vinculosAuto.length,
      diagnostico,
    };
  }

  async guardarVinculosPlanoUnidad(
    organizacionId: string,
    desarrolloId: string,
    planoId: string,
    vinculos: Array<{ svgElementId: string; unidadId: string }>
  ): Promise<VinculoPlanoUnidad[]> {
    const supabase = crearClienteSupabaseAdministrador();

    // Validar que no haya duplicados en la solicitud
    const setSvgIds = new Set<string>();
    const setUnidadIds = new Set<string>();

    for (const v of vinculos) {
      if (setSvgIds.has(v.svgElementId)) {
        throw new Error(`El polígono '${v.svgElementId}' está asignado más de una vez.`);
      }
      if (setUnidadIds.has(v.unidadId)) {
        throw new Error(`Una misma unidad no puede vincularse a dos polígonos distintos en el mismo plano.`);
      }
      setSvgIds.add(v.svgElementId);
      setUnidadIds.add(v.unidadId);
    }

    await supabase
      .from("vinculos_plano_unidad")
      .delete()
      .eq("organizacion_id", organizacionId)
      .eq("plano_id", planoId);

    if (vinculos.length === 0) {
      return [];
    }

    const filas = vinculos.map((v) => ({
      organizacion_id: organizacionId,
      desarrollo_id: desarrolloId,
      plano_id: planoId,
      svg_element_id: v.svgElementId,
      unidad_id: v.unidadId,
    }));

    const { data, error } = await supabase
      .from("vinculos_plano_unidad")
      .insert(filas)
      .select("*");

    if (error) {
      throw new Error(`Error al guardar las asociaciones del plano: ${error.message}`);
    }

    return (data as VinculoPlanoUnidad[]) || [];
  }

  obtenerSvgDemoSolha(): string {
    return SVG_DEMO_SOLHA;
  }
}

export const servicioProyectosInmobiliarios = new ServicioProyectosInmobiliarios();
