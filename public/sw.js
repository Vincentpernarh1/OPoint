// Custom service worker for push notifications
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);

// Network first for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst()
);

// Push event handler
self.addEventListener('push', event => {
  console.log('🔔 Push event received:', event);
  
  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📨 Push data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: data.data || {},
      requireInteraction: false, // Changed to false for mobile
      silent: false,
      vibrate: [200, 100, 200], // Add vibration
      tag: 'announcement', // Group notifications
    };

    console.log('📢 Showing notification:', data.title, options);
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => console.log('✅ Notification shown successfully'))
        .catch(err => console.error('❌ Error showing notification:', err))
    );
  } catch (error) {
    console.error('❌ Error parsing push data:', error);
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