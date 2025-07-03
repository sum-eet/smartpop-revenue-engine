import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    console.log('Public script installation request:', { shop, hasToken: !!accessToken })
    
    if (!accessToken) {
      // Return instructions for getting access token
      return new Response(JSON.stringify({
        error: 'Access token required',
        instructions: [
          'Go to https://admin.shopify.com/store/testingstoresumeet/settings/apps/development',
          'Create a private app',
          'Enable Admin API access',
          'Check "write_script_tags" permission',
          'Install app and copy access token',
          'Call this endpoint with ?token=YOUR_TOKEN'
        ],
        install_url: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-script-public?shop=${shop}&token=YOUR_TOKEN`
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
          'X-Shopify-Access-Token': accessToken
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
                'X-Shopify-Access-Token': accessToken
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
          'X-Shopify-Access-Token': accessToken
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
        
        return new Response(JSON.stringify({
          success: true,
          message: '🎉 SCRIPT TAG INSTALLED SUCCESSFULLY!',
          shop: shop,
          script_tag_id: scriptTagData.script_tag.id,
          script_url: scriptUrl,
          test_instructions: [
            '✅ Visit your store: https://' + shop + '/',
            '✅ Wait 5 seconds or scroll 50% to trigger popups',
            '✅ Check browser console for SmartPop logs',
            '✅ You should see 8 configured popups ready to display'
          ],
          popup_configs: [
            'Scroll 50% Popup: "Wait! Don\'t Leave Empty Handed!" (SCROLL15 - 15% off)',
            'Multiple time-based test popups (5-second delays)',
            'Various deployment verification popups'
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
          status: scriptTagResponse.status,
          troubleshooting: [
            'Check if access token is valid',
            'Ensure write_script_tags permission is enabled',
            'Verify the shop domain is correct',
            'Try regenerating the access token'
          ]
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