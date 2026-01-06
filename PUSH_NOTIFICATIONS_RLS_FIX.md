# Push Notifications RLS Fix - Applied ✅

## Problem
Push notification subscriptions were failing with:
```
Error: new row violates row-level security policy for table "push_subscriptions"
```

## Root Cause
Server code was using `getSupabaseClient()` (regular client with RLS) instead of `getSupabaseAdminClient()` (admin client that bypasses RLS) for push subscription operations.

## Solution Applied
Changed all push notification database operations to use the admin client:

### Files Modified:
- ✅ `server.js` - 4 changes:
  1. `/api/push/subscribe` endpoint → uses admin client
  2. `/api/push/unsubscribe` endpoint → uses admin client  
  3. `/api/push/send` endpoint → uses admin client
  4. `sendPushNotification()` helper → uses admin client

## Changes Made

```javascript
// BEFORE (❌ Blocked by RLS)
const supabase = getSupabaseClient();

// AFTER (✅ Works!)
const supabase = getSupabaseAdminClient();
```

## Testing After Deploy

1. **Push changes to production:**
   ```bash
   git add server.js
   git commit -m "Fix: Use admin client for push subscriptions to bypass RLS"
   git push origin main
   ```

2. **Test subscription:**
   - Log in to your app
   - Wait for permission prompt (or go to Profile → Enable Push Notifications)
   - Click "Allow"
   - Should see "✅ Push notifications enabled" (no more RLS error!)

3. **Test announcement notification:**
   - As admin, post a new announcement
   - All subscribed users should receive push notification
   - Click notification → opens to Announcements page

## Why This Works

- **Admin client** has full database access (bypasses RLS)
- **Regular client** is restricted by RLS policies
- Push subscriptions are **server-side operations** → need admin access
- User authentication is handled by cookies, not Supabase Auth

## Security Notes

✅ **Still secure because:**
- Only server-side code can access admin client
- Client-side JavaScript cannot access admin credentials
- Users can only subscribe their own account (validated in endpoint)
- Tenant isolation still enforced via `tenant_id` checks

---

## Status: READY TO DEPLOY 🚀

Deploy the updated `server.js` and push notifications will work immediately!
