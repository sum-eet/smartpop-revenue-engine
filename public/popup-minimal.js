// Ultra-minimal popup SDK - Pure JavaScript, no frameworks
// Target: <5KB for customer stores

(function() {
  'use strict';

  // Config
  const API = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1';
  
  // Skip admin context
  const h = location.hostname, p = location.pathname;
  if (h === 'admin.shopify.com' || p.includes('/admin') || p.includes('/apps') || 
      p.includes('/install') || p.includes('/auth') || window !== top) return;

  // State
  let campaigns = [];
  let activePopup = null;
  let sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  let behavior = {
    isFirstVisit: !localStorage.getItem('smartpop_visited'),
    timeOnSite: 0,
    scrollDepth: 0,
    hasExitIntent: false
  };

  // Load campaigns
  async function load() {
    try {
      const r = await fetch(`${API}/popup-config?shop=${h}`);
      campaigns = (await r.json()).campaigns || [];
    } catch (e) {}
  }

  function track() {
    localStorage.setItem('smartpop_visited', '1');
    setInterval(() => behavior.timeOnSite++, 1000);
    let t = false;
    addEventListener('scroll', () => {
      if (!t) {
        requestAnimationFrame(() => {
          behavior.scrollDepth = Math.max(behavior.scrollDepth, (scrollY / (document.body.scrollHeight - innerHeight)) * 100 || 0);
          t = false;
        });
        t = true;
      }
    }, { passive: true });
    document.addEventListener('mouseleave', e => e.clientY <= 0 && (behavior.hasExitIntent = true));
  }

  function check() {
    if (activePopup || !campaigns.length) return;
    const c = campaigns.find(c => {
      const t = c.triggers;
      return !(t.isFirstVisit && !behavior.isFirstVisit) && 
             !(t.timeOnSite && behavior.timeOnSite < t.timeOnSite) &&
             !(t.scrollDepth && behavior.scrollDepth < t.scrollDepth) &&
             !(t.hasExitIntent && !behavior.hasExitIntent);
    });
    c && show(c);
  }

  function show(c) {
    activePopup = c;
    track2('view', { campaignId: c.id });
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const popup = document.createElement('div');
    popup.style.cssText = `
      position: relative;
      max-width: 400px;
      padding: 24px;
      border-radius: 12px;
      background: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
      animation: smartpop-slide 0.3s ease-out;
    `;

    popup.innerHTML = `
      <style>
        @keyframes smartpop-slide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <button style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; opacity: 0.6;">&times;</button>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">${campaign.title}</h2>
        <p style="opacity: 0.8; margin: 0 0 16px 0;">${campaign.subtitle || ''}</p>
        
        ${campaign.discount_percent ? `
          <div style="background: #10b981; color: white; border-radius: 20px; padding: 8px 16px; display: inline-block; margin-bottom: 16px;">
            <span style="font-weight: 600;">${campaign.discount_percent}% OFF</span>
          </div>
        ` : ''}
      </div>
      
      <form style="display: flex; flex-direction: column; gap: 12px;">
        <input type="email" placeholder="Enter your email" required style="padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box;">
        <button type="submit" style="background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%;">
          Get Discount
        </button>
      </form>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add event listeners
    const closeBtn = popup.querySelector('button');
    const form = popup.querySelector('form');
    
    function closePopup() {
      overlay.remove();
      activePopup = null;
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input').value;
      
      if (email) {
        await trackEvent('conversion', {
          campaignId: campaign.id,
          email: email,
          discountCode: campaign.discount_code
        });
        
        showSuccess(popup, campaign);
      }
    });
  }

  // Show success message
  function showSuccess(popup, campaign) {
    popup.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span style="color: white; font-size: 24px;">✓</span>
        </div>
        <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">Thank You!</h3>
        ${campaign.discount_code ? `
          <p style="margin: 0 0 16px 0;">Your discount code:</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">
            ${campaign.discount_code}
          </div>
          <p style="font-size: 14px; opacity: 0.8; margin: 0;">Code copied to clipboard!</p>
        ` : ''}
      </div>
    `;
    
    // Copy code to clipboard
    if (campaign.discount_code && navigator.clipboard) {
      navigator.clipboard.writeText(campaign.discount_code);
    }
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      popup.closest('div').remove();
      activePopup = null;
    }, 3000);
  }

  // Track events
  async function trackEvent(event, data) {
    try {
      await fetch(`${API_URL}/popup-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: window.location.hostname,
          event,
          sessionId,
          pageUrl: window.location.href,
          ...data
        })
      });
    } catch (error) {
      console.error('SmartPop: Failed to track event', error);
    }
  }

  // Initialize
  async function init() {
    console.log('🚀 SmartPop: Initializing customer popup...');
    
    await loadCampaigns();
    startTracking();
    
    // Check triggers every second
    setInterval(checkTriggers, 1000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();