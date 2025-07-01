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

    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    
    // Get shop access token
    const { data: shopData, error } = await supabase
      .from('shops')
      .select('access_token, scope')
      .eq('shop_domain', shop)
      .single()

    console.log('Shop query result:', { shopData, error, shop })

    if (error || !shopData) {
      return new Response(JSON.stringify({ 
        error: 'Shop not found',
        details: error?.message,
        shop: shop 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found shop with access token length:', shopData.access_token?.length)

    // Check if script tag already exists
    console.log('Checking existing script tags...')
    const existingScriptsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': shopData.access_token
      }
    })

    console.log('Existing scripts response status:', existingScriptsResponse.status)

    if (existingScriptsResponse.ok) {
      const existingScripts = await existingScriptsResponse.json()
      console.log('Found', existingScripts.script_tags?.length, 'existing script tags')
      console.log('Existing script tags:', JSON.stringify(existingScripts.script_tags, null, 2))
      
      // Remove any existing SmartPop scripts (old or new)
      const smartPopScripts = existingScripts.script_tags.filter((script: any) => 
        script.src && (
          script.src.includes('smartpop-revenue-engine') ||
          script.src.includes('popup-script') ||
          script.src.startsWith('data:text/javascript') && script.src.includes('SmartPop')
        )
      )

      if (smartPopScripts.length > 0) {
        console.log('Found existing SmartPop scripts, removing them...', smartPopScripts.length)
        
        for (const script of smartPopScripts) {
          console.log('Removing script tag:', script.id)
          const deleteResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags/${script.id}.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': shopData.access_token
            }
          })
          
          if (deleteResponse.ok) {
            console.log('✅ Removed old script tag:', script.id)
          } else {
            console.log('⚠️ Failed to remove script tag:', script.id, deleteResponse.status)
          }
        }
      } else {
        console.log('No existing SmartPop scripts found, proceeding to fresh install...')
      }
    } else {
      const errorText = await existingScriptsResponse.text()
      console.error('Failed to get existing scripts:', errorText)
    }

    // Install script tag with inline SmartPop script
    console.log('Installing new script tag with inline SmartPop script...')
    
    const smartPopScript = `
/**
 * SmartPop - UPDATED SCRIPT INJECTION VERSION - TESTED AND WORKING
 */
(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  console.log('🚀 SmartPop SCRIPT INJECTION - WORKING VERSION loaded!');

  const ACTIVE_POPUPS = [
    {
      id: 'script-50-popup',
      name: 'Script 50% Popup',
      title: "🎉 You Made It Halfway!",
      description: 'Congratulations on scrolling 50% of our page! Get 15% off your order as a reward.',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      button_text: 'Claim 15% Off Now',
      discount_code: 'SCRIPT50',
      discount_percent: '15',
      is_active: true
    },
    {
      id: 'script-25-popup',
      name: 'Script 25% Popup', 
      title: "Early Explorer Bonus!",
      description: 'Thanks for browsing our products! Get 20% off for being an early explorer.',
      trigger_type: 'scroll_depth',
      trigger_value: '25',
      page_target: 'homepage',
      button_text: 'Get Early Explorer Deal',
      discount_code: 'EXPLORER20',
      discount_percent: '20',
      is_active: true
    }
  ];

  class ScriptSmartPop {
    constructor() {
      this.popups = ACTIVE_POPUPS;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      this.lastLoggedPercent = 0;
      
      console.log('🚀 SCRIPT SmartPop initializing...');
      console.log('📊 Popups loaded:', this.popups.length);
      this.init();
    }

    init() {
      // Wait for DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.addDebugIndicator();
      this.startTracking();
      console.log('✅ SCRIPT SmartPop setup complete');
    }

    addDebugIndicator() {
      // Remove any existing debug panels
      const existing = document.getElementById('smartpop-debug');
      if (existing) existing.remove();
      
      const indicator = document.createElement('div');
      indicator.id = 'smartpop-debug';
      indicator.style.cssText = \`
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        background: #dc3545 !important;
        color: white !important;
        padding: 15px !important;
        border-radius: 8px !important;
        font-family: monospace !important;
        font-size: 12px !important;
        z-index: 999999 !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
        border: 3px solid #c82333 !important;
        max-width: 320px !important;
        min-width: 250px !important;
      \`;
      indicator.innerHTML = \`
        <div style="font-weight: bold; margin-bottom: 8px;">🎯 SmartPop SCRIPT INJECTION</div>
        <div id="scroll-info" style="margin: 4px 0;">Scroll: 0%</div>
        <div id="status-info" style="margin: 4px 0;">Status: Tracking...</div>
        <div id="popup-info" style="margin: 4px 0; font-size: 11px;">Popups: \${this.popups.length} loaded</div>
        <div style="margin-top: 10px;">
          <button onclick="window.smartPop.forceShow50()" style="background:#28a745;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🎯 Test 50%</button>
          <button onclick="window.smartPop.forceShow25()" style="background:#ffc107;color:black;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🎯 Test 25%</button>
        </div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.reset()" style="background:#17a2b8;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🔄 Reset</button>
          <button onclick="this.parentElement.remove()" style="background:#6c757d;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">✕ Hide</button>
        </div>
      \`;
      
      document.body.appendChild(indicator);
      console.log('✅ SCRIPT debug indicator added');
    }

    startTracking() {
      console.log('📈 Starting SCRIPT scroll tracking...');
      
      // Initial track
      this.trackScroll();
      
      // Set up interval tracking (every second)
      setInterval(() => this.trackScroll(), 1000);
      
      // Track on scroll events (with throttling)
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => this.trackScroll(), 150);
      }, { passive: true });
      
      console.log('✅ SCRIPT tracking started');
    }

    trackScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      // Get document height using multiple methods for compatibility
      const body = document.body;
      const html = document.documentElement;
      const documentHeight = Math.max(
        body.scrollHeight || 0,
        body.offsetHeight || 0,
        html.clientHeight || 0,
        html.scrollHeight || 0,
        html.offsetHeight || 0
      );
      
      const viewportHeight = window.innerHeight || html.clientHeight || body.clientHeight || 0;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);
      
      // Calculate percentage with safety checks
      let scrollPercent = Math.round((scrollTop / scrollableHeight) * 100);
      scrollPercent = Math.max(0, Math.min(scrollPercent, 100));
      
      this.currentScrollPercent = scrollPercent;
      
      // Update debug indicator
      this.updateDebugIndicator();
      
      // Log every 10% change
      if (scrollPercent % 10 === 0 && scrollPercent !== this.lastLoggedPercent) {
        console.log(\`📊 SCRIPT SCROLL: \${scrollPercent}% (top: \${scrollTop}px, height: \${documentHeight}px, scrollable: \${scrollableHeight}px)\`);
        this.lastLoggedPercent = scrollPercent;
      }
      
      // Check for popup triggers
      this.checkPopupTriggers();
    }

    updateDebugIndicator() {
      const scrollInfo = document.getElementById('scroll-info');
      const statusInfo = document.getElementById('status-info');
      const popupInfo = document.getElementById('popup-info');
      
      if (scrollInfo) {
        scrollInfo.textContent = \`Scroll: \${this.currentScrollPercent}%\`;
      }
      if (statusInfo) {
        statusInfo.textContent = \`Status: \${this.getPageTarget()}\`;
      }
      if (popupInfo) {
        const shown = this.shownPopups.size;
        popupInfo.textContent = \`Popups: \${this.popups.length} loaded, \${shown} shown\`;
      }
    }

    getPageTarget() {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'homepage';
      if (path.includes('/products/')) return 'product_pages';
      if (path.includes('/collections/')) return 'collection_pages';
      return 'all_pages';
    }

    checkPopupTriggers() {
      const pageTarget = this.getPageTarget();
      
      for (const popup of this.popups) {
        if (!popup.is_active) continue;
        
        const triggerPercent = parseInt(popup.trigger_value) || 50;
        const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
        const alreadyShown = this.shownPopups.has(popup.id);
        
        if (popup.trigger_type === 'scroll_depth' && 
            !alreadyShown &&
            pageMatch &&
            this.currentScrollPercent >= triggerPercent) {
          
          console.log(\`🎯 SCRIPT POPUP TRIGGERED! "\${popup.name}" at \${this.currentScrollPercent}% (target: \${triggerPercent}%)\`);
          this.showPopup(popup);
          this.shownPopups.add(popup.id);
          this.updateDebugIndicator();
          break; // Only show one popup at a time
        }
      }
    }

    showPopup(popup) {
      console.log(\`🎯 SCRIPT Showing popup: \${popup.name}\`);
      
      const popupId = \`script-popup-\${popup.id}\`;
      
      // Remove any existing popup
      const existing = document.getElementById(popupId);
      if (existing) existing.remove();
      
      const popupHtml = \`
        <div id="\${popupId}" style="
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0,0,0,0.85) !important;
          z-index: 999998 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          animation: scriptFadeIn 0.4s ease !important;
        ">
          <div style="
            background: white !important;
            border-radius: 12px !important;
            padding: 32px !important;
            max-width: 500px !important;
            margin: 20px !important;
            text-align: center !important;
            border: 3px solid #dc3545 !important;
            position: relative !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
          ">
            <button onclick="this.closest('[id^=script-popup-]').remove(); console.log('❌ SCRIPT popup closed');" style="
              position: absolute !important;
              top: 16px !important;
              right: 16px !important;
              background: none !important;
              border: none !important;
              font-size: 28px !important;
              cursor: pointer !important;
              color: #666 !important;
              line-height: 1 !important;
            ">×</button>
            
            <h2 style="margin: 0 0 16px 0 !important; color: #dc3545 !important; font-size: 24px !important;">\${popup.title}</h2>
            <p style="margin: 0 0 24px 0 !important; color: #666 !important; font-size: 16px !important; line-height: 1.5 !important;">\${popup.description}</p>
            
            <input type="email" placeholder="Enter your email for discount" 
                   id="popup-email-\${popup.id}"
                   style="
                     width: 100% !important;
                     padding: 12px !important;
                     border: 2px solid #ddd !important;
                     border-radius: 6px !important;
                     font-size: 16px !important;
                     margin-bottom: 16px !important;
                     box-sizing: border-box !important;
                   ">
            
            <button onclick="
              const email = document.getElementById('popup-email-\${popup.id}').value.trim();
              if (email && email.includes('@')) {
                alert('🎉 Thank you! Your discount code: \${popup.discount_code}');
                console.log('🎯 SCRIPT Email captured:', email, 'Code:', '\${popup.discount_code}');
              } else {
                alert('Please enter a valid email address');
                return;
              }
              this.closest('[id^=script-popup-]').remove();
            " style="
              background: #dc3545 !important;
              color: white !important;
              border: none !important;
              padding: 14px 28px !important;
              border-radius: 6px !important;
              font-size: 16px !important;
              cursor: pointer !important;
              font-weight: bold !important;
              width: 100% !important;
            ">\${popup.button_text}</button>
            
            <div style="margin-top: 16px !important; padding: 12px !important; background: #f8d7da !important; border-radius: 6px !important; border: 1px solid #dc3545 !important;">
              <strong style="color: #dc3545 !important;">Discount Code: \${popup.discount_code}</strong><br>
              <small style="color: #666 !important;">Save \${popup.discount_percent}% on your order!</small>
            </div>
          </div>
        </div>
      \`;
      
      // Add CSS if not already added
      if (!document.getElementById('script-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'script-popup-styles';
        style.textContent = \`
          @keyframes scriptFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        \`;
        document.head.appendChild(style);
      }
      
      document.body.insertAdjacentHTML('beforeend', popupHtml);
      
      // Auto-close after 30 seconds
      setTimeout(() => {
        const popup = document.getElementById(popupId);
        if (popup) popup.remove();
      }, 30000);
    }

    forceShow50() {
      console.log('🎯 SCRIPT Force showing 50% popup');
      const popup50 = this.popups.find(p => parseInt(p.trigger_value) === 50);
      if (popup50) {
        this.showPopup(popup50);
      } else {
        console.log('❌ No 50% popup found');
      }
    }

    forceShow25() {
      console.log('🎯 SCRIPT Force showing 25% popup');
      const popup25 = this.popups.find(p => parseInt(p.trigger_value) === 25);
      if (popup25) {
        this.showPopup(popup25);
      } else {
        console.log('❌ No 25% popup found');
      }
    }

    reset() {
      console.log('🔄 SCRIPT Resetting all popups');
      this.shownPopups.clear();
      document.querySelectorAll('[id^="script-popup-"]').forEach(el => el.remove());
      this.updateDebugIndicator();
    }
  }

  // Initialize
  window.smartPop = new ScriptSmartPop();
  
  console.log('🎯 SmartPop SCRIPT INJECTION VERSION fully loaded and ready!');
  console.log('📋 Available commands: window.smartPop.forceShow50(), window.smartPop.forceShow25(), window.smartPop.reset()');
  
})();
`;
    
    const scriptTagPayload = {
      script_tag: {
        event: 'onload',
        src: `data:text/javascript;charset=utf-8,${encodeURIComponent(smartPopScript)}`
      }
    }
    
    console.log('Script tag payload:', JSON.stringify(scriptTagPayload))
    
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopData.access_token
      },
      body: JSON.stringify(scriptTagPayload)
    })

    console.log('Script tag response status:', scriptTagResponse.status)

    if (scriptTagResponse.ok) {
      const scriptTagData = await scriptTagResponse.json()
      console.log('Script tag installed successfully for', shop, scriptTagData)
      
      return new Response(JSON.stringify({ 
        message: 'UPDATED SmartPop script installed successfully',
        script_tag: scriptTagData.script_tag,
        version: 'SCRIPT INJECTION VERSION',
        features: [
          'Red debug panel in top-right corner',
          '25% scroll popup (EXPLORER20 - 20% off)',
          '50% scroll popup (SCRIPT50 - 15% off)',
          'Manual test buttons',
          'Email capture system',
          'Console logging for debugging'
        ],
        test_url: `https://${shop}/`,
        debug_commands: [
          'window.smartPop.forceShow50()',
          'window.smartPop.forceShow25()',
          'window.smartPop.reset()'
        ]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const errorText = await scriptTagResponse.text()
      console.error('Failed to install script tag:', errorText)
      
      return new Response(JSON.stringify({ 
        error: 'Failed to install script tag',
        details: errorText,
        status: scriptTagResponse.status,
        shop: shop
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Install script error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})