const CACHE_NAME = 'lucy-shell-v6-__BUILD_HASH__';

function isLegacyCacheName(name) {
  return /^lucy-shell-v[1-5]\b/.test(name);
}

function isLocalhostOrigin() {
  const host = self.location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

self.addEventListener('install', (event) => {
  if (isLocalhostOrigin()) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(['/', '/index.html', '/favicon.svg']);

      const existingKeys = await caches.keys();
      if (existingKeys.some(isLegacyCacheName)) {
        await self.skipWaiting();
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      if (isLocalhostOrigin()) {
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.registration.unregister();
        return;
      }

      const staleKeys = keys.filter((key) => key !== CACHE_NAME);
      await Promise.all(staleKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// Never intercept local preview traffic; on production origins:
// Network-first (no-store) for HTML navigations with offline shell fallback;
// Immutable cache-hit for content-hashed /assets/* bundles;
// Stale-while-revalidate for static icons/manifests.
self.addEventListener('fetch', (event) => {
  if (isLocalhostOrigin()) return;

  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((res) => res || caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
