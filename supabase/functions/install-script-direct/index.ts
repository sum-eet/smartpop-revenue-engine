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
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    const accessToken = url.searchParams.get('token')
    
    console.log('Script installation request:', { shop, hasToken: !!accessToken })
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // If no token provided, check if we have one stored
    let finalAccessToken = accessToken
    
    if (!finalAccessToken) {
      console.log('No token provided, checking database...')
      const { data: shopData } = await supabase
        .from('shops')
        .select('access_token')
        .eq('shop_domain', shop)
        .single()
      
      if (shopData?.access_token) {
        finalAccessToken = shopData.access_token
        console.log('Found stored access token for shop:', shop)
      } else {
        console.log('No stored token found for shop:', shop)
      }
    }
    
    if (!finalAccessToken) {
      return new Response(JSON.stringify({ 
        error: 'No access token provided or found',
        message: 'Please provide token parameter or complete OAuth flow first',
        shop: shop
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Install script tag
    const scriptUrl = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${shop}`
    
    console.log('Installing script tag with URL:', scriptUrl)
    
    try {
      // First, remove any existing SmartPop script tags
      const existingScriptsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': finalAccessToken
        }
      })
      
      if (existingScriptsResponse.ok) {
        const existingScripts = await existingScriptsResponse.json()
        console.log('Found existing script tags:', existingScripts.script_tags?.length || 0)
        
        // Remove old SmartPop scripts
        for (const script of existingScripts.script_tags || []) {
          if (script.src?.includes('smartpop') || script.src?.includes('popup')) {
            console.log('Removing old script:', script.src)
            await fetch(`https://${shop}/admin/api/2023-10/script_tags/${script.id}.json`, {
              method: 'DELETE',
              headers: {
                'X-Shopify-Access-Token': finalAccessToken
              }
            })
          }
        }
      }
      
      // Install new script tag
      const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': finalAccessToken
        },
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: scriptUrl
          }
        })
      })
      
      if (scriptTagResponse.ok) {
        const scriptTagData = await scriptTagResponse.json()
        console.log('Script tag installed successfully:', scriptTagData)
        
        // Update installation record
        await supabase
          .from('shopify_installations')
          .upsert({
            shop_domain: shop,
            script_tag_id: scriptTagData.script_tag.id,
            script_url: scriptUrl,
            installed_at: new Date().toISOString(),
            is_active: true
          })
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Script tag installed successfully',
          shop: shop,
          script_tag_id: scriptTagData.script_tag.id,
          script_url: scriptUrl,
          test_url: `https://${shop}/`,
          instructions: [
            'Visit your store to test popups',
            'Wait 5 seconds or scroll 50% to trigger popups',
            'Check browser console for SmartPop logs'
          ]
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
          status: scriptTagResponse.status
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } catch (scriptError) {
      console.error('Error installing script tag:', scriptError)
      
      return new Response(JSON.stringify({
        error: 'Error installing script tag',
        details: scriptError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
  } catch (error) {
    console.error('Installation error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})