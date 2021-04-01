
const DYNAMIC_CACHE = "dynamic-3"
const STATIC_CACHE = "static-v3"
const OFFLINE_URL = '/404.html'
const maxCacheSize = 50

const STATIC_ASSETS = [
  '/',
  '/home.html', 
  '/404.html',
  '/css/app.css',
  '/css/materialize.min.css',
  '/js/app.js',
  '/js/materialize.min.js',
  '/img/icons/android-chrome-192x192.png',
  '/img/icons/android-chrome-512x512.png',
  '/img/icons/apple-touch-icon.png',
  '/img/icons/favicon-16x16.png',
  '/img/icons/favicon-32x32.png',
  '/img/icons/favicon.ico',
  '/img/icons/mstile-150x150.png',
  '/img/icons/safari-pinned-tab.svg',
  '/img/logo/logo.png',
  '/img/logo/tmdb-logo.svg',
  '/img/gr-stocks-q8P8YoR6erg-unsplash.jpg',
  '/manifest.json',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v82/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
]

function limitCacheSize(cacheName, maxCacheSize) {
  caches.open(cacheName)
  .then(cache => { cache.keys()
    .then(keys => {
      if (keys.length > maxCacheSize) {
        cache.delete(keys[0])
        .then(limitCacheSize(cacheName, maxCacheSize))
      }
    })
  })
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      console.log('Caching static assets')
      await cache.addAll(STATIC_ASSETS) 
    })()
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async() => {
      const keys = await caches.keys()
      return Promise.all(keys
        .filter(key => (key !== STATIC_CACHE && key !== DYNAMIC_CACHE)) 
            .map(key => caches.delete(key))
          )
    })()
  )
  self.clients.claim(); 
})

self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request)
      const dynamicCache = await caches.open(DYNAMIC_CACHE)
      
      if (cachedResponse) return cachedResponse
    
      try{
        const networkResponse = await fetch(event.request)
        dynamicCache.put(event.request, networkResponse.clone())
        limitCacheSize(DYNAMIC_CACHE, maxCacheSize)
        return networkResponse
      } catch(error) {
        console.log(error, "Returning offline page instead");
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse;
      }
    })()
  )}
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) { 
            return preloadResponse;
          }

          const networkResponse = await fetch(event.request);
          return networkResponse;

        } catch (error) {
          console.log("Fetch failed; returning offline page instead.", error);
          const cache = await caches.open(STATIC_CACHE);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  }
});

self.addEventListener('message', ({ data }) => {
  console.log('Message from service worker', data)
})


