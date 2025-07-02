import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key for admin access to all tables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
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

    const results = {}

    // Get count of records in each table
    console.log('Checking popup_events...')
    try {
      const { count: popupCount } = await supabase
        .from('popup_events')
        .select('*', { count: 'exact', head: true })
      results.popup_events_count = popupCount || 0
    } catch (e) {
      results.popup_events_count = `Error: ${e.message}`
    }

    console.log('Checking tracking_events...')
    try {
      const { count: trackingCount } = await supabase
        .from('tracking_events')
        .select('*', { count: 'exact', head: true })
      results.tracking_events_count = trackingCount || 0
    } catch (e) {
      results.tracking_events_count = `Error: ${e.message}`
    }

    console.log('Checking sessions...')
    try {
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
      results.sessions_count = sessionsCount || 0
    } catch (e) {
      results.sessions_count = `Error: ${e.message}`
    }

    console.log('Checking popups...')
    try {
      const { count: popupsCount } = await supabase
        .from('popups')
        .select('*', { count: 'exact', head: true })
      results.popups_count = popupsCount || 0
    } catch (e) {
      results.popups_count = `Error: ${e.message}`
    }

    // Get actual data from popup_events
    console.log('Getting popup events data...')
    try {
      const { data: popupEvents, error } = await supabase
        .from('popup_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        results.popup_events_data = `Error: ${error.message}`
      } else {
        results.popup_events_data = popupEvents || []
      }
    } catch (e) {
      results.popup_events_data = `Error: ${e.message}`
    }

    // Get actual data from popups
    console.log('Getting popups data...')
    try {
      const { data: popups, error } = await supabase
        .from('popups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        results.popups_data = `Error: ${error.message}`
      } else {
        results.popups_data = popups || []
      }
    } catch (e) {
      results.popups_data = `Error: ${e.message}`
    }

    // Get tracking events
    console.log('Getting tracking events data...')
    try {
      const { data: trackingEvents, error } = await supabase
        .from('tracking_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        results.tracking_events_data = `Error: ${error.message}`
      } else {
        results.tracking_events_data = trackingEvents || []
      }
    } catch (e) {
      results.tracking_events_data = `Error: ${e.message}`
    }

    // Get sessions
    console.log('Getting sessions data...')
    try {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        results.sessions_data = `Error: ${error.message}`
      } else {
        results.sessions_data = sessions || []
      }
    } catch (e) {
      results.sessions_data = `Error: ${e.message}`
    }

    results.timestamp = new Date().toISOString()
    results.message = 'Data inspection complete'

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Function error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})