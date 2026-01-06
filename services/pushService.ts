import Cookies from 'js-cookie';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

export const pushService = {
  // Check if push notifications are supported
  isSupported(): boolean {
    // Native mobile always supports push
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    // Web requires service worker and PushManager
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission | 'granted' | 'denied'> {
    if (Capacitor.isNativePlatform()) {
      // Native mobile permissions
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted' ? 'granted' : 'denied';
    }

    // Web permissions
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }
    return await Notification.requestPermission();
  },

  // Get VAPID public key from server
  async getVapidPublicKey(): Promise<string> {
    const response = await fetch('/api/push/vapid-public-key');
    const data = await response.json();
    return data.publicKey;
  },

  // Subscribe to push notifications
  async subscribe(userId: string): Promise<PushSubscription | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native mobile push
        await this.subscribeNative(userId);
        return null;
      }

      // Web push
      return await this.subscribeWeb(userId);
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  },

  // Subscribe to web push notifications
  async subscribeWeb(userId: string): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = await this.getVapidPublicKey();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId
        }),
        credentials: 'include'
      });

      return subscription;
    } catch (error) {
      console.error('Web push subscription failed:', error);
      return null;
    }
  },

  // Subscribe to native mobile push notifications
  async subscribeNative(userId: string): Promise<void> {
    console.log('📱 Subscribing to native push notifications...');

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration success
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('📱 Push registration success, token: ' + token.value);
      
      // Send token to server
      await fetch('/api/push/subscribe/native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: token.value,
          platform: Capacitor.getPlatform() // 'ios' or 'android'
        }),
        credentials: 'include'
      });
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('📱 Push registration error: ', error);
    });

    // Listen for push notifications received while app is open
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📱 Push received: ', notification);
    });

    // Listen for notification taps
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('📱 Push action performed: ', notification);
      const data = notification.notification.data;
      if (data && data.url) {
        window.location.href = data.url;
      }
    });
  },

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            userId
          }),
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
    }
  },

  // Send test notification
  async sendTestNotification(userId: string): Promise<void> {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: 'Test Notification',
        body: 'This is a test push notification from Opoint!',
        icon: '/favicon.svg',
        data: { url: '/announcements' }
      }),
      credentials: 'include'
    });
  },

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};