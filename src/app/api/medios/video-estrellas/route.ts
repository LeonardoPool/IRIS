// ==============================================================================
// IRIS by WYLEN — ENDPOINT DE INTEGRACIÓN CON PEXELS API
// ==============================================================================
// Búsqueda y obtención dinámica de video de fondo de estrellas
// ==============================================================================

import { NextResponse } from "next/server";

export async function GET() {
  const clavePexels =
    process.env.PEXELS_API_KEY || "cxXI16SaeuxL1n78lx5BtOtDVoQJOfL2rW4QycWr57YnRcMA3rSdjxOf";

  try {
    const respuesta = await fetch(
      "https://api.pexels.com/videos/search?query=stars+night+sky&orientation=landscape&size=medium&per_page=8",
      {
        headers: {
          Authorization: clavePexels,
        },
        next: { revalidate: 86400 },
      }
    );

    if (!respuesta.ok) {
      console.warn(`[Pexels API] Error en la petición: status ${respuesta.status}`);
      return NextResponse.json({
        exito: false,
        urlVideo: "/video-estrellas.mp4",
        origen: "local_respaldo",
      });
    }

    const datos = await respuesta.json();
    const videos = datos.videos || [];

    if (videos.length === 0) {
      return NextResponse.json({
        exito: false,
        urlVideo: "/video-estrellas.mp4",
        origen: "local_respaldo",
      });
    }

    // Seleccionar video con mejor resolución HD
    const videoSeleccionado = videos[0];
    const archivoHD =
      videoSeleccionado.video_files?.find(
        (f: any) => f.quality === "hd" && (f.width === 1920 || f.width === 1280)
      ) ||
      videoSeleccionado.video_files?.find((f: any) => f.quality === "hd") ||
      videoSeleccionado.video_files?.[0];

    const urlVideo = archivoHD?.link || "/video-estrellas.mp4";

    return NextResponse.json({
      exito: true,
      urlVideo,
      origen: "pexels_api",
      idVideo: videoSeleccionado.id,
      fotografo: videoSeleccionado.user?.name,
      urlPexels: videoSeleccionado.url,
    });
  } catch (error: any) {
    console.error("[Pexels API] Error al conectar con Pexels:", error);
    return NextResponse.json({
      exito: false,
      urlVideo: "/video-estrellas.mp4",
      origen: "local_respaldo",
      error: error.message,
    });
  }
}
