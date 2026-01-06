# 🔔 Push Notifications - Quick Reference

## Setup (First Time Only)

```bash
# 1. Generate keys
node generate-vapid-keys.js

# 2. Add to .env file (copy from terminal output)
echo "VAPID_PUBLIC_KEY=your_key" >> .env
echo "VAPID_PRIVATE_KEY=your_key" >> .env

# 3. Create database table
# Run create_push_subscriptions_table.sql in Supabase SQL Editor

# 4. Test setup
node test-push-notifications.js

# 5. Start server
npm start
```

## How Users Enable Notifications

### Option 1: Automatic (Default)
- User logs in
- After 3 seconds, browser asks "Allow notifications?"
- User clicks "Allow"
- Done! ✅

### Option 2: Manual
- User goes to Profile page
- Scrolls to "Push Notifications" section
- Clicks "Enable Push Notifications"
- Clicks "Allow" in browser prompt
- Done! ✅

## How to Send Notifications

### Announcements (Automatic)
```typescript
// Already implemented! Just post an announcement:
// 1. Go to Announcements page (as Admin/HR)
// 2. Write your announcement
// 3. Click "Post Announcement"
// 4. All subscribed users get notified automatically! 🎉
```

### Custom Notifications (For Developers)
```javascript
// In server.js, use this helper function:
await sendPushNotification(userId, {
    title: 'Your Title',
    body: 'Your message here',
    icon: '/favicon.svg',
    data: { url: '/target-page' }
});
```

## Testing

```bash
# Method 1: Post an announcement
# - Log in as Admin
# - Go to Announcements
# - Post a new announcement
# - Check other logged-in users for notification

# Method 2: Test button
# - Log in as any user
# - Go to Profile page
# - Click "Send Test Notification"
# - Check for notification
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No permission prompt | Clear browser notifications settings, reload |
| "VAPID keys not configured" | Restart server after adding keys to .env |
| No notification received | Check browser notification settings (not blocked) |
| "Table doesn't exist" | Run create_push_subscriptions_table.sql |

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Chrome (Desktop) | ✅ Full | All features work |
| Firefox (Desktop) | ✅ Full | All features work |
| Safari (macOS 13+) | ✅ Full | Requires macOS 13+ |
| Chrome (Android) | ✅ Full | Works in browser + PWA |
| Safari (iOS 16.4+) | ✅ Full | Must add to Home Screen first |

## Production Checklist

- [ ] VAPID keys generated
- [ ] Keys added to production environment variables
- [ ] Database table created
- [ ] App served over HTTPS
- [ ] Service worker accessible at `/sw.js`
- [ ] Tested with real announcement

## API Endpoints

```bash
# Get public key
GET /api/push/vapid-public-key

# Subscribe user
POST /api/push/subscribe
Body: { subscription, userId }

# Unsubscribe user
POST /api/push/unsubscribe
Body: { endpoint, userId }

# Send notification (server-side only)
POST /api/push/send
Body: { userId, title, body, icon, data }
```

## Files Modified/Created

- ✅ `generate-vapid-keys.js` - Generate VAPID keys
- ✅ `create_push_subscriptions_table.sql` - Database schema
- ✅ `test-push-notifications.js` - Setup verification
- ✅ `PUSH_NOTIFICATIONS_SETUP.md` - Full documentation
- ✅ `App.tsx` - Auto-subscribe users on login
- ✅ `public/sw.js` - Service worker (already existed)
- ✅ `services/pushService.ts` - Push API (already existed)
- ✅ `server.js` - Push endpoints (already existed)

---

**Quick Start:**
1. Run `node generate-vapid-keys.js`
2. Add keys to `.env`
3. Create database table
4. Restart server
5. Log in and allow notifications
6. Post an announcement
7. See notifications! 🎉
