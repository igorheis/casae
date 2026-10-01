self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'casaê', {
    body: payload.body || 'Você tem uma nova notificação.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/badge-96.svg',
    data: { url: payload.url || '/' },
    vibrate: [90, 40, 90],
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const open = windows.find(client => client.url === target);
    return open ? open.focus() : clients.openWindow(target);
  }));
});
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
