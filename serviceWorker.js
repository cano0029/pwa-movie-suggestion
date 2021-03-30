
const DYNAMIC_CACHE = "dynamic-v2"
const STATIC_CACHE = "static-v2"
const OFFLINE_URL = '/pages/404.html'

const STATIC_ASSETS = [
  '/',
  '/home.html', 
  '/pages/404.html',
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
  '/img/gr-stocks-q8P8YoR6erg-unsplash.jpg',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v82/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
]

const DYNAMIC_ASSETS = []

const maxCacheSize = (cacheName, maxSize) => {
  caches.open(cacheName)
  .then(cache => { cache.keys()
    .then(keys => {
      if (keys.length > maxSize) {
        cache.delete(keys[0])
        .then(maxCacheSize(cacheName, maxSize)) // recalling function over and over again until if argument is no longer true
      }
    })
  })
}

// listen when service worker is installed - then create static cache
self.addEventListener('install', event => {
  // adding static cache assets
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      console.log('Caching static assets')
      await cache.addAll(STATIC_ASSETS) // goes to the server and finds the assets to put into static cache
    })()
  )
  // Force the waiting service worker to become the active service worker without the user having to reload the page
  console.log('Service worker has been installed', event)
  self.skipWaiting() // presses skipWaiting by itself and it triggers the activate event
})

// delete old caches, before activating most recent caches version (dynamic and static)
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
   // Tell the active service worker to take control of the page(s) immediately. User will not have to refresh the browser twice to make new service worker active
  self.clients.claim(); // but should put in checks before doing this, old service worker may be caching some sort of info for example that you may need
  console.log('Service worker has been activated')
})

// create and return dynamic cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request)
      const dynamicCache = await caches.open(DYNAMIC_CACHE)
      
      if (cachedResponse) return cachedResponse
    
      try{
        const networkResponse = await fetch(event.request)
        dynamicCache.put(event.request, networkResponse.clone())
        maxCacheSize(DYNAMIC_CACHE, 45)
        return networkResponse
      } catch(error) {
        const requestedPage = event.request.url.indexOf('.html')
        if(requestedPage > -1) { // it will only show offline page if user is trying to go to a page (not when it is trying to load an image etc.)
          return caches.match(OFFLINE_URL)
        } 
      }
    })()
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    // only want to respond with our offline if browser or user is trying to do something in a NEW page, not in the current page
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) { // if we yes, return that page
            return preloadResponse;
          }

          // if it was not pre-fetch, try the network
          const networkResponse = await fetch(event.request);
          return networkResponse; // if yes, return that page

        } catch (error) {
          console.log("Fetch failed; returning offline page instead.", error);
          // if error, return that cached page during initialize
          const cache = await caches.open(STATIC_CACHE);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  }
});

// TO DO: what is this??
self.addEventListener('message', ({ data }) => {
  console.log('Message', data)
});

const sendMessage = async (msg) => {
  //send a message from the service worker to the webpage(s)
  let allClients = await clients.matchAll({ includeUncontrolled: true });
  return Promise.all(
    allClients.map((client) => {
      let channel = new MessageChannel();
      channel.port1.onmessage = onMessage;
      //port1 for send port2 for receive
      return client.postMessage(msg, [channel.port2]);
    })
  );
};

