import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateAuth, createAuthResponse } from '../auth-middleware/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === POPUP CREATE API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      // Validate authentication first
      const authResult = await validateAuth(req)
      if (!authResult.success) {
        return createAuthResponse(authResult.error, authResult.details)
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const body = await req.json()
      console.log(`[${timestamp}] Create request for shop ${authResult.shopDomain}:`, JSON.stringify(body, null, 2))
      
      // Validate required fields for popup creation
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

      // Get shop ID using authenticated shop domain
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', authResult.shopDomain)
        .single()

      if (shopError || !shop) {
        console.log(`[${timestamp}] ERROR: Shop not found`)
        return new Response(JSON.stringify({ 
          error: 'Shop not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Creating popup for shop:`, shop.id)

      // Create popup
      const { data, error } = await supabase
        .from('popups')
        .insert([{
          name: body.name,
          trigger_type: body.triggerType,
          trigger_value: body.triggerValue || null,
          page_target: body.pageTarget,
          popup_type: body.popupType,
          title: body.title || null,
          description: body.description || null,
          button_text: body.buttonText || null,
          email_placeholder: body.emailPlaceholder || 'Enter your email',
          discount_code: body.discountCode || null,
          discount_percent: body.discountPercent || null,
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

      console.log(`[${timestamp}] SUCCESS: Popup created with ID:`, data.id)

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Popup created successfully',
        popup: data,
        created_at: timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    } catch (error) {
      console.error(`[${timestamp}] FUNCTION ERROR:`, error)
      return new Response(JSON.stringify({ 
        error: 'Function error',
        details: error.message,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ 
    error: 'Method not allowed. Use POST for popup creation.' 
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})