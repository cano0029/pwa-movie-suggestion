/*
Copyright 2015, 2019, 2020, 2021 Google LLC. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/





// Incrementing OFFLINE_VERSION will kick off the install event and force
// previously cached resources to be updated from the network.

const OFFLINE_VERSION = 1;
const CACHE_NAME = "offline";
const OFFLINE_URL = "/pages/404.html"; // Customize this with a different URL if needed

// listen when service worker is installed
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    })()
  );
  // Force the waiting service worker to become the active service worker without the user having to reload the page
  console.log('Service worker has been installed', event)
  self.skipWaiting(); // presses skipWaiting by itself and it triggers the activate event
})

// activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      // See https://developers.google.com/web/updates/2017/02/navigation-preload

      // it will work perfectly fine without this = just a more optimization performance things
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })()
  )
  // Tell the active service worker to take control of the page(s) immediately. User will not have to refresh the browser twice to make new service worker active
  self.clients.claim(); // but should put in checks before doing this, old service worker may be caching some sort of info for example that you may need
  console.log('Service worker has been activated')
})

//listens for fetch events
self.addEventListener('fetch', event => {
  if (event.request.mode === "navigate") { // We only want to call event.respondWith() if this is a navigation request for an HTML page.
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported. - if the browser had tried to pre-fetch the page
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) { 
            return preloadResponse;
          }

          // if it was not pre-fetch, try the network- Always try the network first
          const networkResponse = await fetch(event.request);
          return networkResponse; 

        } catch (error) { // network error.
          // only want to respond with our offline if browser or user is trying to do something in a NEW page, not in the current page
          console.log("Fetch failed; returning offline page instead.", error)
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    )
  }
})

