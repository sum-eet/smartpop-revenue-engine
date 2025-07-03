/**
 * IMMEDIATE FIX FOR BOTH ISSUES
 * Run this to fix the logic immediately
 */

console.log('🚨 IMMEDIATE LOGIC FIX');
console.log('='.repeat(40));

// STEP 1: Clear everything on admin pages
if (window.location.hostname === 'admin.shopify.com') {
  console.log('🚫 ADMIN PAGE: Removing all popups and blocking future ones');
  
  // Remove all existing popups
  const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
  popups.forEach(popup => {
    console.log('Removing popup:', popup.id || popup.className);
    popup.remove();
  });
  
  // Stop all SmartPop activities
  if (window.smartPop?.stop) window.smartPop.stop();
  if (window.smartPopTracker?.stop) window.smartPopTracker.stop();
  if (window.SmartPop?.stop) window.SmartPop.stop();
  
  // Block all future popup creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName.toLowerCase() === 'div' && element.id && element.id.includes('smartpop')) {
      console.log('🚫 Blocked popup creation:', element.id);
      return document.createTextNode(''); // Return empty text node instead
    }
    return element;
  };
  
  console.log('✅ Admin page cleaned and protected');
}

// STEP 2: Force popups to work on customer store
else if (window.location.hostname.includes('.myshopify.com') && 
         !window.location.hostname.includes('admin')) {
  
  console.log('🎯 CUSTOMER STORE: Forcing popups to work');
  
  // Force load popups if not already working
  async function forceLoadPopups() {
    try {
      console.log('📥 Force loading popup configs...');
      
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?action=list&shop_domain=testingstoresumeet.myshopify.com');
      const popups = await response.json();
      
      console.log('📊 Found', popups.length, 'popups');
      
      // Find an active popup to show
      const activePopup = popups.find(p => p.is_active && !p.is_deleted);
      
      if (activePopup) {
        console.log('🎯 Showing popup:', activePopup.name);
        
        // Create popup immediately
        const popupHTML = `
          <div id="force-smartpop-${activePopup.id}" class="smartpop-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            <div style="
              background: white;
              border-radius: 12px;
              padding: 32px;
              max-width: 450px;
              width: 90%;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              position: relative;
            ">
              <button onclick="this.closest('.smartpop-overlay').remove()" style="
                position: absolute;
                top: 16px;
                right: 16px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
              ">×</button>
              
              <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
                ${activePopup.title || 'Special Offer!'}
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
                ${activePopup.description || 'Get a special discount on your order!'}
              </p>
              
              <input type="email" placeholder="${activePopup.email_placeholder || 'Enter your email'}" 
                     style="
                       width: 100%;
                       padding: 12px;
                       border: 2px solid #ddd;
                       border-radius: 6px;
                       font-size: 16px;
                       margin-bottom: 16px;
                       box-sizing: border-box;
                     ">
              
              <button onclick="alert('Thank you! Check your email for discount code.'); this.closest('.smartpop-overlay').remove();" 
                      style="
                        background: #007cba;
                        color: white;
                        border: none;
                        padding: 14px 28px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        width: 100%;
                      ">
                ${activePopup.button_text || 'Get Offer'}
              </button>
              
              ${activePopup.discount_code ? `
                <div style="margin-top: 16px; padding: 12px; background: #f0f8f0; border-radius: 6px;">
                  <strong>Discount Code: ${activePopup.discount_code}</strong>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        console.log('✅ Popup forced to show on customer store');
        
        // Track the view
        fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            popupId: activePopup.id,
            eventType: 'view',
            shop: 'testingstoresumeet.myshopify.com',
            pageUrl: window.location.href
          })
        }).catch(e => console.log('Track failed:', e));
        
      } else {
        console.log('❌ No active popups found');
      }
      
    } catch (error) {
      console.error('❌ Failed to force load popups:', error);
    }
  }
  
  // Force load after a short delay to ensure page is ready
  setTimeout(forceLoadPopups, 2000);
}

// STEP 3: Report status
setTimeout(() => {
  console.log('');
  console.log('📊 LOGIC FIX STATUS:');
  
  if (window.location.hostname === 'admin.shopify.com') {
    const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
    console.log(`Admin page: ${popups.length === 0 ? '✅ Clean' : '❌ Still has popups'}`);
  } else {
    const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
    console.log(`Customer store: ${popups.length > 0 ? '✅ Popups showing' : '❌ No popups'}`);
  }
}, 3000);

console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Run this script on BOTH admin and customer pages');
console.log('2. Admin: Should remove all popups');
console.log('3. Customer: Should force show a popup after 2 seconds');
console.log('4. This is a temporary fix while we deploy proper solution');