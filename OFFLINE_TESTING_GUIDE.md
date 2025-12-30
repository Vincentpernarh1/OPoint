# 🔧 OFFLINE MODE - TESTING & TROUBLESHOOTING GUIDE

## ⚠️ IMPORTANT: FIRST-TIME SETUP REQUIRED

**The offline mode requires you to load data ONLINE first before it can work offline.**

Think of it like this: The app needs to "download" your data to your phone's storage before it can show it to you without internet.

---

## 📱 STEP-BY-STEP TESTING GUIDE

### **STEP 1: Initial Data Loading (ONLINE)**
**❗ You MUST do this first with internet ON**

1. ✅ **Connect to WiFi/Mobile Data**
2. ✅ **Open the installed PWA app**
3. ✅ **Log in to your account**
4. ✅ **Visit each page to cache the data:**
   - Go to **Dashboard** (loads announcements)
   - Go to **Payslips** (loads payslip history)
   - Go to **Expenses** (loads expense claims)
   - Go to **Leave Management** (loads leave requests)
   - Go to **Approvals** if you're Admin/HR (loads approval data)
   - Go to **Reports** if you're Admin (loads employee list)

5. ✅ **Wait for each page to fully load** before moving to the next

**What's happening:** The app is saving data to your phone's IndexedDB storage for offline use.

---

### **STEP 2: Test Offline Mode**

Now that data is cached, test offline:

1. **Turn OFF internet** (Airplane mode or disable WiFi)
2. **Close and reopen the app**
3. **Test each page:**

#### ✅ **Announcements (Dashboard)**
- Should show previously loaded announcements
- No error message

#### ✅ **Payslips**
- Should show previously loaded payslip history
- May show: "📴 Offline - Showing cached payslip data"

#### ✅ **Expenses**
- Should show previously loaded expense claims
- Unsynced expenses show "Pending Sync"

#### ✅ **Leave Requests**
- Should show previously loaded leave history
- Unsynced leaves show "⏳ Pending Sync"

#### ✅ **Approvals (Admin/HR only)**
- Should show cached approval requests
- May show: "📴 Offline - Showing cached approval data"

---

### **STEP 3: Submit Data Offline**

**Note:** You can submit NEW data offline, but you cannot VIEW data you've never loaded before.

1. **While OFFLINE:**
   - ✅ Submit a new expense claim
   - ✅ Submit a new leave request
   - ✅ Clock in/out (if using Time Clock)

2. **What you'll see:**
   - New items appear in your list
   - Status shows "Pending Sync" or "⏳ Pending Sync"
   - Browser console shows: "💾 Expense saved (local)"

3. **Turn internet back ON**
4. **Wait 5-10 seconds**
5. **Check console for:**
   - "🌐 Online - ready to sync"
   - "🔁 Processing sync queue"
   - "✅ Queue request marked done"

6. **Verify:**
   - "Pending Sync" status disappears
   - Data now shows proper status (Pending/Approved)

---

## ❌ ERROR MESSAGES EXPLAINED

### **"📴 Offline - No cached data available. Please connect to internet and load data first."**

**Meaning:** You tried to view a page offline, but you never visited it online.

**Solution:**
1. Turn internet back ON
2. Visit that page and let it load completely
3. Turn internet OFF and try again

---

### **"Failed to fetch"** or **"Failed to load"**

**Meaning:** You're offline AND no cached data exists.

**Solution:**
1. Connect to internet
2. Load the page/data you want to access
3. Data will be cached for future offline use

---

### **"Pending Sync"** or **"⏳ Pending Sync"**

**Meaning:** You submitted this item while offline. It's saved locally and waiting for internet.

**Solution:**
- This is NORMAL and EXPECTED
- Data is safe in local storage
- Will automatically sync when internet returns
- Do NOT delete or resubmit

---

## 🧪 QUICK TEST CHECKLIST

**WITH INTERNET ON:**
- [ ] Login successfully
- [ ] Visit Dashboard - announcements load
- [ ] Visit Payslips - payslips load
- [ ] Visit Expenses - expense claims load
- [ ] Visit Leave Management - leave requests load
- [ ] Visit Approvals (Admin) - requests load
- [ ] Visit Reports (Admin) - employee list loads

**WITH INTERNET OFF:**
- [ ] Dashboard shows cached announcements
- [ ] Payslips shows cached history
- [ ] Expenses shows cached claims
- [ ] Leave Management shows cached requests
- [ ] Can submit new expense offline
- [ ] Can submit new leave request offline
- [ ] New items show "Pending Sync"

**INTERNET BACK ON:**
- [ ] Console shows "🌐 Online - ready to sync"
- [ ] Console shows "🔁 Processing sync queue"
- [ ] "Pending Sync" items update to proper status
- [ ] No data lost

---

## 🐛 TROUBLESHOOTING

### **Problem: "Nothing shows when offline"**

**Check:**
1. Did you visit that page ONLINE first?
2. Did you wait for data to load completely?
3. Check browser console for errors

**Fix:**
- Connect to internet
- Visit each page and wait for data to load
- Data will now be cached

---

### **Problem: "Submit fails when offline"**

**Check:**
1. Is the app actually offline? (Check WiFi/data icons)
2. Check browser console for errors
3. Check if you're logged in properly

**Expected Behavior:**
- Submit should work offline
- Item appears with "Pending Sync" status
- Item syncs when internet returns

**If still failing:**
- Try reloading the page
- Check if you're logged in
- Clear app cache and try again: Settings → Clear Data

---

### **Problem: "Data doesn't sync when internet returns"**

**Check:**
1. Open browser console (if testing in browser)
2. Look for sync messages
3. Wait at least 10-15 seconds after connection returns

**Manual Sync:**
- Reload the page
- Data should sync automatically
- Check "Pending Sync" items disappear

---

## 🔍 DEBUGGING IN BROWSER

**For testing on desktop browser:**

1. **Open DevTools:** Press F12
2. **Go to Application tab**
3. **Check IndexedDB:**
   - Expand "IndexedDB"
   - Click "vpena-onpoint-offline"
   - Inspect stores:
     - `announcements` - Cached announcements
     - `expenses` - Unsynced expenses
     - `leaveRequests` - Unsynced leaves
     - `payslips` - Cached payslips
     - `users` - Cached employees
     - `cachedData` - Cached approval data

4. **Check Console for messages:**
   - "💾 Cached X announcements..."
   - "📴 Offline - data will be stored locally"
   - "🌐 Online - ready to sync"
   - "🔁 Processing sync queue"

5. **Simulate Offline:**
   - Go to Network tab
   - Change "Online" to "Offline"
   - Test app behavior

---

## ✅ EXPECTED BEHAVIOR SUMMARY

| **Action** | **Online** | **Offline (No Cache)** | **Offline (Has Cache)** |
|------------|-----------|----------------------|------------------------|
| View Announcements | ✅ Load from API | ❌ Error: "No cached data" | ✅ Show cached |
| View Payslips | ✅ Load from API | ❌ Error: "No cached data" | ✅ Show cached |
| View Expenses | ✅ Load from API | ❌ Error: "No cached data" | ✅ Show cached + local |
| View Leaves | ✅ Load from API | ❌ Error: "No cached data" | ✅ Show cached + local |
| Submit Expense | ✅ Save to API | ✅ Save locally | ✅ Save locally |
| Submit Leave | ✅ Save to API | ✅ Save locally | ✅ Save locally |

**Cache Duration:** 24 hours

**Sync Trigger:** Automatic when internet returns

---

## 📞 STILL HAVING ISSUES?

If problems persist:

1. **Clear all offline data:**
   - Browser: DevTools → Application → IndexedDB → Delete database
   - App: Settings → Clear Data (if available)

2. **Reinstall PWA:**
   - Uninstall app from phone
   - Reinstall from browser

3. **Check console logs:**
   - Look for errors in red
   - Share error messages for support

4. **Verify internet connection:**
   - Try loading other websites
   - Check if API server is accessible

---

## 🎯 REMEMBER

**Offline mode = View cached + Submit new**

**NOT = Load new data without internet**

You must load data online FIRST, then it works offline.

---

**Last Updated:** December 30, 2025  
**Build:** Production Ready  
**Status:** ✅ Working with proper cache initialization
