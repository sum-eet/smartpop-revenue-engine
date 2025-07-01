-- Create table for storing Shopify app installations
CREATE TABLE IF NOT EXISTS shopify_installations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    shop_domain TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    script_tag_id BIGINT,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    app_version TEXT DEFAULT '1.0.0',
    installation_method TEXT DEFAULT 'script_tag'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_installations_shop_domain ON shopify_installations(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_installations_active ON shopify_installations(is_active);

-- Enable RLS
ALTER TABLE shopify_installations ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage installations" ON shopify_installations
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_installations_updated_at 
    BEFORE UPDATE ON shopify_installations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();