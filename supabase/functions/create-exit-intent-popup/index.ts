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

    // First, deactivate the current scroll popup to avoid conflicts
    await supabase
      .from('popups')
      .update({ is_active: false })
      .eq('name', 'scroll 69%')

    // Create a test exit intent popup
    const { data, error } = await supabase
      .from('popups')
      .insert({
        shop_id: '5909a9ee-eb94-4261-8742-3e03bce19d2d',
        name: 'Exit Intent Test',
        trigger_type: 'exit_intent',
        trigger_value: null, // Not needed for exit intent
        page_target: 'all_pages',
        popup_type: 'discount_offer',
        title: 'Wait! Don\'t Leave Yet!',
        description: 'Get 20% off your first order before you go. This offer expires in 5 minutes!',
        button_text: 'Claim 20% Off',
        email_placeholder: 'Enter email for discount',
        discount_code: 'EXITOFFER20',
        discount_percent: '20',
        is_active: true,
        is_deleted: false
      })
      .select()

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({
      success: true,
      message: '🚪 Exit intent popup created successfully!',
      popup: data[0],
      testing_instructions: [
        '1. Visit: https://testingstoresumeet.myshopify.com/',
        '2. Enter password: eaneus',
        '3. Move mouse towards top of browser (near address bar)',
        '4. Or move mouse out of the page through the top',
        '5. Exit intent popup should appear with EXITOFFER20 discount',
        '6. Check console for: "🚪 Exit intent detected" messages'
      ],
      architecture_notes: [
        '✅ Desktop-only detection (mobile excluded)',
        '✅ Throttled mouse tracking (100ms intervals)',
        '✅ Dual detection: rapid upward movement + mouse leave',
        '✅ Non-breaking integration with existing triggers',
        '✅ Performance optimized with passive event listeners'
      ]
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