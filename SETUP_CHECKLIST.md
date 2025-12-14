# 🚀 OPoint-P360 Setup Checklist

Follow these steps in order to get your authentication system running.

---

## ✅ Step-by-Step Setup

### □ Step 1: Database Setup (Supabase)

1. Go to https://supabase.com and login
2. Open your project or create a new one
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `OPOINT_P360_SETUP.sql`
6. Paste into the SQL editor
7. Click **Run** or press Ctrl+Enter
8. Wait for "Success" message

**Expected Result:** Tables updated with authentication fields

---

### □ Step 2: Create Test User

In the same SQL Editor:

```sql
INSERT INTO users (
  name,
  email,
  role,
  basic_salary,
  mobile_money_number,
  hire_date,
  department,
  position,
  status,
  is_active,
  requires_password_change
) VALUES (
  'Vincent Pernarh',
  'vpernarh@gmail.com',
  'SuperAdmin',
  0,
  '0240000000',
  CURRENT_DATE,
  'Administration',
  'System Administrator',
  'active',
  TRUE,
  FALSE
) ON CONFLICT (email) DO NOTHING;
```

Click **Run**

**Expected Result:** 1 row inserted (or "duplicate key" if already exists - that's OK!)

---

### □ Step 3: Verify Environment Variables

Check your `.env` file contains:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3001
```

**Where to find these:**
- Supabase → Settings → API
- Copy "Project URL" → `SUPABASE_URL`
- Copy "anon public" key → `SUPABASE_ANON_KEY`

---

### □ Step 4: Install Dependencies

Open terminal in project folder:

```powershell
npm install
```

**Expected Result:**
```
added 3 packages, and audited 195 packages in 2s
found 0 vulnerabilities
```

**New package installed:** `bcrypt` (for password hashing)

---

### □ Step 5: Start the Server

```powershell
node server.js
```

**Expected Output:**
```
[timestamp] Server running on port 3001
[timestamp] Environment: development
```

**Troubleshooting:**
- If port 3001 is in use: Change `PORT` in `.env`
- If "Database not configured": Check `.env` credentials
- If server crashes: Check Node.js version (need 18+)

---

### □ Step 6: Initialize Test User Password

**Option A: Using Node Script** (Recommended)

In a **new terminal** (keep server running):

```powershell
node initialize-test-user.js
```

**Expected Output:**
```
🔐 Initializing test user password...
✅ Test user password initialized successfully!
📧 Email: vpernarh@gmail.com
🔑 Password: Vpernarh@20

✨ You can now login to the application!
```

**Option B: Using PowerShell Script**

```powershell
.\setup.ps1
```

**Option C: Manual API Call**

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/initialize-password" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"vpernarh@gmail.com","password":"Vpernarh@20"}'
```

---

### □ Step 7: Verify User in Database

Back in Supabase → SQL Editor:

```sql
SELECT id, name, email, role, is_active, requires_password_change, 
       CASE WHEN password_hash IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as password_status
FROM users 
WHERE email = 'vpernarh@gmail.com';
```

**Expected Result:**
```
name: Vincent Pernarh
email: vpernarh@gmail.com
role: SuperAdmin
is_active: true
requires_password_change: false
password_status: SET
```

---

### □ Step 8: Start Frontend

In a **third terminal**:

```powershell
npm run dev
# or whatever command starts your frontend
```

---

### □ Step 9: Test Login

1. Open browser to your frontend URL (usually http://localhost:3000 or http://localhost:5173)
2. Click "Company Login" (or wherever the login button is)
3. Enter credentials:
   - **Email:** `vpernarh@gmail.com`
   - **Password:** `Vpernarh@20`
4. Click "Sign In"

**Expected Result:** Successfully logged in, redirected to dashboard

---

## 🎯 Success Criteria

You'll know it worked when:

✅ No errors in server console  
✅ No errors in browser console  
✅ Login form accepts credentials  
✅ User is redirected to dashboard  
✅ User name "Vincent Pernarh" appears in UI  

---

## 🔧 Troubleshooting Guide

### Problem: "Database not configured"
**Solution:**
- Check `.env` file exists
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Restart server after updating `.env`

### Problem: "Invalid credentials"
**Solution:**
- Run `initialize-test-user.js` again
- Check user exists in database (Step 7)
- Verify email is exactly `vpernarh@gmail.com` (no spaces)
- Verify password is exactly `Vpernarh@20` (case-sensitive)

### Problem: "User not found"
**Solution:**
- Run Step 2 again (create test user)
- Check `is_active = TRUE` in database
- Verify user email in database matches login email

### Problem: Server won't start
**Solution:**
- Check port 3001 is available: `netstat -ano | findstr :3001`
- Kill process using port: `Stop-Process -Id <PID> -Force`
- Or change port in `.env`

### Problem: "Unable to connect to server"
**Solution:**
- Make sure server is running (Step 5)
- Check server is on port 3001
- Try: `curl http://localhost:3001/api/health`
- Check firewall isn't blocking localhost

### Problem: Password doesn't work
**Solution:**
- Password is case-sensitive: `Vpernarh@20`
- Re-run `initialize-test-user.js`
- Check server logs for errors
- Verify bcrypt is installed: `npm list bcrypt`

---

## 📋 Quick Reference

### Test User Credentials
```
Email:    vpernarh@gmail.com
Password: Vpernarh@20
Role:     SuperAdmin
```

### API Endpoints
```
POST /api/auth/login
POST /api/auth/change-password
POST /api/auth/initialize-password
```

### Important Files
```
OPOINT_P360_SETUP.sql      - Database schema
initialize-test-user.js    - Password setup
setup.ps1                  - Automated setup
AUTHENTICATION_SETUP.md    - Full documentation
```

---

## 🎉 Next Steps After Success

Once logged in successfully:

1. ✅ Test the dashboard
2. ✅ Create a second test employee
3. ✅ Test the first-time password change flow
4. ✅ Verify employee management works
5. ✅ Test all the features with database-backed auth

---

## 📞 Still Having Issues?

1. Check server logs for errors
2. Check browser console for errors
3. Review `AUTHENTICATION_SETUP.md` for detailed help
4. Verify all steps completed in order
5. Try restarting both server and frontend

---

**Good luck! You've got this! 🚀**
