const CACHE_NAME = 'ascension-shell-v5'
// Chemins relatifs à l'emplacement de l'app (la racine du site ou un sous-dossier GitHub Pages).
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/ascension.svg', './icons/favicon-64.png', './fonts/ascension-pixel.woff', './icons/apple-touch-icon.png', './icons/ascension-192.png', './icons/ascension-512.png']
  .map((path) => new URL(path, self.registration.scope).href)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ascension-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
    return response
  }).catch(async () => {
    const cached = await caches.match(request)
    return cached || (request.mode === 'navigate' ? caches.match(new URL('./index.html', self.registration.scope).href) : Response.error())
  }))
})
