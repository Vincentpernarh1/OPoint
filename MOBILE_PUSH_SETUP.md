# Mobile Push Notifications Setup for Capacitor

## Problem
Web Push API doesn't work in Capacitor mobile apps. You need native push notifications.

## Solution: Install Capacitor Push Notifications Plugin

### 1. Install the Plugin
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 2. Configure Android (FCM)

#### a. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create a new project or select existing
3. Add Android app with package name: `com.vpena.onpoint`
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

#### b. Get Server Key
1. In Firebase Console → Project Settings → Cloud Messaging
2. Copy the "Server key" (legacy)
3. Add to `.env`:
```env
FCM_SERVER_KEY=your-server-key-here
```

### 3. Configure iOS (APNs)

#### a. Apple Developer Account
1. Go to https://developer.apple.com/account/
2. Certificates, Identifiers & Profiles
3. Create Push Notification certificate
4. Download and configure

#### b. Upload to Firebase
1. Firebase Console → Project Settings → Cloud Messaging
2. Upload APNs certificate

### 4. Update Code to Use Native Push

Replace the web push service with Capacitor's native push:

**src/services/pushService.ts** - Update to use Capacitor:
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const pushService = {
  async requestPermission() {
    if (!Capacitor.isNativePlatform()) {
      // Use web push for web
      return this.requestWebPush();
    }

    // Use native push for mobile
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }

    await PushNotifications.register();
  },

  async subscribe(userId) {
    if (!Capacitor.isNativePlatform()) {
      return this.subscribeWeb(userId);
    }

    // Mobile: Listen for registration
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      // Send token to server
      await fetch('/api/push/subscribe/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: token.value,
          platform: Capacitor.getPlatform() // 'ios' or 'android'
        })
      });
    });

    // Listen for push notifications
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    // Handle notification tap
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      const data = notification.notification.data;
      if (data.url) {
        window.location.href = data.url;
      }
    });
  },

  // Keep web push methods for browser
  async requestWebPush() {
    // Existing web push code...
  },

  async subscribeWeb(userId) {
    // Existing web push code...
  }
};
```

### 5. Update Server to Send Native Push

**server.js** - Add mobile push endpoint:
```javascript
// Store mobile tokens
app.post('/api/push/subscribe/mobile', async (req, res) => {
  try {
    const { userId, token, platform } = req.body;
    const tenantId = req.headers['x-tenant-id'];

    const supabase = getSupabaseAdminClient();
    
    await supabase.from('mobile_push_tokens').insert({
      user_id: userId,
      tenant_id: tenantId,
      token,
      platform,
      created_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Create new table:**
```sql
CREATE TABLE mobile_push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mobile_push_tokens_user ON mobile_push_tokens(user_id, tenant_id);
```

**Send to mobile devices:**
```javascript
async function sendMobilePushNotification(userId, notificationData) {
  const { data: tokens } = await supabase
    .from('mobile_push_tokens')
    .select('*')
    .eq('user_id', userId);

  for (const tokenData of tokens) {
    if (tokenData.platform === 'android') {
      // Send via FCM
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: tokenData.token,
          notification: {
            title: notificationData.title,
            body: notificationData.body,
            icon: notificationData.icon,
            sound: 'default'
          },
          data: notificationData.data
        })
      });
    } else if (tokenData.platform === 'ios') {
      // Send via APNs (requires node-apn or similar)
      // Implementation depends on your APNs setup
    }
  }
}
```

### 6. Rebuild Mobile Apps
```bash
npm run build
npx cap sync
npx cap open android
npx cap open ios
```

Then rebuild in Android Studio / Xcode.

## Quick Test
1. Install app on phone
2. Login
3. Go to Profile → Enable notifications
4. Post announcement
5. Should receive native push notification

## Current Status
✅ Web push working (2 users received notifications)
❌ Mobile push not configured (needs native plugin)

## Next Steps
1. Install `@capacitor/push-notifications`
2. Set up Firebase project
3. Update code to detect platform
4. Add mobile token storage
5. Rebuild and test
