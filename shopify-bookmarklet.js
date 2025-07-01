// SmartPop Bookmarklet - Drag this to your bookmarks bar and click on any page to test
javascript:(function(){
  if(window.smartPopInitialized){alert('SmartPop already loaded!');return;}
  var script=document.createElement('script');
  script.onload=function(){alert('SmartPop loaded! Scroll to test popups or run testSmartPop() in console.');};
  script.onerror=function(){alert('Failed to load SmartPop script.');};
  script.src='data:text/javascript,' + encodeURIComponent(`
/**
 * SmartPop Instant Test - Bookmarklet Version
 */
(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  console.log('🚀 SmartPop BOOKMARKLET initializing...');

  const SMARTPOP_CONFIG = {
    shop: window.location.hostname,
    debug: true,
    trackingInterval: 1000,
    sessionId: 'bookmarklet_' + Date.now()
  };

  const ACTIVE_POPUPS = [
    {
      id: 'bookmarklet-25',
      name: 'Bookmarklet 25% Test',
      title: "Bookmarklet Test Popup!",
      description: 'This popup was triggered by the SmartPop bookmarklet at 25% scroll',
      trigger_type: 'scroll_depth',
      trigger_value: '25',
      page_target: 'homepage',
      popup_type: 'discount_offer',
      button_text: 'Test Success!',
      email_placeholder: 'test@example.com',
      discount_code: 'BOOKMARKLET25',
      discount_percent: '25',
      is_active: true
    },
    {
      id: 'bookmarklet-50',
      name: 'Bookmarklet 50% Test',
      title: "Half Way There!",
      description: 'You have scrolled 50% of the page - this popup proves the tracking works!',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'all_pages',
      popup_type: 'discount_offer',
      button_text: 'Amazing!',
      email_placeholder: 'your@email.com',
      discount_code: 'SCROLL50',
      discount_percent: '50',
      is_active: true
    }
  ];

  class BookmarkletTracker {
    constructor() {
      this.config = SMARTPOP_CONFIG;
      this.popups = ACTIVE_POPUPS;
      this.maxScrollReached = 0;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      
      this.addDebugPanel();
      this.startTracking();
    }

    addDebugPanel() {
      const panel = document.createElement('div');
      panel.id = 'smartpop-bookmarklet-debug';
      panel.style.cssText = \`
        position: fixed;
        top: 10px;
        right: 10px;
        background: #28a745;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
      \`;
      panel.innerHTML = \`
        <div><strong>📚 SmartPop Bookmarklet</strong></div>
        <div id="bookmarklet-scroll">Scroll: 0%</div>
        <div id="bookmarklet-status">Ready to track...</div>
        <button onclick="this.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-top: 10px;
        ">Close</button>
      \`;
      document.body.appendChild(panel);
    }

    updateDebugPanel(scrollPercent, status) {
      const scrollEl = document.getElementById('bookmarklet-scroll');
      const statusEl = document.getElementById('bookmarklet-status');
      
      if (scrollEl) scrollEl.textContent = \`Scroll: \${scrollPercent}% (Max: \${this.maxScrollReached}%)\`;
      if (statusEl) statusEl.textContent = status || 'Tracking...';
    }

    startTracking() {
      console.log('📈 Bookmarklet tracking started');
      
      this.trackScroll();
      
      setInterval(() => this.trackScroll(), this.config.trackingInterval);
      
      window.addEventListener('scroll', () => {
        setTimeout(() => this.trackScroll(), 100);
      }, { passive: true });
    }

    trackScroll() {
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
      
      this.updateDebugPanel(this.currentScrollPercent, \`Page: \${this.getPageTarget()}\`);
      
      // Check popups
      for (const popup of this.popups) {
        if (popup.trigger_type === 'scroll_depth' && 
            popup.is_active && 
            !this.shownPopups.has(popup.id)) {
          
          const triggerPercent = parseInt(popup.trigger_value);
          
          if (this.currentScrollPercent >= triggerPercent) {
            console.log(\`🎯 Bookmarklet popup triggered: \${popup.name} at \${this.currentScrollPercent}%\`);
            this.showPopup(popup);
            this.shownPopups.add(popup.id);
            this.updateDebugPanel(this.currentScrollPercent, \`Popup: \${popup.name}\`);
            break;
          }
        }
      }
    }

    getPageTarget() {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'homepage';
      return 'other_page';
    }

    showPopup(popup) {
      const overlay = document.createElement('div');
      overlay.id = \`popup-\${popup.id}\`;
      overlay.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 999998;
        display: flex;
        justify-content: center;
        align-items: center;
      \`;
      
      overlay.innerHTML = \`
        <div style="
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        ">
          <h2 style="margin: 0 0 15px 0; color: #333;">\${popup.title}</h2>
          <p style="margin: 0 0 20px 0; color: #666;">\${popup.description}</p>
          <div style="margin: 20px 0;">
            <input type="email" placeholder="\${popup.email_placeholder}" 
                   id="popup-email-\${popup.id}"
                   style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 15px; box-sizing: border-box;">
          </div>
          <button onclick="alert('Email: ' + document.getElementById('popup-email-\${popup.id}').value + ' - Code: \${popup.discount_code}'); this.closest('[id^=popup-]').remove();" 
                  style="background: #007cba; color: white; border: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; width: 100%;">
            \${popup.button_text}
          </button>
          <div style="margin-top: 15px; padding: 12px; background: #f0f8f0; border-radius: 6px;">
            <strong>Code: \${popup.discount_code}</strong><br>
            <small>Save \${popup.discount_percent}% off!</small>
          </div>
          <button onclick="this.closest('[id^=popup-]').remove();" 
                  style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
      \`;
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
      
      document.body.appendChild(overlay);
    }
  }

  // Initialize
  window.smartPopBookmarklet = new BookmarkletTracker();
  window.testBookmarkletPopup = () => {
    const popup = window.smartPopBookmarklet.popups[0];
    window.smartPopBookmarklet.showPopup(popup);
  };
  
  console.log('🎯 SmartPop Bookmarklet loaded!');
  console.log('🧪 Test: testBookmarkletPopup()');
  
})();
`);
  document.head.appendChild(script);
})();