import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest } from '../_shared/session-auth.ts'
import { checkRateLimit, getClientIP } from '../_shared/security-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const clientIP = getClientIP(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // CRITICAL SECURITY: Rate limiting for analytics access
    const rateLimit = checkRateLimit(clientIP, 60, 60000); // 60 requests per minute per IP
    if (!rateLimit.allowed) {
      console.warn(`[${timestamp}] Analytics rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Too many analytics requests. Please wait before trying again.',
        remaining: rateLimit.remaining
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // CRITICAL SECURITY: Authentication required for analytics access
    const auth = await authenticateRequest(req);
    if (!auth.isAuthenticated) {
      console.warn(`[${timestamp}] Unauthorized analytics access attempt from IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        message: 'Valid session token required to access analytics data'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const url = new URL(req.url)
    // SECURITY: Use authenticated shop domain only
    const shop = auth.shop;
    const timeframe = url.searchParams.get('timeframe') || '7d' // 1d, 7d, 30d, all
    
    // Validate timeframe parameter
    const validTimeframes = ['1d', '7d', '30d', 'all'];
    if (!validTimeframes.includes(timeframe)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid timeframe',
        message: 'Timeframe must be one of: 1d, 7d, 30d, all'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${timestamp}] 📊 Authenticated analytics request for shop: ${shop}, timeframe: ${timeframe}, IP: ${clientIP}`)

    // Calculate date filter based on timeframe
    let dateFilter = ''
    const now = new Date()
    
    if (timeframe === '1d') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      dateFilter = `AND created_at >= '${yesterday.toISOString()}'`
    } else if (timeframe === '7d') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`
    } else if (timeframe === '30d') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = `AND created_at >= '${monthAgo.toISOString()}'`
    }

    // 1. Core Metrics Query
    const { data: coreMetrics, error: coreError } = await supabase.rpc('get_popup_analytics', {
      p_shop_domain: shop,
      p_date_filter: dateFilter
    }).single()

    if (coreError) {
      console.error('Core metrics error:', coreError)
      // Fallback to direct queries if RPC doesn't exist
      const { data: allEvents } = await supabase
        .from('popup_events')
        .select('*')
        .eq('shop_domain', shop)

      const views = allEvents?.filter(e => e.event_type === 'view').length || 0
      const conversions = allEvents?.filter(e => e.event_type === 'conversion').length || 0
      
      var coreMetrics = {
        total_views: views,
        total_conversions: conversions,
        optin_conversion_rate: views > 0 ? (conversions / views * 100).toFixed(2) : 0
      }
    }

    // 2. Daily Trend (Last 7 days)
    const { data: dailyTrend, error: trendError } = await supabase
      .from('popup_events')
      .select('created_at, event_type')
      .eq('shop_domain', shop)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    const dailyData = {}
    if (dailyTrend) {
      dailyTrend.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0]
        if (!dailyData[date]) {
          dailyData[date] = { views: 0, conversions: 0 }
        }
        if (event.event_type === 'view') dailyData[date].views++
        if (event.event_type === 'conversion') dailyData[date].conversions++
      })
    }

    const dailyTrendFormatted = Object.entries(dailyData).map(([date, data]) => ({
      date,
      views: data.views,
      conversions: data.conversions,
      conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : 0
    }))

    // 3. Top Performing Popups
    const { data: popupPerformance, error: popupError } = await supabase
      .from('popup_events')
      .select(`
        popup_id,
        event_type,
        popups!inner(name, popup_type, title)
      `)
      .eq('shop_domain', shop)

    const popupStats = {}
    if (popupPerformance) {
      popupPerformance.forEach(event => {
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
    }

    const topPopups = Object.values(popupStats).map((popup: any) => ({
      ...popup,
      optin_conversion_rate: popup.views > 0 ? (popup.conversions / popup.views * 100).toFixed(2) : 0
    })).sort((a, b) => parseFloat(b.optin_conversion_rate) - parseFloat(a.optin_conversion_rate))

    // 4. Device Analytics
    const { data: deviceData, error: deviceError } = await supabase
      .from('popup_events')
      .select('user_agent, event_type')
      .eq('shop_domain', shop)

    const deviceStats = { mobile: { views: 0, conversions: 0 }, desktop: { views: 0, conversions: 0 } }
    if (deviceData) {
      deviceData.forEach(event => {
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(event.user_agent || '')
        const device = isMobile ? 'mobile' : 'desktop'
        if (event.event_type === 'view') deviceStats[device].views++
        if (event.event_type === 'conversion') deviceStats[device].conversions++
      })
    }

    const deviceAnalytics = {
      mobile: {
        views: deviceStats.mobile.views,
        conversions: deviceStats.mobile.conversions,
        optin_conversion_rate: deviceStats.mobile.views > 0 ? 
          (deviceStats.mobile.conversions / deviceStats.mobile.views * 100).toFixed(2) : 0
      },
      desktop: {
        views: deviceStats.desktop.views,
        conversions: deviceStats.desktop.conversions,
        optin_conversion_rate: deviceStats.desktop.views > 0 ? 
          (deviceStats.desktop.conversions / deviceStats.desktop.views * 100).toFixed(2) : 0
      }
    }

    // 5. Peak Hours Analysis
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('popup_events')
      .select('created_at, event_type')
      .eq('shop_domain', shop)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const hourlyStats = {}
    if (hourlyData) {
      hourlyData.forEach(event => {
        const hour = new Date(event.created_at).getHours()
        if (!hourlyStats[hour]) {
          hourlyStats[hour] = { views: 0, conversions: 0 }
        }
        if (event.event_type === 'view') hourlyStats[hour].views++
        if (event.event_type === 'conversion') hourlyStats[hour].conversions++
      })
    }

    const peakHours = Object.entries(hourlyStats)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        views: data.views,
        conversions: data.conversions,
        optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)

    // 6. Page Performance Analysis
    const { data: pageData, error: pageError } = await supabase
      .from('popup_events')
      .select('page_url, event_type')
      .eq('shop_domain', shop)
      .not('page_url', 'is', null)

    const pageStats = {}
    if (pageData) {
      pageData.forEach(event => {
        const url = event.page_url
        if (!pageStats[url]) {
          pageStats[url] = { views: 0, conversions: 0 }
        }
        if (event.event_type === 'view') pageStats[url].views++
        if (event.event_type === 'conversion') pageStats[url].conversions++
      })
    }

    const topPages = Object.entries(pageStats)
      .map(([url, data]) => ({
        page_url: url,
        views: data.views,
        conversions: data.conversions,
        optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)

    // 7. Popup Type Performance
    const popupTypeStats = {}
    if (popupPerformance) {
      popupPerformance.forEach(event => {
        const type = event.popups?.popup_type || 'unknown'
        if (!popupTypeStats[type]) {
          popupTypeStats[type] = { views: 0, conversions: 0 }
        }
        if (event.event_type === 'view') popupTypeStats[type].views++
        if (event.event_type === 'conversion') popupTypeStats[type].conversions++
      })
    }

    const popupTypePerformance = Object.entries(popupTypeStats).map(([type, data]) => ({
      popup_type: type,
      views: data.views,
      conversions: data.conversions,
      optin_conversion_rate: data.views > 0 ? (data.conversions / data.views * 100).toFixed(2) : 0
    }))

    // 8. Engagement Metrics
    const totalAbandonments = (coreMetrics.total_views || 0) - (coreMetrics.total_conversions || 0)
    const abandonmentRate = coreMetrics.total_views > 0 ? 
      (totalAbandonments / coreMetrics.total_views * 100).toFixed(2) : 0

    // 9. Recent Activity (Last 24 hours)
    const { data: recentActivity, error: recentError } = await supabase
      .from('popup_events')
      .select('created_at, event_type, email, page_url')
      .eq('shop_domain', shop)
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    // Final Analytics Object
    const analytics = {
      // Core Metrics
      core_metrics: {
        total_popup_views: coreMetrics.total_views || 0,
        total_email_optins: coreMetrics.total_conversions || 0,
        optin_conversion_rate: coreMetrics.optin_conversion_rate || 0,
        abandonment_rate: abandonmentRate,
        timeframe: timeframe,
        last_updated: new Date().toISOString()
      },

      // Trend Data
      daily_trend: dailyTrendFormatted,

      // Performance Data
      top_performing_popups: topPopups.slice(0, 5),
      device_analytics: deviceAnalytics,
      peak_hours: peakHours,
      top_pages: topPages,
      popup_type_performance: popupTypePerformance,

      // Engagement Data
      engagement_metrics: {
        total_abandonment: totalAbandonments,
        abandonment_rate: parseFloat(abandonmentRate),
        recent_activity_count: recentActivity?.length || 0
      },

      // Recent Activity
      recent_activity: recentActivity || [],

      // Meta
      shop_domain: shop,
      generated_at: new Date().toISOString()
    }

    console.log(`✅ Analytics generated for ${shop}: ${analytics.core_metrics.total_popup_views} views, ${analytics.core_metrics.total_email_optins} optins`)

    return new Response(JSON.stringify(analytics, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Analytics function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Analytics generation failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})