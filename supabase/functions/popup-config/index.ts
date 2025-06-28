
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      }
    })
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
      
      // Check if this is a dashboard request (includes inactive popups)
      const includeDashboard = url.searchParams.get('dashboard') === 'true'
      
      let query = supabase
        .from('popups')
        .select(`
          *,
          shops!inner(shop_domain)
        `)
        .eq('shops.shop_domain', shop)
      
      // Always filter out deleted popups
      query = query.eq('is_deleted', false)
      
      // Only filter by is_active if not a dashboard request
      if (!includeDashboard) {
        query = query.eq('is_active', true)
      }
      
      const { data: popups, error } = await query
      
      if (error) {
        throw error
      }
      
      return new Response(JSON.stringify(popups || []), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const requestData = await req.json()
      console.log('Received request data:', JSON.stringify(requestData, null, 2))
      
      // Check if this is a delete request (mark as deleted)
      if (requestData.action === 'delete' && requestData.id) {
        console.log('Processing delete (mark as deleted) for ID:', requestData.id)
        
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

        return new Response(JSON.stringify({ 
          message: 'Popup deleted successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Check if this is a batch deactivate request
      if (requestData.action === 'batchDeactivate' && requestData.ids) {
        console.log('Processing batch deactivate for IDs:', requestData.ids)
        
        const { error } = await supabase
          .from('popups')
          .update({ is_active: false })
          .in('id', requestData.ids)

        if (error) {
          console.error('Batch deactivate error:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to deactivate popups',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          message: 'Popups deactivated successfully',
          deactivatedCount: requestData.ids.length 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Check if this is a batch delete request
      if (requestData.action === 'batchDelete' && requestData.ids) {
        console.log('Processing batch delete for IDs:', requestData.ids)
        
        const { error } = await supabase
          .from('popups')
          .delete()
          .in('id', requestData.ids)

        if (error) {
          console.error('Batch delete error:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to delete popups',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Also cleanup related popup_events
        await supabase
          .from('popup_events')
          .delete()
          .in('popup_id', requestData.ids)

        return new Response(JSON.stringify({ 
          message: 'Popups deleted successfully',
          deletedCount: requestData.ids.length 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Check if this is an update request
      if (requestData.action === 'update' && requestData.id) {
        console.log('Processing update for ID:', requestData.id)
        
        // Validate required fields
        if (!requestData.name || !requestData.triggerType || !requestData.pageTarget || !requestData.popupType) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields',
            required: ['name', 'triggerType', 'pageTarget', 'popupType'],
            received: Object.keys(requestData)
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabase
          .from('popups')
          .update({
            name: requestData.name,
            trigger_type: requestData.triggerType,
            trigger_value: requestData.triggerValue,
            page_target: requestData.pageTarget,
            popup_type: requestData.popupType,
            title: requestData.title,
            description: requestData.description,
            button_text: requestData.buttonText,
            email_placeholder: requestData.emailPlaceholder,
            discount_code: requestData.discountCode,
            discount_percent: requestData.discountPercent,
            is_active: requestData.isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestData.id)
          .select()
          .single()

        if (error) {
          console.error('Database update error:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to update popup',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('Popup updated successfully:', data)
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Regular popup creation
      const popupData = requestData
      console.log('Creating new popup:', JSON.stringify(popupData, null, 2))
      
      // Validate required fields
      if (!popupData.name || !popupData.triggerType || !popupData.pageTarget || !popupData.popupType) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['name', 'triggerType', 'pageTarget', 'popupType'],
          received: Object.keys(popupData)
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Get shop ID - for now use default shop, later get from authentication
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', 'testingstoresumeet.myshopify.com')
        .single()

      console.log('Shop query result:', { shop, shopError })

      if (shopError || !shop) {
        console.error('Shop not found:', shopError)
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
        console.error('Database insert error:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to create popup',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Popup created successfully:', data)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'PUT') {
      // Update popup - get ID from query parameter
      const url = new URL(req.url)
      const popupId = url.searchParams.get('id')
      
      console.log('PUT request URL:', req.url)
      console.log('Extracted popup ID:', popupId)
      
      if (!popupId) {
        return new Response(JSON.stringify({ error: 'Popup ID required in query parameter ?id=...' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const popupData = await req.json()
      console.log('Updating popup data:', JSON.stringify(popupData, null, 2))
      
      // Validate required fields
      if (!popupData.name || !popupData.triggerType || !popupData.pageTarget || !popupData.popupType) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['name', 'triggerType', 'pageTarget', 'popupType'],
          received: Object.keys(popupData)
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data, error } = await supabase
        .from('popups')
        .update({
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
          updated_at: new Date().toISOString()
        })
        .eq('id', popupId)
        .select()
        .single()

      if (error) {
        console.error('Database update error:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to update popup',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Popup updated successfully:', data)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'DELETE') {
      // Delete popup - get ID from query parameter
      const url = new URL(req.url)
      const popupId = url.searchParams.get('id')
      
      console.log('DELETE request URL:', req.url)
      console.log('Extracted popup ID:', popupId)
      
      if (!popupId) {
        return new Response(JSON.stringify({ error: 'Popup ID required in query parameter ?id=...' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('popups')
        .delete()
        .eq('id', popupId)

      if (error) {
        console.error('Delete popup error:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to delete popup',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ message: 'Popup deleted successfully' }), {
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
