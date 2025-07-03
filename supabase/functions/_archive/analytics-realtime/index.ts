import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === ANALYTICS REALTIME API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      console.log(`[${timestamp}] Fetching realtime analytics for:`, {
        startOfDay: startOfDay.toISOString(),
        fiveMinutesAgo: fiveMinutesAgo.toISOString()
      })

      // Get active users (sessions with activity in last 5 minutes)
      const { data: activeSessions, error: activeSessionsError } = await supabase
        .from('sessions')
        .select('session_id, updated_at')
        .gte('updated_at', fiveMinutesAgo.toISOString())

      if (activeSessionsError) {
        console.error(`[${timestamp}] Active sessions query error:`, activeSessionsError)
      }

      const activeUsers = activeSessions?.length || 0

      // Get today's page views
      const { data: pageViewEvents, error: pageViewError } = await supabase
        .from('tracking_events')
        .select('event_data')
        .eq('event_type', 'page_view')
        .gte('timestamp', startOfDay.toISOString())

      if (pageViewError) {
        console.error(`[${timestamp}] Page view events query error:`, pageViewError)
      }

      const pageViews = pageViewEvents?.length || 0

      // Get total events today
      const { count: totalEvents, error: eventsCountError } = await supabase
        .from('tracking_events')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', startOfDay.toISOString())

      if (eventsCountError) {
        console.error(`[${timestamp}] Events count query error:`, eventsCountError)
      }

      // Calculate average session duration
      const { data: completedSessions, error: sessionDurationError } = await supabase
        .from('sessions')
        .select('duration')
        .gte('start_time', startOfDay.toISOString())
        .not('duration', 'is', null)

      if (sessionDurationError) {
        console.error(`[${timestamp}] Session duration query error:`, sessionDurationError)
      }

      const avgSessionDuration = completedSessions && completedSessions.length > 0
        ? Math.round(completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / completedSessions.length)
        : 0

      // Get top pages
      const topPagesMap = new Map<string, number>()
      
      if (pageViewEvents) {
        pageViewEvents.forEach(event => {
          if (event.event_data?.url) {
            const url = event.event_data.url
            topPagesMap.set(url, (topPagesMap.get(url) || 0) + 1)
          }
        })
      }

      const topPages = Array.from(topPagesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([url, views]) => ({ url, views }))

      // Get recent events (last 50)
      const { data: recentEventsData, error: recentEventsError } = await supabase
        .from('tracking_events')
        .select('id, event_type, timestamp, event_data')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (recentEventsError) {
        console.error(`[${timestamp}] Recent events query error:`, recentEventsError)
      }

      const recentEvents = recentEventsData?.map(event => ({
        id: event.id,
        type: event.event_type,
        timestamp: new Date(event.timestamp),
        data: event.event_data
      })) || []

      const analytics = {
        activeUsers,
        pageViews,
        events: totalEvents || 0,
        avgSessionDuration,
        topPages,
        recentEvents,
        timestamp: now,
        timeRange: {
          startOfDay: startOfDay.toISOString(),
          fiveMinutesAgo: fiveMinutesAgo.toISOString()
        }
      }

      console.log(`[${timestamp}] Analytics summary:`, {
        activeUsers,
        pageViews,
        totalEvents: totalEvents || 0,
        avgSessionDuration,
        topPagesCount: topPages.length,
        recentEventsCount: recentEvents.length
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