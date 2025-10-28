// 캐시 이름 정의
const CACHE_NAME = 'my-account-book-cache-v1';

// 캐시할 파일 목록 (A안이므로 index.html만 캐시해도 대부분의 기능이 동작함)
const FILES_TO_CACHE = [
  '/index.html',
  '/' // start_url 대응
];

// 1. 서비스 워커 설치 (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('서비스 워커: 캐시 파일 저장 중...');
        // FILES_TO_CACHE 목록의 파일들을 캐시에 추가
        return cache.addAll(FILES_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// 2. 서비스 워커 활성화 (Activate)
// 이전 버전의 캐시를 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('서비스 워커: 이전 캐시 삭제 중...', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. 네트워크 요청 처리 (Fetch)
// 'Cache First' 전략: 요청이 오면 캐시에서 먼저 찾고, 없으면 네트워크로 요청
self.addEventListener('fetch', (event) => {
  // POST 요청 등은 캐시하지 않음 (API 요청 등)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 응답이 있으면 캐시된 응답 반환
        if (response) {
          return response;
        }

        // 캐시에 없으면 네트워크로 요청
        return fetch(event.request).then(
          (response) => {
            // 응답이 유효하지 않으면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // (선택적) 네트워크 응답을 캐시에 저장
            // const responseToCache = response.clone();
            // caches.open(CACHE_NAME)
            //   .then((cache) => {
            //     cache.put(event.request, responseToCache);
            //   });

            return response;
          }
        );
      })
      .catch(() => {
        // 오프라인 상태에서 캐시에도 없는 경우 (네트워크 오류)
        // 오프라인 기본 페이지를 보여줄 수 있으나, 
        // A안에서는 index.html이 캐시되므로 이 경우는 거의 발생하지 않음.
        console.log('네트워크 연결 실패 및 캐시된 리소스 없음');
      })
  );
});
