import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { securityMiddleware, SECURITY_CONFIGS } from '../security-middleware/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://smartpop.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === ANALYTICS DASHBOARD API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply security middleware
  const securityResult = await securityMiddleware(req, SECURITY_CONFIGS.ANALYTICS)
  if (!securityResult.allowed) {
    return securityResult.response!
  }

  if (req.method === 'POST') {
    try {
      const { startDate, endDate } = await req.json()
      
      console.log(`[${timestamp}] Fetching analytics for period:`, {
        startDate,
        endDate
      })

      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const start = new Date(startDate)
      const end = new Date(endDate)

      // Get overview metrics
      const [
        sessionsResult,
        eventsResult,
        pageViewResult,
        uniqueUsersResult
      ] = await Promise.all([
        // Total sessions
        supabase
          .from('sessions')
          .select('*', { count: 'exact' })
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString()),
        
        // Total events
        supabase
          .from('tracking_events')
          .select('*', { count: 'exact' })
          .gte('timestamp', start.toISOString())
          .lte('timestamp', end.toISOString()),
        
        // Page view events
        supabase
          .from('tracking_events')
          .select('event_data')
          .eq('event_type', 'page_view')
          .gte('timestamp', start.toISOString())
          .lte('timestamp', end.toISOString()),
        
        // Unique users (sessions)
        supabase
          .from('sessions')
          .select('session_id')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
      ])

      // Calculate overview metrics
      const totalSessions = sessionsResult.count || 0
      const totalEvents = eventsResult.count || 0
      const totalPageViews = pageViewResult.data?.length || 0
      const totalUsers = uniqueUsersResult.data?.length || 0

      // Get session durations for average calculation
      const { data: sessionDurations } = await supabase
        .from('sessions')
        .select('duration')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .not('duration', 'is', null)

      const avgSessionDuration = sessionDurations && sessionDurations.length > 0
        ? Math.round(sessionDurations.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionDurations.length)
        : 0

      // Calculate bounce rate
      const { data: bouncedSessions } = await supabase
        .from('sessions')
        .select('page_views')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .eq('bounced', true)

      const bounceRate = totalSessions > 0 
        ? (bouncedSessions?.length || 0) / totalSessions * 100 
        : 0

      // Get trends data (daily breakdown)
      const trendData = await generateTrendsData(supabase, start, end)

      // Get top pages
      const topPages = await getTopPages(supabase, start, end)

      // Get device/browser/country data
      const [deviceData, browserData, countryData] = await Promise.all([
        getDeviceData(supabase, start, end),
        getBrowserData(supabase, start, end),
        getCountryData(supabase, start, end)
      ])

      // Get event types breakdown
      const eventTypes = await getEventTypes(supabase, start, end)

      const analytics = {
        overview: {
          totalUsers,
          totalSessions,
          totalPageViews,
          avgSessionDuration,
          bounceRate,
          conversionRate: 2.5 // Placeholder - would need goal tracking
        },
        trends: trendData,
        topPages,
        devices: deviceData,
        browsers: browserData,
        countries: countryData,
        events: eventTypes,
        dateRange: { startDate, endDate },
        generatedAt: timestamp
      }

      console.log(`[${timestamp}] Analytics generated:`, {
        totalUsers,
        totalSessions,
        totalPageViews,
        avgSessionDuration,
        bounceRate
      })

      return new Response(JSON.stringify(analytics), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error(`[${timestamp}] Function error:`, error)
      return new Response(JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

async function generateTrendsData(supabase: any, start: Date, end: Date) {
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const trends = {
    users: [],
    sessions: [],
    pageViews: []
  }

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const dateStr = dayStart.toISOString().split('T')[0]

    const [sessionsCount, pageViewsCount] = await Promise.all([
      supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString()),
      
      supabase
        .from('tracking_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('timestamp', dayStart.toISOString())
        .lt('timestamp', dayEnd.toISOString())
    ])

    trends.users.push({ date: dateStr, value: sessionsCount.count || 0 })
    trends.sessions.push({ date: dateStr, value: sessionsCount.count || 0 })
    trends.pageViews.push({ date: dateStr, value: pageViewsCount.count || 0 })
  }

  return trends
}

async function getTopPages(supabase: any, start: Date, end: Date) {
  const { data: pageViews } = await supabase
    .from('tracking_events')
    .select('event_data')
    .eq('event_type', 'page_view')
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString())

  const pageStats = new Map()
  
  pageViews?.forEach((event: any) => {
    const url = event.event_data?.url || 'Unknown'
    const timeOnPage = event.event_data?.timeOnPage || 0
    
    if (!pageStats.has(url)) {
      pageStats.set(url, { views: 0, totalTime: 0 })
    }
    
    const stats = pageStats.get(url)
    stats.views++
    stats.totalTime += timeOnPage
  })

  return Array.from(pageStats.entries())
    .map(([url, stats]) => ({
      url,
      views: stats.views,
      avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
}

async function getDeviceData(supabase: any, start: Date, end: Date) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('device_fingerprint')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())

  const deviceCounts = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 }
  
  sessions?.forEach((session: any) => {
    const fingerprint = session.device_fingerprint
    // Simple device detection based on screen resolution
    if (fingerprint?.screenResolution) {
      const [width] = fingerprint.screenResolution.split('x').map(Number)
      if (width < 768) {
        deviceCounts.mobile++
      } else if (width < 1024) {
        deviceCounts.tablet++
      } else {
        deviceCounts.desktop++
      }
    } else {
      deviceCounts.unknown++
    }
  })

  return [
    { name: 'Desktop', value: deviceCounts.desktop, color: '#3b82f6' },
    { name: 'Mobile', value: deviceCounts.mobile, color: '#10b981' },
    { name: 'Tablet', value: deviceCounts.tablet, color: '#f59e0b' },
    { name: 'Unknown', value: deviceCounts.unknown, color: '#6b7280' }
  ].filter(device => device.value > 0)
}

async function getBrowserData(supabase: any, start: Date, end: Date) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('user_agent')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())

  const browserCounts = new Map()
  
  sessions?.forEach((session: any) => {
    const userAgent = session.user_agent || ''
    let browser = 'Unknown'
    
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)
  })

  return Array.from(browserCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

async function getCountryData(supabase: any, start: Date, end: Date) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('country')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())

  const countryCounts = new Map()
  
  sessions?.forEach((session: any) => {
    const country = session.country || 'Unknown'
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
  })

  return Array.from(countryCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

async function getEventTypes(supabase: any, start: Date, end: Date) {
  const { data: events } = await supabase
    .from('tracking_events')
    .select('event_type')
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString())

  const eventCounts = new Map()
  
  events?.forEach((event: any) => {
    const type = event.event_type
    eventCounts.set(type, (eventCounts.get(type) || 0) + 1)
  })

  return Array.from(eventCounts.entries())
    .map(([type, count]) => ({ type, count, change: 0 })) // Would need historical data for change
    .sort((a, b) => b.count - a.count)
}