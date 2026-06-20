const CACHE    = 'fdr-v5';
const PRECACHE = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/assets/images/logo.png',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels aux serveurs de données (back-end + Supabase) :
  // ce sont des données qui changent, elles doivent toujours venir du réseau.
  if (url.hostname.includes('onrender.com')) return;
  if (url.hostname.includes('supabase.co')) return;

  if (event.request.mode === 'navigate') {
    const target = url.pathname === '/pages/login.html' ? '/pages/login.html' : '/index.html';
    event.respondWith(
      caches.match(target).then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
