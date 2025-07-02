import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === POPUP CREATE SIMPLE API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const body = await req.json()
      console.log(`[${timestamp}] Create request:`, JSON.stringify(body, null, 2))
      
      // Simple validation
      const required = ['name', 'triggerType', 'pageTarget', 'popupType']
      const missing = required.filter(field => !body[field])
      
      if (missing.length > 0) {
        console.log(`[${timestamp}] ERROR: Missing required fields:`, missing)
        return new Response(JSON.stringify({ 
          error: 'Missing required fields for popup creation',
          missing_fields: missing,
          required_fields: required
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get or create shop for testingstoresumeet.myshopify.com
      const shopDomain = 'testingstoresumeet.myshopify.com'
      
      let { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', shopDomain)
        .single()

      if (shopError || !shop) {
        console.log(`[${timestamp}] Creating shop: ${shopDomain}`)
        const { data: newShop, error: createError } = await supabase
          .from('shops')
          .insert([{
            shop_domain: shopDomain,
            is_active: true,
            subscription_status: 'active',
            plan_type: 'basic'
          }])
          .select('id')
          .single()
        
        if (createError) {
          console.log(`[${timestamp}] ERROR: Failed to create shop:`, createError)
          return new Response(JSON.stringify({ 
            error: 'Failed to create shop',
            details: createError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        shop = newShop
      }

      console.log(`[${timestamp}] Creating popup for shop:`, shop.id)

      // Create popup
      const { data, error } = await supabase
        .from('popups')
        .insert([{
          name: body.name,
          trigger_type: body.triggerType,
          trigger_value: body.triggerValue || '5',
          page_target: body.pageTarget,
          popup_type: body.popupType,
          title: body.title || body.name,
          description: body.description || 'Default description',
          button_text: body.buttonText || 'Get Started',
          email_placeholder: body.emailPlaceholder || 'Enter your email',
          discount_code: body.discountCode || '',
          discount_percent: body.discountPercent || '10',
          is_active: body.isActive !== undefined ? body.isActive : true,
          is_deleted: false,
          shop_id: shop.id,
          created_at: timestamp,
          updated_at: timestamp
        }])
        .select()
        .single()

      if (error) {
        console.log(`[${timestamp}] ERROR: Database insert failed:`, error)
        return new Response(JSON.stringify({ 
          error: 'Failed to create popup',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] SUCCESS: Popup created:`, data.id)
      return new Response(JSON.stringify({ 
        success: true, 
        popup: data,
        message: 'Popup created successfully'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.log(`[${timestamp}] ERROR: Unexpected error:`, error)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})