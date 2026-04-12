// sw.js
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
    // Este evento vacío es OBLIGATORIO para que Chrome muestre el botón de Instalar.
});