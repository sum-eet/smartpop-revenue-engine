-- Fix missing RLS on data_deletion_log table
-- This was accidentally omitted from the original consent tables migration

-- Enable RLS on the data_deletion_log table
ALTER TABLE public.data_deletion_log ENABLE ROW LEVEL SECURITY;

-- Add the missing RLS policy for service role
CREATE POLICY "Service role can access all data_deletion_log" 
ON public.data_deletion_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_session_id ON public.data_deletion_log(session_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_user_id ON public.data_deletion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_requested_at ON public.data_deletion_log(requested_at);

-- Add shop_domain column if needed for multi-tenant support
ALTER TABLE public.data_deletion_log ADD COLUMN IF NOT EXISTS shop_domain TEXT;
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_shop_domain ON public.data_deletion_log(shop_domain);