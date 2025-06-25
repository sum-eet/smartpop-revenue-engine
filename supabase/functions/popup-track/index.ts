
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
    const { shop, campaignId, event, email, discountCode, sessionId } = body
    
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
    
    if (event === 'view') {
      // Track popup view
      const { data: view } = await supabase
        .from('popup_views')
        .insert({
          shop_id: shopData.id,
          campaign_id: campaignId,
          session_id: sessionId,
          visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
          user_agent: req.headers.get('User-Agent'),
          page_url: body.pageUrl
        })
        .select()
        .single()
      
      return new Response(JSON.stringify({ success: true, viewId: view?.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (event === 'conversion') {
      // Track conversion
      await supabase
        .from('popup_conversions')
        .insert({
          shop_id: shopData.id,
          campaign_id: campaignId,
          view_id: body.viewId,
          email: email,
          discount_code_used: discountCode
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
