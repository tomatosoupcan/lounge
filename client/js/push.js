self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const title = event.data.text().split("♭")[0];
  const options = {
    body: event.data.text().split("♭")[1],
    icon: '../img/apple-touch-icon-120x120.png',
    badge: '../img/logo-dark.png',
    tag: 'test'
  };
  self.registration.getNotifications({tag: 'test'})
  .then(notifications => {
    if (notifications.length > 0) {
      options.renotify = true;
    }
  });
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({
  includeUncontrolled: true,
  type: 'window'
  }).then( activeClients => {
    if (activeClients.length > 0) {
      activeClients[0].navigate('/');
      activeClients[0].focus();
    } else {
      clients.openWindow('/');
    }
  })
);
});
