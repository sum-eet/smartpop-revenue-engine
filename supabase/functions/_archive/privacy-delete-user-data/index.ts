import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === PRIVACY DELETE USER DATA API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const { sessionId, userId } = await req.json()
      console.log(`[${timestamp}] Delete request for session:`, sessionId, 'user:', userId)

      if (!sessionId && !userId) {
        return new Response(JSON.stringify({
          error: 'Either sessionId or userId is required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const deletionResults = []

      // Delete tracking events
      if (sessionId) {
        const { data: trackingData, error: trackingError } = await supabase
          .from('tracking_events')
          .delete()
          .eq('session_id', sessionId)
          .select('count')

        deletionResults.push({
          table: 'tracking_events',
          criteria: `session_id = ${sessionId}`,
          success: !trackingError,
          error: trackingError?.message,
          deletedCount: trackingData?.length || 0
        })
      }

      // Delete session data
      if (sessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .delete()
          .eq('session_id', sessionId)
          .select('count')

        deletionResults.push({
          table: 'sessions',
          criteria: `session_id = ${sessionId}`,
          success: !sessionError,
          error: sessionError?.message,
          deletedCount: sessionData?.length || 0
        })
      }

      // Delete consent records
      if (sessionId) {
        const { data: consentData, error: consentError } = await supabase
          .from('consent_records')
          .delete()
          .eq('session_id', sessionId)
          .select('count')

        deletionResults.push({
          table: 'consent_records',
          criteria: `session_id = ${sessionId}`,
          success: !consentError,
          error: consentError?.message,
          deletedCount: consentData?.length || 0
        })
      }

      // Delete user-specific data if userId provided
      if (userId) {
        const { data: userData, error: userError } = await supabase
          .from('tracking_events')
          .delete()
          .eq('user_id', userId)
          .select('count')

        deletionResults.push({
          table: 'tracking_events',
          criteria: `user_id = ${userId}`,
          success: !userError,
          error: userError?.message,
          deletedCount: userData?.length || 0
        })

        const { data: userConsentData, error: userConsentError } = await supabase
          .from('consent_records')
          .delete()
          .eq('user_id', userId)
          .select('count')

        deletionResults.push({
          table: 'consent_records',
          criteria: `user_id = ${userId}`,
          success: !userConsentError,
          error: userConsentError?.message,
          deletedCount: userConsentData?.length || 0
        })
      }

      // Check if all deletions were successful
      const allSuccessful = deletionResults.every(result => result.success)
      const totalDeleted = deletionResults.reduce((sum, result) => sum + result.deletedCount, 0)

      console.log(`[${timestamp}] Deletion completed:`, {
        allSuccessful,
        totalDeleted,
        results: deletionResults
      })

      // Log the deletion for compliance audit trail
      await supabase
        .from('data_deletion_log')
        .insert([{
          session_id: sessionId,
          user_id: userId,
          deletion_results: deletionResults,
          requested_at: timestamp,
          success: allSuccessful,
          total_records_deleted: totalDeleted
        }])

      return new Response(JSON.stringify({
        success: allSuccessful,
        message: allSuccessful ? 'User data deleted successfully' : 'Some deletions failed',
        deletionResults,
        totalRecordsDeleted: totalDeleted,
        timestamp
      }), {
        status: allSuccessful ? 200 : 207, // 207 for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error(`[${timestamp}] Function error:`, error)
      return new Response(JSON.stringify({
        error: 'Failed to delete user data',
        details: error.message,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})