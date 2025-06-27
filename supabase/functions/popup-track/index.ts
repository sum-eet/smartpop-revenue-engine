
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      // Track popup event
      const eventData = await req.json()
      console.log('Received event data:', JSON.stringify(eventData, null, 2))
      
      // Validate required fields
      if (!eventData.popupId || !eventData.eventType || !eventData.shop) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['popupId', 'eventType', 'shop'],
          received: Object.keys(eventData)
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabase
        .from('popup_events')
        .insert([{
          popup_id: eventData.popupId,
          event_type: eventData.eventType,
          shop_domain: eventData.shop,
          page_url: eventData.pageUrl,
          email: eventData.email || null,
          discount_code_used: eventData.discountCode || null,
          visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || null,
          user_agent: req.headers.get('User-Agent') || null,
          created_at: eventData.timestamp || new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Database insert error:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to track event',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Event tracked successfully:', data)
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Get analytics for a specific popup or shop
      const url = new URL(req.url)
      const popupId = url.searchParams.get('popupId')
      const shop = url.searchParams.get('shop')
      
      if (!shop) {
        return new Response(JSON.stringify({ error: 'Shop parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let query = supabase
        .from('popup_events')
        .select(`
          *,
          popups!inner(name, popup_type)
        `)
        .eq('shop_domain', shop)

      if (popupId) {
        query = query.eq('popup_id', popupId)
      }

      const { data: events, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (error) {
        throw error
      }

      // Aggregate analytics data
      const analytics = {
        totalEvents: events?.length || 0,
        views: events?.filter(e => e.event_type === 'view').length || 0,
        conversions: events?.filter(e => e.event_type === 'conversion').length || 0,
        closes: events?.filter(e => e.event_type === 'close').length || 0,
        conversionRate: 0,
        events: events || []
      }

      if (analytics.views > 0) {
        analytics.conversionRate = (analytics.conversions / analytics.views) * 100
      }

      // Group by popup if no specific popup requested
      if (!popupId) {
        const popupAnalytics = {}
        events?.forEach(event => {
          const id = event.popup_id
          if (!popupAnalytics[id]) {
            popupAnalytics[id] = {
              popupId: id,
              popupName: event.popups?.name || 'Unknown',
              popupType: event.popups?.popup_type || 'unknown',
              views: 0,
              conversions: 0,
              closes: 0,
              conversionRate: 0
            }
          }
          
          if (event.event_type === 'view') popupAnalytics[id].views++
          if (event.event_type === 'conversion') popupAnalytics[id].conversions++
          if (event.event_type === 'close') popupAnalytics[id].closes++
        })

        // Calculate conversion rates
        Object.values(popupAnalytics).forEach((popup: any) => {
          if (popup.views > 0) {
            popup.conversionRate = (popup.conversions / popup.views) * 100
          }
        })

        analytics.byPopup = Object.values(popupAnalytics)
      }
      
      return new Response(JSON.stringify(analytics), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Popup tracking error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
