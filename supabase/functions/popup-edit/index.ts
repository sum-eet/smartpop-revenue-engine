import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('=== POPUP EDIT FUNCTION CALLED ===')
  console.log('Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const body = await req.json()
      console.log('Request body:', JSON.stringify(body, null, 2))
      
      if (!body.id) {
        console.log('ERROR: Missing popup ID')
        return new Response(JSON.stringify({ 
          error: 'Missing popup ID' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Updating popup ID:', body.id)
      
      // Build update object
      const updates = {}
      
      if (body.is_active !== undefined) {
        updates.is_active = body.is_active
        console.log('Setting is_active to:', body.is_active)
      }
      
      if (body.is_deleted !== undefined) {
        updates.is_deleted = body.is_deleted
        console.log('Setting is_deleted to:', body.is_deleted)
      }
      
      if (Object.keys(updates).length === 0) {
        console.log('ERROR: No valid fields to update')
        return new Response(JSON.stringify({ 
          error: 'No valid fields to update' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Performing database update with:', updates)
      
      const { data, error } = await supabase
        .from('popups')
        .update(updates)
        .eq('id', body.id)
        .select()

      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({ 
          error: 'Database update failed',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Update successful. Affected rows:', data?.length || 0)
      console.log('Updated data:', data)

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Popup updated successfully',
        affected_rows: data?.length || 0,
        updated_data: data
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      
    } catch (error) {
      console.error('Function error:', error)
      return new Response(JSON.stringify({ 
        error: 'Function error',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ 
    error: 'Method not allowed. Use POST.' 
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})