// Custom Workbox plugin to add push notification support to generated service worker

export default function pushNotificationPlugin() {
  return {
    name: 'push-notification-plugin',
    generateBundle(options, bundle) {
      // Find the service worker file
      const swFile = bundle['sw.js'];
      if (swFile && swFile.type === 'asset') {
        // Append push notification handlers to the generated service worker
        swFile.source += `

// ===== CUSTOM PUSH NOTIFICATION HANDLERS =====
self.addEventListener('push', event => {
  console.log('🔔 Push event received');
  
  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📨 Push notification data:', data);
    
    const title = data.title || 'OPoint Notification';
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: data.data || {},
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      tag: data.tag || 'notification',
      renotify: true
    };

    console.log('📢 Showing notification:', title);
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => console.log('✅ Notification displayed'))
        .catch(err => console.error('❌ Notification error:', err))
    );
  } catch (error) {
    console.error('❌ Push handler error:', error);
  }
});

self.addEventListener('notificationclick', event => {
  console.log('👆 Notification clicked');
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('✅ Push notification handlers registered');
`;
      }
    }
  };
}
