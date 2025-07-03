
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
    
    console.log('Shopify auth request:', { shop, code: !!code, hmac: !!hmac })
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Handle OAuth callback
    if (code && shop) {
      console.log('Processing OAuth callback for shop:', shop)
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
      console.log('Token exchange response:', { success: !!tokenData.access_token })
      
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
          console.log('Created default campaigns for shop:', shop)
          
          // Install popup script tag
          try {
            const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': tokenData.access_token
              },
              body: JSON.stringify({
                script_tag: {
                  event: 'onload',
                  src: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${shop}`
                }
              })
            })
            
            if (scriptTagResponse.ok) {
              const scriptTagData = await scriptTagResponse.json()
              console.log('Script tag installed successfully:', scriptTagData)
            } else {
              console.error('Failed to install script tag:', await scriptTagResponse.text())
            }
          } catch (scriptError) {
            console.error('Error installing script tag:', scriptError)
          }
        }
        
        // Redirect to success page with shop parameter
        const successUrl = `https://smartpop-revenue-engine.vercel.app/auth/shopify?shop=${shop}`
        console.log('Redirecting to success URL:', successUrl)
        
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': successUrl
          }
        })
      }
    }
    
    // Handle initial OAuth request
    if (shop) {
      console.log('Initiating OAuth for shop:', shop)
      const clientId = Deno.env.get('SHOPIFY_CLIENT_ID')
      // Fix: Use the correct redirect URI that matches your route
      const redirectUri = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth`
      const scopes = 'read_orders,read_customers,write_script_tags'
      
      const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${shop}`
      
      console.log('Redirecting to Shopify OAuth:', authUrl)
      
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
    console.error('Shopify auth error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
