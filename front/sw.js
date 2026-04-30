self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    fetch(e.request).catch(function () {
      if (e.request.mode === 'navigate') {
        return Response.redirect('/login');
      }
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
