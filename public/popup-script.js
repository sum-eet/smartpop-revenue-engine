
(function() {
  'use strict';

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
      const response = await fetch(`${API_BASE}/popup-config?shop=${encodeURIComponent(SHOP_DOMAIN)}`);
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
            " onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
            
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

  // Handle form submission
  function handleSubmit(popupId, email) {
    console.log('Email submitted:', email);
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
