const CACHE    = 'fdr-v21';
const PRECACHE = [
  '/',
  '/index.html',
  '/index-externe.html',
  '/pages/login.html',
  '/pages/login-externe.html',
  '/pages/responsable.html',
  '/pages/admin.html',
  '/assets/images/logo.png',
  '/assets/images/logo-reduit.png',
  '/assets/images/davlogo.png',
  '/manifest.json',
  '/manifest-externe.json',
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
    const PAGES_DIRECTES = ['/pages/login.html', '/pages/login-externe.html', '/pages/responsable.html', '/pages/admin.html', '/index-externe.html'];
    const target = PAGES_DIRECTES.includes(url.pathname) ? url.pathname : '/index.html';
    // On demande toujours la dernière version de la page au réseau en premier :
    // c'est ce qui garantit qu'on affiche la version la plus récente du site.
    // On ne se rabat sur la copie en cache que si le réseau échoue (hors-ligne).
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(target, clone));
          return response;
        })
        .catch(() => caches.match(target))
    );
    return;
  }

  // Scripts / CSS / images : on répond tout de suite avec la version en cache
  // pour que l'app reste rapide, mais on vérifie systématiquement en
  // arrière-plan si le fichier a changé sur le serveur, et on met à jour le
  // cache pour la prochaine fois (stale-while-revalidate).
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
