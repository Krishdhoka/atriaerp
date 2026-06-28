/* AtriaERP — self-destruct service worker (kill switch).
 * Earlier beta builds registered a caching service worker which could serve a
 * stale snapshot (blank screen). This version removes itself: it clears all
 * caches, unregisters, and reloads open tabs so the browser loads fresh files
 * straight from the server. No offline caching in the beta.
 */
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} }); })
      .catch(function () {})
  );
});
/* No fetch handler — all requests go straight to the network. */
