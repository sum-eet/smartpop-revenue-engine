import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use service role key for admin access
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const capturedData = {
      timestamp: new Date().toISOString(),
      summary: {},
      data: {}
    }

    // Count records in each table
    const tables = ['popup_events', 'tracking_events', 'sessions', 'popups', 'consent_records', 'security_logs']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        capturedData.summary[table] = error ? 0 : count
      } catch (e) {
        capturedData.summary[table] = 0
      }
    }

    // Get recent popup events with all captured browser/user data
    const { data: popupEvents } = await supabase
      .from('popup_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    capturedData.data.popup_events = popupEvents || []

    // Get tracking events 
    const { data: trackingEvents } = await supabase
      .from('tracking_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    capturedData.data.tracking_events = trackingEvents || []

    // Get sessions data
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    capturedData.data.sessions = sessions || []

    // Get popups created
    const { data: popups } = await supabase
      .from('popups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    capturedData.data.popups = popups || []

    // Get security logs
    const { data: securityLogs } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    capturedData.data.security_logs = securityLogs || []

    return new Response(JSON.stringify(capturedData, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Function error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})