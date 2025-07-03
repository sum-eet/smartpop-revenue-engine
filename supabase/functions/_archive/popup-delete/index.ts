import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === POPUP DELETE API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const body = await req.json()
      console.log(`[${timestamp}] Delete request:`, JSON.stringify(body, null, 2))
      
      if (!body.id) {
        console.log(`[${timestamp}] ERROR: Missing popup ID`)
        return new Response(JSON.stringify({ 
          error: 'Missing popup ID for deletion' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const action = body.action || 'soft_delete' // Default to soft delete
      console.log(`[${timestamp}] Delete action:`, action, 'for popup ID:', body.id)
      
      let updateData = {}
      let successMessage = ''
      
      switch (action) {
        case 'soft_delete':
          // Mark as deleted but keep in database
          updateData = { 
            is_deleted: true, 
            is_active: false, 
            deleted_at: timestamp,
            updated_at: timestamp 
          }
          successMessage = 'Popup soft deleted successfully'
          break
          
        case 'deactivate':
          // Just deactivate, don't delete
          updateData = { 
            is_active: false, 
            updated_at: timestamp 
          }
          successMessage = 'Popup deactivated successfully'
          break
          
        case 'activate':
          // Reactivate (only if not deleted)
          updateData = { 
            is_active: true, 
            updated_at: timestamp 
          }
          successMessage = 'Popup activated successfully'
          break
          
        case 'hard_delete':
          // Actually remove from database (dangerous!)
          console.log(`[${timestamp}] HARD DELETE requested for popup:`, body.id)
          
          const { error: deleteError } = await supabase
            .from('popups')
            .delete()
            .eq('id', body.id)

          if (deleteError) {
            console.log(`[${timestamp}] ERROR: Hard delete failed:`, deleteError)
            return new Response(JSON.stringify({ 
              error: 'Hard delete failed',
              details: deleteError.message 
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          console.log(`[${timestamp}] SUCCESS: Popup hard deleted`)
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Popup permanently deleted',
            deleted_at: timestamp
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
          
        default:
          console.log(`[${timestamp}] ERROR: Invalid action:`, action)
          return new Response(JSON.stringify({ 
            error: 'Invalid action',
            valid_actions: ['soft_delete', 'deactivate', 'activate', 'hard_delete'],
            received: action
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }

      // For soft_delete, deactivate, activate actions
      const { data, error } = await supabase
        .from('popups')
        .update(updateData)
        .eq('id', body.id)
        .eq('is_deleted', action === 'activate' ? false : undefined) // Only activate non-deleted popups
        .select()

      if (error) {
        console.log(`[${timestamp}] ERROR: Database update failed:`, error)
        return new Response(JSON.stringify({ 
          error: 'Database operation failed',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!data || data.length === 0) {
        console.log(`[${timestamp}] ERROR: Popup not found`)
        return new Response(JSON.stringify({ 
          error: 'Popup not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] SUCCESS: ${action} completed`)

      return new Response(JSON.stringify({ 
        success: true,
        message: successMessage,
        action: action,
        popup: data[0],
        timestamp
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
    error: 'Method not allowed. Use POST for popup deletion/deactivation.' 
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})