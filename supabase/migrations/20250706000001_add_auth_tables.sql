-- Phase 3: Authentication system tables
-- Add authentication and token management capabilities

-- Authentication tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('api_key', 'jwt_refresh', 'shopify_oauth')),
  token_name TEXT, -- Human readable name like "Dashboard API Key"
  permissions JSONB DEFAULT '["read", "write"]',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_used_ip INET,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID, -- User who created this token
  is_active BOOLEAN DEFAULT true
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- API request logs for monitoring
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  shop_id UUID REFERENCES shops(id),
  user_id UUID,
  auth_method TEXT CHECK (auth_method IN ('api_key', 'jwt', 'shopify_oauth', 'none')),
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_shop ON auth_tokens(shop_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_shop ON api_request_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);

-- Enable RLS
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their shop's tokens" ON auth_tokens
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

CREATE POLICY "Users can manage their sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can access all logs" ON api_request_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger for auth_tokens
CREATE OR REPLACE FUNCTION update_auth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    NEW.usage_count = OLD.usage_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auth_tokens_usage 
    BEFORE UPDATE ON auth_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_auth_tokens_updated_at();