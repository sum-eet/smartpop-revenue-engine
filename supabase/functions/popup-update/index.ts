import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === POPUP UPDATE API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const body = await req.json()
      console.log(`[${timestamp}] Update request:`, JSON.stringify(body, null, 2))
      
      if (!body.id) {
        console.log(`[${timestamp}] ERROR: Missing popup ID`)
        return new Response(JSON.stringify({ 
          error: 'Missing popup ID for update' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Updating popup ID:`, body.id)
      
      // Build update object with only provided fields
      const updates = { updated_at: timestamp }
      
      // Content fields
      if (body.name !== undefined) updates.name = body.name
      if (body.triggerType !== undefined) updates.trigger_type = body.triggerType
      if (body.triggerValue !== undefined) updates.trigger_value = body.triggerValue
      if (body.pageTarget !== undefined) updates.page_target = body.pageTarget
      if (body.popupType !== undefined) updates.popup_type = body.popupType
      if (body.title !== undefined) updates.title = body.title
      if (body.description !== undefined) updates.description = body.description
      if (body.buttonText !== undefined) updates.button_text = body.buttonText
      if (body.emailPlaceholder !== undefined) updates.email_placeholder = body.emailPlaceholder
      if (body.discountCode !== undefined) updates.discount_code = body.discountCode
      if (body.discountPercent !== undefined) updates.discount_percent = body.discountPercent
      
      // Status fields
      if (body.isActive !== undefined) updates.is_active = body.isActive
      
      console.log(`[${timestamp}] Update fields:`, Object.keys(updates))

      const { data, error } = await supabase
        .from('popups')
        .update(updates)
        .eq('id', body.id)
        .eq('is_deleted', false) // Only update non-deleted popups
        .select()

      if (error) {
        console.log(`[${timestamp}] ERROR: Database update failed:`, error)
        return new Response(JSON.stringify({ 
          error: 'Database update failed',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!data || data.length === 0) {
        console.log(`[${timestamp}] ERROR: Popup not found or already deleted`)
        return new Response(JSON.stringify({ 
          error: 'Popup not found or already deleted' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] SUCCESS: Popup updated`)

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Popup updated successfully',
        popup: data[0],
        updated_at: timestamp
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
    error: 'Method not allowed. Use POST for popup updates.' 
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})