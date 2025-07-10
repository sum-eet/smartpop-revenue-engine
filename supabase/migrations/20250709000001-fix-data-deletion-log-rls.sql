-- Fix RLS security issue for data_deletion_log table
-- This migration enables RLS and creates appropriate policies

-- Enable RLS on the data_deletion_log table
ALTER TABLE public.data_deletion_log ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (backend operations)
CREATE POLICY "Service role can manage deletion logs" ON public.data_deletion_log
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Create policy for authenticated admins only (if needed for dashboard access)
CREATE POLICY "Admins can view deletion logs" ON public.data_deletion_log
  FOR SELECT USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated' AND
    current_setting('request.jwt.claims', true)::json->>'shop_domain' IS NOT NULL
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_shop_domain ON public.data_deletion_log(shop_domain);
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_created_at ON public.data_deletion_log(created_at);