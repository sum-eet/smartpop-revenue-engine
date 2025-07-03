import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === SCROLL TRACKER API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      let scrollData
      try {
        scrollData = await req.json()
        console.log(`[${timestamp}] Scroll tracking:`, JSON.stringify(scrollData, null, 2))
      } catch (parseError) {
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
      if (!scrollData.sessionId || scrollData.scrollPercent === undefined) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['sessionId', 'scrollPercent'],
          received: Object.keys(scrollData),
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Store scroll event in tracking_events table
      const scrollEvent = {
        session_id: scrollData.sessionId,
        user_id: scrollData.userId || null,
        event_type: 'behavioral',
        event_data: {
          type: 'scroll_tracking',
          scroll_percent: scrollData.scrollPercent,
          page_url: scrollData.pageUrl,
          page_height: scrollData.pageHeight,
          viewport_height: scrollData.viewportHeight,
          scroll_position: scrollData.scrollPosition,
          max_scroll_reached: scrollData.maxScrollReached || scrollData.scrollPercent,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }

      const { data: eventData, error: eventError } = await supabase
        .from('tracking_events')
        .insert([scrollEvent])
        .select()

      if (eventError) {
        console.error(`[${timestamp}] Failed to insert scroll event:`, eventError)
      }

      // Check for scroll-triggered popups
      const { data: scrollPopups, error: popupError } = await supabase
        .from('popups')
        .select('*')
        .eq('trigger_type', 'scroll_depth')
        .eq('is_active', true)
        .eq('page_target', scrollData.pageTarget || 'all_pages')

      if (popupError) {
        console.error(`[${timestamp}] Failed to fetch scroll popups:`, popupError)
        return new Response(JSON.stringify({ 
          success: true,
          scroll_tracked: true,
          popups_checked: false,
          timestamp
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check if any popups should trigger
      const triggeredPopups = []
      for (const popup of scrollPopups || []) {
        const triggerPercent = parseInt(popup.trigger_value)
        
        if (scrollData.scrollPercent >= triggerPercent) {
          // Check if this popup has already been shown to this session
          const { data: existingView } = await supabase
            .from('popup_events')
            .select('id')
            .eq('popup_id', popup.id)
            .eq('shop_domain', scrollData.shop || 'testingstoresumeet.myshopify.com')
            .eq('visitor_ip', req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown')
            .eq('event_type', 'view')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

          if (!existingView || existingView.length === 0) {
            triggeredPopups.push({
              popup_id: popup.id,
              name: popup.name,
              title: popup.title,
              description: popup.description,
              button_text: popup.button_text,
              discount_code: popup.discount_code,
              discount_percent: popup.discount_percent,
              email_placeholder: popup.email_placeholder,
              trigger_percent: triggerPercent,
              current_scroll: scrollData.scrollPercent
            })

            console.log(`[${timestamp}] Popup triggered: ${popup.name} at ${scrollData.scrollPercent}% scroll`)
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        scroll_tracked: true,
        scroll_percent: scrollData.scrollPercent,
        popups_checked: true,
        triggered_popups: triggeredPopups,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET request - return scroll analytics
    if (req.method === 'GET') {
      const reqUrl = new URL(req.url)
      const sessionId = reqUrl.searchParams.get('sessionId')
      
      let query = supabase
        .from('tracking_events')
        .select('*')
        .eq('event_type', 'behavioral')
        .eq('event_data->>type', 'scroll_tracking')

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data: scrollEvents, error } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch scroll data',
          details: error.message,
          timestamp
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Analyze scroll behavior
      const analytics = {
        total_scroll_events: scrollEvents?.length || 0,
        sessions: {},
        max_scroll_reached: 0,
        avg_scroll_depth: 0,
        timestamp
      }

      if (scrollEvents && scrollEvents.length > 0) {
        const scrollPercentages: number[] = []
        
        for (const event of scrollEvents) {
          const data = event.event_data
          const sessionId = event.session_id
          
          if (!analytics.sessions[sessionId]) {
            analytics.sessions[sessionId] = {
              session_id: sessionId,
              max_scroll: 0,
              page_urls: new Set(),
              scroll_events: 0
            }
          }
          
          const scrollPercent = data.scroll_percent || 0
          scrollPercentages.push(scrollPercent)
          analytics.sessions[sessionId].max_scroll = Math.max(analytics.sessions[sessionId].max_scroll, scrollPercent)
          analytics.sessions[sessionId].page_urls.add(data.page_url)
          analytics.sessions[sessionId].scroll_events++
          
          analytics.max_scroll_reached = Math.max(analytics.max_scroll_reached, scrollPercent)
        }
        
        analytics.avg_scroll_depth = scrollPercentages.reduce((a, b) => a + b, 0) / scrollPercentages.length
        
        // Convert sets to arrays for JSON serialization
        Object.values(analytics.sessions).forEach((session: any) => {
          session.page_urls = Array.from(session.page_urls)
        })
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