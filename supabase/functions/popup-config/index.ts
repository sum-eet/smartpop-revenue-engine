import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      // Get popups for shop
      const url = new URL(req.url)
      const shop = url.searchParams.get('shop')
      
      if (!shop) {
        return new Response(JSON.stringify({ error: 'Shop parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const includeDashboard = url.searchParams.get('dashboard') === 'true'
      
      let query = supabase
        .from('popups')
        .select(`*, shops!inner(shop_domain)`)
        .eq('shops.shop_domain', shop)
        .eq('is_deleted', false)
      
      if (!includeDashboard) {
        query = query.eq('is_active', true)
      }
      
      const { data: popups, error } = await query
      
      if (error) throw error
      
      return new Response(JSON.stringify(popups || []), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const requestData = await req.json()
      console.log('POST Request:', JSON.stringify(requestData, null, 2))
      
      // SIMPLE DELETE ACTION
      if (requestData.action === 'delete' && requestData.id) {
        console.log('=== DELETE ACTION ===')
        console.log('Deleting popup ID:', requestData.id)
        
        const { error } = await supabase
          .from('popups')
          .update({ 
            is_deleted: true, 
            is_active: false,
            deleted_at: new Date().toISOString()
          })
          .eq('id', requestData.id)

        if (error) {
          console.error('Delete error:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to delete popup',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('Delete successful')
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Popup deleted successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // SIMPLE TOGGLE ACTION
      if (requestData.action === 'toggle_active' && requestData.id) {
        console.log('=== TOGGLE ACTION ===')
        console.log('Toggling popup ID:', requestData.id, 'to active:', requestData.is_active)
        
        const { error } = await supabase
          .from('popups')
          .update({ is_active: requestData.is_active })
          .eq('id', requestData.id)

        if (error) {
          console.error('Toggle error:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to toggle popup',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('Toggle successful')
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Popup toggled successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // If we have an action but it's not delete or toggle, it's unknown
      if (requestData.action) {
        console.log('=== UNKNOWN ACTION ===')
        console.log('Unknown action:', requestData.action)
        return new Response(JSON.stringify({ 
          error: 'Unknown action: ' + requestData.action,
          supported_actions: ['delete', 'toggle_active']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // No action = popup creation (existing logic)
      console.log('=== POPUP CREATION ===')
      const popupData = requestData
      
      if (!popupData.name || !popupData.triggerType || !popupData.pageTarget || !popupData.popupType) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields for popup creation',
          required: ['name', 'triggerType', 'pageTarget', 'popupType'],
          received: Object.keys(popupData)
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Get shop
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', 'testingstoresumeet.myshopify.com')
        .single()

      if (shopError || !shop) {
        return new Response(JSON.stringify({ 
          error: 'Shop not found', 
          details: shopError?.message 
        }), {
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
          is_deleted: false,
          shop_id: shop.id
        }])
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to create popup',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})