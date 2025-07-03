import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === PUBLIC POPUP TRACK API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key for database access (internal only)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return new Response(JSON.stringify({ 
        error: 'Service configuration error',
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (req.method === 'POST') {
      let eventData
      try {
        eventData = await req.json()
        console.log(`[${timestamp}] Public track event:`, JSON.stringify(eventData, null, 2))
      } catch (parseError) {
        console.error(`[${timestamp}] JSON parse error:`, parseError)
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

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

      // Special handling for scroll tracking events (store in tracking_events)
      if (eventData.eventType === 'scroll_tracking') {
        try {
          const scrollEvent = {
            session_id: eventData.sessionId || 'unknown',
            user_id: eventData.userId || null,
            event_type: 'behavioral',
            event_data: {
              type: 'scroll_tracking',
              scroll_percent: eventData.scrollPercent || 0,
              max_scroll_reached: eventData.maxScrollReached || 0,
              page_url: eventData.pageUrl,
              shop: eventData.shop,
              timestamp: timestamp
            },
            timestamp: timestamp
          }

          const { data, error } = await supabase
            .from('tracking_events')
            .insert([scrollEvent])
            .select()

          if (error) {
            console.error(`[${timestamp}] Scroll tracking insert error:`, error)
            return new Response(JSON.stringify({ 
              error: 'Failed to track scroll event',
              details: error.message,
              timestamp
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          console.log(`[${timestamp}] Scroll event tracked successfully`)
          return new Response(JSON.stringify({ 
            success: true, 
            event_type: 'scroll_tracking',
            scroll_percent: eventData.scrollPercent,
            timestamp
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (scrollError) {
          console.error(`[${timestamp}] Scroll tracking error:`, scrollError)
          return new Response(JSON.stringify({ 
            error: 'Scroll tracking failed',
            details: scrollError.message,
            timestamp
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Regular popup event tracking
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (eventData.popupId !== 'tracking_scroll' && !uuidRegex.test(eventData.popupId)) {
        console.log(`[${timestamp}] ERROR: Invalid popup ID format:`, eventData.popupId)
        return new Response(JSON.stringify({ 
          error: 'Invalid popup ID format',
          received: eventData.popupId,
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      try {
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
            timestamp: timestamp
          }])
          .select()

        if (error) {
          console.error(`[${timestamp}] Database insert error:`, error)
          return new Response(JSON.stringify({ 
            error: 'Failed to track event',
            details: error.message,
            hint: error.hint,
            code: error.code,
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

      } catch (dbError) {
        console.error(`[${timestamp}] Database operation error:`, dbError)
        return new Response(JSON.stringify({ 
          error: 'Database operation failed',
          details: dbError.message,
          timestamp
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (req.method === 'GET') {
      // Get analytics (public access)
      const reqUrl = new URL(req.url)
      const popupId = reqUrl.searchParams.get('popupId')
      const shop = reqUrl.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
      const showDetails = reqUrl.searchParams.get('details') === 'true'
      
      console.log(`[${timestamp}] Public analytics request for shop:`, shop, 'popup:', popupId)

      let query = supabase
        .from('popup_events')
        .select('*')
        .eq('shop_domain', shop)

      if (popupId && popupId !== 'all') {
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

      // Add detailed events if requested
      if (showDetails && events?.length > 0) {
        analytics.detailedEvents = events.map(event => ({
          id: event.id,
          popup_id: event.popup_id,
          event_type: event.event_type,
          shop_domain: event.shop_domain,
          page_url: event.page_url,
          email: event.email,
          discount_code_used: event.discount_code_used,
          visitor_ip: event.visitor_ip,
          user_agent: event.user_agent,
          timestamp: event.timestamp,
          created_at: event.created_at
        }))
      }

      // Group by popup if no specific popup requested
      if (!popupId && events?.length > 0) {
        const popupAnalytics = {}
        
        for (const event of events) {
          const id = event.popup_id
          if (!popupAnalytics[id]) {
            // Get popup info if possible
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

      return new Response(JSON.stringify(analytics, null, 2), {
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
    console.error(`[${timestamp}] Function error:`, error)
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