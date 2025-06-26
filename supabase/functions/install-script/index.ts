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
      .select('access_token, scope')
      .eq('shop_domain', shop)
      .single()

    console.log('Shop query result:', { shopData, error, shop })

    if (error || !shopData) {
      return new Response(JSON.stringify({ 
        error: 'Shop not found',
        details: error?.message,
        shop: shop 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found shop with access token length:', shopData.access_token?.length)

    // Check if script tag already exists
    console.log('Checking existing script tags...')
    const existingScriptsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': shopData.access_token
      }
    })

    console.log('Existing scripts response status:', existingScriptsResponse.status)

    if (existingScriptsResponse.ok) {
      const existingScripts = await existingScriptsResponse.json()
      console.log('Found', existingScripts.script_tags?.length, 'existing script tags')
      console.log('Existing script tags:', JSON.stringify(existingScripts.script_tags, null, 2))
      
      const smartPopScript = existingScripts.script_tags.find((script: any) => 
        script.src && script.src.includes('smartpop-revenue-engine')
      )

      if (smartPopScript) {
        console.log('SmartPop script already exists:', smartPopScript)
        return new Response(JSON.stringify({ 
          message: 'Script tag already installed',
          script_tag: smartPopScript
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log('No SmartPop script found, proceeding to install...')
      }
    } else {
      const errorText = await existingScriptsResponse.text()
      console.error('Failed to get existing scripts:', errorText)
    }

    // Install script tag
    console.log('Installing new script tag...')
    const scriptTagPayload = {
      script_tag: {
        event: 'onload',
        src: 'https://smartpop-revenue-engine.vercel.app/popup-script.js'
      }
    }
    
    console.log('Script tag payload:', JSON.stringify(scriptTagPayload))
    
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopData.access_token
      },
      body: JSON.stringify(scriptTagPayload)
    })

    console.log('Script tag response status:', scriptTagResponse.status)

    if (scriptTagResponse.ok) {
      const scriptTagData = await scriptTagResponse.json()
      console.log('Script tag installed successfully for', shop, scriptTagData)
      
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
        details: errorText,
        status: scriptTagResponse.status,
        shop: shop
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