const CACHE_NAME = 'antigravity-v1.0.1';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/components.css',
    './css/game.css',
    './js/app.js',
    './js/engine/gameEngine.js',
    './js/engine/stats.js',
    './js/engine/textGenerator.js',
    './js/engine/audioEngine.js',
    './js/engine/haptics.js',
    './js/engine/voiceEngine.js',
    './js/ui/renderer.js',
    './js/ui/inputHandler.js',
    './icon.svg',
    './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim()) // Claim clients immediately
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});
