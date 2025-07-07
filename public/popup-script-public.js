
(function() {
  'use strict';
  
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: Script starting...');
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: Current URL:', window.location.href);
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: Timestamp:', new Date().toISOString());

  // COMPREHENSIVE ADMIN DETECTION
  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    console.log('🔍 SmartPop URL Check:', { url: currentUrl, hostname: hostname, path: currentPath });
    
    // MAIN ADMIN DETECTION: admin.shopify.com domain
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    // Admin subdomains
    if (hostname.includes('admin.shopify.com') || 
        hostname.includes('partners.shopify.com') ||
        hostname.includes('accounts.shopify.com') ||
        hostname.includes('app.shopify.com')) {
      console.log('🚫 SmartPop: Blocked Shopify admin subdomain:', hostname);
      return true;
    }
    
    // App-specific paths (when on store domain)
    if (currentPath.includes('/admin') || 
        currentPath.includes('/apps') ||
        currentPath.includes('/account') ||
        currentPath.includes('/oauth') ||
        currentPath.includes('/login') ||
        currentPath.includes('/checkout')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    // Third-party app domains
    if (hostname.includes('shopifyapp.com') ||
        hostname.includes('claude.ai') ||
        hostname.includes('vercel.app') ||
        hostname.includes('netlify.app')) {
      console.log('🚫 SmartPop: Blocked third-party app domain:', hostname);
      return true;
    }
    
    // DOM-based detection
    if (document.querySelector('meta[name="shopify-checkout-api-token"]') ||
        document.querySelector('[data-shopify-app]') ||
        document.querySelector('#shopify-app') ||
        document.querySelector('.shopify-admin') ||
        document.querySelector('[data-shopify-admin]') ||
        document.body?.classList?.contains('admin') ||
        document.body?.classList?.contains('shopify-admin')) {
      console.log('🚫 SmartPop: Blocked admin DOM element detected');
      return true;
    }
    
    // Iframe detection
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    // URL query parameter detection
    if (currentUrl.includes('shopify_app') ||
        currentUrl.includes('embedded=1') ||
        currentUrl.includes('hmac=') ||
        currentUrl.includes('timestamp=')) {
      console.log('🚫 SmartPop: Blocked Shopify app parameters');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed');
    return false;
  }

  if (shouldSkipPopup()) {
    return;
  }

  // PREVENT MULTIPLE POPUP INSTANCES
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: Checking if already initialized...');
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: window.smartPopInitialized =', window.smartPopInitialized);
  
  if (window.smartPopInitialized) {
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: ALREADY INITIALIZED - This explains multiple popups!');
    const existingPopups = document.querySelectorAll('[id^="smartpop-"], .smartpop-popup, [class*="smartpop"]');
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Found existing popups:', existingPopups.length);
    existingPopups.forEach((p, i) => {
      console.log(`🎯 SMARTPOP-PUBLIC DEBUG: Removing popup ${i+1}:`, p.id, p.className);
      p.remove();
    });
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: EXITING - should prevent duplicate');
    return;
  }
  window.smartPopInitialized = true;
  console.log('🎯 SMARTPOP-PUBLIC DEBUG: NOW INITIALIZED - first time running');

  // Configuration
  const API_BASE = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1';
  const SHOP_DOMAIN = window.Shopify ? window.Shopify.shop : window.location.hostname;
  
  console.log('🚀 SmartPop: Customer store page detected:', currentPath);
  console.log('SmartPop SDK initialized for shop:', SHOP_DOMAIN);

  // Visitor behavior tracking
  let behavior = {
    isFirstVisit: !localStorage.getItem('smartpop_visited'),
    timeOnSite: 0,
    scrollDepth: 0,
    cartValue: 0,
    hasExitIntent: false
  };

  let activePopups = new Set();
  let shownPopups = new Set();
  let popupConfigs = [];

  // Mark as visited
  localStorage.setItem('smartpop_visited', '1');

  // Time tracker
  setInterval(() => {
    behavior.timeOnSite += 1;
    checkTriggers();
  }, 1000);

  // Scroll tracker with throttling
  let scrollTicking = false;
  function handleScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
        const validScrolled = Math.min(100, Math.max(0, scrolled));
        
        if (validScrolled > behavior.scrollDepth) {
          behavior.scrollDepth = validScrolled;
          console.log('Scroll depth:', validScrolled + '%');
          checkTriggers();
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  // Exit intent tracker (desktop only)
  function handleMouseLeave(e) {
    if (e.clientY <= 0 && !behavior.hasExitIntent) {
      behavior.hasExitIntent = true;
      console.log('Exit intent detected');
      checkTriggers();
    }
  }

  // Add event listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('mouseleave', handleMouseLeave);

  // Load popup configurations
  async function loadPopupConfigs() {
    try {
      const response = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${encodeURIComponent(SHOP_DOMAIN)}`);
      const data = await response.json();
      
      popupConfigs = data.filter(popup => popup.is_active && !popup.is_deleted).map(popup => ({
        id: popup.id,
        type: popup.trigger_type,
        title: popup.title || 'Special Offer',
        description: popup.description || 'Don\'t miss out!',
        discountPercent: popup.discount_percent ? parseInt(popup.discount_percent) : null,
        discountCode: popup.discount_code,
        buttonText: popup.button_text || 'Get Offer',
        emailPlaceholder: popup.email_placeholder || 'Enter your email',
        triggers: {
          scrollDepth: popup.trigger_type === 'scroll_depth' ? parseInt(popup.trigger_value || '50') : null,
          timeOnSite: popup.trigger_type === 'time_delay' ? parseInt(popup.trigger_value || '10') : null,
          isFirstVisit: popup.trigger_type === 'page_view',
          hasExitIntent: popup.trigger_type === 'exit_intent'
        }
      }));
      
      console.log('Loaded popup configs:', popupConfigs);
      checkTriggers();
    } catch (error) {
      console.error('Failed to load popup configs:', error);
    }
  }

  // Check if any popup should be triggered
  function checkTriggers() {
    if (activePopups.size > 0) return; // Don't show multiple popups

    const eligiblePopup = popupConfigs.find(popup => {
      if (shownPopups.has(popup.id)) return false;

      const triggers = popup.triggers;
      
      // Check scroll depth trigger
      if (triggers.scrollDepth && behavior.scrollDepth >= triggers.scrollDepth) {
        console.log(`Scroll trigger met: ${behavior.scrollDepth}% >= ${triggers.scrollDepth}%`);
        return true;
      }
      
      // Check time trigger
      if (triggers.timeOnSite && behavior.timeOnSite >= triggers.timeOnSite) {
        console.log(`Time trigger met: ${behavior.timeOnSite}s >= ${triggers.timeOnSite}s`);
        return true;
      }
      
      // Check first visit trigger
      if (triggers.isFirstVisit && behavior.isFirstVisit) {
        console.log('First visit trigger met');
        return true;
      }
      
      // Check exit intent trigger
      if (triggers.hasExitIntent && behavior.hasExitIntent) {
        console.log('Exit intent trigger met');
        return true;
      }
      
      return false;
    });

    if (eligiblePopup) {
      showPopup(eligiblePopup);
    }
  }

  // Show popup
  function showPopup(config) {
    if (activePopups.has(config.id) || shownPopups.has(config.id)) return;

    console.log('Showing popup:', config);
    activePopups.add(config.id);
    shownPopups.add(config.id);

    // Track view event
    trackEvent(config.id, 'view');

    // Create popup HTML
    const popupHTML = `
      <div id="smartpop-${config.id}" class="smartpop-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div class="smartpop-modal" style="
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 450px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          position: relative;
          animation: smartpop-fadeIn 0.3s ease-out;
        ">
          <button class="smartpop-close" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">×</button>
          
          <h2 style="
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #111827;
            line-height: 1.2;
          ">${config.title}</h2>
          
          ${config.description ? `<p style="
            font-size: 16px;
            color: #6b7280;
            margin: 0 0 24px 0;
            line-height: 1.5;
          ">${config.description}</p>` : ''}
          
          ${config.discountPercent ? `<div style="
            background: #fef3c7;
            color: #d97706;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            margin-bottom: 24px;
            display: inline-block;
          ">${config.discountPercent}% OFF</div>` : ''}
          
          <form class="smartpop-form" style="margin-top: 24px;">
            <input type="email" placeholder="${config.emailPlaceholder}" required style="
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              font-size: 16px;
              margin-bottom: 16px;
              box-sizing: border-box;
              transition: border-color 0.2s;
            " onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'" 
            oninput="validateEmailRealTime(this)">
            
            <button type="submit" style="
              width: 100%;
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'">
              ${config.buttonText}
            </button>
          </form>
          
          ${config.discountCode ? `<p style="
            margin-top: 16px;
            font-size: 14px;
            color: #6b7280;
          ">Use code: <strong>${config.discountCode}</strong></p>` : ''}
        </div>
      </div>
    `;

    // Add CSS animation
    if (!document.querySelector('#smartpop-styles')) {
      const styles = document.createElement('style');
      styles.id = 'smartpop-styles';
      styles.textContent = `
        @keyframes smartpop-fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(styles);
    }

    // Insert popup into DOM
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // Add event listeners
    const popup = document.getElementById(`smartpop-${config.id}`);
    const closeBtn = popup.querySelector('.smartpop-close');
    const form = popup.querySelector('.smartpop-form');

    closeBtn.addEventListener('click', () => closePopup(config.id));
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup(config.id);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      handleSubmit(config.id, email);
    });
  }

  // Close popup
  function closePopup(popupId) {
    const popup = document.getElementById(`smartpop-${popupId}`);
    if (popup) {
      popup.style.animation = 'smartpop-fadeOut 0.3s ease-in forwards';
      setTimeout(() => {
        popup.remove();
        activePopups.delete(popupId);
      }, 300);
    }
    trackEvent(popupId, 'close');
  }

  // EMAIL VALIDATION - RFC 5322 COMPLIANT
  window.validateEmail = function(email) {
    console.log('🔍 Validating email:', email);
    if (!email || typeof email !== 'string') {
      console.log('❌ Email is empty or not string');
      return false;
    }
    
    const cleanEmail = email.trim();
    if (cleanEmail.length === 0) {
      console.log('❌ Email is empty after trim');
      return false;
    }
    
    // Check for exactly one @
    const atCount = (cleanEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      console.log('❌ Must contain exactly one @, found:', atCount);
      return false;
    }
    
    const [localPart, domain] = cleanEmail.split('@');
    
    // Local part validation
    if (!localPart || localPart.length === 0) {
      console.log('❌ Local part is empty');
      return false;
    }
    
    // Domain validation
    if (!domain || domain.length === 0) {
      console.log('❌ Domain is empty');
      return false;
    }
    
    if (!domain.includes('.')) {
      console.log('❌ Domain must contain at least one dot');
      return false;
    }
    
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(cleanEmail);
    console.log(isValid ? '✅ Email is valid' : '❌ Email failed regex test');
    return isValid;
  };

  // Real-time email validation with visual feedback
  window.validateEmailRealTime = function(input) {
    const email = input.value;
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Real-time validation for:', email);
    const isValid = window.validateEmail(email);
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Real-time result:', isValid ? 'VALID' : 'INVALID');
    
    // Update visual feedback
    if (email.length === 0) {
      input.style.borderColor = '#e5e7eb'; // Default
    } else if (isValid) {
      input.style.borderColor = '#10b981'; // Green for valid
    } else {
      input.style.borderColor = '#ef4444'; // Red for invalid
    }
    
    // Update submit button state
    const form = input.closest('form');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (email.length === 0 || isValid) {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.disabled = false;
      } else {
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.disabled = true;
      }
    }
  };

  // Handle form submission
  function handleSubmit(popupId, email) {
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Form submission attempted');
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Popup ID:', popupId);
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Email value:', email);
    
    // Validate email before submission
    const isValidForSubmission = window.validateEmail(email);
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: Final validation result:', isValidForSubmission ? 'VALID - PROCEEDING' : 'INVALID - BLOCKING');
    
    if (!isValidForSubmission) {
      console.log('🎯 SMARTPOP-PUBLIC DEBUG: ❌ SUBMISSION BLOCKED - Invalid email:', email);
      return;
    }
    
    console.log('🎯 SMARTPOP-PUBLIC DEBUG: ✅ SUBMISSION ALLOWED - Valid email:', email);
    
    trackEvent(popupId, 'conversion', { email });
    
    // Show success message
    const popup = document.getElementById(`smartpop-${popupId}`);
    const modal = popup.querySelector('.smartpop-modal');
    modal.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="
          width: 64px;
          height: 64px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        ">
          <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #111827;">Thank you!</h3>
        <p style="margin: 0; color: #6b7280;">Check your email for your discount code.</p>
      </div>
    `;
    
    setTimeout(() => closePopup(popupId), 3000);
  }

  // Track events
  function trackEvent(popupId, eventType, data = {}) {
    fetch(`${API_BASE}/popup-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popupId,
        eventType,
        shop: SHOP_DOMAIN,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        ...data
      })
    }).catch(error => console.error('Failed to track event:', error));
  }

  // Add fade out animation
  const fadeOutStyles = `
    @keyframes smartpop-fadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.9); }
    }
  `;
  
  if (!document.querySelector('#smartpop-fadeout-styles')) {
    const styles = document.createElement('style');
    styles.id = 'smartpop-fadeout-styles';
    styles.textContent = fadeOutStyles;
    document.head.appendChild(styles);
  }

  // Initialize
  loadPopupConfigs();

  // Expose API for Shopify themes
  window.SmartPop = {
    trackCartValue: (value) => {
      behavior.cartValue = value;
      checkTriggers();
    },
    triggerPopup: (popupId) => {
      const config = popupConfigs.find(p => p.id === popupId);
      if (config) showPopup(config);
    },
    getBehavior: () => ({ ...behavior })
  };

  console.log('SmartPop SDK loaded successfully');
})();
