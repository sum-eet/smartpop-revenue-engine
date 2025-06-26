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
      const response = await fetch(`${SMARTPOP_API_BASE}/popup-config?shop=${shopDomain}`);
      if (response.ok) {
        popupConfigs = await response.json();
        initializePopups();
      }
    } catch (error) {
      console.error('SmartPop: Error fetching popup configs:', error);
    }
  }

  // Initialize popup monitoring
  function initializePopups() {
    popupConfigs.forEach(config => {
      if (!config.isActive) return;
      
      // Check if popup should be shown on current page
      if (!shouldShowOnCurrentPage(config.pageTarget)) return;
      
      // Set up triggers based on popup configuration
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
    switch (config.triggerType) {
      case 'time_delay':
        setTimeout(() => {
          showPopup(config);
        }, parseInt(config.triggerValue) * 1000);
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
    
    shownPopups.add(config.id);
    
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
    closeBtn.onclick = () => overlay.remove();

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
        overlay.remove();
      };
      
      popup.appendChild(button);
    }

    popup.appendChild(closeBtn);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
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
    switch (config.popupType) {
      case 'email_capture':
        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
          // Here you would typically send the email to your backend
          console.log('Email captured:', emailInput.value);
        }
        break;
      
      case 'discount_offer':
        if (config.discountCode) {
          // Copy discount code to clipboard
          navigator.clipboard.writeText(config.discountCode).then(() => {
            alert('Discount code copied to clipboard!');
          });
        }
        break;
    }
  }

  // Track popup events
  async function trackPopupEvent(popupId, eventType) {
    try {
      await fetch(`${SMARTPOP_API_BASE}/popup-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          popupId,
          eventType,
          shop: shopDomain,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href
        })
      });
    } catch (error) {
      console.error('SmartPop: Error tracking event:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPopupConfigs);
  } else {
    fetchPopupConfigs();
  }
})();