-- Check current push subscriptions and user details
SELECT 
  ps.user_id,
  u.full_name,
  u.email,
  COUNT(*) as subscription_count,
  ps.created_at,
  SUBSTRING(ps.endpoint, 1, 50) as endpoint_preview
FROM push_subscriptions ps
LEFT JOIN users u ON ps.user_id = u.id
GROUP BY ps.user_id, u.full_name, u.email, ps.created_at, ps.endpoint
ORDER BY ps.created_at DESC;
