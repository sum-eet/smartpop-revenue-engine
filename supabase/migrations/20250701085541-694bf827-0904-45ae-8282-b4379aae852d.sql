
-- Enable RLS on all public tables that currently don't have it enabled
ALTER TABLE public.generic_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for generic_webhooks (system-only access)
CREATE POLICY "Service role can manage generic webhooks" ON public.generic_webhooks
FOR ALL USING (auth.role() = 'service_role');

-- Create policies for shopify_webhooks (system-only access)
CREATE POLICY "Service role can manage shopify webhooks" ON public.shopify_webhooks
FOR ALL USING (auth.role() = 'service_role');

-- Create policies for crm_sync_queue (system-only access)
CREATE POLICY "Service role can manage crm sync queue" ON public.crm_sync_queue
FOR ALL USING (auth.role() = 'service_role');

-- Create policies for request_audit (system-only access)
CREATE POLICY "Service role can manage request audit" ON public.request_audit
FOR ALL USING (auth.role() = 'service_role');

-- Also enable RLS on other tables that should have it
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage security logs" ON public.security_logs
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage ip whitelist" ON public.ip_whitelist
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.webhook_security ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage webhook security" ON public.webhook_security
FOR ALL USING (auth.role() = 'service_role');
