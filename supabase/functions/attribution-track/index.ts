import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePublicRequest, createSecurityErrorResponse, getClientIP } from '../_shared/security-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttributionEvent {
  id: string;
  sessionId: string;
  visitorId: string;
  shopDomain: string;
  eventType: 'popup_shown' | 'email_submitted' | 'purchase_made' | 'cart_abandoned';
  timestamp: number;
  popupId?: string;
  email?: string;
  orderId?: string;
  orderValue?: number;
  attributionWindow: number;
  crossDevice: boolean;
  metadata: Record<string, any>;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const clientIP = getClientIP(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // SECURITY: Validate request and rate limiting
    const validation = validatePublicRequest(req);
    
    if (!validation.isValid) {
      console.warn(`[${timestamp}] Attribution tracking blocked: ${validation.error}`);
      return createSecurityErrorResponse(validation.error!, 403, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const attributionEvent: AttributionEvent = await req.json();
    
    console.log(`[${timestamp}] Attribution event: ${attributionEvent.eventType} for shop: ${attributionEvent.shopDomain}`);

    // Validate required fields
    if (!attributionEvent.id || !attributionEvent.sessionId || !attributionEvent.eventType) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        required: ['id', 'sessionId', 'eventType']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate shop domain matches security validation
    if (attributionEvent.shopDomain !== validation.shop) {
      return new Response(JSON.stringify({ 
        error: 'Shop domain mismatch',
        expected: validation.shop,
        received: attributionEvent.shopDomain
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare attribution record
    const attributionRecord = {
      event_id: attributionEvent.id,
      session_id: attributionEvent.sessionId,
      visitor_id: attributionEvent.visitorId,
      shop_domain: attributionEvent.shopDomain,
      event_type: attributionEvent.eventType,
      event_timestamp: new Date(attributionEvent.timestamp).toISOString(),
      popup_id: attributionEvent.popupId || null,
      email: attributionEvent.email || null,
      order_id: attributionEvent.orderId || null,
      order_value: attributionEvent.orderValue || null,
      attribution_window_days: Math.floor(attributionEvent.attributionWindow / (24 * 60 * 60 * 1000)),
      cross_device: attributionEvent.crossDevice,
      metadata: attributionEvent.metadata || {},
      client_ip: clientIP,
      user_agent: req.headers.get('User-Agent') || 'unknown',
      created_at: timestamp
    };

    try {
      // Insert into attribution_events table
      const { data, error } = await supabase
        .from('attribution_events')
        .insert([attributionRecord])
        .select();

      if (error) {
        console.error(`[${timestamp}] Failed to insert attribution event:`, error);
        
        // Try to create table if it doesn't exist
        if (error.message?.includes('does not exist')) {
          await createAttributionTables(supabase);
          console.log(`[${timestamp}] Created attribution tables`);
          
          // Retry insert
          const { data: retryData, error: retryError } = await supabase
            .from('attribution_events')
            .insert([attributionRecord])
            .select();

          if (retryError) {
            throw retryError;
          }
          
          data = retryData;
        } else {
          throw error;
        }
      }

      // Process specific event types
      await processAttributionEvent(supabase, attributionEvent, timestamp);

      // Store behavioral data if provided
      if (attributionEvent.metadata?.behavioralData) {
        await storeBehavioralData(supabase, attributionEvent, timestamp);
      }

      console.log(`[${timestamp}] Attribution event recorded: ${data?.[0]?.event_id}`);

      return new Response(JSON.stringify({ 
        success: true,
        eventId: data?.[0]?.event_id,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (dbError) {
      console.error(`[${timestamp}] Database error in attribution tracking:`, dbError);
      return new Response(JSON.stringify({ 
        error: 'Failed to record attribution event',
        details: dbError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error(`[${timestamp}] Attribution tracking function error:`, error);
    return new Response(JSON.stringify({ 
      error: 'Attribution tracking failed',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createAttributionTables(supabase: any): Promise<void> {
  const createTablesSQL = `
    -- Attribution Events Table
    CREATE TABLE IF NOT EXISTS attribution_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id TEXT UNIQUE NOT NULL,
      session_id TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      shop_domain TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      popup_id TEXT,
      email TEXT,
      order_id TEXT,
      order_value DECIMAL(10,2),
      attribution_window_days INTEGER NOT NULL DEFAULT 7,
      cross_device BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      client_ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Customer Journey Table (for analyzing paths)
    CREATE TABLE IF NOT EXISTS customer_journeys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      visitor_id TEXT NOT NULL,
      shop_domain TEXT NOT NULL,
      journey_start TIMESTAMP WITH TIME ZONE NOT NULL,
      journey_end TIMESTAMP WITH TIME ZONE,
      total_sessions INTEGER DEFAULT 1,
      total_events INTEGER DEFAULT 0,
      first_popup_shown TIMESTAMP WITH TIME ZONE,
      email_submitted TIMESTAMP WITH TIME ZONE,
      first_purchase TIMESTAMP WITH TIME ZONE,
      total_order_value DECIMAL(10,2) DEFAULT 0,
      device_types TEXT[] DEFAULT ARRAY[]::TEXT[],
      utm_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
      engagement_level TEXT DEFAULT 'low',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Behavioral Tracking Table
    CREATE TABLE IF NOT EXISTS behavioral_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT UNIQUE NOT NULL,
      visitor_id TEXT NOT NULL,
      shop_domain TEXT NOT NULL,
      time_on_site INTEGER NOT NULL DEFAULT 0,
      pages_viewed INTEGER NOT NULL DEFAULT 1,
      scroll_depth INTEGER NOT NULL DEFAULT 0,
      mouse_movements INTEGER NOT NULL DEFAULT 0,
      click_count INTEGER NOT NULL DEFAULT 0,
      cart_value DECIMAL(10,2),
      product_views TEXT[] DEFAULT ARRAY[]::TEXT[],
      search_queries TEXT[] DEFAULT ARRAY[]::TEXT[],
      exit_intent BOOLEAN DEFAULT FALSE,
      engagement_level TEXT DEFAULT 'low',
      device_type TEXT,
      session_start TIMESTAMP WITH TIME ZONE NOT NULL,
      last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_attribution_events_shop_domain ON attribution_events(shop_domain);
    CREATE INDEX IF NOT EXISTS idx_attribution_events_visitor_id ON attribution_events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_attribution_events_session_id ON attribution_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_attribution_events_event_type ON attribution_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_attribution_events_timestamp ON attribution_events(event_timestamp);
    CREATE INDEX IF NOT EXISTS idx_attribution_events_email ON attribution_events(email);

    CREATE INDEX IF NOT EXISTS idx_customer_journeys_visitor_id ON customer_journeys(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_customer_journeys_shop_domain ON customer_journeys(shop_domain);
    CREATE INDEX IF NOT EXISTS idx_customer_journeys_journey_start ON customer_journeys(journey_start);

    CREATE INDEX IF NOT EXISTS idx_behavioral_data_session_id ON behavioral_data(session_id);
    CREATE INDEX IF NOT EXISTS idx_behavioral_data_visitor_id ON behavioral_data(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_behavioral_data_shop_domain ON behavioral_data(shop_domain);
  `;

  await supabase.rpc('exec_sql', { sql: createTablesSQL });
}

async function processAttributionEvent(supabase: any, event: AttributionEvent, timestamp: string): Promise<void> {
  try {
    switch (event.eventType) {
      case 'popup_shown':
        await processPopupShownEvent(supabase, event);
        break;
      case 'email_submitted':
        await processEmailSubmittedEvent(supabase, event);
        break;
      case 'purchase_made':
        await processPurchaseEvent(supabase, event);
        break;
    }
  } catch (error) {
    console.error(`[${timestamp}] Error processing ${event.eventType} event:`, error);
  }
}

async function processPopupShownEvent(supabase: any, event: AttributionEvent): Promise<void> {
  // Update or create customer journey
  const { data: existingJourney } = await supabase
    .from('customer_journeys')
    .select('*')
    .eq('visitor_id', event.visitorId)
    .eq('shop_domain', event.shopDomain)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingJourney) {
    // Update existing journey
    await supabase
      .from('customer_journeys')
      .update({
        first_popup_shown: existingJourney.first_popup_shown || new Date(event.timestamp).toISOString(),
        total_events: existingJourney.total_events + 1,
        device_types: Array.from(new Set([...existingJourney.device_types, event.metadata.deviceType])),
        utm_sources: event.metadata.utmSource ? 
          Array.from(new Set([...existingJourney.utm_sources, event.metadata.utmSource])) : 
          existingJourney.utm_sources,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingJourney.id);
  } else {
    // Create new journey
    await supabase
      .from('customer_journeys')
      .insert([{
        visitor_id: event.visitorId,
        shop_domain: event.shopDomain,
        journey_start: new Date(event.timestamp).toISOString(),
        first_popup_shown: new Date(event.timestamp).toISOString(),
        total_events: 1,
        device_types: [event.metadata.deviceType],
        utm_sources: event.metadata.utmSource ? [event.metadata.utmSource] : []
      }]);
  }
}

async function processEmailSubmittedEvent(supabase: any, event: AttributionEvent): Promise<void> {
  // Update customer journey with email submission
  await supabase
    .from('customer_journeys')
    .update({
      email_submitted: new Date(event.timestamp).toISOString(),
      total_events: supabase.raw('total_events + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('visitor_id', event.visitorId)
    .eq('shop_domain', event.shopDomain);

  // Check for attribution to popup within attribution window
  const attributionWindowStart = new Date(event.timestamp - event.attributionWindow).toISOString();
  
  const { data: popupShownEvents } = await supabase
    .from('attribution_events')
    .select('*')
    .eq('visitor_id', event.visitorId)
    .eq('shop_domain', event.shopDomain)
    .eq('event_type', 'popup_shown')
    .gte('event_timestamp', attributionWindowStart)
    .lte('event_timestamp', new Date(event.timestamp).toISOString())
    .order('event_timestamp', { ascending: false });

  if (popupShownEvents && popupShownEvents.length > 0) {
    // Record conversion attribution
    const attributedPopup = popupShownEvents[0]; // Most recent popup shown
    
    await supabase
      .from('popup_conversions')
      .insert([{
        popup_id: attributedPopup.popup_id,
        visitor_id: event.visitorId,
        session_id: event.sessionId,
        shop_domain: event.shopDomain,
        email: event.email,
        converted_at: new Date(event.timestamp).toISOString(),
        attribution_popup_shown_at: attributedPopup.event_timestamp,
        time_to_conversion_seconds: Math.floor((event.timestamp - new Date(attributedPopup.event_timestamp).getTime()) / 1000),
        cross_device: event.crossDevice,
        metadata: {
          ...event.metadata,
          attributedPopupId: attributedPopup.popup_id,
          popupMetadata: attributedPopup.metadata
        }
      }]);
  }
}

async function storeBehavioralData(supabase: any, event: AttributionEvent, timestamp: string): Promise<void> {
  try {
    const behavioralData = event.metadata.behavioralData;
    
    const behavioralRecord = {
      session_id: event.sessionId,
      visitor_id: event.visitorId,
      shop_domain: event.shopDomain,
      time_on_site: behavioralData.timeOnSite || 0,
      pages_viewed: behavioralData.pagesViewed || 1,
      scroll_depth: behavioralData.scrollDepth || 0,
      mouse_movements: behavioralData.mouseMovements || 0,
      click_count: behavioralData.clickCount || 0,
      cart_value: behavioralData.cartValue || null,
      product_views: behavioralData.productViews || [],
      search_queries: behavioralData.searchQueries || [],
      exit_intent: behavioralData.exitIntent || false,
      engagement_level: behavioralData.engagement || 'low',
      device_type: event.metadata.deviceType || 'unknown',
      session_start: new Date(event.timestamp).toISOString(),
      last_activity: new Date().toISOString()
    };

    // Upsert behavioral data (update if exists, insert if not)
    await supabase
      .from('behavioral_data')
      .upsert(behavioralRecord, { onConflict: 'session_id' });

  } catch (error) {
    console.error(`[${timestamp}] Error storing behavioral data:`, error);
  }
}

async function processPurchaseEvent(supabase: any, event: AttributionEvent): Promise<void> {
  // Update customer journey with purchase
  await supabase
    .from('customer_journeys')
    .update({
      first_purchase: supabase.raw(`COALESCE(first_purchase, '${new Date(event.timestamp).toISOString()}')`),
      total_order_value: supabase.raw(`total_order_value + ${event.orderValue || 0}`),
      total_events: supabase.raw('total_events + 1'),
      journey_end: new Date(event.timestamp).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('visitor_id', event.visitorId)
    .eq('shop_domain', event.shopDomain);

  // Check for attribution to email submission within attribution window
  if (event.email) {
    const attributionWindowStart = new Date(event.timestamp - event.attributionWindow).toISOString();
    
    const { data: emailSubmissions } = await supabase
      .from('attribution_events')
      .select('*')
      .eq('shop_domain', event.shopDomain)
      .eq('event_type', 'email_submitted')
      .eq('email', event.email)
      .gte('event_timestamp', attributionWindowStart)
      .lte('event_timestamp', new Date(event.timestamp).toISOString())
      .order('event_timestamp', { ascending: false });

    if (emailSubmissions && emailSubmissions.length > 0) {
      // Update popup conversion with purchase data
      await supabase
        .from('popup_conversions')
        .update({
          order_id: event.orderId,
          revenue_amount: event.orderValue,
          purchased_at: new Date(event.timestamp).toISOString(),
          time_to_purchase_seconds: Math.floor((event.timestamp - new Date(emailSubmissions[0].event_timestamp).getTime()) / 1000)
        })
        .eq('email', event.email)
        .eq('shop_domain', event.shopDomain)
        .is('order_id', null) // Only update conversions that haven't been attributed to orders yet
        .order('converted_at', { ascending: false })
        .limit(1);
    }
  }
}