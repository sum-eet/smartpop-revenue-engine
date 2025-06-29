-- Add consent management tables for GDPR/CCPA compliance

-- Consent records table
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

-- Sessions table for tracking user sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER, -- in seconds
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

-- Tracking events table for comprehensive data capture
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

-- Data deletion log for compliance audit trail
CREATE TABLE IF NOT EXISTS data_deletion_log (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  deletion_results JSONB,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  total_records_deleted INTEGER DEFAULT 0
);

-- Data subjects table for GDPR compliance
CREATE TABLE IF NOT EXISTS data_subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data requests table for GDPR/CCPA rights
CREATE TABLE IF NOT EXISTS data_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subject_id TEXT NOT NULL REFERENCES data_subjects(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'portability', 'deletion', 'rectification')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_records_session_id ON consent_records(session_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_user_id ON tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_data_subjects_email ON data_subjects(email);

CREATE INDEX IF NOT EXISTS idx_data_requests_subject_id ON data_requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_data_subjects_updated_at BEFORE UPDATE ON data_subjects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_data_requests_updated_at BEFORE UPDATE ON data_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role can access all consent_records" ON consent_records FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all tracking_events" ON tracking_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data_subjects" ON data_subjects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data_requests" ON data_requests FOR ALL USING (auth.role() = 'service_role');