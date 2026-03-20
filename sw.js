// ── 성경읽고 레벨업 Service Worker ──
const CACHE_NAME = 'bible-quest-v3';
const OFFLINE_URL = '/';
const PUSH_SERVER = 'https://untranscendentally-bland-johnnie.ngrok-free.dev';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── 설치 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── 활성화 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('emailjs') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('ngrok') ||
    event.request.method !== 'GET'
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// ── 푸시 알림 수신 ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body || '새로운 알림이 있어요!',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || '성경읽고 레벨업', options)
  );
});

// ── 알림 클릭 시 앱 열기 ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('bible-quest-release') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('https://bible-quest-release.vercel.app' + url);
    })
  );
});
