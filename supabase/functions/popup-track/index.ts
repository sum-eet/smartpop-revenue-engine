
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { shop, popupId, eventType, email, discountCode, pageUrl, timestamp } = body
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)
    
    // Get shop ID
    const { data: shopData } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single()
    
    if (!shopData) {
      throw new Error('Shop not found')
    }
    
    if (eventType === 'view') {
      // Track popup view
      const { data: event } = await supabase
        .from('popup_events')
        .insert({
          popup_id: popupId,
          event_type: 'view',
          shop_domain: shop,
          page_url: pageUrl,
          timestamp: timestamp,
          visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
          user_agent: req.headers.get('User-Agent')
        })
        .select()
        .single()
      
      return new Response(JSON.stringify({ success: true, eventId: event?.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (eventType === 'conversion') {
      // Track conversion
      await supabase
        .from('popup_events')
        .insert({
          popup_id: popupId,
          event_type: 'conversion',
          shop_domain: shop,
          page_url: pageUrl,
          timestamp: timestamp,
          email: email,
          discount_code_used: discountCode,
          visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
          user_agent: req.headers.get('User-Agent')
        })
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ error: 'Invalid event type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
