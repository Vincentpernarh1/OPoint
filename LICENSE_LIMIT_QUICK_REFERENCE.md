# License Limit - Quick Reference Guide

## 🎯 Quick Summary

The license limit feature restricts the number of **active employees** a company can have based on their subscription.

---

## 🔢 Key Database Columns

In `opoint_companies` table:
- **`license_count`** - Maximum active employees allowed
- **`used_licenses`** - Current count of active employees

---

## ✅ What Works

### Adding Employees
- ✅ System checks if `used_licenses < license_count`
- ✅ Only **active employees** count towards limit
- ✅ Inactive/terminated employees don't count
- ✅ Visual warning at 90% usage
- ✅ Hard block at 100% usage

### Automatic Updates
- ✅ `used_licenses` updates when employee is added
- ✅ `used_licenses` updates when employee is deleted
- ✅ `used_licenses` updates when `is_active` status changes

### UI Feedback
- ✅ License usage shown in "Add Employee" modal
- ✅ Color-coded warnings (blue → yellow → red)
- ✅ Submit button disabled at limit
- ✅ Clear error messages

---

## 🚨 Error Messages

### When Limit is Reached
```
"License limit reached. Your company has used all available employee licenses. 
Please contact support to increase your license limit."
```

### HTTP Response
```json
{
  "success": false,
  "error": "License limit reached",
  "licenseInfo": {
    "used": 10,
    "limit": 10,
    "message": "Your company has reached its license limit (10/10 licenses used)..."
  }
}
```

---

## 🔧 Manual License Limit Adjustment

### For Super Admins (Direct Database Access)

#### View Current License Status
```sql
SELECT 
    name,
    license_count,
    used_licenses,
    (used_licenses::float / license_count * 100) as usage_percent
FROM opoint_companies;
```

#### Update License Limit
```sql
UPDATE opoint_companies
SET license_count = 50  -- New limit
WHERE id = 'company-uuid';
```

#### Sync Used Licenses (if out of sync)
```sql
UPDATE opoint_companies c
SET used_licenses = (
    SELECT COUNT(*)
    FROM opoint_users u
    WHERE u.tenant_id = c.id
    AND u.is_active = true
);
```

---

## 🧪 Testing

### Test Scenarios

#### Test 1: Normal Addition (Within Limit)
1. Company has 8/10 licenses used
2. Add employee → ✅ Success
3. License count → 9/10

#### Test 2: Warning Zone (90%)
1. Company has 9/10 licenses used
2. Modal shows yellow warning
3. Add employee → ✅ Success (last one)
4. License count → 10/10

#### Test 3: At Limit
1. Company has 10/10 licenses used
2. Modal shows red warning
3. Submit button disabled
4. Attempt to add → ❌ Blocked

#### Test 4: Inactive Employee
1. Company has 10/10 licenses used
2. Add employee with `is_active = false`
3. → ✅ Success (doesn't count)
4. License count → still 10/10

### Run Tests
```bash
node test_license_logic.js      # Logic tests
node test_license_limit.js      # Full integration test
```

---

## 📊 Monitoring License Usage

### Check Company License Status
```sql
SELECT 
    id,
    name,
    license_count,
    used_licenses,
    (license_count - used_licenses) as available_licenses,
    ROUND((used_licenses::numeric / license_count * 100), 2) as usage_percent
FROM opoint_companies
WHERE used_licenses >= license_count * 0.9  -- Companies near limit
ORDER BY usage_percent DESC;
```

### Find Companies Over Limit
```sql
SELECT 
    name,
    license_count,
    used_licenses,
    (used_licenses - license_count) as over_limit_by
FROM opoint_companies
WHERE used_licenses > license_count;
```

---

## 🐛 Troubleshooting

### Problem: Employee added despite being at limit
**Solution**: Check if employee is `is_active = false` (inactive employees don't count)

### Problem: Used licenses count is wrong
**Solution**: Run sync script:
```sql
UPDATE opoint_companies c
SET used_licenses = (
    SELECT COUNT(*)
    FROM opoint_users u
    WHERE u.tenant_id = c.id AND u.is_active = true
);
```

### Problem: Can't add employee but counter shows space
**Solution**: 
1. Check browser console for errors
2. Verify API response
3. Check if `license_count` is NULL
4. Ensure server is running

---

## 📞 Support Flow

### User Perspective
1. User tries to add employee
2. Gets "License limit reached" error
3. Contacts company admin
4. Admin contacts support/sales

### Admin Perspective
1. Check current usage in database
2. Verify it's a real limit issue
3. Contact sales/billing team
4. Get approval for increase
5. Update `license_count` in database

---

## 🎨 UI Color Codes

| Usage | Color | Background | Border |
|-------|-------|------------|--------|
| < 90% | Blue | `bg-blue-100` | `border-blue-300` |
| ≥ 90% | Yellow | `bg-yellow-100` | `border-yellow-300` |
| = 100% | Red | `bg-red-100` | `border-red-300` |

---

## 📝 Files Modified

- `server.js` - Backend validation
- `components/AddEmployeeModal.tsx` - UI display
- `components/EmployeeManagement.tsx` - Error handling
- `services/api.ts` - API error handling

---

**Last Updated**: December 27, 2025
