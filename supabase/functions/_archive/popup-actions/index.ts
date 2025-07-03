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
      console.log('Popup action request:', JSON.stringify(requestData, null, 2))

      // Delete popup
      if (requestData.action === 'delete' && requestData.id) {
        console.log('Deleting popup:', requestData.id)
        
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

      // Toggle active/inactive
      if (requestData.action === 'toggle_active' && requestData.id) {
        console.log('Toggling popup:', requestData.id, 'to active:', requestData.is_active)
        
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

        return new Response(JSON.stringify({ 
          message: 'Popup toggled successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        error: 'Invalid action or missing parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Popup action error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})