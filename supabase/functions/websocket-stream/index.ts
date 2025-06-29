import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Store active WebSocket connections
const connections = new Map<string, WebSocket>()

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === WEBSOCKET STREAM API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    return new Response(JSON.stringify({
      error: 'sessionId parameter required'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Handle WebSocket upgrade
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    socket.onopen = () => {
      console.log(`[${timestamp}] WebSocket connected for session:`, sessionId)
      connections.set(sessionId, socket)
      
      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: new Date()
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log(`[${timestamp}] Received message from ${sessionId}:`, message.type)
        
        await handleWebSocketMessage(sessionId, message)
      } catch (error) {
        console.error(`[${timestamp}] Error processing message:`, error)
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          timestamp: new Date()
        }))
      }
    }

    socket.onclose = () => {
      console.log(`[${timestamp}] WebSocket disconnected for session:`, sessionId)
      connections.delete(sessionId)
    }

    socket.onerror = (error) => {
      console.error(`[${timestamp}] WebSocket error for session ${sessionId}:`, error)
      connections.delete(sessionId)
    }

    return response
  }

  // Handle REST API calls for broadcasting
  if (req.method === 'POST') {
    try {
      const { targetSessionId, message } = await req.json()
      
      if (targetSessionId && connections.has(targetSessionId)) {
        const socket = connections.get(targetSessionId)!
        socket.send(JSON.stringify({
          ...message,
          timestamp: new Date()
        }))
        
        return new Response(JSON.stringify({
          success: true,
          delivered: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Session not connected'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // Handle GET for connection status
  if (req.method === 'GET') {
    const isConnected = connections.has(sessionId)
    return new Response(JSON.stringify({
      sessionId,
      connected: isConnected,
      totalConnections: connections.size,
      timestamp
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

async function handleWebSocketMessage(sessionId: string, message: any) {
  const timestamp = new Date().toISOString()
  const socket = connections.get(sessionId)
  
  if (!socket) return

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    switch (message.type) {
      case 'event':
        // Store real-time event
        const { data, error } = await supabase
          .from('tracking_events')
          .insert([{
            id: message.data.id,
            session_id: sessionId,
            user_id: message.data.userId || null,
            event_type: message.data.type,
            event_data: message.data.data,
            timestamp: message.data.timestamp,
            batch_id: message.data.batchId || null
          }])

        if (error) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Failed to store event',
            details: error.message,
            timestamp: new Date()
          }))
        } else {
          socket.send(JSON.stringify({
            type: 'ack',
            eventId: message.data.id,
            timestamp: new Date()
          }))
        }
        break

      case 'batch':
        // Store batch of events
        const events = message.data.map((event: any) => ({
          id: event.id,
          session_id: sessionId,
          user_id: event.userId || null,
          event_type: event.type,
          event_data: event.data,
          timestamp: event.timestamp,
          batch_id: message.batchId
        }))

        const { data: batchData, error: batchError } = await supabase
          .from('tracking_events')
          .insert(events)

        if (batchError) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Failed to store batch',
            details: batchError.message,
            timestamp: new Date()
          }))
        } else {
          socket.send(JSON.stringify({
            type: 'batch_ack',
            batchId: message.batchId,
            eventCount: events.length,
            timestamp: new Date()
          }))
        }
        break

      case 'heartbeat':
        // Respond to heartbeat
        socket.send(JSON.stringify({
          type: 'heartbeat_ack',
          timestamp: new Date()
        }))
        break

      default:
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Unknown message type',
          timestamp: new Date()
        }))
    }
  } catch (error) {
    console.error(`[${timestamp}] Error handling message:`, error)
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Internal server error',
      timestamp: new Date()
    }))
  }
}