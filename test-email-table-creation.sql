-- Test script to create email_subscribers table
-- Run this in Supabase SQL Editor

-- Check if table already exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'email_subscribers'
);

-- Create the table (will be run manually in SQL editor)
-- Copy the content from supabase/migrations/20250706000003_create_email_subscribers.sql