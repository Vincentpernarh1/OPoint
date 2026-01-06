# Push Notifications Setup Guide

Your app already has push notifications built-in! Here's how to enable them:

## 🚀 Quick Setup (3 Steps)

### Step 1: Generate VAPID Keys

Run this command once to generate your push notification keys:

```bash
node generate-vapid-keys.js
```

This will output something like:
```
VAPID_PUBLIC_KEY=BHx3kRy...
VAPID_PRIVATE_KEY=k5F9pL...
```

### Step 2: Add Keys to Environment

Create or update your `.env` file with the generated keys:

```env
VAPID_PUBLIC_KEY=BHx3kRy... (paste your public key here)
VAPID_PRIVATE_KEY=k5F9pL... (paste your private key here)
```

⚠️ **Important**: Never commit these keys to Git! Add `.env` to `.gitignore`

### Step 3: Create Database Table

Go to your Supabase SQL Editor and run the script in `create_push_subscriptions_table.sql`

Or run it from your project:

```bash
# If you have psql installed
psql -h your-supabase-host.supabase.co -U postgres -d postgres -f create_push_subscriptions_table.sql
```

---

## ✅ How It Works

### 1. Automatic Subscription
- When users log in, they'll be asked to allow notifications (after 3 seconds)
- If they click "Allow", they're automatically subscribed
- Existing users can enable/disable in their Profile settings

### 2. Announcement Notifications
Your app already sends notifications when:
- ✨ A new announcement is published by admin/HR
- 📢 The notification shows the announcement title and author
- 🔔 Users see a browser notification even when app is closed

### 3. User Control
Users can manage notifications in **Profile → Push Notifications**:
- Toggle on/off anytime
- Test notifications
- See subscription status

---

## 🔧 Testing

### Test on localhost:

1. Start your server:
```bash
npm start
```

2. Open your app in browser (must be HTTPS or localhost)

3. Log in as any user

4. You should see a permission prompt after 3 seconds

5. Click "Allow"

6. As admin, post a new announcement

7. All subscribed users will receive a push notification!

### Test the notification manually:

Go to Profile page and click "Send Test Notification" button.

---

## 📱 Mobile Support

### iOS (Safari)
- ✅ Works on iOS 16.4+ 
- ✅ Must add app to Home Screen first
- ✅ Requires HTTPS in production

### Android (Chrome/Firefox)
- ✅ Works in browser directly
- ✅ Works as installed PWA
- ✅ Requires HTTPS in production

### Desktop
- ✅ Chrome, Firefox, Edge (all platforms)
- ⚠️ Safari requires macOS 13+

---

## 🌐 Production Deployment

### Railway/Vercel/Heroku:

1. Add environment variables in your dashboard:
```
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

2. Ensure your app is served over HTTPS

3. Deploy!

### Verify it works:

```bash
# Check if server has VAPID configured
curl https://your-app.com/api/push/vapid-public-key
```

Should return:
```json
{"publicKey":"BHx3kRy..."}
```

---

## 🐛 Troubleshooting

### "Push notifications disabled - VAPID keys not configured"

**Fix**: Make sure VAPID keys are set in `.env` and restart your server

### "Permission denied" or no prompt shown

**Fix**: 
- Clear site settings in browser
- Reset notification permissions
- Try in incognito mode first

### "ServiceWorker registration failed"

**Fix**: 
- Check browser console for errors
- Ensure `/sw.js` is accessible
- Verify HTTPS (required for production)

### No notifications received

**Fix**:
1. Check browser notification settings (not blocked)
2. Verify user has enabled notifications in Profile
3. Check server logs for push errors
4. Test with "Send Test Notification" button

### Database error: "table push_subscriptions does not exist"

**Fix**: Run the SQL script in `create_push_subscriptions_table.sql`

---

## 📊 Monitoring

Check your server logs for:

```
✅ Push notifications enabled  ← Keys configured
📧 Email sent successfully    ← Notifications working
⚠️  Push notifications disabled ← Missing keys
```

Check browser console for:

```
SW registered: ServiceWorkerRegistration ← Service worker OK
✅ Push notifications enabled ← User subscribed
```

---

## 🔐 Security Notes

- VAPID keys are like passwords - keep them secret!
- Each environment (dev/staging/prod) should have different keys
- Users must explicitly grant permission
- Notifications are encrypted end-to-end
- Only users in the same tenant receive notifications

---

## 📚 Additional Features

Your push notification system supports:

### Announcement Notifications
- ✅ Automatically sent when admin posts
- ✅ Shows title and author
- ✅ Clicking opens the Announcements page

### Future Extensions (Ready to add)

You can easily add notifications for:
- 📝 Leave request approved/rejected
- ⏰ Time adjustment approved
- 💰 Payslip ready
- 📋 New company announcement

Just use the `sendPushNotification()` helper function in `server.js`!

---

## 🎉 You're Done!

Your push notification system is now ready. Run the setup steps and your users will start receiving real-time notifications!

Need help? Check the troubleshooting section or contact support.
