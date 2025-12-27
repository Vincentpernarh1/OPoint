# 🚀 QUICK START GUIDE - One-Row-Per-Day Migration

## ⚡ 3-Step Deployment

### Step 1: Run This SQL in Supabase Dashboard
```sql
-- Copy entire contents of RUN_THIS_IN_SUPABASE.sql and run it
-- Or run these commands:

ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS punches JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clock_logs_date 
ON opoint_clock_logs(employee_id, tenant_id, date);

UPDATE opoint_clock_logs
SET date = DATE(clock_in), punches = jsonb_build_array(...)
WHERE punches IS NULL;
```

### Step 2: Restart Server
```bash
node server.js

# Look for this line:
# ⏰ Auto-close:  Enabled (10 PM daily)
```

### Step 3: Test
```bash
node test_punches_architecture.js

# Should see:
# 🎉 ALL TESTS PASSED!
```

---

## 📝 What Changed

| Feature | Before | After |
|---------|--------|-------|
| **Database Rows** | 4 punches = 4 rows | 4 punches = 1 row |
| **Query Speed** | Slow (scan multiple rows) | Fast (indexed date) |
| **Unclosed Shifts** | Manual cleanup needed | Auto-close at 10 PM |
| **Storage** | More rows = more storage | Fewer rows = less storage |

---

## 🧪 Quick Test

```bash
# 1. Clock in
curl -X POST http://localhost:3001/api/time-punches \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -d '{
    "userId": "USER_ID",
    "companyId": "COMPANY_ID",
    "type": "clock_in",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "location": "Office"
  }'

# 2. Clock out
curl -X POST http://localhost:3001/api/time-punches \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -d '{
    "userId": "USER_ID",
    "companyId": "COMPANY_ID",
    "type": "clock_out",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "location": "Office"
  }'

# 3. Check database - should see ONE row with TWO punches in array
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Migration fails | Run `RUN_THIS_IN_SUPABASE.sql` manually |
| Auto-close not working | Check server logs for "⏰ Auto-close: Enabled" |
| Multiple rows per day | Migration didn't run, check punches column exists |
| Tests fail | Ensure server is running on port 3001 |

---

## 📞 Quick Commands

```bash
# Run migration
node run_punches_migration.js

# Start server
node server.js

# Run tests
node test_punches_architecture.js

# Force auto-close (testing)
curl -X POST http://localhost:3001/api/admin/force-auto-close \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

---

## ✅ Verification

After deployment, verify:
- [ ] Database has `date` and `punches` columns
- [ ] Server shows "⏰ Auto-close: Enabled"
- [ ] Test script passes all 4 tests
- [ ] Clock in/out creates ONE row per day
- [ ] Force auto-close API works

---

**Need Help?** Check [IMPLEMENTATION_SUMMARY_PUNCHES.md](IMPLEMENTATION_SUMMARY_PUNCHES.md) for detailed documentation.
