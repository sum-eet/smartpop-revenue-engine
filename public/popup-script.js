(function() {
  'use strict';
  
  // SmartPop Popup Runtime Script
  const SMARTPOP_API_BASE = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1';
  
  // Get shop domain from current URL
  const shopDomain = window.location.hostname;
  
  // Global state
  let popupConfigs = [];
  let shownPopups = new Set();
  let sessionData = {
    pageViews: parseInt(localStorage.getItem('smartpop_page_views') || '0'),
    timeOnPage: 0,
    scrollDepth: 0
  };

  // Update page views
  sessionData.pageViews++;
  localStorage.setItem('smartpop_page_views', sessionData.pageViews.toString());

  // Track time on page
  let startTime = Date.now();
  setInterval(() => {
    sessionData.timeOnPage = Math.floor((Date.now() - startTime) / 1000);
  }, 1000);

  // Track scroll depth
  function updateScrollDepth() {
    const scrolled = window.scrollY;
    const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
    sessionData.scrollDepth = Math.floor((scrolled / maxHeight) * 100);
  }
  window.addEventListener('scroll', updateScrollDepth);

  // Track exit intent
  let exitIntentTriggered = false;
  function handleMouseLeave(e) {
    if (!exitIntentTriggered && e.clientY <= 0) {
      exitIntentTriggered = true;
      checkTriggers('exit_intent');
    }
  }
  document.addEventListener('mouseleave', handleMouseLeave);

  // Fetch popup configurations for this shop
  async function fetchPopupConfigs() {
    try {
      console.log('SmartPop: Fetching configs for shop:', shopDomain);
      const response = await fetch(`${SMARTPOP_API_BASE}/popup-config?shop=${shopDomain}`);
      console.log('SmartPop: API response status:', response.status);
      if (response.ok) {
        popupConfigs = await response.json();
        console.log('SmartPop: Found', popupConfigs.length, 'popup configs');
        console.log('SmartPop: First popup:', popupConfigs[0]);
        initializePopups();
      }
    } catch (error) {
      console.error('SmartPop: Error fetching popup configs:', error);
    }
  }

  // Initialize popup monitoring
  function initializePopups() {
    console.log('SmartPop: Initializing popups...');
    
    // Get client-side deleted popups
    const deletedPopups = JSON.parse(localStorage.getItem('smartpop_deleted_popups') || '[]');
    
    popupConfigs.forEach(config => {
      console.log('SmartPop: Processing popup:', config.name, 'Active:', config.is_active);
      if (!config.is_active) return;
      
      // Skip if popup is marked as deleted client-side
      if (deletedPopups.includes(config.id)) {
        console.log('SmartPop: Skipping deleted popup:', config.name);
        return;
      }
      
      // Check if popup should be shown on current page
      console.log('SmartPop: Checking page target:', config.page_target);
      if (!shouldShowOnCurrentPage(config.page_target)) return;
      
      // Set up triggers based on popup configuration
      console.log('SmartPop: Setting up trigger for:', config.name);
      setupTrigger(config);
    });
  }

  // Check if popup should show on current page
  function shouldShowOnCurrentPage(pageTarget) {
    const currentPath = window.location.pathname;
    
    switch (pageTarget) {
      case 'homepage':
        return currentPath === '/' || currentPath === '';
      case 'product_pages':
        return currentPath.includes('/products/');
      case 'collection_pages':
        return currentPath.includes('/collections/');
      case 'blog_pages':
        return currentPath.includes('/blogs/');
      case 'cart_page':
        return currentPath.includes('/cart');
      case 'checkout_page':
        return currentPath.includes('/checkout');
      case 'all_pages':
      default:
        return true;
    }
  }

  // Set up trigger monitoring for popup
  function setupTrigger(config) {
    console.log('SmartPop: Setup trigger type:', config.trigger_type, 'value:', config.trigger_value);
    switch (config.trigger_type) {
      case 'time_delay':
        const delay = parseInt(config.trigger_value) * 1000;
        console.log('SmartPop: Setting up time delay:', delay, 'ms');
        setTimeout(() => {
          console.log('SmartPop: Time delay triggered, showing popup');
          showPopup(config);
        }, delay);
        break;
        
      case 'scroll_depth':
        const targetDepth = parseInt(config.triggerValue);
        const scrollCheck = setInterval(() => {
          if (sessionData.scrollDepth >= targetDepth) {
            clearInterval(scrollCheck);
            showPopup(config);
          }
        }, 500);
        break;
        
      case 'page_view':
        if (sessionData.pageViews >= parseInt(config.triggerValue)) {
          showPopup(config);
        }
        break;
        
      case 'exit_intent':
        // Exit intent is handled globally
        break;
        
      case 'click':
        // For now, we'll trigger on any button click
        document.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
            showPopup(config);
          }
        }, { once: true });
        break;
    }
  }

  // Check triggers (used for exit intent)
  function checkTriggers(triggerType) {
    popupConfigs.forEach(config => {
      if (config.triggerType === triggerType && !shownPopups.has(config.id)) {
        if (shouldShowOnCurrentPage(config.pageTarget)) {
          showPopup(config);
        }
      }
    });
  }

  // Show popup
  function showPopup(config) {
    if (shownPopups.has(config.id)) return;
    
    console.log('SmartPop: Showing popup:', config.name);
    shownPopups.add(config.id);
    
    // Track popup view immediately
    trackPopupEvent(config.id, 'view');
    
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create popup content
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      position: relative;
      text-align: center;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      line-height: 1;
    `;
    closeBtn.onclick = () => {
      trackPopupEvent(config.id, 'close');
      overlay.remove();
    };

    // Title
    if (config.title) {
      const title = document.createElement('h3');
      title.textContent = config.title;
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: bold;
        color: #111;
      `;
      popup.appendChild(title);
    }

    // Description
    if (config.description) {
      const desc = document.createElement('p');
      desc.textContent = config.description;
      desc.style.cssText = `
        margin: 0 0 20px 0;
        color: #666;
        line-height: 1.5;
      `;
      popup.appendChild(desc);
    }

    // Content based on popup type
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'margin-bottom: 20px;';

    switch (config.popupType) {
      case 'email_capture':
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = config.emailPlaceholder || 'Enter your email';
        emailInput.style.cssText = `
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 14px;
        `;
        contentDiv.appendChild(emailInput);
        break;

      case 'discount_offer':
        if (config.discountCode) {
          const codeDiv = document.createElement('div');
          codeDiv.style.cssText = `
            background: #f0fdf4;
            border: 2px solid #bbf7d0;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 12px;
          `;
          
          const codeText = document.createElement('div');
          codeText.textContent = config.discountCode;
          codeText.style.cssText = `
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            color: #166534;
          `;
          
          if (config.discountPercent) {
            const percentText = document.createElement('div');
            percentText.textContent = `${config.discountPercent}% OFF`;
            percentText.style.cssText = `
              color: #16a34a;
              font-size: 12px;
              margin-top: 4px;
            `;
            codeDiv.appendChild(percentText);
          }
          
          codeDiv.appendChild(codeText);
          contentDiv.appendChild(codeDiv);
        }
        break;

      case 'survey':
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Your feedback...';
        textarea.rows = 3;
        textarea.style.cssText = `
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 14px;
          resize: vertical;
        `;
        contentDiv.appendChild(textarea);
        break;
    }

    popup.appendChild(contentDiv);

    // Action button
    if (config.buttonText) {
      const button = document.createElement('button');
      button.textContent = config.buttonText;
      button.style.cssText = `
        width: 100%;
        padding: 12px 24px;
        background: ${getButtonColor(config.popupType)};
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      
      button.onclick = () => {
        handlePopupAction(config);
        trackPopupEvent(config.id, 'close');
        overlay.remove();
      };
      
      popup.appendChild(button);
    }

    popup.appendChild(closeBtn);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        trackPopupEvent(config.id, 'close');
        overlay.remove();
      }
    };

    // Track popup view
    trackPopupEvent(config.id, 'view');
  }

  function getButtonColor(popupType) {
    switch (popupType) {
      case 'email_capture': return '#2563eb';
      case 'discount_offer': return '#16a34a';
      case 'announcement': return '#9333ea';
      case 'survey': return '#ea580c';
      default: return '#2563eb';
    }
  }

  function handlePopupAction(config) {
    // Track conversion
    trackPopupEvent(config.id, 'conversion');
    
    // Handle specific actions based on popup type
    switch (config.popup_type) {
      case 'email_capture':
        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
          // Track email capture with the email
          trackPopupEvent(config.id, 'conversion', emailInput.value);
          console.log('Email captured:', emailInput.value);
        }
        break;
      
      case 'discount_offer':
        if (config.discount_code) {
          // Track discount code usage
          trackPopupEvent(config.id, 'conversion', null, config.discount_code);
          // Copy discount code to clipboard
          navigator.clipboard.writeText(config.discount_code).then(() => {
            alert('Discount code copied to clipboard!');
          });
        }
        break;
      
      case 'survey':
        const textarea = document.querySelector('textarea');
        if (textarea && textarea.value) {
          console.log('Survey response:', textarea.value);
        }
        break;
        
      case 'announcement':
        // Just track the conversion for announcements
        console.log('Announcement clicked');
        break;
    }
  }

  // Track popup events
  async function trackPopupEvent(popupId, eventType, email = null, discountCode = null) {
    try {
      const eventData = {
        popupId,
        eventType,
        shop: shopDomain,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href
      };
      
      if (email) eventData.email = email;
      if (discountCode) eventData.discountCode = discountCode;
      
      console.log('SmartPop: Tracking event:', eventType, 'for popup:', popupId);
      
      await fetch(`${SMARTPOP_API_BASE}/popup-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });
    } catch (error) {
      console.error('SmartPop: Error tracking event:', error);
    }
  }

  // Initialize when DOM is ready
  console.log('SmartPop: Script loaded, DOM state:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('SmartPop: Waiting for DOM ready...');
    document.addEventListener('DOMContentLoaded', fetchPopupConfigs);
  } else {
    console.log('SmartPop: DOM ready, fetching configs...');
    fetchPopupConfigs();
  }
})();