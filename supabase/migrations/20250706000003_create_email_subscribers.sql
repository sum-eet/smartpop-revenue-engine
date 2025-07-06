-- Email Validation Fix: Create dedicated email subscribers table
-- This table will store all captured emails with proper validation and management

-- Main email subscribers table
CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL UNIQUE, -- SHA256 for privacy
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Capture details
  first_captured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  popup_id UUID REFERENCES popups(id),
  discount_code TEXT,
  
  -- Simple status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  verified BOOLEAN DEFAULT false,
  
  -- Capture metadata
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_shop ON email_subscribers(shop_id);
CREATE INDEX idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX idx_email_subscribers_captured ON email_subscribers(first_captured_at);
CREATE INDEX idx_email_subscribers_popup ON email_subscribers(popup_id);

-- Unique constraint: one email per shop
CREATE UNIQUE INDEX idx_email_subscribers_shop_email ON email_subscribers(shop_id, email);

-- Enable RLS
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS policy: shops can only access their own email subscribers
CREATE POLICY "Shops can access their email subscribers" ON email_subscribers
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_subscribers_updated_at 
    BEFORE UPDATE ON email_subscribers 
    FOR EACH ROW EXECUTE FUNCTION update_email_subscribers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE email_subscribers IS 'Dedicated table for storing email addresses captured through popups with enhanced validation';
COMMENT ON COLUMN email_subscribers.email_hash IS 'SHA256 hash of email for privacy and deduplication';
COMMENT ON COLUMN email_subscribers.status IS 'Email status: active, unsubscribed, bounced';
COMMENT ON INDEX idx_email_subscribers_shop_email IS 'Ensures one email per shop for deduplication';