-- Create popups table for the new popup system
CREATE TABLE public.popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_delay', 'exit_intent', 'scroll_depth', 'click', 'page_view')),
  trigger_value TEXT,
  page_target TEXT NOT NULL CHECK (page_target IN ('all_pages', 'homepage', 'product_pages', 'collection_pages', 'blog_pages', 'cart_page', 'checkout_page')),
  popup_type TEXT NOT NULL CHECK (popup_type IN ('email_capture', 'discount_offer', 'announcement', 'survey')),
  title TEXT,
  description TEXT,
  button_text TEXT,
  email_placeholder TEXT DEFAULT 'Enter your email',
  discount_code TEXT,
  discount_percent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create popup_events table for tracking
CREATE TABLE public.popup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID REFERENCES public.popups(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'conversion')),
  shop_domain TEXT,
  page_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  email TEXT,
  discount_code_used TEXT,
  visitor_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Shops can access their popups" ON public.popups
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop_domain'));

CREATE POLICY "Allow popup events tracking" ON public.popup_events
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_popups_shop_id ON public.popups(shop_id);
CREATE INDEX idx_popups_active ON public.popups(is_active);
CREATE INDEX idx_popup_events_popup_id ON public.popup_events(popup_id);
CREATE INDEX idx_popup_events_shop_domain ON public.popup_events(shop_domain);