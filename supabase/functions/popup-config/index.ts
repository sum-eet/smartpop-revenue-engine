import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '../_shared/session-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate request
    const auth = await authenticateRequest(req);
    
    if (!auth.isAuthenticated) {
      return createErrorResponse(auth.error || 'Authentication failed', 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    console.log('=== POPUP CONFIG REQUEST ===')
    console.log('Method:', req.method)
    console.log('Shop:', auth.shop)
    console.log('User:', auth.user)
    console.log('Is Embedded:', auth.isEmbedded)

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('=== POPUP CONFIG REQUEST ===')
      console.log('Method:', req.method)
      console.log('Body:', JSON.stringify(body, null, 2))
      
      // DELETE ACTION - ONLY NEEDS ID
      if (body.action === 'delete') {
        if (!body.id) {
          return new Response(JSON.stringify({ error: 'Missing id for delete action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        console.log('DELETING POPUP ID:', body.id)
        
        const { error } = await supabase
          .from('popups')
          .update({ is_deleted: true, is_active: false })
          .eq('id', body.id)

        if (error) {
          console.error('Delete error:', error)
          return new Response(JSON.stringify({ error: 'Delete failed', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('DELETE SUCCESS')
        return new Response(JSON.stringify({ success: true, message: 'Deleted' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // TOGGLE ACTION - NEEDS ID + IS_ACTIVE
      if (body.action === 'toggle_active') {
        if (!body.id || body.is_active === undefined) {
          return new Response(JSON.stringify({ error: 'Missing id or is_active for toggle action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        console.log('TOGGLING POPUP ID:', body.id, 'TO:', body.is_active)
        
        const { error } = await supabase
          .from('popups')
          .update({ is_active: body.is_active })
          .eq('id', body.id)

        if (error) {
          console.error('Toggle error:', error)
          return new Response(JSON.stringify({ error: 'Toggle failed', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('TOGGLE SUCCESS')
        return new Response(JSON.stringify({ success: true, message: 'Toggled' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // SAVE/CREATE ACTION - SAVE POPUP CONFIGURATION
      if (body.action === 'save' || !body.action) {
        console.log('SAVING POPUP CONFIG:', JSON.stringify(body, null, 2))
        
        // Required fields for popup
        if (!body.name && !body.title) {
          return new Response(JSON.stringify({ error: 'Missing name/title for popup' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        // First, get or create the shop to get shop_id
        const shopDomain = body.shop_domain || 'testingstoresumeet.myshopify.com'
        
        let shopResult = await supabase
          .from('shops')
          .select('id')
          .eq('shop_domain', shopDomain)
          .single()
        
        let shopId
        if (shopResult.error) {
          // Create shop if it doesn't exist
          const createShopResult = await supabase
            .from('shops')
            .insert([{
              shop_domain: shopDomain,
              is_active: true
            }])
            .select('id')
            .single()
          
          if (createShopResult.error) {
            console.error('Failed to create shop:', createShopResult.error)
            return new Response(JSON.stringify({ 
              error: 'Failed to create shop', 
              details: createShopResult.error.message 
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          shopId = createShopResult.data.id
        } else {
          shopId = shopResult.data.id
        }
        
        const popupData = {
          shop_id: shopId,
          name: body.name || body.title || 'Untitled Popup',
          trigger_type: body.trigger_type || 'time_delay',
          trigger_value: body.trigger_value?.toString() || '5',
          page_target: body.page_target || 'all_pages',
          popup_type: body.popup_type || body.type || 'discount_offer',
          title: body.title || body.name || 'Untitled Popup',
          description: body.description || '',
          button_text: body.button_text || 'Get Discount',
          email_placeholder: body.email_placeholder || 'Enter your email',
          discount_code: body.discount_code || '',
          discount_percent: body.discount_value?.toString() || body.discount_percent || '10',
          is_active: body.is_active !== undefined ? body.is_active : true,
          updated_at: new Date().toISOString()
        }
        
        // Store popup_style in description field temporarily until column is added
        if (body.popup_style || body.popupStyle) {
          const style = body.popup_style || body.popupStyle || 'native';
          popupData.description = popupData.description + ` [STYLE:${style}]`;
        }
        
        let result
        if (body.id) {
          // Update existing popup
          console.log('UPDATING POPUP ID:', body.id)
          
          result = await supabase
            .from('popups')
            .update(popupData)
            .eq('id', body.id)
            .select()
        } else {
          // Create new popup
          console.log('CREATING NEW POPUP')
          result = await supabase
            .from('popups')
            .insert([popupData])
            .select()
        }
        
        if (result.error) {
          console.error('Save error:', result.error)
          return new Response(JSON.stringify({ 
            error: 'Save failed', 
            details: result.error.message,
            hint: result.error.hint
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        console.log('SAVE SUCCESS:', result.data)
        return new Response(JSON.stringify({ 
          success: true, 
          data: result.data?.[0],
          message: body.id ? 'Updated' : 'Created'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // If no valid action, return error
      return new Response(JSON.stringify({ 
        error: 'No valid action provided',
        supported_actions: ['save', 'delete', 'toggle_active'],
        received: body
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Use authenticated shop domain
      const shop = auth.shop;
      const url = new URL(req.url)
      const dashboard = url.searchParams.get('dashboard') === 'true'
      const emails = url.searchParams.get('emails') === 'true'
      
      console.log('🔍 GET Request:', { shop, dashboard, emails, authenticated: auth.isAuthenticated, embedded: auth.isEmbedded })
      
      // 📧 EMAIL SUBSCRIBERS ENDPOINT
      if (emails && shop) {
        console.log('📧 Fetching email subscribers for shop:', shop)
        
        try {
          // Try new email_subscribers table first
          const { data: emailData, error: emailError } = await supabase
            .from('email_subscribers')
            .select(`
              id,
              email,
              first_captured_at,
              popup_id,
              discount_code,
              status,
              page_url,
              popups(name)
            `)
            .eq('shops.shop_domain', shop)
            .eq('status', 'active')
            .order('first_captured_at', { ascending: false })
            .limit(1000)

          if (!emailError && emailData) {
            console.log(`📧 Found ${emailData.length} email subscribers`)
            return new Response(JSON.stringify({
              emails: emailData,
              source: 'email_subscribers',
              count: emailData.length
            }), {
              status: 200,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'X-Email-Source': 'dedicated-table'
              }
            })
          }
          
          // Fallback to popup_events table
          console.log('📧 Falling back to popup_events table')
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('popup_events')
            .select(`
              id,
              email,
              timestamp,
              popup_id,
              discount_code_used,
              page_url
            `)
            .eq('shop_domain', shop)
            .eq('event_type', 'conversion')
            .not('email', 'is', null)
            .order('timestamp', { ascending: false })
            .limit(1000)

          if (fallbackError) {
            console.error('❌ Email retrieval error:', fallbackError)
            return new Response(JSON.stringify({ 
              error: 'Failed to fetch emails', 
              details: fallbackError.message 
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          console.log(`📧 Found ${fallbackData?.length || 0} emails in fallback table`)
          return new Response(JSON.stringify({
            emails: fallbackData || [],
            source: 'popup_events',
            count: fallbackData?.length || 0
          }), {
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Email-Source': 'fallback-table'
            }
          })

        } catch (error) {
          console.error('❌ Email endpoint error:', error)
          return new Response(JSON.stringify({ 
            error: 'Email retrieval failed',
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
      
      let query = supabase
        .from('popups')
        .select(`
          *,
          shops!inner(shop_domain)
        `)
        .eq('is_deleted', false)
      
      // 🔐 CRITICAL: Filter by shop if provided (SECURITY FIX)
      if (shop) {
        console.log('🛡️ Filtering popups for shop:', shop)
        query = query.eq('shops.shop_domain', shop)
      } else {
        // 🚨 BACKWARD COMPATIBILITY: Allow unfiltered for tests without shop param
        console.warn('⚠️ No shop parameter - returning all popups (test mode)')
      }
      
      const { data, error } = await query

      if (error) {
        console.error('❌ Database error:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch popups', 
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 📊 Security logging for monitoring
      const resultCount = data?.length || 0
      console.log(`✅ Returned ${resultCount} popups for shop: ${shop || 'ALL_SHOPS'}`)
      
      // 🔄 Transform response to maintain backward compatibility
      const transformedData = data?.map(popup => ({
        ...popup,
        // Remove the shops join data from response to maintain API compatibility
        shops: undefined
      })) || []

      return new Response(JSON.stringify(transformedData), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Shop-Filter': shop || 'none',
          'X-Result-Count': resultCount.toString()
        }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})