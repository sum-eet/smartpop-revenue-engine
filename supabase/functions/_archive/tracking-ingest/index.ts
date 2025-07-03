import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { securityMiddleware, SECURITY_CONFIGS } from '../security-middleware/index.ts'
import { sanitizeInput, validateJsonInput } from '../auth-middleware/index.ts'

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
  console.log(`[${timestamp}] === TRACKING INGEST API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply security middleware with high rate limits for tracking
  const trackingConfig = {
    ...SECURITY_CONFIGS.AUTHENTICATED,
    rateLimit: { windowMs: 60000, maxRequests: 1000 } // Higher limits for tracking data
  }
  
  const securityResult = await securityMiddleware(req, trackingConfig)
  if (!securityResult.allowed) {
    return securityResult.response!
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const requestData = await req.json()
      
      // Validate input data
      if (!validateJsonInput(requestData, 10, 5 * 1024 * 1024)) { // 5MB limit
        return new Response(JSON.stringify({
          error: 'Invalid or malicious input data detected',
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Tracking data received:`, {
        sessionId: requestData.sessionId,
        eventCount: requestData.events?.length || 0,
        shopDomain: securityResult.context?.shopDomain
      })

      // Validate required fields
      if (!requestData.sessionId || !requestData.events || !Array.isArray(requestData.events)) {
        return new Response(JSON.stringify({
          error: 'Invalid request format',
          required: ['sessionId', 'events (array)'],
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Sanitize session ID
      const sessionId = sanitizeInput(requestData.sessionId)
      if (!sessionId || sessionId.length < 10) {
        return new Response(JSON.stringify({
          error: 'Invalid session ID format',
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Limit number of events per request to prevent DoS
      if (requestData.events.length > 1000) {
        return new Response(JSON.stringify({
          error: 'Too many events in single request',
          limit: 1000,
          received: requestData.events.length,
          timestamp
        }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Process events for database insertion with validation
      const processedEvents = requestData.events.map((event: any, index: number) => {
        // Validate event structure
        if (!event.type || typeof event.type !== 'string') {
          throw new Error(`Invalid event type at index ${index}`)
        }

        // Sanitize event type
        const eventType = sanitizeInput(event.type)
        const allowedEventTypes = ['page_view', 'behavioral', 'ecommerce', 'performance', 'error']
        
        if (!allowedEventTypes.includes(eventType)) {
          throw new Error(`Invalid event type "${eventType}" at index ${index}`)
        }

        // Validate event data
        if (event.data && !validateJsonInput(event.data, 5, 100 * 1024)) { // 100KB per event
          throw new Error(`Invalid event data at index ${index}`)
        }

        return {
          id: sanitizeInput(event.id) || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id: sessionId,
          user_id: event.userId ? sanitizeInput(event.userId.toString()) : null,
          event_type: eventType,
          event_data: event.data || {},
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          batch_id: batchId,
          created_at: timestamp
        }
      })

      console.log(`[${timestamp}] Processing ${processedEvents.length} events`)

      // Insert events in batches for better performance
      const batchSize = 100
      const results = []
      
      for (let i = 0; i < processedEvents.length; i += batchSize) {
        const batch = processedEvents.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('tracking_events')
          .insert(batch)
          .select('id')

        if (error) {
          console.error(`[${timestamp}] Batch insert error:`, error)
          return new Response(JSON.stringify({
            error: 'Failed to insert tracking events',
            details: error.message,
            batchIndex: Math.floor(i / batchSize)
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        results.push(...(data || []))
      }

      // Update session statistics
      await updateSessionStats(supabase, requestData.sessionId, processedEvents)

      console.log(`[${timestamp}] Successfully processed ${results.length} events`)

      // Send real-time notifications to connected WebSocket clients
      try {
        await notifyWebSocketClients(requestData.sessionId, {
          type: 'batch_processed',
          batchId,
          eventCount: results.length,
          sessionId: requestData.sessionId
        })
      } catch (wsError) {
        console.warn(`[${timestamp}] WebSocket notification failed:`, wsError)
        // Don't fail the request if WebSocket notification fails
      }

      return new Response(JSON.stringify({
        success: true,
        batchId,
        eventsProcessed: results.length,
        timestamp
      }), {
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

async function updateSessionStats(supabase: any, sessionId: string, events: any[]) {
  try {
    // Count page views and calculate other metrics
    const pageViews = events.filter(e => e.event_type === 'page_view').length
    const behavioralEvents = events.filter(e => e.event_type === 'behavioral').length
    
    // Check if session exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (existingSession) {
      // Update existing session
      await supabase
        .from('sessions')
        .update({
          page_views: (existingSession.page_views || 0) + pageViews,
          bounced: (existingSession.page_views || 0) + pageViews <= 1,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
    } else {
      // Create new session record
      const sessionData = extractSessionData(events)
      await supabase
        .from('sessions')
        .insert([{
          session_id: sessionId,
          page_views: pageViews,
          bounced: pageViews <= 1,
          start_time: new Date(),
          ...sessionData
        }])
    }
  } catch (error) {
    console.warn('Failed to update session stats:', error)
  }
}

function extractSessionData(events: any[]) {
  // Extract session information from events
  const pageViewEvents = events.filter(e => e.event_type === 'page_view')
  const firstPageView = pageViewEvents[0]
  
  if (!firstPageView?.event_data) return {}

  return {
    source: firstPageView.event_data.source || 'direct',
    medium: firstPageView.event_data.medium || 'none',
    campaign: firstPageView.event_data.campaign || null,
    device_fingerprint: firstPageView.event_data.device || null,
    user_agent: firstPageView.event_data.userAgent || null,
    country: firstPageView.event_data.country || null,
    region: firstPageView.event_data.region || null,
    city: firstPageView.event_data.city || null
  }
}

async function notifyWebSocketClients(sessionId: string, message: any) {
  try {
    // Call the WebSocket function to notify connected clients
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/websocket-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        targetSessionId: sessionId,
        message
      })
    })

    if (!response.ok) {
      throw new Error(`WebSocket notification failed: ${response.status}`)
    }
  } catch (error) {
    console.warn('WebSocket notification error:', error)
  }
}