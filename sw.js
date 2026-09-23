/* yomikaki web Service Worker
   単一HTMLアプリなので、必要ファイルを全てキャッシュしてオフライン動作させる。
   データは IndexedDB にあるため SW はアプリ本体の配信のみを担当する。 */
/* github.io は他の PWA と同じオリジンを共有している。キャッシュ名には必ず
   この接頭辞を付け、消すときも自分の分だけ消すこと（他のアプリのキャッシュを消さない）。 */
const CACHE_PREFIX = "yomikaki-web-";
const CACHE = CACHE_PREFIX + "v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      // アイコン等が無い環境でもインストールを失敗させない
      // cache: "reload" でブラウザの HTTP キャッシュを通さず、必ず最新を取る
      .then(cache => Promise.allSettled(
        ASSETS.map(a => cache.add(new Request(a, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)   // 自分の古い版だけ
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 外部リクエストは素通し

  // ネットワーク優先・失敗時キャッシュ（更新をすぐ反映しつつオフラインでも動く）
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
