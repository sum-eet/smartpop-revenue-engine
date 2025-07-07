-- Check what email data exists in the database

-- Check popup_events table for email captures
SELECT 
    id,
    email,
    timestamp,
    event_type,
    shop_domain,
    popup_id,
    page_url,
    created_at
FROM popup_events 
WHERE event_type = 'email_capture' 
    AND email IS NOT NULL
    AND shop_domain = 'testingstoresumeet.myshopify.com'
ORDER BY timestamp DESC 
LIMIT 20;

-- Check if email_subscribers table exists and has data
SELECT 
    id,
    email,
    first_captured_at,
    shop_id,
    popup_id,
    discount_code,
    status,
    page_url
FROM email_subscribers 
WHERE shop_id IN (
    SELECT id FROM shops WHERE shop_domain = 'testingstoresumeet.myshopify.com'
)
ORDER BY first_captured_at DESC 
LIMIT 20;

-- Check all popup_events for this shop (not just email captures)
SELECT 
    event_type,
    COUNT(*) as count
FROM popup_events 
WHERE shop_domain = 'testingstoresumeet.myshopify.com'
GROUP BY event_type
ORDER BY count DESC;