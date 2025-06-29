import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === CONSENT RECORD API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const consentData = await req.json()
      console.log(`[${timestamp}] Recording consent:`, {
        sessionId: consentData.sessionId,
        source: consentData.source,
        permissions: Object.keys(consentData.permissions || {})
      })

      // Validate required fields
      if (!consentData.sessionId || !consentData.permissions || !consentData.consentString) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          required: ['sessionId', 'permissions', 'consentString']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Store consent record for compliance
      const { data, error } = await supabase
        .from('consent_records')
        .insert([{
          id: consentData.id,
          session_id: consentData.sessionId,
          user_id: consentData.userId || null,
          permissions: consentData.permissions,
          consent_string: consentData.consentString,
          ip_address: consentData.ipAddress,
          user_agent: consentData.userAgent,
          source: consentData.source,
          version: consentData.version,
          created_at: timestamp
        }])
        .select()
        .single()

      if (error) {
        console.error(`[${timestamp}] Failed to record consent:`, error)
        return new Response(JSON.stringify({
          error: 'Failed to record consent',
          details: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Consent recorded successfully:`, data.id)

      return new Response(JSON.stringify({
        success: true,
        consentId: data.id,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error(`[${timestamp}] Function error:`, error)
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
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})