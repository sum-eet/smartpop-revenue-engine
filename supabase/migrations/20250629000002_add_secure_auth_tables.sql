-- Add secure authentication and API key management tables

-- API keys table for secure authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_domain TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL, -- First 8 characters for identification
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  permissions JSONB DEFAULT '{"read": true, "write": true, "admin": false}',
  rate_limit_per_minute INTEGER DEFAULT 100,
  notes TEXT,
  created_by TEXT, -- User who created the key
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure shops table exists and add subscription status columns
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to shops table (safe with IF NOT EXISTS)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled'));
ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise'));
ALTER TABLE shops ADD COLUMN IF NOT EXISTS monthly_request_limit INTEGER DEFAULT 100000;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS current_month_usage INTEGER DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{"rate_limit": 100, "ip_whitelist": [], "webhook_validation": true}';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMPTZ;

-- Rate limiting and security logs
CREATE TABLE IF NOT EXISTS security_logs (
  id SERIAL PRIMARY KEY,
  shop_domain TEXT,
  ip_address TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('auth_success', 'auth_failure', 'rate_limit', 'suspicious_activity', 'api_key_created', 'api_key_revoked')),
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook security table
CREATE TABLE IF NOT EXISTS webhook_security (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_domain TEXT NOT NULL,
  webhook_secret TEXT NOT NULL, -- Encrypted webhook secret
  signature_algorithm TEXT DEFAULT 'sha256',
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  failed_verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP whitelist for enhanced security
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id SERIAL PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  ip_address INET NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Request audit trail
CREATE TABLE IF NOT EXISTS request_audit (
  id SERIAL PRIMARY KEY,
  shop_domain TEXT,
  api_key_prefix TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_size INTEGER,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_api_keys_shop_domain ON api_keys(shop_domain);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_security_logs_shop_domain ON security_logs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);

CREATE INDEX IF NOT EXISTS idx_webhook_security_shop_domain ON webhook_security(shop_domain);
CREATE INDEX IF NOT EXISTS idx_webhook_security_active ON webhook_security(is_active);

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_shop_domain ON ip_whitelist(shop_domain);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip_address ON ip_whitelist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active ON ip_whitelist(is_active);

CREATE INDEX IF NOT EXISTS idx_request_audit_shop_domain ON request_audit(shop_domain);
CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_request_audit_endpoint ON request_audit(endpoint);
CREATE INDEX IF NOT EXISTS idx_request_audit_status ON request_audit(response_status);

-- Updated at triggers
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_webhook_security_updated_at BEFORE UPDATE ON webhook_security FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_audit ENABLE ROW LEVEL SECURITY;

-- Service role policies (for API functions)
CREATE POLICY "Service role can access all api_keys" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all security_logs" ON security_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all webhook_security" ON webhook_security FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all ip_whitelist" ON ip_whitelist FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all request_audit" ON request_audit FOR ALL USING (auth.role() = 'service_role');

-- Functions for security operations
CREATE OR REPLACE FUNCTION log_security_event(
  p_shop_domain TEXT,
  p_ip_address TEXT,
  p_event_type TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_request_method TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
) RETURNS void AS $$
BEGIN
  INSERT INTO security_logs (
    shop_domain, ip_address, event_type, user_agent, request_path, 
    request_method, details, severity
  ) VALUES (
    p_shop_domain, p_ip_address, p_event_type, p_user_agent, p_request_path,
    p_request_method, p_details, p_severity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is whitelisted
CREATE OR REPLACE FUNCTION is_ip_whitelisted(
  p_shop_domain TEXT,
  p_ip_address TEXT
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_whitelist 
    WHERE shop_domain = p_shop_domain 
    AND ip_address >>= p_ip_address::inet 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shop rate limits
CREATE OR REPLACE FUNCTION get_shop_rate_limits(p_shop_domain TEXT)
RETURNS TABLE(
  rate_limit_per_minute INTEGER,
  monthly_limit INTEGER,
  current_usage INTEGER,
  subscription_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((security_settings->>'rate_limit')::INTEGER, 100) as rate_limit_per_minute,
    monthly_request_limit,
    current_month_usage,
    shops.subscription_status
  FROM shops 
  WHERE shop_domain = p_shop_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old security logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs() RETURNS void AS $$
BEGIN
  DELETE FROM security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM request_audit 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup function (would need to be set up via pg_cron or external scheduler)
-- SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_security_logs();');

-- Shopify webhooks table for audit trail
CREATE TABLE IF NOT EXISTS shopify_webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE
);

-- CRM sync queue table
CREATE TABLE IF NOT EXISTS crm_sync_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_data JSONB NOT NULL,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed')),
  encryption_key_id TEXT,
  data_hash TEXT, -- SHA-256 of customer data for integrity
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic webhooks table for non-Shopify webhooks
CREATE TABLE IF NOT EXISTS generic_webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  headers JSONB,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Security dashboard view will be created after all columns are confirmed to exist