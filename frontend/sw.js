const CACHE    = 'fdr-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Navigation : si l'app est déjà ouverte, focus la fenêtre existante
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels API vers Render
  if (url.hostname.includes('onrender.com')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        // Ramène l'onglet existant au premier plan plutôt qu'en ouvrir un nouveau
        for (const client of clients) {
          if ('focus' in client) client.focus();
        }
        return caches.match('/index.html').then(cached => cached || fetch(event.request));
      })
    );
    return;
  }

  // Stratégie cache-first pour les assets statiques
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
