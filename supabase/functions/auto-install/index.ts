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
    
    console.log('Auto-installing script for shop:', shop)
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Check for stored access token
    const { data: shopData } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', shop)
      .single()

    if (!shopData?.access_token) {
      // Try alternative storage
      const { data: installData } = await supabase
        .from('shopify_installations')
        .select('access_token')
        .eq('shop_domain', shop)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!installData?.access_token) {
        return new Response(JSON.stringify({
          error: 'No stored access token found',
          message: 'Need to complete OAuth flow first',
          oauth_url: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?shop=${shop}`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const accessToken = shopData?.access_token || installData?.access_token
    const scriptUrl = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-script?shop=${shop}`

    console.log('Using stored token to install script:', scriptUrl)

    // Remove existing scripts
    const existingResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (existingResponse.ok) {
      const existingScripts = await existingResponse.json()
      for (const script of existingScripts.script_tags || []) {
        if (script.src?.includes('smartpop') || script.src?.includes('popup')) {
          await fetch(`https://${shop}/admin/api/2023-10/script_tags/${script.id}.json`, {
            method: 'DELETE',
            headers: { 'X-Shopify-Access-Token': accessToken }
          })
        }
      }
    }

    // Install new script
    const installResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: scriptUrl
        }
      })
    })

    if (installResponse.ok) {
      const result = await installResponse.json()
      
      return new Response(JSON.stringify({
        success: true,
        message: '🎉 Script tag installed automatically!',
        script_tag_id: result.script_tag.id,
        script_url: result.script_tag.src,
        test_url: `https://${shop}/`,
        instructions: 'Visit your store - popups should now appear!'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const error = await installResponse.text()
      throw new Error(`Install failed: ${installResponse.status} - ${error}`)
    }

  } catch (error) {
    console.error('Auto-install error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      action: 'auto_install_failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})