/* Service worker minimo do App Onix: so repassa os pedidos, nunca guarda copia.
   Existe para o Chrome reconhecer a pagina como instalavel — e para nao correr
   o risco de servir versao velha depois de um deploy. */
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request)); });
