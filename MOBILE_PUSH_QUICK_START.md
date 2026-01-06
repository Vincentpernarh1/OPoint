# Mobile Push Notifications Setup Guide

## Quick Start

### 1. Run Database Migration
Run this in Supabase SQL Editor:
```sql
-- See create_mobile_push_tokens_table.sql
```

### 2. Set up Firebase (Android)

#### A. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project" or select existing
3. Enter project name: "OPoint" → Continue
4. Disable Google Analytics (optional) → Create project

#### B. Add Android App
1. In Firebase console → Click Android icon
2. Android package name: `com.vpena.onpoint` (from capacitor.config.ts)
3. App nickname: "OPoint Android"
4. Click "Register app"

#### C. Download google-services.json
1. Download `google-services.json`
2. Place it here: `android/app/google-services.json`

#### D. Get Firebase Server Key
1. Firebase Console → Project Settings (gear icon)
2. Cloud Messaging tab
3. Under "Cloud Messaging API (Legacy)", enable it if needed
4. Copy "Server key"
5. Add to `.env`:
```env
FCM_SERVER_KEY=your-server-key-here
```

### 3. Update Android Project

**android/build.gradle:**
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**android/app/build.gradle:**
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
}
```

### 4. Sync Capacitor
```bash
npx cap sync android
```

### 5. Build & Test
```bash
# Build the app
npm run build
npx cap copy
npx cap sync

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Build → Make Project
2. Run → Run 'app'

## Testing

1. Install app on phone
2. Login
3. Go to Profile → Enable Push Notifications
4. You'll see: "📱 Push registration success" in logs
5. Post an announcement from another account
6. Phone should receive notification! 🎉

## Troubleshooting

### App doesn't request permission
- Check Android Manifest has notification permission
- Ensure google-services.json is in android/app/

### No token received
- Check FCM is enabled in Firebase console
- Check google-services.json package name matches capacitor.config.ts

### Notifications not received
- Verify FCM_SERVER_KEY in .env
- Check server logs for "Stored mobile push token"
- Make sure app is in background (Android doesn't show notifications when app is open)

## iOS Setup (Optional)

### 1. Apple Developer Account
1. developer.apple.com → Certificates, Identifiers & Profiles
2. Create App ID for com.vpena.onpoint
3. Enable Push Notifications capability

### 2. APNs Certificate
1. Create APNs certificate (.p8 key file)
2. Download .p8 file
3. Upload to Firebase: Project Settings → Cloud Messaging → APNs

### 3. Build iOS
```bash
npx cap open ios
```

In Xcode:
1. Enable Push Notifications capability
2. Build and run on device

## Current Status

✅ Code implemented for native push
✅ Database table ready
✅ Server endpoints ready
⏳ Need to complete Firebase setup
⏳ Need to test on Android device

