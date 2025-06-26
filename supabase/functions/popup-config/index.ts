
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

    if (req.method === 'GET') {
      // Get active popups for the shop
      const url = new URL(req.url)
      const shop = url.searchParams.get('shop')
      
      if (!shop) {
        return new Response(JSON.stringify({ error: 'Shop parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const { data: popups, error } = await supabase
        .from('popups')
        .select(`
          *,
          shops!inner(shop_domain)
        `)
        .eq('shops.shop_domain', shop)
        .eq('is_active', true)
      
      if (error) {
        throw error
      }
      
      return new Response(JSON.stringify(popups || []), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      // Create new popup
      const popupData = await req.json()
      
      // Get shop ID - for now use default shop, later get from authentication
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', 'testingstoresumeet.myshopify.com')
        .single()

      if (shopError || !shop) {
        return new Response(JSON.stringify({ error: 'Shop not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabase
        .from('popups')
        .insert([{
          name: popupData.name,
          trigger_type: popupData.triggerType,
          trigger_value: popupData.triggerValue,
          page_target: popupData.pageTarget,
          popup_type: popupData.popupType,
          title: popupData.title,
          description: popupData.description,
          button_text: popupData.buttonText,
          email_placeholder: popupData.emailPlaceholder,
          discount_code: popupData.discountCode,
          discount_percent: popupData.discountPercent,
          is_active: popupData.isActive,
          shop_id: shop.id
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Popup config error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
