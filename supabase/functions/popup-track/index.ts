import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '../_shared/session-auth.ts'
import { invalidateDashboardCache, warmupCache } from '../_shared/performance-cache.ts'
import { processEventWebhook } from '../event-processor/index.ts'

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
      let eventData
      try {
        // Track popup event (no auth required for public tracking)
        eventData = await req.json()
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

      console.log(`[${timestamp}] Tracking event:`, eventData.eventType, 'for popup:', eventData.popupId)

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(eventData.popupId)) {
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
            shop_domain: eventData.shop || null, // No default shop domain for security
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
          console.error(`[${timestamp}] Error details:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
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
        
        // Process event for real-time aggregations and cache invalidation
        try {
          await processEventWebhook(supabase, {
            popup_id: eventData.popupId,
            event_type: eventData.eventType,
            shop_domain: eventData.shop || 'unknown',
            session_id: eventData.sessionId,
            visitor_ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || '',
            user_agent: req.headers.get('User-Agent') || '',
            page_url: eventData.pageUrl,
            email: eventData.email,
            timestamp: timestamp,
            metadata: eventData.metadata || {}
          }, timestamp);
        } catch (processingError) {
          console.warn(`[${timestamp}] Event processing failed:`, processingError);
          // Don't fail the main request if processing fails
        }

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
      // Authenticate analytics requests
      const auth = await authenticateRequest(req);
      
      if (!auth.isAuthenticated) {
        return createErrorResponse(auth.error || 'Authentication required for analytics', 401, corsHeaders);
      }

      const reqUrl = new URL(req.url)
      const popupId = reqUrl.searchParams.get('popupId')
      const shop = auth.shop // Use authenticated shop
      const showDetails = reqUrl.searchParams.get('details') === 'true'
      const fullAnalytics = reqUrl.searchParams.get('analytics') === 'true'
      const timeframe = reqUrl.searchParams.get('timeframe') || '7d'
      
      console.log(`[${timestamp}] Analytics request for authenticated shop:`, shop, 'popup:', popupId, 'full:', fullAnalytics, 'embedded:', auth.isEmbedded)

      // If full analytics requested, return comprehensive dashboard data
      if (fullAnalytics) {
        console.log(`[${timestamp}] Generating comprehensive analytics for ${shop}`)
        
        // Calculate date filter based on timeframe
        const now = new Date()
        let dateFilter = new Date(0) // Default to all time
        
        if (timeframe === '1d') {
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        } else if (timeframe === '7d') {
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        } else if (timeframe === '30d') {
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }

        // Get all events for analytics
        const { data: allEvents, error: eventsError } = await supabase
          .from('popup_events')
          .select(`
            *,
            popups!inner(name, popup_type, title)
          `)
          .eq('shop_domain', shop)
          .gte('created_at', dateFilter.toISOString())
          .order('created_at', { ascending: false })

        if (eventsError) {
          console.error(`[${timestamp}] Events query error:`, eventsError)
          return new Response(JSON.stringify({ 
            error: 'Failed to fetch events',
            details: eventsError.message,
            timestamp
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Calculate core metrics
        const views = allEvents?.filter(e => e.event_type === 'view').length || 0
        const conversions = allEvents?.filter(e => e.event_type === 'conversion').length || 0
        const optinConversionRate = views > 0 ? (conversions / views * 100).toFixed(2) : '0.00'
        const abandonments = views - conversions
        const abandonmentRate = views > 0 ? (abandonments / views * 100).toFixed(2) : '0.00'

        // Daily trend analysis
        const dailyData = {}
        allEvents?.forEach(event => {
          const date = new Date(event.created_at).toISOString().split('T')[0]
          if (!dailyData[date]) {
            dailyData[date] = { views: 0, conversions: 0 }
          }
          if (event.event_type === 'view') dailyData[date].views++
          if (event.event_type === 'conversion') dailyData[date].conversions++
        })

        const dailyTrend = Object.entries(dailyData).map(([date, data]) => ({
          date,
          views: data.views,
          conversions: data.conversions,
          optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : '0.00'
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Popup performance analysis
        const popupStats = {}
        allEvents?.forEach(event => {
          const popupId = event.popup_id
          if (!popupStats[popupId]) {
            popupStats[popupId] = {
              popup_id: popupId,
              name: event.popups?.name || 'Unknown',
              popup_type: event.popups?.popup_type || 'unknown',
              title: event.popups?.title || 'Unknown',
              views: 0,
              conversions: 0
            }
          }
          if (event.event_type === 'view') popupStats[popupId].views++
          if (event.event_type === 'conversion') popupStats[popupId].conversions++
        })

        const topPopups = Object.values(popupStats).map((popup: any) => ({
          ...popup,
          optin_conversion_rate: popup.views > 0 ? (popup.conversions / popup.views * 100).toFixed(2) : '0.00'
        })).sort((a, b) => parseFloat(b.optin_conversion_rate) - parseFloat(a.optin_conversion_rate))

        // Device analytics
        const deviceStats = { mobile: { views: 0, conversions: 0 }, desktop: { views: 0, conversions: 0 } }
        allEvents?.forEach(event => {
          const isMobile = /Mobile|Android|iPhone|iPad/i.test(event.user_agent || '')
          const device = isMobile ? 'mobile' : 'desktop'
          if (event.event_type === 'view') deviceStats[device].views++
          if (event.event_type === 'conversion') deviceStats[device].conversions++
        })

        const deviceAnalytics = {
          mobile: {
            views: deviceStats.mobile.views,
            conversions: deviceStats.mobile.conversions,
            optin_conversion_rate: deviceStats.mobile.views > 0 ? 
              (deviceStats.mobile.conversions / deviceStats.mobile.views * 100).toFixed(2) : '0.00'
          },
          desktop: {
            views: deviceStats.desktop.views,
            conversions: deviceStats.desktop.conversions,
            optin_conversion_rate: deviceStats.desktop.views > 0 ? 
              (deviceStats.desktop.conversions / deviceStats.desktop.views * 100).toFixed(2) : '0.00'
          }
        }

        // Peak hours analysis (last 7 days)
        const hourlyStats = {}
        const last7Days = allEvents?.filter(e => 
          new Date(e.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ) || []
        
        last7Days.forEach(event => {
          const hour = new Date(event.created_at).getHours()
          if (!hourlyStats[hour]) {
            hourlyStats[hour] = { views: 0, conversions: 0 }
          }
          if (event.event_type === 'view') hourlyStats[hour].views++
          if (event.event_type === 'conversion') hourlyStats[hour].conversions++
        })

        const peakHours = Object.entries(hourlyStats)
          .map(([hour, data]) => ({
            hour: parseInt(hour),
            hour_display: `${hour}:00`,
            views: data.views,
            conversions: data.conversions,
            optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : '0.00'
          }))
          .sort((a, b) => b.conversions - a.conversions)
          .slice(0, 5)

        // Page performance analysis
        const pageStats = {}
        allEvents?.filter(e => e.page_url).forEach(event => {
          const url = event.page_url
          if (!pageStats[url]) {
            pageStats[url] = { views: 0, conversions: 0 }
          }
          if (event.event_type === 'view') pageStats[url].views++
          if (event.event_type === 'conversion') pageStats[url].conversions++
        })

        const topPages = Object.entries(pageStats)
          .map(([url, data]) => ({
            page_url: url,
            page_name: url.split('/').pop() || 'Homepage',
            views: data.views,
            conversions: data.conversions,
            optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : '0.00'
          }))
          .sort((a, b) => b.conversions - a.conversions)
          .slice(0, 10)

        // Popup type performance
        const popupTypeStats = {}
        allEvents?.forEach(event => {
          const type = event.popups?.popup_type || 'unknown'
          if (!popupTypeStats[type]) {
            popupTypeStats[type] = { views: 0, conversions: 0 }
          }
          if (event.event_type === 'view') popupTypeStats[type].views++
          if (event.event_type === 'conversion') popupTypeStats[type].conversions++
        })

        const popupTypePerformance = Object.entries(popupTypeStats).map(([type, data]) => ({
          popup_type: type,
          type_display: type.replace('_', ' ').toUpperCase(),
          views: data.views,
          conversions: data.conversions,
          optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : '0.00'
        }))

        // Recent activity (last 50 events)
        const recentActivity = allEvents?.slice(0, 50).map(event => ({
          event_type: event.event_type,
          email: event.email,
          page_url: event.page_url,
          timestamp: event.created_at,
          time_ago: Math.round((now.getTime() - new Date(event.created_at).getTime()) / (1000 * 60)) + ' min ago'
        })) || []

        const comprehensiveAnalytics = {
          // Core Metrics
          core_metrics: {
            total_popup_views: views,
            total_email_optins: conversions,
            optin_conversion_rate: parseFloat(optinConversionRate),
            abandonment_rate: parseFloat(abandonmentRate),
            total_abandonments: abandonments,
            timeframe: timeframe,
            last_updated: new Date().toISOString()
          },

          // Trend Data
          daily_trend: dailyTrend,

          // Performance Data
          top_performing_popups: topPopups.slice(0, 5),
          device_analytics: deviceAnalytics,
          peak_hours: peakHours,
          top_pages: topPages,
          popup_type_performance: popupTypePerformance,

          // Engagement Data
          engagement_metrics: {
            average_time_to_convert: '2.3 min', // TODO: Calculate from actual data
            unique_visitors: 'N/A', // TODO: Track by IP or session
            return_visitor_rate: 'N/A' // TODO: Track repeat visits
          },

          // Recent Activity
          recent_activity: recentActivity,

          // Meta
          shop_domain: shop,
          generated_at: new Date().toISOString(),
          total_events_analyzed: allEvents?.length || 0
        }

        console.log(`[${timestamp}] Comprehensive analytics generated: ${views} views, ${conversions} optins`)

        return new Response(JSON.stringify(comprehensiveAnalytics, null, 2), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

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