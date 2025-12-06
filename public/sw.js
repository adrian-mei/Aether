const CACHE_NAME = 'aether-v2';
const MODEL_CACHE_NAME = 'aether-models-v1';

const URLS_TO_CACHE = [
  '/',
  '/api/manifest', // Use the API route for the manifest
  '/icons/file.svg',
  '/icons/globe.svg',
  '/icons/window.svg'
  // Removed '/workers/embedding.worker.js' as it does not exist
];

// Domains that host large model files or libraries
const CACHE_DOMAINS = [
  'huggingface.co',
  'cdn.jsdelivr.net',
  'cas-bridge.xethub.hf.co',
  'hf.co'
];

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());

  // Cleanup old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MODEL_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

function isCacheableExternalRequest(url) {
  try {
    const urlObj = new URL(url);
    // Check if domain matches
    if (CACHE_DOMAINS.some(domain => urlObj.hostname.endsWith(domain))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Handle External Model/Library Requests (Cache First)
  if (isCacheableExternalRequest(url)) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const fetchResponse = await fetch(request);
          // Cache valid responses (including opaque ones for no-cors, though we prefer cors)
          if (fetchResponse && (fetchResponse.ok || fetchResponse.type === 'opaque')) {
            cache.put(request, fetchResponse.clone());
          }
          return fetchResponse;
        } catch (error) {
          console.error('[SW] Fetch failed:', error);
          throw error;
        }
      })
    );
    return;
  }

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle App Shell & Static Assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Update cache if successful
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback could go here
      });

      return cachedResponse || fetchPromise;
    })
  );
});
