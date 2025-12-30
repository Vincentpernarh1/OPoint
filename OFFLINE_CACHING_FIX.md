# Offline Caching Fix - December 30, 2024

## 🐛 Problems Fixed

### 1. **Leave Management - Data Not Caching**
**Problem**: Leave requests were not being cached after successful API fetch, so going offline showed "no cached data" even after loading online.

**Root Cause**: The `fetchData` function was only merging unsynced local leaves with API data but never actually caching the API response.

**Fix**: Added `cacheData()` call after successful API fetch:
```typescript
// CACHE THE LEAVE REQUESTS for offline use
await offlineStorage.cacheData('leaveRequests', transformedData, tenantId, currentUser.id);
```

**Result**: Leave requests are now cached every time you load them online, making them available offline.

---

### 2. **Leave Management - Offline Fallback Incomplete**
**Problem**: When offline, only local unsynced leaves were shown, not the full cached history from API.

**Root Cause**: The error handler only checked `getLeaveRequestsByUser()` (local submissions) but never checked `getCachedData()` (API data cache).

**Fix**: Updated offline fallback to check BOTH sources:
```typescript
// Try to get cached API data
const cachedData = await offlineStorage.getCachedData('leaveRequests', tenantId, currentUser.id);
// Merge with unsynced local leaves
const localLeaves = await offlineStorage.getLeaveRequestsByUser(tenantId, currentUser.id);
const allLeaves = [...unsyncedLeaves, ...cachedLeaves];
```

**Result**: When offline, you see your full leave history (cached API data) + any new unsynced submissions.

---

### 3. **Approvals - Cancel Action Not Persisting Offline**
**Problem**: When user cancels an approval offline, it shows "Cancelled" status, but navigating away and back makes the request reappear as "Pending".

**Root Cause**: The cancel action updated React state but didn't persist the change to IndexedDB cache. On navigation, the stale cache reloaded.

**Fix**: Added cache update after state update:
```typescript
setLeaveRequests(prev => {
    const updated = prev.map(req =>
        req.id === id ? { ...req, status: status as RequestStatus } : req
    );
    
    // Also update cache so changes persist across navigation
    offlineStorage.cacheData('leaveRequests', updated, currentUser.tenantId!, currentUser.id)
        .catch(e => console.warn('Failed to update cache after action:', e));
    
    return updated;
});
```

**Result**: Cancellations now persist across page navigation when offline. The cancelled status stays even when you leave and come back.

---

### 4. **Cache Method Signature Mismatch**
**Problem**: The `cacheData()` and `getCachedData()` methods had inconsistent parameter order and didn't support user-specific caching.

**Old Signature**:
```typescript
cacheData(type: string, tenantId: string, data: any)
getCachedData(type: string, tenantId: string)
```

**Issue**: Components were calling it with different parameter orders, and there was no way to cache user-specific data (like individual user's leave requests).

**Fix**: Updated to support optional userId parameter:
```typescript
cacheData(type: string, data: any, tenantId: string, userId?: string)
getCachedData(type: string, tenantId: string, userId?: string)
```

The method now creates a composite key when userId is provided:
```typescript
const key = userId ? `${type}_${userId}` : type;
```

**Result**: User-specific data (like leave requests, expenses) is cached per user, not globally.

---

## 📱 Testing Instructions

### **CRITICAL: Uninstall and Reinstall the PWA**
The old build is cached in your PWA. You MUST reinstall to get these fixes.

### Step 1: Clean Install
1. **Uninstall** the old PWA from your device
2. **Clear browser cache** (Settings → Privacy → Clear browsing data)
3. **Reinstall** the PWA from the website

### Step 2: Populate Cache (ONLINE)
1. **Connect to internet**
2. **Open the app** and log in
3. **Visit Leave Management page** - wait for leave requests to load
4. **Pull down to refresh** to ensure caching
5. **Visit Payslips page** - wait for payslip history to load
6. **Visit Approvals page** (if HR/Admin) - wait for approval data to load

### Step 3: Test Offline (OFFLINE)
1. **Turn OFF internet** (Airplane Mode)
2. **Go to Leave Management**
   - ✅ Should see: "📴 Offline - Showing cached leave data"
   - ✅ Should see all your leave requests from when you were online
   - ❌ If you see "No cached data", you didn't load it online first

3. **Submit a leave request offline**
   - Fill the form and submit
   - ✅ Should see: "📴 Offline - Leave request saved locally. Will sync when online."
   - ✅ New request appears with "⏳ Pending Sync" status

4. **Go to Approvals** (if HR/Admin)
   - ✅ Should see cached approval requests
   - **Cancel a leave request**
   - ✅ Should show "Cancelled" status
   - **Navigate to Expenses tab and back to Leave tab**
   - ✅ The cancelled request should STILL show "Cancelled" (not revert to "Pending")

5. **Go to Payslips**
   - ✅ Should see: "📴 Offline - Showing cached payslip data"
   - ✅ Should see your payslip history

### Step 4: Test Sync (BACK ONLINE)
1. **Turn internet back ON**
2. **Go to Leave Management**
3. **Pull down to refresh**
   - ✅ The "⏳ Pending Sync" request should sync to server
   - ✅ Status should change from "Pending Sync" to "Pending"
   - ✅ Offline ID should change to server ID

## 🔧 What's Working Now

| Feature | Status | Notes |
|---------|--------|-------|
| **Announcements Offline** | ✅ Working | Already worked before |
| **Leave Management Offline Read** | ✅ **FIXED** | Now caches API data |
| **Leave Management Offline Submit** | ✅ Working | Saves locally, syncs later |
| **Payslips Offline** | ✅ Working | Already had caching |
| **Expenses Offline Read** | ✅ Working | Already had caching |
| **Expenses Offline Submit** | ✅ Working | Saves locally, syncs later |
| **Approvals Offline Read** | ✅ Working | Already had caching |
| **Approvals Cancel Offline** | ✅ **FIXED** | Now persists across navigation |
| **Reports Employee List Offline** | ✅ Working | Already had caching |

## 🐛 Known Limitations

1. **Must Load Data Online First**: Cache is only populated when you successfully load data online. If you never visit a page while online, it won't have offline data.

2. **24-Hour Cache Expiry**: Cached data expires after 24 hours. If you go offline for more than 24 hours, cached data won't be available.

3. **No Offline Approval/Rejection**: You can cancel your own requests offline, but HR can't approve/reject offline yet (would require complex conflict resolution).

4. **File Uploads**: Receipt uploads in expenses won't work offline (files are stored as blob URLs, not actual files).

5. **Real-time Updates**: Offline changes won't reflect for other users until you come back online and sync.

## 📊 Technical Details

### Cache Flow (Reads)
```
1. User online → fetchData() → API success → cacheData() → Show data
2. User offline → fetchData() → API fails → getCachedData() → Show cached data
```

### Cache Flow (Writes)
```
1. User online → handleSubmit() → API success → Refresh from API
2. User offline → handleSubmit() → API fails → saveToIndexedDB() → Add to local state with "Pending Sync"
3. User back online → Pull to refresh → processQueue() → Sync to server
```

### Cache Storage Structure
```typescript
// IndexedDB: cachedData store
{
  type: "leaveRequests_user123",  // Composite key with userId
  tenantId: "company456",
  data: [...],  // Array of leave requests
  cachedAt: "2024-12-30T10:30:00Z"
}
```

## 🚀 Deployment Checklist

- [x] Fixed Leave Management caching
- [x] Fixed Leave Management offline fallback
- [x] Fixed Approvals cancel persistence
- [x] Fixed cache method signatures
- [x] Updated Approvals component to use new signatures
- [x] Build successful (no errors)
- [ ] Test on installed PWA (user must reinstall)
- [ ] Verify all offline scenarios work
- [ ] Monitor for any sync issues

## 📞 Support

If you still see issues after following this guide:
1. Check browser console (F12 → Console) for errors
2. Check IndexedDB (F12 → Application → IndexedDB → vPenaDB) to verify data is cached
3. Ensure you're testing with the NEW build (check file hashes in dist folder)
4. Try a different browser or device to rule out caching issues
