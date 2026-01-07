-- Clean up all old push subscriptions
-- Run this in Supabase SQL Editor to remove invalid subscriptions
-- Users will need to re-subscribe with new VAPID keys

-- Delete all existing subscriptions
DELETE FROM push_subscriptions;

-- Verify they're deleted
SELECT COUNT(*) as remaining_subscriptions FROM push_subscriptions;
-- Should return: remaining_subscriptions = 0

-- Optional: View table structure to confirm it's ready
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;

commit;