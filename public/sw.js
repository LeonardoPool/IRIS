// ==============================================================================
// IRIS by WYLEN — SERVICE WORKER PWA (INSTALABILIDAD MÓVIL Y CACHÉ)
// ==============================================================================

const NOMBRE_CACHE = "iris-pwa-v1";
const ACTIVOS_PRECACHE = [
  "/",
  "/panel-control",
  "/iconos/icon-192x192.png",
  "/iconos/icon-512x512.png",
  "/isotipo-iris.jpg",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => {
      return cache.addAll(ACTIVOS_PRECACHE).catch(() => {
        // En caso de que alguna ruta requiera autenticación, no bloquear instalación
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== NOMBRE_CACHE) {
            return caches.delete(clave);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Ignorar peticiones que no sean GET o que sean hacia la API/Supabase/Next Internals
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase.co") ||
    event.request.url.includes("_next/webpack-hmr")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        // Si la respuesta es válida y estática, actualizar caché
        if (
          respuestaRed &&
          respuestaRed.status === 200 &&
          (event.request.url.includes("/iconos/") ||
            event.request.url.includes(".png") ||
            event.request.url.includes(".jpg") ||
            event.request.url.includes(".css"))
        ) {
          const copia = respuestaRed.clone();
          caches.open(NOMBRE_CACHE).then((cache) => {
            cache.put(event.request, copia);
          });
        }
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});
