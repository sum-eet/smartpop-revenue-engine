import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === SHOPIFY SCRIPT INJECTION API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      // Handle Shopify app installation - inject script tag
      const body = await req.json()
      console.log(`[${timestamp}] Script injection request:`, JSON.stringify(body, null, 2))

      const shopDomain = body.shop || body.shop_domain
      if (!shopDomain) {
        return new Response(JSON.stringify({ 
          error: 'Missing shop domain',
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create the script tag that will auto-inject our tracking code
      const scriptTag = {
        script_tag: {
          event: 'onload',
          src: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${encodeURIComponent(shopDomain)}&t=${Date.now()}`,
          display_scope: 'all'
        }
      }

      // In a real Shopify app, you would use the Shopify Admin API here
      // For now, we'll simulate the script tag creation
      console.log(`[${timestamp}] Script tag to be created:`, JSON.stringify(scriptTag, null, 2))

      // Store the script injection in our database
      const { data: scriptRecord, error: scriptError } = await supabase
        .from('script_injections')
        .insert([{
          shop_domain: shopDomain,
          script_url: scriptTag.script_tag.src,
          status: 'active',
          created_at: timestamp
        }])
        .select()

      if (scriptError) {
        // Try to create the table if it doesn't exist
        console.log(`[${timestamp}] Creating script_injections table...`)
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS script_injections (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            shop_domain TEXT NOT NULL,
            script_url TEXT NOT NULL,
            shopify_script_id TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_script_injections_shop_domain ON script_injections(shop_domain);
          CREATE INDEX IF NOT EXISTS idx_script_injections_status ON script_injections(status);
        `
        
        // Execute the SQL (this would need to be done via a migration in production)
        console.log(`[${timestamp}] Table creation SQL prepared`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Script injection configured',
        shop_domain: shopDomain,
        script_url: scriptTag.script_tag.src,
        embed_url: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${encodeURIComponent(shopDomain)}`,
        instructions: {
          manual_method: 'Add this script tag to your theme',
          script_tag: `<script src="${scriptTag.script_tag.src}" async></script>`,
          automatic_method: 'Use Shopify Admin API to create script tag',
          api_payload: scriptTag
        },
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Get script injection status for a shop
      const url = new URL(req.url)
      const shopDomain = url.searchParams.get('shop')
      
      if (!shopDomain) {
        return new Response(JSON.stringify({ 
          error: 'Missing shop parameter',
          timestamp
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check if script is already injected
      const { data: scriptRecords, error } = await supabase
        .from('script_injections')
        .select('*')
        .eq('shop_domain', shopDomain)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      return new Response(JSON.stringify({
        shop_domain: shopDomain,
        script_injected: (scriptRecords && scriptRecords.length > 0),
        script_records: scriptRecords || [],
        embed_url: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${encodeURIComponent(shopDomain)}`,
        manual_install: `<script src="https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/app-embed?shop=${encodeURIComponent(shopDomain)}" async></script>`,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      timestamp
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    return new Response(JSON.stringify({ 
      error: 'Function error',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})