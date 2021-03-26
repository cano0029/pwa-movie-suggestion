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



const DYNAMIC_CACHE = "dynamic-v1"
const STATIC_CACHE = "static-v1"

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
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v82/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
]

// listen when service worker is installed - caching
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

// activate event
self.addEventListener('activate', event => {
  //delete old caches and use most recent one
  event.waitUntil(
    caches.keys().then(keys => { // go through caches and looks for those keys (our cache)
      // console.log(keys)
      return Promise.all(keys
        .filter(key => (key !== STATIC_CACHE && key !== DYNAMIC_CACHE)) // filter through static cache
        .map(key => caches.delete(key)) // delete several old caches that does not equal current static cache name
      )
    })
  )
  // Tell the active service worker to take control of the page(s) immediately. User will not have to refresh the browser twice to make new service worker active
  self.clients.claim(); // but should put in checks before doing this, old service worker may be caching some sort of info for example that you may need
  console.log('Service worker has been activated')
})

//fetch events
self.addEventListener('fetch', event => {
  // if request is inside our cache, return it from our cache- better offline experience
  event.respondWith(
    caches.match(event.request)
      .then(staticCacheResponse => {
        return staticCacheResponse || fetch(event.request) // if we do not have it in cache, do not return cacheResponse but return the normal fetch request
        .then(async fetchResponse => {
          const dynamicCache = await caches.open(DYNAMIC_CACHE)
          dynamicCache.put(event.request.url, fetchResponse.clone()) // put the clone of that fetch response inside the class - movie results and suggested movies pages
          return fetchResponse // return the actual fetch response
        }) 
      })
      .catch(() => {
        const requestedPage = event.request.url.indexOf('.html')
        if(requestedPage > -1) { // it will only show offline page if user is trying to go to a page (not when it is trying to load an image etc.)
          return caches.match('/pages/404.html')
        }
        // TO DO: you can also add it for images i.e. check if it is a png and then return a dummy image that you saved in cache
      })
  )
})

