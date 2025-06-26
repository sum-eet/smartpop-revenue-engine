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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    
    // Get shop access token
    const { data: shopData, error } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', shop)
      .single()

    if (error || !shopData) {
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if script tag already exists
    const existingScriptsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': shopData.access_token
      }
    })

    if (existingScriptsResponse.ok) {
      const existingScripts = await existingScriptsResponse.json()
      const smartPopScript = existingScripts.script_tags.find((script: any) => 
        script.src.includes('smartpop-revenue-engine.vercel.app/popup-script.js')
      )

      if (smartPopScript) {
        return new Response(JSON.stringify({ 
          message: 'Script tag already installed',
          script_tag: smartPopScript
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Install script tag
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopData.access_token
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: 'https://smartpop-revenue-engine.vercel.app/popup-script.js'
        }
      })
    })

    if (scriptTagResponse.ok) {
      const scriptTagData = await scriptTagResponse.json()
      console.log('Script tag installed successfully for', shop)
      
      return new Response(JSON.stringify({ 
        message: 'Script tag installed successfully',
        script_tag: scriptTagData.script_tag
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const errorText = await scriptTagResponse.text()
      console.error('Failed to install script tag:', errorText)
      
      return new Response(JSON.stringify({ 
        error: 'Failed to install script tag',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Install script error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})