var ROUTES_URL = 'gtfs/routes.txt';
var STOPS_URL = 'gtfs/stops.txt';
var STOP_TIMES_URL = 'gtfs/stop_times.txt';

var cacheName = 'hello-caltrain';
var filesToCache = [
  '/',
  ROUTES_URL, STOPS_URL, STOP_TIMES_URL
];

self.addEventListener('install', (e) => {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch:true }).then(response => {
      return response || fetch(event.request);
    })
  );
});
