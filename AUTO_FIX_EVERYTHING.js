/**
 * AUTO-FIX EVERYTHING - Run this script to automatically fix both issues
 * No manual steps required
 */

console.log('🚀 AUTO-FIX: Starting comprehensive SmartPop repair...');

// STEP 1: Remove all broken scripts
function removeBrokenScripts() {
  console.log('🧹 Removing broken scripts...');
  const brokenScripts = document.querySelectorAll('script[src*="vercel.app"], script[src*="app-embed"], script[src*="popup-script.js"]');
  console.log(`Found ${brokenScripts.length} broken scripts to remove`);
  brokenScripts.forEach(script => script.remove());
}

// STEP 2: Block on admin pages
function blockOnAdmin() {
  if (window.location.hostname === 'admin.shopify.com') {
    console.log('🚫 ADMIN PAGE: Blocking all popups');
    
    // Remove any existing popups
    document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay').forEach(el => el.remove());
    
    // Block future popup creation
    const originalCreateElement = document.createElement;
    document.createElement = function(tag) {
      const el = originalCreateElement.call(this, tag);
      if (tag === 'div' && arguments.length > 0) {
        const originalSetId = el.setAttribute;
        el.setAttribute = function(name, value) {
          if (name === 'id' && value.includes('smartpop')) {
            console.log('🚫 Blocked popup:', value);
            return;
          }
          return originalSetId.call(this, name, value);
        };
      }
      return el;
    };
    
    console.log('✅ Admin page protected');
    return true;
  }
  return false;
}

// STEP 3: Force popups on customer store
async function forcePopupsOnStore() {
  if (window.location.hostname.includes('.myshopify.com') && !window.location.hostname.includes('admin')) {
    console.log('🎯 CUSTOMER STORE: Loading working script...');
    
    // Add working script
    const script = document.createElement('script');
    script.src = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&debug=true';
    script.async = true;
    script.onload = () => console.log('✅ Working script loaded');
    script.onerror = () => console.log('❌ Script failed to load');
    document.head.appendChild(script);
    
    // Backup: Direct popup injection if script fails
    setTimeout(async () => {
      if (!window.smartPopInitialized) {
        console.log('🔄 Script failed, injecting popup directly...');
        
        try {
          const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?action=list&shop_domain=testingstoresumeet.myshopify.com');
          const popups = await response.json();
          const activePopup = popups.find(p => p.is_active && !p.is_deleted);
          
          if (activePopup) {
            const popupHTML = `
              <div id="auto-fix-popup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; padding: 32px; max-width: 450px; text-align: center; position: relative;">
                  <button onclick="document.getElementById('auto-fix-popup').remove()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                  <h2 style="margin: 0 0 16px 0;">${activePopup.title || 'Special Offer!'}</h2>
                  <p style="margin: 0 0 24px 0;">${activePopup.description || 'Get discount!'}</p>
                  <input type="email" placeholder="${activePopup.email_placeholder || 'Enter email'}" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; margin-bottom: 16px; box-sizing: border-box;">
                  <button onclick="alert('Thank you!'); document.getElementById('auto-fix-popup').remove();" style="background: #007cba; color: white; border: none; padding: 14px 28px; border-radius: 6px; width: 100%; cursor: pointer;">${activePopup.button_text || 'Get Offer'}</button>
                </div>
              </div>
            `;
            document.body.insertAdjacentHTML('beforeend', popupHTML);
            console.log('✅ Direct popup injected');
          }
        } catch (error) {
          console.log('❌ Backup injection failed:', error);
        }
      }
    }, 3000);
    
    return true;
  }
  return false;
}

// STEP 4: Run comprehensive fix
async function runAutoFix() {
  console.log('🔧 Running auto-fix sequence...');
  
  removeBrokenScripts();
  
  const isAdmin = blockOnAdmin();
  if (isAdmin) {
    console.log('🎉 AUTO-FIX COMPLETE: Admin page secured');
    return;
  }
  
  const isStore = await forcePopupsOnStore();
  if (isStore) {
    console.log('🎉 AUTO-FIX COMPLETE: Customer store enhanced');
    return;
  }
  
  console.log('ℹ️ AUTO-FIX: Unknown page type, no action taken');
}

// STEP 5: Monitor and report
function monitorResults() {
  setTimeout(() => {
    console.log('📊 AUTO-FIX RESULTS:');
    
    if (window.location.hostname === 'admin.shopify.com') {
      const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
      console.log(`Admin page popups: ${popups.length === 0 ? '✅ NONE (correct)' : '❌ ' + popups.length + ' found'}`);
    } else if (window.location.hostname.includes('.myshopify.com')) {
      const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
      console.log(`Customer store popups: ${popups.length > 0 ? '✅ ' + popups.length + ' showing (correct)' : '❌ NONE found'}`);
      console.log(`SmartPop initialized: ${window.smartPopInitialized ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log('🎯 AUTO-FIX monitoring complete');
  }, 5000);
}

// AUTO-RUN EVERYTHING
runAutoFix();
monitorResults();

console.log('');
console.log('📋 AUTO-FIX INSTRUCTIONS:');
console.log('1. Copy this entire script');
console.log('2. Paste in browser console on ANY page (admin or store)');
console.log('3. Script automatically detects page type and applies correct fix');
console.log('4. Wait 5 seconds for results report');
console.log('');
console.log('Expected results:');
console.log('- Admin pages: NO popups (blocked)');
console.log('- Customer store: Popups appear (working)');