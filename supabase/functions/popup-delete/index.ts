import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      const requestData = await req.json()
      console.log('=== POPUP DELETE REQUEST ===')
      console.log('Request body:', JSON.stringify(requestData, null, 2))
      
      if (!requestData.id) {
        return new Response(JSON.stringify({ 
          error: 'Missing popup id' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.log('Marking popup as deleted:', requestData.id)
      
      const { data, error } = await supabase
        .from('popups')
        .update({ 
          is_deleted: true, 
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', requestData.id)
        .select()

      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({ 
          error: 'Database error',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Delete successful, updated rows:', data?.length || 0)
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Popup deleted successfully',
        updated_rows: data?.length || 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Only POST method allowed' }), {
      status: 405,
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
})