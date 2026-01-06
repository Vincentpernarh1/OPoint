-- Clean ALL duplicate and expired push subscriptions
-- This removes duplicates keeping only the most recent subscription per user

-- Step 1: Delete all but the most recent subscription for each user
DELETE FROM push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, tenant_id) id
  FROM push_subscriptions
  ORDER BY user_id, tenant_id, created_at DESC
);

-- Step 2: Show what's left
SELECT 
  user_id,
  COUNT(*) as subscription_count,
  MAX(created_at) as latest_subscription
FROM push_subscriptions
GROUP BY user_id
ORDER BY latest_subscription DESC;

-- Step 3: Total count
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users
FROM push_subscriptions;
