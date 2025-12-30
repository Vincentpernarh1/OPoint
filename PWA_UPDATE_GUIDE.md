# PWA Update & Testing Guide

## ✅ Latest Changes (Completed)
- **Offline Submission Support**: Leave requests and expense claims can now be submitted offline
- **Improved Error Messages**: Clear distinction between "no cache" vs "connection error"
- **Better User Guidance**: Helpful messages when cache is empty
- **Offline Status Indicators**: "⏳ Pending Sync" badge for unsynced submissions

## 📱 How to Update Your Installed PWA

### CRITICAL: PWA apps cache aggressively, so you MUST reinstall to get the latest version

### Method 1: Uninstall and Reinstall (Recommended)
1. **Uninstall the old PWA**:
   - iOS: Long-press the app icon → Remove App → Delete
   - Android: Long-press → Uninstall or App Info → Uninstall
   - Desktop: Right-click → Uninstall

2. **Clear browser cache** (important!):
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Safari: Settings → Safari → Clear History and Website Data

3. **Reinstall the PWA**:
   - Open the website in your browser
   - Wait for the "Install" prompt or use browser menu → Install App
   - Confirm installation

### Method 2: Force Update (May Not Always Work)
1. Open the PWA
2. Pull down to refresh on the home page
3. If you see a "New version available" message, click "Reload"
4. If nothing happens, use Method 1 instead

## 🧪 Testing Offline Mode (STEP-BY-STEP)

### IMPORTANT: You MUST load data online FIRST before going offline!

### Step 1: Initial Setup (Online)
1. **Connect to internet** (WiFi or mobile data)
2. **Open the PWA** and log in
3. **Visit EVERY page** you want to use offline:
   - ✅ Announcements (swipe to Announcements)
   - ✅ Leave Management (go to Leave tab)
   - ✅ Expenses (go to Expenses tab)
   - ✅ Payslips (go to Payslips tab)
   - ✅ Approval Requests (HR/Admin only)
   - ✅ Reports (HR/Admin only)
4. **Wait for data to load** on each page (you should see real data, not errors)
5. **Pull down to refresh** on each page to ensure cache is populated

### Step 2: Test Offline Mode
1. **Turn OFF internet**:
   - Enable Airplane Mode, OR
   - Turn off WiFi AND mobile data
2. **Open the PWA** (should still work)
3. **Check each page**:
   - Should see "📴 Offline - Showing cached data" messages
   - Should see data you loaded in Step 1
   - If you see "No cached data", you didn't visit that page online first!

### Step 3: Test Offline Submissions (NEW!)
1. **Still offline**, try to submit:
   - **Leave Request**: Go to Leave → Fill form → Submit
   - **Expense Claim**: Go to Expenses → Fill form → Submit
2. **Expected behavior**:
   - ✅ You should see: "📴 Offline - [Request] saved locally. Will sync when online."
   - ✅ The request should appear in the list with "⏳ Pending Sync" status
   - ✅ The form should clear (submission successful)
   - ❌ If you see "Failed to fetch", the PWA is not updated (reinstall!)

### Step 4: Test Sync When Back Online
1. **Turn internet back ON**
2. **Pull down to refresh** on the Leave/Expenses page
3. **Expected behavior**:
   - ✅ "⏳ Pending Sync" items should sync to server
   - ✅ Status should change from "Pending Sync" to "Pending" or "Approved"
   - ✅ Offline ID (`offline-123456`) should change to server ID

## 🐛 Troubleshooting

### "Failed to fetch" when submitting offline
- **Cause**: Old PWA version still installed
- **Fix**: Uninstall and reinstall the PWA (see Method 1 above)

### "No cached data available" when offline
- **Cause**: You never visited that page while online
- **Fix**: 
  1. Go back online
  2. Visit the page and let it load
  3. Pull down to refresh
  4. Now go offline and test again

### App won't update automatically
- **Cause**: Service worker caching is aggressive
- **Fix**: Always uninstall and reinstall for major updates

### Announcements work offline but Payslips don't
- **Cause**: You visited Announcements online but not Payslips
- **Fix**: Go online, visit Payslips, wait for data to load, then test offline

### "Pending Sync" items not syncing when back online
- **Cause**: Sync happens on page refresh or app restart
- **Fix**: Pull down to refresh or close and reopen the app

## 📋 Expected Messages

### When Using Cache (Offline)
- ✅ "📴 Offline - Showing cached announcements"
- ✅ "📴 Offline - Showing local expense data"
- ✅ "📴 Offline - Showing cached payslips"
- ✅ "📴 Offline - Showing cached employee list"

### When No Cache Available
- ℹ️ "No cached data available. Please connect to internet and load data first."
- ℹ️ "No cached employee data. Please connect and visit Reports page first."
- ℹ️ "No cached payslip data. Please connect to internet and load payslips first."

### When Submitting Offline
- ✅ "📴 Offline - Leave request saved locally. Will sync when online."
- ✅ "📴 Offline - Expense saved locally. Will sync when online."

### When Data Synced
- ✅ "✅ Leave request submitted successfully!"
- ✅ "✅ Expense claim submitted successfully!"

## 🔄 Offline Data Lifecycle

```
1. User goes ONLINE → Visits page → Data cached to IndexedDB (24hr expiry)
2. User goes OFFLINE → Visits page → Reads from IndexedDB cache
3. User submits form OFFLINE → Saves to IndexedDB with synced=false
4. User goes back ONLINE → Pull to refresh → Syncs to server → Updates local data
```

## 🚀 Deployment Checklist

After rebuilding:
- [ ] Uninstall old PWA from test devices
- [ ] Clear browser cache
- [ ] Reinstall PWA from latest build
- [ ] Load all pages online first (cache population)
- [ ] Test offline reads (should show cached data)
- [ ] Test offline writes (should save locally with "Pending Sync")
- [ ] Test sync when back online (should upload queued data)

## 📝 Technical Details

### IndexedDB Stores
- `announcements`: Cached announcements (24hr TTL)
- `users`: Employee list for reports dropdown (24hr TTL)
- `payslips`: Payslip history (24hr TTL)
- `cachedData`: Generic cache for approval requests (24hr TTL)
- `leaveRequests`: Leave requests with `synced: false` flag
- `expenses`: Expense claims with `synced: false` flag
- `syncQueue`: General API call queue for background sync
- `timePunches`: Time clock punches (always synced)

### Sync Strategy
- **Reads**: Try API first → Fallback to cache on error
- **Writes**: Try API first → Save to IndexedDB if offline → Sync when connection returns
- **Cache Expiry**: 24 hours (configurable in offlineStorage.ts)
- **Sync Trigger**: Page refresh, app restart, or manual pull-to-refresh

## 📞 Need Help?

If offline mode still doesn't work after following this guide:
1. Check browser console for errors (F12 → Console tab)
2. Verify IndexedDB has data (F12 → Application → IndexedDB → vPenaDB)
3. Ensure you're testing with the LATEST build (check timestamp in manifest.webmanifest)
4. Try on a different device or browser
