import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === POPUP TRACK API CALLED ===`)
  console.log(`[${timestamp}] Method:`, req.method)
  console.log(`[${timestamp}] URL:`, req.url)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      // Track popup event (no auth required for public tracking)
      const eventData = await req.json()
      console.log(`[${timestamp}] Track event request:`, JSON.stringify(eventData, null, 2))
      
      // Validate required fields
      if (!eventData.popupId || !eventData.eventType) {
        console.log(`[${timestamp}] ERROR: Missing required fields`)
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['popupId', 'eventType'],
          received: Object.keys(eventData),
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Tracking event:`, eventData.eventType, 'for popup:', eventData.popupId)

      const { data, error } = await supabase
        .from('popup_events')
        .insert([{
          popup_id: eventData.popupId,
          event_type: eventData.eventType,
          shop_domain: eventData.shop || 'testingstoresumeet.myshopify.com',
          page_url: eventData.pageUrl || null,
          email: eventData.email || null,
          discount_code_used: eventData.discountCode || null,
          visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || null,
          user_agent: req.headers.get('User-Agent') || null,
          created_at: timestamp
        }])
        .select()

      if (error) {
        console.error(`[${timestamp}] Database insert error:`, error)
        return new Response(JSON.stringify({ 
          error: 'Failed to track event',
          details: error.message,
          timestamp
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Event tracked successfully:`, data?.[0]?.id)
      return new Response(JSON.stringify({ 
        success: true, 
        event: data?.[0],
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Get analytics (no auth required for basic analytics)
      const url = new URL(req.url)
      const popupId = url.searchParams.get('popupId')
      const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
      
      console.log(`[${timestamp}] Analytics request for shop:`, shop, 'popup:', popupId)

      // Build query
      let query = supabase
        .from('popup_events')
        .select('*')
        .eq('shop_domain', shop)

      if (popupId) {
        query = query.eq('popup_id', popupId)
      }

      const { data: events, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (error) {
        console.error(`[${timestamp}] Analytics query error:`, error)
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch analytics',
          details: error.message,
          timestamp
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Found ${events?.length || 0} events`)

      // Aggregate analytics data
      const analytics = {
        totalEvents: events?.length || 0,
        views: events?.filter(e => e.event_type === 'view').length || 0,
        conversions: events?.filter(e => e.event_type === 'conversion').length || 0,
        closes: events?.filter(e => e.event_type === 'close').length || 0,
        conversionRate: 0,
        timestamp
      }

      if (analytics.views > 0) {
        analytics.conversionRate = (analytics.conversions / analytics.views) * 100
      }

      // Group by popup if no specific popup requested
      if (!popupId && events?.length > 0) {
        const popupAnalytics = {}
        
        for (const event of events) {
          const id = event.popup_id
          if (!popupAnalytics[id]) {
            // Get popup info
            const { data: popup } = await supabase
              .from('popups')
              .select('name, popup_type')
              .eq('id', id)
              .single()
            
            popupAnalytics[id] = {
              popupId: id,
              popupName: popup?.name || 'Unknown',
              popupType: popup?.popup_type || 'unknown',
              views: 0,
              conversions: 0,
              closes: 0,
              conversionRate: 0
            }
          }
          
          if (event.event_type === 'view') popupAnalytics[id].views++
          if (event.event_type === 'conversion') popupAnalytics[id].conversions++
          if (event.event_type === 'close') popupAnalytics[id].closes++
        }

        // Calculate conversion rates
        Object.values(popupAnalytics).forEach((popup: any) => {
          if (popup.views > 0) {
            popup.conversionRate = (popup.conversions / popup.views) * 100
          }
        })

        analytics.byPopup = Object.values(popupAnalytics)
      }

      console.log(`[${timestamp}] Analytics summary:`, {
        views: analytics.views,
        conversions: analytics.conversions,
        rate: analytics.conversionRate
      })
      
      return new Response(JSON.stringify(analytics), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      timestamp
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error(`[${timestamp}] FUNCTION ERROR:`, error)
    return new Response(JSON.stringify({ 
      error: 'Function error',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})