// The revision the page was built from, put here when the site is deployed: the browser only
// looks for a new service worker when sw.js itself has changed, so a deploy has to change it
// to be noticed. A new worker means a new cache, and `activate` drops the one before it. An
// ordinary build leaves it at 'dev', where the name of the cache does not matter.
const BUILD = 'dev';

const CACHE = 'plus-codes-web-' + BUILD;

// Everything the page needs to open, plus the H3 bundle. It is asked for when the browser is
// idle and precached here, so the first switch to H3 is instant and works offline.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './h3.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Only the page's own files are kept, including the H3 bundle, which is precached when
  // the worker installs. The map tiles come from OpenStreetMap's public server, whose usage
  // policy asks that they are not stored and reused by a client like this one, so those
  // requests are left to the browser to make and to cache for itself.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // The page goes to the network first, so a new deploy is picked up as soon as the browser
  // is online, and falls back to the cache so the page still opens offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Everything else is served from the cache when it is there and refreshed in the
  // background, so a redeploy takes effect on the next load and the page still opens offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fromNetwork = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fromNetwork;
    })
  );
});
