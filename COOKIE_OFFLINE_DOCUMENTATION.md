# Cookie Authentication & Offline Storage Implementation

## Overview
This document explains the cookie-based authentication system and offline storage capabilities added to the VPena OnPoint application.

---

## 🍪 Cookie-Based Authentication

### Why Cookies Over localStorage?

**Security Benefits:**
- **HttpOnly Flag**: Cookies can be marked as httpOnly, making them inaccessible to JavaScript (prevents XSS attacks)
- **Secure Flag**: Cookies can be sent only over HTTPS in production
- **SameSite Protection**: Prevents CSRF attacks by restricting cross-site cookie sending
- **Automatic Expiry**: Browser handles cookie expiration automatically

**Implementation:**
```typescript
// services/authService.ts
import Cookies from 'js-cookie';

authService.login(email, password)  // Sets cookies automatically
authService.getCurrentUser()         // Reads from cookies
authService.logout()                 // Clears all cookies
```

### Authentication Flow

1. **Login**:
   - User submits credentials
   - Server validates and returns user data
   - `authService` stores session token and user data in cookies
   - Cookies expire after 7 days (configurable)

2. **Session Persistence**:
   - On app load, `App.tsx` checks `authService.isAuthenticated()`
   - If valid session exists, user is automatically logged in
   - No need to re-enter credentials

3. **Logout**:
   - Cookies are cleared
   - User redirected to login screen

### Cookie Configuration

```typescript
{
    expires: 7,                    // 7 days
    secure: true,                  // HTTPS only (production)
    sameSite: 'strict',           // CSRF protection
    path: '/'                     // Available site-wide
}
```

### API Calls with Auth Headers

```typescript
// Get headers with authentication token
const headers = authService.getAuthHeaders();

fetch('/api/endpoint', {
    method: 'POST',
    headers: headers,
    credentials: 'include',  // Important for cookies!
    body: JSON.stringify(data)
});
```

---

## 💾 Offline Storage (IndexedDB)

### Why IndexedDB?

**Advantages over localStorage:**
- **Large Storage**: Can store megabytes/gigabytes (vs 5-10MB for localStorage)
- **Structured Data**: Native support for objects, arrays, dates
- **Indexed Queries**: Fast searches with indexes
- **Async Operations**: Non-blocking I/O
- **Transaction Support**: ACID guarantees

### Storage Architecture

```
vpena-onpoint-offline (Database)
├── timePunches (Store)
│   ├── id (Primary Key)
│   ├── by-synced (Index)
│   ├── by-user (Index)
│   └── by-company (Index)
├── leaveRequests (Store)
│   ├── id (Primary Key)
│   ├── by-synced (Index)
│   ├── by-user (Index)
│   └── by-company (Index)
└── expenses (Store)
    ├── id (Primary Key)
    ├── by-synced (Index)
    ├── by-user (Index)
    └── by-company (Index)
```

### Data Structure

**Time Punch:**
```typescript
{
    id: string;           // UUID
    userId: string;
    companyId: string;
    type: 'clock_in' | 'clock_out';
    timestamp: string;
    location?: string;    // GPS coordinates
    photoUrl?: string;    // Photo verification
    synced: boolean;      // Sync status
    createdAt: string;
}
```

**Leave Request:**
```typescript
{
    id: string;
    userId: string;
    companyId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    synced: boolean;
    createdAt: string;
}
```

**Expense:**
```typescript
{
    id: string;
    userId: string;
    companyId: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    receiptUrl?: string;
    synced: boolean;
    createdAt: string;
}
```

### Usage Examples

**1. Save Time Punch (Offline)**
```typescript
import { offlineStorage } from './services/offlineStorage';

// Clock in
await offlineStorage.saveTimePunch({
    id: crypto.randomUUID(),
    userId: currentUser.id,
    companyId: currentUser.company_id,
    type: 'clock_in',
    timestamp: new Date().toISOString(),
    location: '5.6037° N, 0.1870° W',  // Accra coordinates
    synced: false,
    createdAt: new Date().toISOString()
});
```

**2. Save Leave Request (Offline)**
```typescript
await offlineStorage.saveLeaveRequest({
    id: crypto.randomUUID(),
    userId: currentUser.id,
    companyId: currentUser.company_id,
    leaveType: 'Annual Leave',
    startDate: '2025-02-01',
    endDate: '2025-02-05',
    reason: 'Family vacation',
    status: 'pending',
    synced: false,
    createdAt: new Date().toISOString()
});
```

**3. Get Unsynced Count**
```typescript
const count = await offlineStorage.getUnsyncedCount(companyId);
console.log('Unsynced items:', count.total);
// Output: { timePunches: 3, leaveRequests: 1, expenses: 2, total: 6 }
```

**4. Sync All Data (When Online)**
```typescript
await offlineStorage.syncAll(companyId, async (item) => {
    // Custom sync logic
    const endpoint = item.type === 'timePunch' ? '/api/time-punches' :
                    item.type === 'leaveRequest' ? '/api/leave-requests' :
                    '/api/expenses';
    
    await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(item.data)
    });
});
```

---

## 🔄 Automatic Sync System

### Network Detection

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        syncOfflineData();  // Automatic sync when connection restored
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
}, []);
```

### UI Indicators

**Offline Mode Badge:**
- Yellow badge shows "Offline Mode" when `!isOnline`
- Positioned at top center of header
- Pulsing animation for visibility

**Unsynced Count Badge:**
- Blue badge shows number of unsynced items
- Clickable to trigger manual sync
- Updates in real-time

```tsx
{!isOnline && (
    <div className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full shadow animate-pulse">
        Offline Mode
    </div>
)}

{unsyncedCount > 0 && (
    <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow cursor-pointer hover:bg-blue-600 transition-colors" 
         onClick={syncOfflineData}>
        {unsyncedCount} unsynced
    </div>
)}
```

---

## 🏢 Company-Specific Data Isolation

### Row Level Security (RLS)

**What is RLS?**
- Database-level security enforced by PostgreSQL
- Filters data automatically based on user context
- Prevents accidental data leaks between companies
- Cannot be bypassed from application code

### Implementation Steps

**1. Run Migration:**
```bash
# In Supabase SQL Editor or psql
psql -U postgres -d your_database -f migration_company_isolation.sql
```

**2. Set Company Context (Backend):**
```javascript
import { setCompanyContext } from './services/database.js';

// After successful login
await setCompanyContext(user.company_id, user.id);
```

**3. All Queries Automatically Filtered:**
```javascript
// This query will ONLY return employees from user's company
const { data } = await supabase
    .from('P360-Opoint_Employees')
    .select('*');
```

### RLS Policies

**Users Table:**
- Users can view users from same company
- Users can update only their own data
- Admins can insert new users in their company

**Employees Table:**
- All operations filtered by `company_id`
- Employees from other companies are invisible

**Leave Requests:**
- Can view/create requests for employees in same company
- Cannot see other companies' leave data

**Attendance, Payroll, Expenses:**
- Same company-based filtering
- Complete data isolation

### Benefits

1. **Security**: Database enforces company boundaries
2. **Simplicity**: No need to add `WHERE company_id = ?` to every query
3. **Multi-Tenancy**: One database, multiple isolated companies
4. **Performance**: Indexed queries remain fast

---

## 🚀 Usage in Production

### Environment Setup

**.env file:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
FRONTEND_URL=https://your-app.com
NODE_ENV=production
```

### HTTPS Configuration

**For production, ensure:**
- Deploy behind HTTPS (Netlify, Vercel, AWS CloudFront)
- Cookies will automatically use `secure: true`
- Enable HSTS headers
- Use SameSite='strict'

### Database Setup Checklist

- [ ] Run `OPOINT_P360_SETUP.sql` (main schema)
- [ ] Run `migration_add_first_login.sql` (password fields)
- [ ] Run `migration_company_isolation.sql` (RLS policies)
- [ ] Create test user with hashed password
- [ ] Verify RLS by logging in as different companies

---

## 📱 Testing Offline Mode

### Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Try creating time punch/leave request
5. Data should save to IndexedDB
6. Uncheck "Offline"
7. Data should sync automatically

### Chrome Application Tab

1. Open DevTools > Application
2. Navigate to IndexedDB > vpena-onpoint-offline
3. Inspect stores: timePunches, leaveRequests, expenses
4. Verify data structure

---

## 🔐 Security Considerations

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Temporary passwords force change on first login
- Password strength validation enforced
- Previous passwords not reused

### Session Security
- Cookies expire after 7 days
- HttpOnly cookies prevent XSS theft (when server implements)
- SameSite prevents CSRF attacks
- Secure flag for HTTPS-only transmission

### Data Privacy
- Company data isolated via RLS
- User can only access their company's data
- No cross-company queries possible
- Audit trail via `created_at` timestamps

---

## 📊 Monitoring & Debugging

### Console Logs

```
✅ User logged in with cookies: vpernarh@gmail.com
✅ Company context set for: 550e8400-e29b-41d4-a716-446655440000
💾 Time punch saved offline: 123e4567-e89b-12d3-a456-426614174000
🔄 Syncing offline data...
✅ Sync complete. Remaining unsynced: 0
```

### Error Handling

```typescript
try {
    await offlineStorage.saveTimePunch(punchData);
} catch (error) {
    console.error('Failed to save offline:', error);
    // Fallback: show error to user
    alert('Could not save time punch. Please try again.');
}
```

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Server-Side HttpOnly Cookies**
   - Move token storage to server-set cookies
   - Add JWT signing and verification
   - Implement token refresh mechanism

2. **Background Sync API**
   - Use Service Workers for true background sync
   - Sync even when browser is closed
   - Better offline-first experience

3. **Conflict Resolution**
   - Handle simultaneous edits from multiple devices
   - Implement last-write-wins or merge strategies
   - Version tracking for data

4. **Progressive Web App (PWA)**
   - Add manifest.json
   - Service worker for caching
   - Installable on mobile devices

5. **Real-Time Sync**
   - WebSocket connections for instant updates
   - Supabase Realtime subscriptions
   - Push notifications for approvals

---

## 📚 References

- [js-cookie Documentation](https://github.com/js-cookie/js-cookie)
- [IndexedDB API (idb)](https://github.com/jakearchibald/idb)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [MDN Web Docs - Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN Web Docs - IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 🐛 Troubleshooting

### "Cannot read cookies"
- Ensure `credentials: 'include'` in fetch calls
- Check CORS allows credentials
- Verify cookie domain matches

### "IndexedDB not available"
- Check browser compatibility (all modern browsers support it)
- Private/incognito mode may disable IndexedDB
- Check browser storage settings

### "RLS policies block queries"
- Verify `set_company_context()` was called after login
- Check user has `company_id` set
- Ensure RLS function exists in database

### "Data not syncing"
- Check network connectivity
- Verify API endpoints exist
- Check authentication headers
- Look for errors in browser console

---

**Implementation Date**: January 2025  
**Version**: 1.0  
**Author**: VPena OnPoint Development Team
