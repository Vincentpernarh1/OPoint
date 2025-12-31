# EMAIL SERVICE TROUBLESHOOTING GUIDE
**Issue:** SMTP Connection Timeout (ETIMEDOUT)
**Date:** December 31, 2025

---

## 🔴 PROBLEM IDENTIFIED

Your email service is experiencing connection timeouts:
```
Error: Connection timeout
code: 'ETIMEDOUT'
command: 'CONN'
```

This means nodemailer cannot connect to Gmail's SMTP server.

---

## ✅ FIXES IMPLEMENTED

### 1. Updated Email Service Configuration
**File:** `services/emailService.js`

Added:
- ✅ Connection timeouts (10s)
- ✅ Connection pooling (reuse connections)
- ✅ TLS settings for Gmail compatibility
- ✅ Better error handling
- ✅ Debug logging

---

## 🔧 STEP-BY-STEP TROUBLESHOOTING

### **OPTION 1: Verify Gmail App Password (MOST COMMON FIX)**

Your current password in `.env` is: `wnhcznlbjcgwnade`

**Steps to verify:**

1. **Check if App Password is still valid:**
   - Go to https://myaccount.google.com/apppasswords
   - Sign in with `vpenatechwizard@gmail.com`
   - Check if the app password still exists

2. **Generate NEW App Password (RECOMMENDED):**
   ```
   1. Go to: https://myaccount.google.com/apppasswords
   2. Click "Generate new app password"
   3. Name it: "VPENA OnPoint Server"
   4. Copy the 16-character password
   5. Update .env file
   ```

3. **Update `.env` file:**
   ```env
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Your NEW 16-char password
   ```

4. **Restart server:**
   ```powershell
   # Stop server (Ctrl+C)
   node server.js
   ```

---

### **OPTION 2: Check 2-Factor Authentication**

Gmail requires 2FA to use App Passwords.

**Verify 2FA is enabled:**
1. Go to https://myaccount.google.com/security
2. Look for "2-Step Verification"
3. Must be **ON** to use App Passwords

**If 2FA is OFF:**
1. Turn on 2-Step Verification
2. Generate new App Password
3. Update `.env`

---

### **OPTION 3: Check "Less Secure App Access" (Legacy)**

⚠️ **Note:** Google removed this option in May 2022. You MUST use App Passwords now.

If you're using your regular Gmail password, **it won't work**.

---

### **OPTION 4: Test Email Configuration**

Add this test endpoint to `server.js`:

```javascript
// Add this test endpoint (temporary)
app.get('/test-email', async (req, res) => {
    try {
        const result = await sendPasswordResetEmail({
            to: 'vpenatechwizard@gmail.com', // Send to yourself
            employeeName: 'Test User',
            tempPassword: 'Test123!',
            resetBy: 'Admin'
        });
        
        res.json({ 
            success: result.success, 
            message: result.message,
            error: result.error 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
```

**Test it:**
```
http://localhost:3001/test-email
```

---

### **OPTION 5: Alternative SMTP Settings**

If Gmail is blocked by your hosting provider, try these settings:

**Using Gmail with SSL (Port 465):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
```

Then update `emailService.js`:
```javascript
secure: true, // Change to true for port 465
```

**Using SendGrid (FREE alternative):**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=YOUR_SENDGRID_API_KEY
EMAIL_FROM=vpenatechwizard@gmail.com
```

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Get API key
3. Update `.env`

---

### **OPTION 6: Check Firewall/Network**

If your server is hosted (not localhost):

**Check if SMTP ports are blocked:**
```powershell
# Test SMTP connection
Test-NetConnection smtp.gmail.com -Port 587
```

**Expected output:**
```
TcpTestSucceeded : True
```

**If False:**
- Your hosting provider may block SMTP ports
- Contact hosting support to unblock port 587
- Use alternative email service (SendGrid, Mailgun, etc.)

---

### **OPTION 7: Check Server Location**

Gmail sometimes blocks connections from certain countries/IPs.

**If your server is hosted outside common regions:**
1. Use a VPN
2. Switch to SendGrid/Mailgun/AWS SES
3. Use a relay service

---

## 🚀 RECOMMENDED SOLUTION (QUICK FIX)

**Best approach for immediate fix:**

1. **Generate NEW Gmail App Password:**
   - https://myaccount.google.com/apppasswords
   - Copy 16-character password

2. **Update `.env`:**
   ```env
   EMAIL_PASSWORD=YOUR_NEW_16_CHAR_PASSWORD
   ```

3. **Restart server:**
   ```powershell
   node server.js
   ```

4. **Test password reset** in the app

---

## 🔄 ALTERNATIVE: Use SendGrid (FREE)

**If Gmail keeps failing, switch to SendGrid:**

### Setup (5 minutes):

1. **Sign up:**
   - https://signup.sendgrid.com/
   - Free tier: 100 emails/day (enough for small teams)

2. **Get API Key:**
   - Dashboard → Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the key (starts with `SG.`)

3. **Update `.env`:**
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=SG.YOUR_API_KEY_HERE
   EMAIL_FROM=vpenatechwizard@gmail.com
   ```

4. **Verify sender email:**
   - Dashboard → Settings → Sender Authentication
   - Verify `vpenatechwizard@gmail.com`

5. **Restart server**

**Benefits:**
- ✅ More reliable than Gmail
- ✅ No App Password needed
- ✅ Better deliverability
- ✅ Email analytics
- ✅ No 2FA required

---

## 📊 DEBUGGING STEPS

### 1. Check Current Configuration
```powershell
# Run this in PowerShell
$env:EMAIL_USER
$env:EMAIL_PASSWORD
```

### 2. Enable Debug Logging
Already enabled in development mode. Check server logs for:
```
DEBUG: SMTP connection established
DEBUG: Authentication successful
```

### 3. Test SMTP Connection Manually
```powershell
# Install telnet (Windows)
dism /online /Enable-Feature /FeatureName:TelnetClient

# Test connection
telnet smtp.gmail.com 587
```

Expected response:
```
220 smtp.gmail.com ESMTP
```

---

## ⚠️ COMMON MISTAKES

1. **Using regular Gmail password instead of App Password** ❌
2. **2FA not enabled on Gmail** ❌
3. **Old App Password (revoked)** ❌
4. **Wrong SMTP port (25 instead of 587)** ❌
5. **Firewall blocking port 587** ❌
6. **Typo in EMAIL_USER or EMAIL_PASSWORD** ❌

---

## ✅ VERIFICATION CHECKLIST

After making changes, verify:

- [ ] 2FA is enabled on Gmail account
- [ ] App Password is generated (16 characters)
- [ ] `.env` file updated with correct password
- [ ] No spaces/typos in EMAIL_USER or EMAIL_PASSWORD
- [ ] Server restarted after `.env` changes
- [ ] Port 587 is not blocked by firewall
- [ ] Test email sent successfully

---

## 🆘 STILL NOT WORKING?

If emails still fail after trying above steps:

### Temporary Workaround:
Disable email sending and just show password to admin:

**In `server.js`, find password reset endpoint and add:**
```javascript
// After generating temporary password, show it to admin
console.log('🔑 TEMPORARY PASSWORD:', temporaryPassword);
console.log('📧 FOR USER:', email);
console.log('⚠️  Manually send this to the employee');
```

Admin can copy the password and send it manually via WhatsApp/SMS.

### Long-term Solution:
Switch to a dedicated email service:
- **SendGrid** (100 free emails/day)
- **Mailgun** (First 1000 emails free)
- **AWS SES** ($0.10 per 1000 emails)
- **Postmark** (100 free emails/month)

---

## 📞 NEED MORE HELP?

**Check Gmail Security Settings:**
https://myaccount.google.com/security

**Check Recent Security Activity:**
https://myaccount.google.com/notifications

**Gmail Help Center:**
https://support.google.com/mail/answer/185833

---

**Last Updated:** December 31, 2025
**Status:** Configuration updated, awaiting testing
