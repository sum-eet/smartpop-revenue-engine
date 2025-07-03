import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === WEBHOOK TRACK API ===`)
  
  // Always allow CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      let eventData
      try {
        eventData = await req.json()
        console.log(`[${timestamp}] Webhook track event:`, JSON.stringify(eventData, null, 2))
      } catch (parseError) {
        console.error(`[${timestamp}] JSON parse error:`, parseError)
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON',
          details: parseError.message,
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Simple validation
      if (!eventData.popupId || !eventData.eventType) {
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

      // Log the event (in production, this would go to database)
      console.log(`[${timestamp}] ✅ Tracked: ${eventData.eventType} for popup ${eventData.popupId}`)
      console.log(`[${timestamp}] 📊 Data:`, {
        shop: eventData.shop,
        pageUrl: eventData.pageUrl,
        scrollPercent: eventData.scrollPercent,
        sessionId: eventData.sessionId,
        userAgent: req.headers.get('User-Agent'),
        ip: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')
      })

      // For now, just return success (later we'll add database storage)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Event tracked successfully',
        event_type: eventData.eventType,
        popup_id: eventData.popupId,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Simple analytics endpoint
      return new Response(JSON.stringify({
        message: 'Webhook tracking endpoint is working',
        timestamp,
        endpoints: {
          track: 'POST to this endpoint with popupId and eventType',
          analytics: 'GET to this endpoint for basic info'
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      allowed: ['GET', 'POST', 'OPTIONS'],
      timestamp
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Webhook error:`, error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})