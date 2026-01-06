// Service worker for push notifications
// IMPORTANT: This file must be plain JavaScript (no imports) because it runs in a Service Worker context

const CACHE_NAME = 'onpoint-v1';

// VitePWA will inject the precache manifest here
self.__WB_MANIFEST;

// Install event - cache basic assets
self.addEventListener('install', event => {
  console.log('⚙️ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.svg'
      ]).catch(err => console.log('Cache add failed:', err));
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event handler - THIS IS THE KEY PART FOR NOTIFICATIONS
self.addEventListener('push', event => {
  console.log('🔔 Push event received in service worker');
  
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

    console.log('📢 Calling showNotification with:', title, options);
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('✅ Notification displayed successfully!');
        })
        .catch(err => {
          console.error('❌ Error displaying notification:', err);
        })
    );
  } catch (error) {
    console.error('❌ Error in push event handler:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});