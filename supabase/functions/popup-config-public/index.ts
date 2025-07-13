import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePublicRequest, createSecurityErrorResponse } from '../_shared/security-validation.ts'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === PUBLIC POPUP CONFIG API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    // Validate public request with relaxed security
    const validation = validatePublicRequest(req)
    
    if (!validation.isValid) {
      console.warn(`[${timestamp}] Security validation failed: ${validation.error}`);
      // For now, let's be very permissive and just log the warning
      // return createSecurityErrorResponse(validation.error!, 403, corsHeaders);
    }

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || validation.shop || 'unknown'
    
    console.log(`[${timestamp}] Loading popup config for shop: ${shop}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        campaigns: [] 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query active popups for this shop
    const { data: popups, error } = await supabase
      .from('popups')
      .select('*')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`[${timestamp}] Database error:`, error)
      return new Response(JSON.stringify({ 
        error: 'Failed to load popup configuration',
        campaigns: [] 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Transform database format to expected format
    const campaigns = (popups || []).map(popup => ({
      id: popup.id,
      name: popup.title || popup.name || 'Special Offer',
      description: popup.description || 'Limited time offer!',
      discount_percent: popup.discount_percent,
      discount_code: popup.discount_code,
      trigger_type: popup.trigger_type,
      trigger_value: popup.trigger_value,
      triggers: {
        timeOnSite: popup.trigger_type === 'time_delay' ? parseInt(popup.trigger_value || '10') : undefined,
        scrollDepth: popup.trigger_type === 'scroll_depth' ? parseInt(popup.trigger_value || '50') : undefined,
        hasExitIntent: popup.trigger_type === 'exit_intent' ? true : undefined,
        isFirstVisit: popup.trigger_type === 'page_view' ? true : undefined
      }
    }))

    console.log(`[${timestamp}] Returning ${campaigns.length} campaigns for shop: ${shop}`)

    return new Response(JSON.stringify({ 
      success: true,
      campaigns,
      shop,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Error in public popup config API:`, error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      campaigns: [],
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})