import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Define all popup types from dashboard
    const popupAnalysis = {
      trigger_types: {
        supported_in_dashboard: [
          {
            type: 'page_view',
            description: 'Shows immediately when page loads',
            trigger_value: 'Not required',
            implementation_status: '✅ Implemented',
            notes: 'Works correctly - shows immediately on checkTriggers()'
          },
          {
            type: 'time_delay', 
            description: 'Shows after X seconds on page',
            trigger_value: 'Seconds (e.g., 5, 10, 30)',
            implementation_status: '✅ Implemented',
            notes: 'Works correctly - tracks timeOnSite and compares with trigger_value'
          },
          {
            type: 'scroll_depth',
            description: 'Shows when user scrolls to X% of page',
            trigger_value: 'Percentage (1-100)',
            implementation_status: '✅ Implemented',
            notes: 'Fixed - now properly tracks scroll percentage and compares with trigger_value'
          },
          {
            type: 'exit_intent',
            description: 'Shows when user moves mouse to leave page',
            trigger_value: 'Not required',
            implementation_status: '❌ NOT Implemented',
            notes: 'Missing in popup-script function - needs mouse leave detection'
          }
        ],
        
        missing_implementations: [
          {
            type: 'exit_intent',
            required_implementation: 'Add mouse leave event listener and check for upward movement near top of page',
            priority: 'High - commonly used trigger'
          }
        ]
      },

      popup_types: {
        supported_in_dashboard: [
          {
            type: 'email_capture',
            description: 'Simple email collection popup',
            fields_used: ['title', 'description', 'button_text', 'email_placeholder'],
            fields_ignored: ['discount_code', 'discount_percent'],
            implementation_status: '✅ Fully Implemented',
            notes: 'Shows email input and button correctly'
          },
          {
            type: 'discount_offer',
            description: 'Email capture with discount code/percentage',
            fields_used: ['title', 'description', 'button_text', 'email_placeholder', 'discount_code', 'discount_percent'],
            fields_ignored: [],
            implementation_status: '⚠️ Partially Implemented',
            notes: 'Shows all fields but discount code/percentage not prominently displayed in popup HTML'
          },
          {
            type: 'announcement',
            description: 'Information-only popup (no email capture)',
            fields_used: ['title', 'description', 'button_text'],
            fields_ignored: ['email_placeholder', 'discount_code', 'discount_percent'],
            implementation_status: '❌ NOT Implemented',
            notes: 'Still shows email input field - should hide email input for announcements'
          },
          {
            type: 'newsletter',
            description: 'Newsletter subscription popup',
            fields_used: ['title', 'description', 'button_text', 'email_placeholder'],
            fields_ignored: ['discount_code', 'discount_percent'],
            implementation_status: '✅ Functionally Same as Email Capture',
            notes: 'Works but no visual distinction from email_capture'
          }
        ]
      },

      page_targets: {
        supported_in_dashboard: [
          'all_pages',
          'home_page', 
          'product_pages',
          'cart_page',
          'checkout_page'
        ],
        implementation_status: '❌ NOT Implemented',
        notes: 'popup-script function ignores page_target - shows on all pages regardless'
      },

      critical_issues_found: [
        {
          issue: 'exit_intent trigger not implemented',
          severity: 'High',
          impact: 'Users can create exit-intent popups but they will never show',
          fix_needed: 'Add mouse leave detection in popup-script'
        },
        {
          issue: 'page_target filtering not implemented', 
          severity: 'Medium',
          impact: 'Popups show on all pages regardless of page_target setting',
          fix_needed: 'Add URL/path checking logic in popup-script'
        },
        {
          issue: 'announcement popups show email input',
          severity: 'Medium', 
          impact: 'Announcement popups incorrectly ask for email',
          fix_needed: 'Conditional rendering based on popup_type'
        },
        {
          issue: 'discount code not prominently displayed',
          severity: 'Low',
          impact: 'Users may not see the discount code clearly',
          fix_needed: 'Better styling for discount offers'
        }
      ],

      working_correctly: [
        'page_view trigger',
        'time_delay trigger', 
        'scroll_depth trigger',
        'email_capture popup type',
        'basic popup display and styling',
        'admin detection',
        'script tag installation'
      ]
    }

    return new Response(JSON.stringify(popupAnalysis, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})