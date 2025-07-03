import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    
    console.log('Serving popup script for shop:', shop)

    const script = `
/**
 * SmartPop Revenue Engine - Live Script
 * Shop: ${shop}
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    if (currentPath.includes('/admin') || currentPath.includes('/apps')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed');
    return false;
  }

  if (shouldSkipPopup()) {
    console.log('🚫 SmartPop: Exiting due to admin detection');
    return;
  }

  console.log('🚀 SmartPop: Initializing on customer store');

  async function loadAndShowPopups() {
    try {
      console.log('📥 Loading popup configs...');
      
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?action=list&shop_domain=${shop}');
      
      if (!response.ok) {
        console.log('❌ Failed to load popups:', response.status);
        return;
      }
      
      const popups = await response.json();
      console.log('📊 Loaded', popups.length, 'popup configs');
      
      const activePopup = popups.find(p => p.is_active && !p.is_deleted);
      
      if (activePopup) {
        console.log('🎯 Showing popup:', activePopup.name);
        setTimeout(() => showPopup(activePopup), 2000);
      } else {
        console.log('ℹ️ No active popups to show');
      }
      
    } catch (error) {
      console.error('❌ Error loading popups:', error);
    }
  }
  
  function showPopup(popup) {
    const popupHTML = \`
      <div id="smartpop-\${popup.id}" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white; border-radius: 12px; padding: 32px;
          max-width: 450px; width: 90%; text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative;
        ">
          <button onclick="document.getElementById('smartpop-\${popup.id}').remove()" style="
            position: absolute; top: 16px; right: 16px; background: none;
            border: none; font-size: 24px; cursor: pointer; color: #666;
          ">×</button>
          
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
            \${popup.title || 'Special Offer!'}
          </h2>
          
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
            \${popup.description || 'Get a special discount!'}
          </p>
          
          <input type="email" placeholder="\${popup.email_placeholder || 'Enter your email'}" 
                 style="width: 100%; padding: 12px; border: 2px solid #ddd;
                        border-radius: 6px; font-size: 16px; margin-bottom: 16px;
                        box-sizing: border-box;">
          
          <button onclick="alert('Thank you!'); document.getElementById('smartpop-\${popup.id}').remove();" 
                  style="background: #007cba; color: white; border: none;
                         padding: 14px 28px; border-radius: 6px; font-size: 16px;
                         cursor: pointer; width: 100%;">
            \${popup.button_text || 'Get Offer'}
          </button>
        </div>
      </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndShowPopups);
  } else {
    loadAndShowPopups();
  }
  
  console.log('🎯 SmartPop loaded for shop: ${shop}');
})();
`
    
    return new Response(script, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    console.error('Script generation error:', error)
    return new Response(`console.error('SmartPop Error: ${error.message}');`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    })
  }
})