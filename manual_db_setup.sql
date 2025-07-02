-- MANUAL DATABASE SETUP FOR DATA CAPTURE SYSTEM
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zsmoutzjhqjgjehaituw/sql

-- =====================================================
-- DATA CAPTURE TABLES
-- =====================================================

-- Main tracking events table (stores all captured data)
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'behavioral', 'ecommerce', 'performance', 'error')),
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table (device fingerprinting, attribution)
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER,
  page_views INTEGER DEFAULT 0,
  bounced BOOLEAN DEFAULT FALSE,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  device_fingerprint JSONB,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent records for GDPR/CCPA compliance
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  permissions JSONB NOT NULL,
  consent_string TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT NOT NULL CHECK (source IN ('banner', 'preferences', 'api')),
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECURITY TABLES  
-- =====================================================

-- API keys for secure authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_domain TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  permissions JSONB DEFAULT '{"read": true, "write": true, "admin": false}',
  rate_limit_per_minute INTEGER DEFAULT 100,
  notes TEXT,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security event logging
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

-- Webhook security
CREATE TABLE IF NOT EXISTS webhook_security (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_domain TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  signature_algorithm TEXT DEFAULT 'sha256',
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  failed_verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Tracking events indexes
CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_user_id ON tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

-- Consent records indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_session_id ON consent_records(session_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_shop_domain ON api_keys(shop_domain);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_security_logs_shop_domain ON security_logs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_security ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role can access all tracking_events" ON tracking_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all consent_records" ON consent_records FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all api_keys" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all security_logs" ON security_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all request_audit" ON request_audit FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all webhook_security" ON webhook_security FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_webhook_security_updated_at BEFORE UPDATE ON webhook_security FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'DATABASE SETUP COMPLETE! 🎉 All tables created for data capture and security.' as status;