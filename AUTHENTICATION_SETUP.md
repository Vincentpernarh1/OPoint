# OPoint-P360 Authentication Setup Guide

## 🎯 Overview

This guide will help you set up the OPoint-P360 database authentication system with the test user credentials.

## 📋 What's Been Implemented

### 1. **Database Schema**
- Added password authentication fields to the `users` table
- Created password reset tokens table
- Created user sessions table
- Added triggers and indexes for performance

### 2. **Backend API Endpoints**
- `POST /api/auth/login` - User authentication with bcrypt
- `POST /api/auth/change-password` - Password change (first-time & regular)
- `POST /api/auth/initialize-password` - Set initial password for test user

### 3. **Frontend Components**
- Updated `Login.tsx` to use API authentication
- Added password change flow for first-time users
- Updated `App.tsx` to handle API-based login

### 4. **Security Features**
- Bcrypt password hashing (10 rounds)
- Password validation (minimum 8 characters)
- Active user checking
- Last login tracking
- First-time password change requirement

---

## 🚀 Setup Instructions

### Step 1: Set Up Your Supabase Database

1. **Go to Supabase**: https://supabase.com
2. **Create a new project** or use existing one
3. **Run the SQL setup script**:
   - Go to SQL Editor in Supabase Dashboard
   - Copy the contents of `OPOINT_P360_SETUP.sql`
   - Run the SQL script

### Step 2: Configure Environment Variables

Make sure your `.env` file has:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

### Step 3: Create the Test User in Database

Run this SQL in Supabase SQL Editor:

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

### Step 4: Install Dependencies

```bash
npm install
```

Dependencies installed:
- `bcrypt` - For password hashing

### Step 5: Start the Server

```bash
npm run dev
# or
node server.js
```

Server should start on http://localhost:3001

### Step 6: Initialize the Test User Password

**Option A: Using the Initialization Script**

```bash
node initialize-test-user.js
```

This will set the password for vpernarh@gmail.com to "Vpernarh@20"

**Option B: Manual API Call**

```bash
curl -X POST http://localhost:3001/api/auth/initialize-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vpernarh@gmail.com","password":"Vpernarh@20"}'
```

**Option C: Using PowerShell**

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/initialize-password" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"vpernarh@gmail.com","password":"Vpernarh@20"}'
```

### Step 7: Start the Frontend

In a new terminal:

```bash
npm run dev
# or your frontend start command
```

### Step 8: Login to the Application

1. Open your browser to http://localhost:3000 (or your frontend URL)
2. Click on "Company Login"
3. Use these credentials:
   - **Email**: `vpernarh@gmail.com`
   - **Password**: `Vpernarh@20`

---

## 🔐 Testing the Authentication Flow

### Test 1: Normal Login
1. Login with vpernarh@gmail.com / Vpernarh@20
2. Should successfully log in to the dashboard

### Test 2: First-Time Password Change
1. Create a new employee in the system with `requires_password_change = TRUE`
2. Login with their credentials
3. Should be prompted to set a new password
4. After setting password, should automatically login

### Test 3: Password Change for Existing User
1. Login as vpernarh@gmail.com
2. Go to Profile/Settings
3. Change password
4. Logout and login with new password

---

## 📝 Adding New Employees with Password Setup

When you add a new employee through the UI:

1. The system should create them with `requires_password_change = TRUE`
2. Admin sets a temporary password
3. Employee logs in with temporary password
4. System prompts them to create a new password
5. They set their password and are logged in

To implement this, update the `AddEmployeeModal.tsx` component to:

```typescript
// When creating a new employee
const newEmployee = {
  ...employeeData,
  requires_password_change: true,
  // Generate a random temporary password
  temporaryPassword: generateRandomPassword()
};

// Send email to employee with temporary password
// Or show it to the admin to share with the employee
```

---

## 🔧 API Endpoints Reference

### POST /api/auth/login
**Request:**
```json
{
  "email": "vpernarh@gmail.com",
  "password": "Vpernarh@20"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "vpernarh@gmail.com",
    "name": "Vincent Pernarh",
    "role": "SuperAdmin",
    ...
  },
  "requiresPasswordChange": false
}
```

### POST /api/auth/change-password
**Request:**
```json
{
  "email": "vpernarh@gmail.com",
  "currentPassword": "Vpernarh@20",
  "newPassword": "NewSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "user": { ... }
}
```

### POST /api/auth/initialize-password
**Request:**
```json
{
  "email": "vpernarh@gmail.com",
  "password": "Vpernarh@20"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password initialized successfully"
}
```

---

## 🛠️ Troubleshooting

### Issue: "Database not configured"
- Check your `.env` file has correct Supabase credentials
- Verify Supabase project is running
- Check network connection

### Issue: "Invalid credentials"
- Make sure you ran the initialization script
- Verify the user exists in the database
- Check the password is correct

### Issue: "User not found"
- Make sure you created the user in Supabase
- Check the email is exactly "vpernarh@gmail.com"
- Verify `is_active = TRUE` in the database

### Issue: Server won't start
- Check port 3001 is not in use
- Verify all dependencies are installed
- Check Node.js version (should be 18+)

---

## 📚 Database Structure

### users table (key fields for authentication)
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `requires_password_change` - Boolean flag for first-time login
- `last_login` - Timestamp of last successful login
- `is_active` - User account status

---

## 🔒 Security Best Practices

1. **Never store passwords in plain text** ✅ (Using bcrypt)
2. **Minimum password length: 8 characters** ✅
3. **Force password change on first login** ✅
4. **Hash passwords with salt** ✅ (bcrypt handles this)
5. **Validate email format** ✅
6. **Track last login** ✅
7. **Active user checking** ✅

---

## 📞 Support

If you encounter any issues:
1. Check the server logs
2. Check the browser console
3. Verify database connection
4. Review the SQL setup script was run completely

---

## ✅ Summary

You now have:
- ✅ Database table `OPoint-P360` set up
- ✅ Test user: vpernarh@gmail.com
- ✅ Password: Vpernarh@20
- ✅ API authentication endpoints
- ✅ First-time password change flow
- ✅ Secure bcrypt password hashing

**You're ready to login and start using the system!** 🎉
