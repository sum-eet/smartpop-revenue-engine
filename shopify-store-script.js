/**
 * SmartPop Scroll Tracker for Shopify Store
 * Add this script to your Shopify theme to enable scroll-triggered popups
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

  // Configuration
  const SMARTPOP_CONFIG = {
    shop: 'testingstoresumeet.myshopify.com',
    debug: true,
    trackingInterval: 1000,
    sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };

  // Active popups (these match your database popups)
  const ACTIVE_POPUPS = [
    {
      id: '4fae0cd6-7601-4aff-8eca-0601bedff71d',
      name: 'Scroll 50% Popup',
      title: "Wait! Don't Leave Empty Handed!",
      description: 'Get 15% off your first order when you scroll down and discover our products',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      popup_type: 'discount_offer',
      button_text: 'Claim 15% Off',
      email_placeholder: 'Enter email for discount',
      discount_code: 'SCROLL15',
      discount_percent: '15',
      is_active: true
    },
    {
      id: 'test-25-percent',
      name: 'Test 25% Popup',
      title: "Early Shopper Special!",
      description: 'Get 20% off for being an early browser - limited time offer!',
      trigger_type: 'scroll_depth',
      trigger_value: '25',
      page_target: 'homepage',
      popup_type: 'discount_offer',
      button_text: 'Get 20% Off Now',
      email_placeholder: 'Enter your email',
      discount_code: 'EARLY20',
      discount_percent: '20',
      is_active: true
    }
  ];

  class ShopifyScrollTracker {
    constructor() {
      this.config = SMARTPOP_CONFIG;
      this.popups = ACTIVE_POPUPS;
      this.maxScrollReached = 0;
      this.isTracking = false;
      this.trackingTimer = null;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      this.lastLoggedPercent = 0;
      
      this.log('🚀 Shopify SmartPop initializing...');
      this.log('📊 Session ID:', this.config.sessionId);
      this.log('🎯 Active popups:', this.popups.length);
      
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
      
      // Add debug indicator for Shopify store
      this.addDebugIndicator();
    }

    addDebugIndicator() {
      // Only add if debug is enabled
      if (!this.config.debug) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'smartpop-debug';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #007cba;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-width: 350px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        border: 2px solid #005a8b;
      `;
      indicator.innerHTML = `
        <div><strong>🎯 SmartPop Debug Panel</strong></div>
        <div id="smartpop-scroll-info">Scroll: 0%</div>
        <div id="smartpop-status">Initializing...</div>
        <div id="smartpop-popup-info">Popups: Loading...</div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.testPopup()" style="background:#28a745;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🧪 Test Popup</button>
          <button onclick="window.smartPop.reset()" style="background:#dc3545;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🔄 Reset</button>
        </div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.forceShow50()" style="background:#ff6b35;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🎯 Force 50%</button>
          <button onclick="window.smartPop.debugInfo()" style="background:#6f42c1;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🔍 Debug</button>
        </div>
      `;
      document.body.appendChild(indicator);
      
      this.log('✅ Debug indicator added');
    }

    updateDebugIndicator(scrollPercent, status) {
      const scrollInfo = document.getElementById('smartpop-scroll-info');
      const statusInfo = document.getElementById('smartpop-status');
      const popupInfo = document.getElementById('smartpop-popup-info');
      
      if (scrollInfo) {
        scrollInfo.textContent = `Scroll: ${scrollPercent}% (Max: ${this.maxScrollReached}%)`;
      }
      if (statusInfo) {
        statusInfo.textContent = status || 'Tracking...';
      }
      if (popupInfo) {
        const activePopups = this.popups.filter(p => p.is_active).length;
        const shownCount = this.shownPopups.size;
        popupInfo.textContent = `Popups: ${activePopups} active, ${shownCount} shown`;
      }
    }

    startTracking() {
      this.log('📈 Starting Shopify tracking...');
      this.isTracking = true;
      
      // Initial track
      this.trackScroll();
      
      // Set up interval tracking
      this.trackingTimer = setInterval(() => {
        if (this.isTracking) {
          this.trackScroll();
        }
      }, this.config.trackingInterval);

      // Track on scroll events for responsiveness
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.trackScroll();
        }, 200);
      }, { passive: true });

      this.updateDebugIndicator(0, 'Tracking active ✅');
    }

    getScrollData() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Try multiple methods to get accurate document height for Shopify themes
      const body = document.body;
      const docElement = document.documentElement;
      
      const documentHeight = Math.max(
        body.scrollHeight || 0,
        body.offsetHeight || 0,
        body.clientHeight || 0,
        docElement.scrollHeight || 0,
        docElement.offsetHeight || 0,
        docElement.clientHeight || 0
      );
      
      const viewportHeight = window.innerHeight || docElement.clientHeight || body.clientHeight;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1); // Prevent division by zero
      
      // Calculate percentage - ensure it's reasonable
      let scrollPercent = Math.round((scrollTop / scrollableHeight) * 100);
      scrollPercent = Math.max(0, Math.min(scrollPercent, 100)); // Clamp between 0-100
      
      this.currentScrollPercent = scrollPercent;
      this.maxScrollReached = Math.max(this.maxScrollReached, this.currentScrollPercent);
      
      // DETAILED LOG for Shopify debugging - log every 5%
      if (!this.lastLoggedPercent || Math.abs(scrollPercent - this.lastLoggedPercent) >= 5) {
        this.log(`🔍 SHOPIFY SCROLL DEBUG:
        - scrollTop: ${scrollTop}px
        - documentHeight: ${documentHeight}px
        - viewportHeight: ${viewportHeight}px  
        - scrollableHeight: ${scrollableHeight}px
        - calculated %: ${scrollPercent}%
        - body.scrollHeight: ${body.scrollHeight}px
        - docElement.scrollHeight: ${docElement.scrollHeight}px
        - Current URL: ${window.location.pathname}`);
        this.lastLoggedPercent = scrollPercent;
      }
      
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

    trackScroll() {
      const scrollData = this.getScrollData();
      
      // Update debug indicator
      this.updateDebugIndicator(scrollData.scrollPercent, `Page: ${scrollData.pageTarget}`);
      
      // Check for scroll-triggered popups
      this.checkScrollTriggeredPopups(scrollData.scrollPercent, scrollData.pageTarget);
    }

    checkScrollTriggeredPopups(scrollPercent, pageTarget) {
      this.log(`🔍 POPUP CHECK:
      - Current scroll: ${scrollPercent}%
      - Page target: ${pageTarget}
      - Available popups: ${this.popups.length}
      - Already shown: [${Array.from(this.shownPopups).join(', ')}]`);
      
      for (const popup of this.popups) {
        const triggerPercent = parseInt(popup.trigger_value) || 50;
        const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
        const alreadyShown = this.shownPopups.has(popup.id);
        
        this.log(`📋 Popup "${popup.name}":
        - Trigger type: ${popup.trigger_type}
        - Trigger at: ${triggerPercent}%
        - Is active: ${popup.is_active}
        - Page match: ${pageMatch} (popup: ${popup.page_target}, current: ${pageTarget})
        - Already shown: ${alreadyShown}
        - Should trigger: ${scrollPercent >= triggerPercent && pageMatch && !alreadyShown && popup.is_active}`);
        
        if (popup.trigger_type === 'scroll_depth' && 
            popup.is_active && 
            !alreadyShown &&
            pageMatch &&
            scrollPercent >= triggerPercent) {
          
          this.log(`🎯 POPUP TRIGGERED! "${popup.name}" at ${scrollPercent}% (trigger: ${triggerPercent}%)`);
          this.showPopup(popup);
          this.shownPopups.add(popup.id);
          this.updateDebugIndicator(scrollPercent, `Popup shown: ${popup.name}`);
          break; // Only show one popup at a time
        }
      }
      
      // Additional debug info
      if (scrollPercent >= 50 && this.shownPopups.size === 0) {
        this.log(`⚠️ 50% REACHED BUT NO POPUP! Debug info:
        - Popups available: ${this.popups.length}
        - Active popups: ${this.popups.filter(p => p.is_active).length}
        - 50% popups: ${this.popups.filter(p => parseInt(p.trigger_value) === 50).length}
        - Homepage popups: ${this.popups.filter(p => p.page_target === 'homepage' || p.page_target === 'all_pages').length}`);
      }
    }

    showPopup(popup) {
      this.log(`🎯 Showing popup: ${popup.name}`);
      
      // Create popup HTML
      const popupHtml = `
        <div id="smartpop-overlay-${popup.id}" class="smartpop-overlay" style="
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
            
            <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">${popup.title || popup.name}</h2>
            <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.5;">${popup.description || ''}</p>
            
            <div style="margin: 24px 0;">
              <input type="email" placeholder="${popup.email_placeholder || 'Enter your email'}" 
                     id="smartpop-email-${popup.id}"
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
            ">${popup.button_text || 'Get Offer'}</button>
            
            ${popup.discount_code ? `
              <div style="margin-top: 16px; padding: 12px; background: #f0f8f0; border-radius: 6px;">
                <strong>Discount Code: ${popup.discount_code}</strong><br>
                <small>Save ${popup.discount_percent || '10'}% on your order!</small>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      // Add CSS if not already added
      if (!document.getElementById('smartpop-styles')) {
        const style = document.createElement('style');
        style.id = 'smartpop-styles';
        style.textContent = `
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
        `;
        document.head.appendChild(style);
      }
      
      // Add popup to page
      document.body.insertAdjacentHTML('beforeend', popupHtml);
      
      // Set up event listeners
      const overlay = document.getElementById(`smartpop-overlay-${popup.id}`);
      const closeBtn = overlay.querySelector('.smartpop-close');
      const submitBtn = overlay.querySelector('.smartpop-submit');
      const emailInput = overlay.querySelector(`#smartpop-email-${popup.id}`);
      
      // Close popup handlers
      const closePopup = () => {
        overlay.style.animation = 'smartpop-fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
        this.log(`❌ Popup closed: ${popup.name}`);
      };
      
      closeBtn.addEventListener('click', closePopup);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
      });
      
      // Submit handler
      submitBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email && this.isValidEmail(email)) {
          this.log(`✅ Email captured: ${email} for popup: ${popup.name}`);
          closePopup();
          alert(`Thank you! Your discount code: ${popup.discount_code || 'Check your email'}`);
        } else {
          alert('Please enter a valid email address');
        }
      });
      
      // Auto-close after 30 seconds
      setTimeout(() => {
        if (document.getElementById(`smartpop-overlay-${popup.id}`)) {
          closePopup();
        }
      }, 30000);
    }

    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Public API for testing
    testPopup() {
      this.log('🧪 Manual popup test');
      const popup = this.popups[0];
      if (popup) {
        this.showPopup(popup);
      }
    }

    reset() {
      this.log('🔄 Resetting popups');
      this.shownPopups.clear();
      this.maxScrollReached = 0;
      document.querySelectorAll('[id^="smartpop-overlay-"]').forEach(el => el.remove());
      this.updateDebugIndicator(0, 'Reset ✅');
    }

    // Force show 50% popup for testing
    forceShow50() {
      this.log('🎯 FORCE SHOWING 50% POPUP');
      const popup50 = this.popups.find(p => parseInt(p.trigger_value) === 50);
      if (popup50) {
        this.showPopup(popup50);
        this.shownPopups.add(popup50.id);
        this.updateDebugIndicator(this.currentScrollPercent, `Force shown: ${popup50.name}`);
      } else {
        this.log('❌ No 50% popup found');
        alert('No 50% popup found in configuration');
      }
    }

    // Debug info dump
    debugInfo() {
      this.log('🔍 DEBUG INFO DUMP:');
      this.log('Config:', this.config);
      this.log('Popups:', this.popups);
      this.log('Shown popups:', Array.from(this.shownPopups));
      this.log('Current scroll:', this.currentScrollPercent + '%');
      this.log('Max scroll:', this.maxScrollReached + '%');
      this.log('Page target:', this.getPageTarget());
      this.log('URL:', window.location.href);
      
      // Console output for easy copying
      console.table(this.popups.map(p => ({
        name: p.name,
        trigger: p.trigger_value + '%',
        active: p.is_active,
        page_target: p.page_target,
        shown: this.shownPopups.has(p.id)
      })));
    }
  }

  // Initialize SmartPop for Shopify
  window.smartPop = new ShopifyScrollTracker();
  
  // Global test functions
  window.testSmartPop = () => window.smartPop.testPopup();
  window.resetSmartPop = () => window.smartPop.reset();
  
  console.log('🎯 SmartPop loaded for Shopify store!');
  console.log('💡 Test commands: testSmartPop() or resetSmartPop()');
  
})();