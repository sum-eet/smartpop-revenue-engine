import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  console.log('=== POPUP TEST REQUEST ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const shop = url.searchParams.get('shop') || 'unknown'
  
  // Return sample popup data for testing
  const campaigns = [
    {
      id: 'test-popup-1',
      name: 'Welcome Offer',
      description: 'Get 10% off your first order!',
      discount_percent: 10,
      discount_code: 'WELCOME10',
      triggers: {
        timeOnSite: 5, // Show after 5 seconds
        scrollDepth: 25 // Show after 25% scroll
      }
    }
  ]

  return new Response(JSON.stringify({ 
    success: true,
    campaigns,
    shop,
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})