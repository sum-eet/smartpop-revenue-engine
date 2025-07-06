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
    const shop = 'testingstoresumeet.myshopify.com'
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Get stored access token
    const { data: shopData } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', shop)
      .single()

    if (!shopData?.access_token) {
      return new Response(JSON.stringify({
        error: 'No access token found',
        shop: shop
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check existing script tags
    const response = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': shopData.access_token,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({
        error: `Shopify API error: ${response.status}`,
        details: error
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    
    return new Response(JSON.stringify({
      shop: shop,
      total_scripts: data.script_tags.length,
      script_tags: data.script_tags.map(script => ({
        id: script.id,
        src: script.src,
        event: script.event,
        created_at: script.created_at,
        updated_at: script.updated_at
      })),
      smartpop_scripts: data.script_tags.filter(script => 
        script.src?.includes('smartpop') || script.src?.includes('popup')
      )
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})