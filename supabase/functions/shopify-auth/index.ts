
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop')
    const code = url.searchParams.get('code')
    const hmac = url.searchParams.get('hmac')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Handle OAuth callback
    if (code && shop) {
      const clientId = Deno.env.get('SHOPIFY_CLIENT_ID')
      const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET')
      
      // Exchange code for access token
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code
        })
      })
      
      const tokenData = await tokenResponse.json()
      
      if (tokenData.access_token) {
        // Store shop data in database
        const { data: shopData, error } = await supabase
          .from('shops')
          .upsert({
            shop_domain: shop,
            access_token: tokenData.access_token,
            scope: tokenData.scope
          })
          .select()
          .single()
        
        if (!error && shopData) {
          // Create default campaigns
          await supabase.rpc('create_default_campaigns', { shop_uuid: shopData.id })
        }
        
        // Redirect to success page
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `https://${shop}/admin/apps/smartpop-revenue-engine`
          }
        })
      }
    }
    
    // Handle initial OAuth request
    if (shop) {
      const clientId = Deno.env.get('SHOPIFY_CLIENT_ID')
      const redirectUri = `${url.origin}/auth/shopify/callback`
      const scopes = 'read_orders,read_customers,write_script_tags'
      
      const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${shop}`
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': authUrl
        }
      })
    }
    
    return new Response(JSON.stringify({ error: 'Missing shop parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
