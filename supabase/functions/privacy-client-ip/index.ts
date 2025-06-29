import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === CLIENT IP API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP from various headers (Cloudflare, AWS ALB, Nginx, etc.)
    const clientIP = req.headers.get('CF-Connecting-IP') || 
                    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                    req.headers.get('X-Real-IP') || 
                    req.headers.get('X-Client-IP') ||
                    req.headers.get('True-Client-IP') ||
                    'unknown'

    console.log(`[${timestamp}] Client IP determined:`, clientIP)
    console.log(`[${timestamp}] All headers:`, {
      'CF-Connecting-IP': req.headers.get('CF-Connecting-IP'),
      'X-Forwarded-For': req.headers.get('X-Forwarded-For'),
      'X-Real-IP': req.headers.get('X-Real-IP'),
      'X-Client-IP': req.headers.get('X-Client-IP'),
      'True-Client-IP': req.headers.get('True-Client-IP')
    })

    // Validate IP format (basic check)
    const isValidIP = clientIP !== 'unknown' && (
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(clientIP) || // IPv4
      /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(clientIP) // IPv6 basic
    )

    return new Response(JSON.stringify({
      ip: clientIP,
      valid: isValidIP,
      timestamp
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    return new Response(JSON.stringify({
      ip: 'unknown',
      valid: false,
      error: error.message,
      timestamp
    }), {
      status: 200, // Return 200 with unknown IP rather than error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})