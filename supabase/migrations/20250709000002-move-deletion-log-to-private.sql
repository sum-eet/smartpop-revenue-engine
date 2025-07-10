-- Alternative: Move data_deletion_log to a private schema
-- This removes it from public PostgREST access entirely

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Move table to private schema
ALTER TABLE public.data_deletion_log SET SCHEMA private;

-- Update any existing references/functions to use private.data_deletion_log
-- (Add specific function updates here if needed)

-- Grant access only to service role
GRANT ALL ON private.data_deletion_log TO service_role;
GRANT USAGE ON SCHEMA private TO service_role;