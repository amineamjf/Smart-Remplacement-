/* Smart Remplacement — service worker (fonctionnement hors ligne) */
const V = 'sr-v5';
const SHELL = ['./index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Pages de l'application : réseau d'abord (mises à jour), cache en secours hors ligne
  if (r.mode === 'navigate' || (u.origin === location.origin && /\.(html?|js|json)$/.test(u.pathname))) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); }
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // Polices Google : cache d'abord
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res;
      }).catch(() => m))
    );
    return;
  }
  // Tout le reste (tuiles de carte, routage…) : géré par l'application, pas de cache ici
});
