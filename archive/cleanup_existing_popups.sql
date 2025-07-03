-- Mark all existing popups as deleted except the most recent one
WITH ranked_popups AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM popups 
  WHERE is_deleted = false
)
UPDATE popups 
SET is_deleted = true, 
    is_active = false,
    deleted_at = NOW()
WHERE id IN (
  SELECT id FROM ranked_popups WHERE rn > 1
);

-- Show remaining active popups
SELECT id, name, is_active, is_deleted, created_at 
FROM popups 
WHERE is_deleted = false
ORDER BY created_at DESC;