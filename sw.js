// ── 성경읽고 레벨업 Service Worker ──
const CACHE_NAME = 'bible-quest-v2';
const OFFLINE_URL = '/';

// 캐시할 핵심 파일들
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── 설치: 핵심 파일 프리캐시 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── 활성화: 오래된 캐시 삭제 ──
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

// ── Fetch: Network First 전략 (Firebase 요청은 항상 네트워크) ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase / Google API / EmailJS 는 캐시 안 함
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('emailjs') ||
    url.hostname.includes('googleapis') ||
    event.request.method !== 'GET'
  ) {
    return; // 기본 네트워크 요청
  }

  // 나머지: Network First, 실패 시 캐시 fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공한 응답 캐시에 저장
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 오프라인: 캐시에서 가져오기
        return caches.match(event.request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// ── 푸시 알림 (추후 확장용) ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '성경읽고 레벨업', {
      body: data.body || '새로운 알림이 있어요!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});
