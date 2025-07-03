-- Check captured data from your popup testing
SELECT 'popup_events' as table_name, count(*) as record_count FROM popup_events
UNION ALL
SELECT 'tracking_events' as table_name, count(*) as record_count FROM tracking_events
UNION ALL
SELECT 'sessions' as table_name, count(*) as record_count FROM sessions
UNION ALL
SELECT 'popups' as table_name, count(*) as record_count FROM popups;

-- Show recent popup events
SELECT 
  'Recent Popup Events' as info,
  popup_id,
  event_type,
  shop_domain,
  page_url,
  visitor_ip,
  user_agent,
  timestamp,
  created_at
FROM popup_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Show tracking events 
SELECT 
  'Recent Tracking Events' as info,
  session_id,
  event_type,
  event_data,
  timestamp
FROM tracking_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Show sessions data
SELECT 
  'Session Data' as info,
  session_id,
  device_fingerprint,
  ip_address,
  user_agent,
  country,
  start_time
FROM sessions 
ORDER BY created_at DESC 
LIMIT 5;