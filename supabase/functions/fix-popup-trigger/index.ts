import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Fix the popup configuration
    const { data, error } = await supabase
      .from('popups')
      .update({
        trigger_type: 'scroll_depth',
        trigger_value: '69'
      })
      .eq('name', 'scroll 69%')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .select()

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Fixed popup trigger configuration',
      updated_popup: data[0],
      changes: {
        trigger_type: 'time_delay → scroll_depth',
        trigger_value: '5 → 69'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})