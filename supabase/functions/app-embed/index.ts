import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === APP EMBED API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
      const debug = url.searchParams.get('debug') === 'true'
      
      console.log(`[${timestamp}] Serving app embed for shop: ${shop}`)

      // Get active popups for this shop
      const { data: popups, error: popupError } = await supabase
        .from('popups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (popupError) {
        console.error(`[${timestamp}] Failed to fetch popups:`, popupError)
      }

      // Generate the JavaScript embed code
      const embedScript = generateEmbedScript(shop, popups || [], debug)

      return new Response(embedScript, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    return new Response(`console.error('SmartPop Embed Error: ${error.message}');`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    })
  }
})

function generateEmbedScript(shop: string, popups: any[], debug: boolean = false): string {
  const apiBaseUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1'
  
  return `
/**
 * SmartPop Revenue Engine - Auto-Injected Tracking System
 * Shop: ${shop}
 * Active Popups: ${popups.length}
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  // CRITICAL: Don't run on admin/app pages
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;
  
  // Skip if on admin pages or app pages
  if (currentPath.includes('/admin') || 
      currentPath.includes('/apps') ||
      currentUrl.includes('shopifyapp.com') ||
      currentUrl.includes('claude.ai') ||
      currentUrl.includes('partners.shopify.com') ||
      document.querySelector('meta[name="shopify-checkout-api-token"]') ||
      document.querySelector('[data-shopify-app]') ||
      document.querySelector('body[data-env="development"]')) {
    console.log('🚫 SmartPop: Skipping admin/app page:', currentPath);
    return;
  }
  
  console.log('🚀 SmartPop: Customer store page detected:', currentPath);

  const SMARTPOP_CONFIG = {
    shop: '${shop}',
    apiBaseUrl: '${apiBaseUrl}',
    debug: ${debug},
    popups: ${JSON.stringify(popups)},
    trackingInterval: 2000, // 2 seconds
    sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };

  class SmartPopEngine {
    constructor() {
      this.config = SMARTPOP_CONFIG;
      this.maxScrollReached = 0;
      this.isTracking = false;
      this.trackingTimer = null;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      
      this.log('🚀 SmartPop Engine initializing...');
      this.log('📊 Session ID:', this.config.sessionId);
      this.log('🎯 Active popups:', this.config.popups.length);
      
      this.init();
    }

    log(...args) {
      if (this.config.debug) {
        console.log('[SmartPop]', ...args);
      }
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.startTracking());
      } else {
        this.startTracking();
      }
      
      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseTracking();
        } else {
          this.resumeTracking();
        }
      });
    }

    startTracking() {
      this.log('📈 Starting tracking...');
      this.isTracking = true;
      
      // Initial track
      this.trackScroll();
      
      // Set up interval tracking
      this.trackingTimer = setInterval(() => {
        if (this.isTracking) {
          this.trackScroll();
        }
      }, this.config.trackingInterval);

      // Also track on scroll events for responsiveness
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.trackScroll();
        }, 500); // Debounce
      });

      // Check for time-based popups
      this.checkTimeBasedPopups();
    }

    pauseTracking() {
      this.isTracking = false;
      if (this.trackingTimer) {
        clearInterval(this.trackingTimer);
      }
    }

    resumeTracking() {
      if (!this.isTracking) {
        this.startTracking();
      }
    }

    getScrollData() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      const viewportHeight = window.innerHeight;
      const scrollableHeight = documentHeight - viewportHeight;
      const scrollPercent = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 0;
      
      this.currentScrollPercent = Math.min(scrollPercent, 100);
      this.maxScrollReached = Math.max(this.maxScrollReached, this.currentScrollPercent);
      
      return {
        sessionId: this.config.sessionId,
        scrollPercent: this.currentScrollPercent,
        maxScrollReached: this.maxScrollReached,
        pageUrl: window.location.href,
        pageHeight: documentHeight,
        viewportHeight: viewportHeight,
        scrollPosition: scrollTop,
        pageTarget: this.getPageTarget(),
        shop: this.config.shop
      };
    }

    getPageTarget() {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'homepage';
      if (path.includes('/products/')) return 'product_pages';
      if (path.includes('/collections/')) return 'collection_pages';
      if (path.includes('/blogs/') || path.includes('/blog/')) return 'blog_pages';
      if (path.includes('/cart')) return 'cart_page';
      if (path.includes('/checkout')) return 'checkout_page';
      return 'all_pages';
    }

    async trackScroll() {
      const scrollData = this.getScrollData();
      
      try {
        // Check for scroll-triggered popups first (client-side for speed)
        this.checkScrollTriggeredPopups(scrollData.scrollPercent, scrollData.pageTarget);
        
        // Send tracking data to backend
        const response = await fetch(this.config.apiBaseUrl + '/scroll-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scrollData)
        });

        if (!response.ok) {
          this.log('❌ Scroll tracking failed:', response.status);
          return;
        }

        this.log(\`📊 Scroll: \${scrollData.scrollPercent}% (Max: \${scrollData.maxScrollReached}%)\`);
        
      } catch (error) {
        this.log('❌ Scroll tracking error:', error);
      }
    }

    checkScrollTriggeredPopups(scrollPercent, pageTarget) {
      for (const popup of this.config.popups) {
        if (popup.trigger_type === 'scroll_depth' && 
            popup.is_active && 
            !this.shownPopups.has(popup.id)) {
          
          const triggerPercent = parseInt(popup.trigger_value) || 50;
          const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
          
          if (scrollPercent >= triggerPercent && pageMatch) {
            this.log(\`🎯 Scroll popup triggered: \${popup.name} at \${scrollPercent}%\`);
            this.showPopup(popup);
            this.shownPopups.add(popup.id);
          }
        }
      }
    }

    checkTimeBasedPopups() {
      for (const popup of this.config.popups) {
        if (popup.trigger_type === 'time_delay' && 
            popup.is_active && 
            !this.shownPopups.has(popup.id)) {
          
          const delay = parseInt(popup.trigger_value) * 1000 || 5000; // Convert to milliseconds
          const pageTarget = this.getPageTarget();
          const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
          
          if (pageMatch) {
            this.log(\`⏰ Time popup scheduled: \${popup.name} in \${delay/1000}s\`);
            setTimeout(() => {
              if (!this.shownPopups.has(popup.id)) {
                this.log(\`⏰ Time popup triggered: \${popup.name}\`);
                this.showPopup(popup);
                this.shownPopups.add(popup.id);
              }
            }, delay);
          }
        }
      }
    }

    showPopup(popup) {
      this.log(\`🎯 Showing popup: \${popup.name}\`);
      
      // Track popup view immediately
      this.trackPopupEvent(popup.id, 'view');
      
      // Create popup HTML
      const popupHtml = \`
        <div id="smartpop-overlay-\${popup.id}" class="smartpop-overlay" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          z-index: 999999;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: smartpop-fadeIn 0.3s ease;
        ">
          <div class="smartpop-modal" style="
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            margin: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            text-align: center;
            position: relative;
            animation: smartpop-slideIn 0.3s ease;
          ">
            <button class="smartpop-close" style="
              position: absolute;
              top: 16px;
              right: 16px;
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
            
            <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">\${popup.title || popup.name}</h2>
            <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.5;">\${popup.description || ''}</p>
            
            <div style="margin: 24px 0;">
              <input type="email" placeholder="\${popup.email_placeholder || 'Enter your email'}" 
                     id="smartpop-email-\${popup.id}"
                     style="
                       width: 100%;
                       padding: 12px;
                       border: 2px solid #ddd;
                       border-radius: 6px;
                       font-size: 16px;
                       margin-bottom: 16px;
                       box-sizing: border-box;
                     ">
            </div>
            
            <button class="smartpop-submit" style="
              background: #007cba;
              color: white;
              border: none;
              padding: 14px 28px;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              font-weight: bold;
              width: 100%;
            ">\${popup.button_text || 'Get Offer'}</button>
            
            \${popup.discount_code ? \`
              <div style="margin-top: 16px; padding: 12px; background: #f0f8f0; border-radius: 6px;">
                <strong>Discount Code: \${popup.discount_code}</strong><br>
                <small>Save \${popup.discount_percent || '10'}% on your order!</small>
              </div>
            \` : ''}
          </div>
        </div>
      \`;
      
      // Add CSS if not already added
      if (!document.getElementById('smartpop-styles')) {
        const style = document.createElement('style');
        style.id = 'smartpop-styles';
        style.textContent = \`
          @keyframes smartpop-fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes smartpop-slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes smartpop-fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          .smartpop-submit:hover {
            background: #005a8b !important;
          }
          .smartpop-close:hover {
            color: #000 !important;
          }
        \`;
        document.head.appendChild(style);
      }
      
      // Add popup to page
      document.body.insertAdjacentHTML('beforeend', popupHtml);
      
      // Set up event listeners
      const overlay = document.getElementById(\`smartpop-overlay-\${popup.id}\`);
      const closeBtn = overlay.querySelector('.smartpop-close');
      const submitBtn = overlay.querySelector('.smartpop-submit');
      const emailInput = overlay.querySelector(\`#smartpop-email-\${popup.id}\`);
      
      // Close popup handlers
      const closePopup = () => {
        overlay.style.animation = 'smartpop-fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
        this.trackPopupEvent(popup.id, 'close');
      };
      
      closeBtn.addEventListener('click', closePopup);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
      });
      
      // Submit handler
      submitBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email && this.isValidEmail(email)) {
          this.trackPopupEvent(popup.id, 'conversion', { email });
          closePopup();
          
          // Show success message
          const successMsg = popup.discount_code ? 
            \`Thank you! Your discount code: \${popup.discount_code}\` : 
            'Thank you! Check your email for your discount.';
          
          if (window.confirm) {
            alert(successMsg);
          }
        } else {
          alert('Please enter a valid email address');
        }
      });
      
      // Auto-close after 30 seconds
      setTimeout(() => {
        if (document.getElementById(\`smartpop-overlay-\${popup.id}\`)) {
          closePopup();
        }
      }, 30000);
    }

    isValidEmail(email) {
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    }

    async trackPopupEvent(popupId, eventType, data = {}) {
      try {
        const response = await fetch(this.config.apiBaseUrl + '/popup-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            popupId: popupId,
            eventType: eventType,
            pageUrl: window.location.href,
            shop: this.config.shop,
            ...data
          })
        });

        if (response.ok) {
          this.log(\`✅ Popup event tracked: \${eventType} for popup \${popupId}\`);
        } else {
          this.log('❌ Failed to track popup event:', response.status);
        }
      } catch (error) {
        this.log('❌ Popup tracking error:', error);
      }
    }

    // Public API
    stop() {
      this.pauseTracking();
      this.log('⏹️ SmartPop stopped');
    }

    getAnalytics() {
      return {
        sessionId: this.config.sessionId,
        maxScrollReached: this.maxScrollReached,
        currentScrollPercent: this.currentScrollPercent,
        shownPopups: Array.from(this.shownPopups),
        activePopups: this.config.popups.length
      };
    }
  }

  // Initialize SmartPop Engine
  window.smartPop = new SmartPopEngine();
  
  console.log('🎯 SmartPop Revenue Engine loaded for shop: ${shop}');
  
})();
`;
}