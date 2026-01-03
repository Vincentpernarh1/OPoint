# Missing Days Generator - Documentation

## Overview

The Missing Days Generator is an automated system that creates placeholder entries for weekdays where employees forgot to clock in or clock out. This ensures employees can still request time adjustments for days that would otherwise be lost.

## How It Works

### Daily Automated Process

1. **Runs at midnight (00:00 GMT)** every day via cron job
2. **Checks the previous day** to see if it was a weekday (Mon-Fri)
3. **For each employee**, verifies if they have any punch records
4. **Generates placeholder entries** for users with no punches
5. **Allows adjustment requests** for these missing days

### What Gets Generated

For each missing day, the system creates a clock log entry with:
- **Date**: The missing weekday date
- **Employee**: User information
- **Company**: Company information
- **Punches**: Empty array `[]` (no clock-in/out recorded)
- **Status**: `still_working: false`
- **Location**: `"No punch recorded"`

### Weekday Detection

- ✅ **Processes**: Monday through Friday
- ⏭️ **Skips**: Saturday and Sunday (weekends)

## Integration with Adjustment Requests

These generated entries work seamlessly with the existing time adjustment system:

1. Employee sees the day in their timesheet with **0 hours**
2. Employee can click to **request adjustment** for that day
3. They provide:
   - Requested clock-in time
   - Requested clock-out time
   - Reason for missing punch
4. Request goes through normal approval workflow
5. Once approved, the day gets proper hours

## API Endpoints

### Manual Trigger (For Testing)

```http
POST /api/admin/force-missing-days
```

**Response:**
```json
{
  "success": true,
  "message": "Missing days generation completed"
}
```

**Use cases:**
- Testing the functionality
- Manually generating missing entries
- Catching up after system downtime

## Configuration

### Cron Schedule

Located in `services/missing-days-generator.js`:

```javascript
cron.schedule('0 0 * * *', ...) // Midnight daily
```

### Timezone

Set to **Africa/Accra** (GMT) in the cron configuration.

## Testing

### Run Test Script

```bash
node test_missing_days.js
```

This will:
- Show which users would have entries generated
- Display what data would be created
- **Not actually create** entries (dry run)

### Manual Generation

1. Start the server: `npm start`
2. Use the API endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/admin/force-missing-days
   ```
3. Check the console logs for results

## Server Startup

When the server starts, you'll see:

```
✅ Database:    Connected (Supabase)
⏰ Auto-close:  Enabled (10 PM daily)
⏰ Missing Days: Enabled (midnight daily)
```

## Console Output Examples

### Successful Generation

```
📅 Checking for missing punch entries on 2026-01-02...
✅ Generated missing day entry for John Doe (2026-01-02)
✅ Generated missing day entry for Jane Smith (2026-01-02)
🎉 Missing days generation completed:
   - Generated: 2 placeholder(s)
   - Skipped: 8 (had punches or already generated)
```

### Weekend Skip

```
⏭️ Skipping weekend: 2026-01-04
```

## Benefits

### For Employees
- ✅ Can recover forgotten clock-in/out days
- ✅ Days don't disappear silently
- ✅ Clear visibility of missing days
- ✅ Simple adjustment request process

### For Employers/HR
- ✅ Complete attendance records
- ✅ Audit trail for all working days
- ✅ Reduced disputes about missing days
- ✅ Better payroll accuracy

## Files Modified/Created

### Created Files
- `services/missing-days-generator.js` - Main generator logic
- `test_missing_days.js` - Testing script
- `MISSING_DAYS_GENERATOR.md` - This documentation

### Modified Files
- `package.json` - Added `node-cron` dependency
- `server.js` - Added import and initialization

## Dependencies

- **node-cron** (^3.0.3) - Cron job scheduling
- **@supabase/supabase-js** - Database access

## Database Schema

Uses existing `opoint_clock_logs` table:

```sql
CREATE TABLE opoint_clock_logs (
    id UUID PRIMARY KEY,
    tenant_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    company_name TEXT,
    date DATE,  -- YYYY-MM-DD format
    punches JSONB,  -- Array of punch objects
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    location TEXT,
    photo_url TEXT,
    still_working BOOLEAN
);
```

## Future Enhancements

Potential improvements:
- [ ] Holiday calendar integration (skip company holidays)
- [ ] Custom work schedules (skip employee's off days)
- [ ] Notification to employees about missing days
- [ ] Batch adjustment requests (multiple days at once)
- [ ] Analytics dashboard for missing punch trends
- [ ] Auto-approval for trusted employees (configurable)

## Troubleshooting

### Generator Not Running

1. Check server logs for errors
2. Verify database connection
3. Ensure cron is scheduled correctly
4. Check timezone configuration

### No Entries Generated

- Verify users exist in `opoint_users` table
- Check that users have `company_id` set
- Ensure it's a weekday being checked
- Look for error messages in logs

### Duplicate Entries

The generator checks for existing entries before creating new ones, so duplicates should not occur. If they do:
- Check the date comparison logic
- Verify unique constraints on the database

## Support

For issues or questions:
1. Check server console logs
2. Run the test script: `node test_missing_days.js`
3. Review this documentation
4. Check database records directly in Supabase

---

**Last Updated**: January 3, 2026
**Version**: 1.0.0
