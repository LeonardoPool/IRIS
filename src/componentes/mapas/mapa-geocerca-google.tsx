// ==============================================================================
// IRIS by WYLEN — COMPONENTE DE GOOGLE MAPS INTERACTIVO CON GEOCERCA
// ==============================================================================
// Implementación oficial de Google Maps JavaScript API v3
// Incluye: Marcador arrastrable, Círculo de radio perimetral y clic para reposicionar
// ==============================================================================

"use client";

import * as React from "react";
import { MapPin, Navigation, Compass, Layers, RotateCcw } from "lucide-react";

interface PropiedadesMapaGeocerca {
  latitud: number;
  longitud: number;
  radioMetros: number;
  nombreLugar?: string;
  onCoordenadasChange: (lat: number, lng: number) => void;
  apiKey?: string;
}

declare global {
  interface Window {
    google: any;
    initMapIrisCallback?: () => void;
  }
}

export function MapaGeocercaGoogle({
  latitud,
  longitud,
  radioMetros,
  nombreLugar = "Sede Comercial",
  onCoordenadasChange,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyDTWIUl2XbrZmEbxu3TC6Js_LwfLmSZ_mo",
}: PropiedadesMapaGeocerca) {
  const contenedorRef = React.useRef<HTMLDivElement | null>(null);
  const mapaRef = React.useRef<any>(null);
  const marcadorRef = React.useRef<any>(null);
  const circuloRef = React.useRef<any>(null);

  const [mapaCargado, setMapaCargado] = React.useState(false);
  const [errorCarga, setErrorCarga] = React.useState<string | null>(null);

  // Inicializar mapa de Google
  React.useEffect(() => {
    if (!apiKey) {
      setErrorCarga("Falta la API Key de Google Maps.");
      return;
    }

    let cancelado = false;

    // Función que inicializa los objetos de Google Maps
    const inicializarMapa = () => {
      if (!contenedorRef.current || !window.google || !window.google.maps) return;

      try {
        const posicion = { lat: Number(latitud), lng: Number(longitud) };

        // 1. Instanciar Mapa con estilo editorial elegante
        const mapa = new window.google.maps.Map(contenedorRef.current, {
          center: posicion,
          zoom: radioMetros <= 300 ? 17 : radioMetros <= 1000 ? 16 : 14,
          mapTypeId: "roadmap",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "simplified" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#e9edf5" }],
            },
          ],
        });

        // 2. Marcador de Sede Arrastrable
        const marcador = new window.google.maps.Marker({
          position: posicion,
          map: mapa,
          draggable: true,
          title: nombreLugar,
          animation: window.google.maps.Animation.DROP,
        });

        // 3. Círculo Perimetral de la Geocerca
        const circulo = new window.google.maps.Circle({
          strokeColor: "#059669",
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: "#10b981",
          fillOpacity: 0.22,
          map: mapa,
          center: posicion,
          radius: Number(radioMetros),
        });

        // Evento: Al arrastrar el marcador
        marcador.addListener("dragend", () => {
          const nuevaPos = marcador.getPosition();
          if (nuevaPos) {
            const nuevaLat = Number(nuevaPos.lat().toFixed(6));
            const nuevaLng = Number(nuevaPos.lng().toFixed(6));
            circulo.setCenter(nuevaPos);
            onCoordenadasChange(nuevaLat, nuevaLng);
          }
        });

        // Evento: Clic en el mapa para reposicionar
        mapa.addListener("click", (evento: any) => {
          if (evento.latLng) {
            marcador.setPosition(evento.latLng);
            circulo.setCenter(evento.latLng);
            const nuevaLat = Number(evento.latLng.lat().toFixed(6));
            const nuevaLng = Number(evento.latLng.lng().toFixed(6));
            onCoordenadasChange(nuevaLat, nuevaLng);
          }
        });

        mapaRef.current = mapa;
        marcadorRef.current = marcador;
        circuloRef.current = circulo;

        if (!cancelado) {
          setMapaCargado(true);
        }
      } catch (err: any) {
        console.error("Error al renderizar Google Maps:", err);
        setErrorCarga(err.message || "No se pudo cargar el mapa.");
      }
    };

    // Si la librería ya está cargada en window
    if (window.google && window.google.maps) {
      inicializarMapa();
      return;
    }

    // Si aún no está cargada, inyectar el script oficial de Google Maps
    const idScript = "google-maps-sdk-iris";
    let scriptExistente = document.getElementById(idScript) as HTMLScriptElement | null;

    if (!scriptExistente) {
      scriptExistente = document.createElement("script");
      scriptExistente.id = idScript;
      scriptExistente.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      scriptExistente.async = true;
      scriptExistente.defer = true;
      scriptExistente.onload = () => {
        if (!cancelado) inicializarMapa();
      };
      scriptExistente.onerror = () => {
        if (!cancelado) setErrorCarga("Fallo al descargar script de Google Maps API.");
      };
      document.head.appendChild(scriptExistente);
    } else {
      scriptExistente.addEventListener("load", inicializarMapa);
    }

    return () => {
      cancelado = true;
    };
  }, [apiKey]);

  // Actualizar radio y posición cuando cambien las props
  React.useEffect(() => {
    if (mapaRef.current && marcadorRef.current && circuloRef.current && window.google) {
      const posicion = new window.google.maps.LatLng(latitud, longitud);
      marcadorRef.current.setPosition(posicion);
      circuloRef.current.setCenter(posicion);
      circuloRef.current.setRadius(Number(radioMetros));
      mapaRef.current.panTo(posicion);
    }
  }, [latitud, longitud, radioMetros]);

  return (
    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-[#e5e7eb] bg-gray-100 shadow-2xs">
      {/* Contenedor oficial para el lienzo de Google Maps */}
      <div ref={contenedorRef} className="w-full h-full" />

      {/* Fallback si el script aún carga o si se bloquea la conexión */}
      {(!mapaCargado || errorCarga) && (
        <iframe
          title="Google Maps Fallback"
          width="100%"
          height="100%"
          className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
          loading="lazy"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitud},${longitud}&zoom=16`}
        />
      )}

      {/* Badge Flotante Superior: Instrucción de interacción */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-md text-[11px] font-bold text-gray-800 pointer-events-none">
        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        <span>Arrastra el marcador o haz clic en el mapa para ajustar la sede</span>
      </div>

      {/* Badge Flotante Inferior Derecho: Radio del perímetro */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-gray-900/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-white shadow-md pointer-events-none">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Geocerca Activa: {radioMetros} m</span>
      </div>
    </div>
  );
}
