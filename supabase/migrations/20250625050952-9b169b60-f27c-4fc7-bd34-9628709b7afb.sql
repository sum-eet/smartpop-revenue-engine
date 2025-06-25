
-- Create shops table to store Shopify store data
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create popup_campaigns table
CREATE TABLE public.popup_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'exit-intent', 'cart-abandonment', 'email-capture')),
  title TEXT NOT NULL,
  subtitle TEXT,
  discount_code TEXT,
  discount_percent INTEGER,
  template TEXT DEFAULT 'minimal' CHECK (template IN ('minimal', 'bold', 'elegant')),
  position TEXT DEFAULT 'center' CHECK (position IN ('center', 'bottom-right', 'bottom-bar')),
  is_active BOOLEAN DEFAULT true,
  triggers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create popup_views table for analytics
CREATE TABLE public.popup_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.popup_campaigns(id) ON DELETE CASCADE,
  session_id TEXT,
  visitor_ip TEXT,
  user_agent TEXT,
  page_url TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create popup_conversions table
CREATE TABLE public.popup_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.popup_campaigns(id) ON DELETE CASCADE,
  view_id UUID REFERENCES public.popup_views(id),
  email TEXT,
  discount_code_used TEXT,
  order_id TEXT,
  revenue_amount DECIMAL(10,2) DEFAULT 0,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_conversions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (shops can access their own data)
CREATE POLICY "Shops can access their own data" ON public.shops
  FOR ALL USING (shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain');

CREATE POLICY "Shops can access their campaigns" ON public.popup_campaigns
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

CREATE POLICY "Shops can access their views" ON public.popup_views
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

CREATE POLICY "Shops can access their conversions" ON public.popup_conversions
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

-- Create indexes for performance
CREATE INDEX idx_shops_domain ON public.shops(shop_domain);
CREATE INDEX idx_campaigns_shop_id ON public.popup_campaigns(shop_id);
CREATE INDEX idx_views_shop_id ON public.popup_views(shop_id);
CREATE INDEX idx_conversions_shop_id ON public.popup_conversions(shop_id);

-- Insert default campaigns for new shops
CREATE OR REPLACE FUNCTION create_default_campaigns(shop_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.popup_campaigns (shop_id, name, type, title, subtitle, discount_code, discount_percent, triggers) VALUES
  (shop_uuid, 'Welcome New Visitors', 'welcome', 'Welcome! Get 10% Off', 'Join thousands of happy customers', 'WELCOME10', 10, '{"isFirstVisit": true, "timeOnSite": 8}'),
  (shop_uuid, 'Cart Abandonment Recovery', 'cart-abandonment', 'Don''t Miss Out!', 'Complete your purchase and save 15%', 'SAVE15', 15, '{"cartValue": 50, "timeOnSite": 300}'),
  (shop_uuid, 'Exit Intent Discount', 'exit-intent', 'Wait! Before you go...', 'Get 20% off your first order', 'SAVE20', 20, '{"hasExitIntent": true}');
END;
$$ LANGUAGE plpgsql;
