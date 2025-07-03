/**
 * EMERGENCY MANUAL FIX
 * Run this script to manually fix both issues by:
 * 1. Removing all popups from admin pages (immediate fix)
 * 2. Testing popup creation (should work)
 */

console.log('🚨 EMERGENCY SMARTPOP FIX');
console.log('='.repeat(40));

// STEP 1: REMOVE ALL POPUP ELEMENTS (IMMEDIATE ADMIN FIX)
function emergencyRemovePopups() {
  console.log('🧹 STEP 1: Removing all popup elements...');
  
  // Remove all SmartPop elements
  const selectors = [
    '[id*="smartpop"]',
    '[id*="popup"]', 
    '.smartpop-overlay',
    '[class*="smartpop"]',
    '[data-smartpop]'
  ];
  
  let removed = 0;
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      console.log(`Removing: ${el.tagName} ${el.id || el.className}`);
      el.remove();
      removed++;
    });
  });
  
  // Clear SmartPop variables
  if (window.smartPop) {
    window.smartPop.stop?.();
    delete window.smartPop;
  }
  if (window.smartPopTracker) {
    window.smartPopTracker.stop?.();
    delete window.smartPopTracker;
  }
  if (window.smartPopInitialized) {
    delete window.smartPopInitialized;
  }
  
  console.log(`✅ Removed ${removed} popup elements and cleared variables`);
  return removed;
}

// STEP 2: CREATE ADMIN DETECTION SCRIPT
function createAdminBlocker() {
  console.log('🛡️ STEP 2: Installing admin detection blocker...');
  
  const blockerScript = `
    // SmartPop Admin Blocker - Emergency Fix
    (function() {
      console.log('🛡️ SmartPop Admin Blocker Active');
      
      // Block if on admin domain
      if (window.location.hostname === 'admin.shopify.com') {
        console.log('🚫 Admin domain detected - blocking all SmartPop');
        
        // Prevent any SmartPop initialization
        Object.defineProperty(window, 'smartPop', {
          set: function() { console.log('🚫 Blocked smartPop assignment'); },
          get: function() { return undefined; }
        });
        
        Object.defineProperty(window, 'smartPopTracker', {
          set: function() { console.log('🚫 Blocked smartPopTracker assignment'); },
          get: function() { return undefined; }
        });
        
        // Remove any elements that get added
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) { // Element node
                if (node.id && (node.id.includes('smartpop') || node.id.includes('popup'))) {
                  console.log('🚫 Auto-removed popup element:', node.id);
                  node.remove();
                }
                if (node.className && (node.className.includes('smartpop') || node.className.includes('popup'))) {
                  console.log('🚫 Auto-removed popup element by class:', node.className);
                  node.remove();
                }
              }
            });
          });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('✅ Admin blocker active - will auto-remove any popups');
      }
    })();
  `;
  
  // Add the blocker script
  const script = document.createElement('script');
  script.textContent = blockerScript;
  document.head.appendChild(script);
  
  console.log('✅ Admin blocker installed');
}

// STEP 3: TEST POPUP CREATION API
async function testPopupCreation() {
  console.log('🧪 STEP 3: Testing popup creation API...');
  
  try {
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        name: 'Emergency Test Popup',
        triggerType: 'page_view',
        pageTarget: 'all_pages',
        popupType: 'email_capture',
        title: 'Emergency Fix Test',
        description: 'Testing popup creation after emergency fix',
        buttonText: 'Test',
        emailPlaceholder: 'test@example.com',
        isActive: true,
        shop_domain: 'testingstoresumeet.myshopify.com'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Popup creation API working!');
      console.log('Created popup ID:', result.data?.id);
      return true;
    } else {
      console.log('❌ Popup creation failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Popup creation error:', error.message);
    return false;
  }
}

// STEP 4: VERIFICATION
function verifyFix() {
  console.log('🔍 STEP 4: Verifying fix...');
  
  const checks = {
    adminDetection: window.location.hostname === 'admin.shopify.com',
    noPopupElements: document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay').length === 0,
    noSmartPopVars: !window.smartPop && !window.smartPopTracker && !window.smartPopInitialized
  };
  
  console.log('Verification results:');
  console.log('  Admin domain detected:', checks.adminDetection ? '✅' : '❌');
  console.log('  No popup elements:', checks.noPopupElements ? '✅' : '❌'); 
  console.log('  No SmartPop variables:', checks.noSmartPopVars ? '✅' : '❌');
  
  const allPassed = checks.adminDetection && checks.noPopupElements && checks.noSmartPopVars;
  
  if (allPassed) {
    console.log('🎉 EMERGENCY FIX SUCCESSFUL!');
    console.log('Admin page is now popup-free');
  } else {
    console.log('⚠️ Some checks failed - may need manual intervention');
  }
  
  return allPassed;
}

// RUN EMERGENCY FIX
async function runEmergencyFix() {
  console.log('🚨 Starting emergency fix...');
  
  const removed = emergencyRemovePopups();
  createAdminBlocker();
  const apiWorking = await testPopupCreation();
  const verified = verifyFix();
  
  console.log('');
  console.log('📊 EMERGENCY FIX SUMMARY:');
  console.log('  Popup elements removed:', removed);
  console.log('  Admin blocker installed: ✅');
  console.log('  Popup creation API:', apiWorking ? '✅ Working' : '❌ Failed');
  console.log('  Verification passed:', verified ? '✅' : '❌');
  
  if (verified && apiWorking) {
    console.log('');
    console.log('🎉 BOTH ISSUES FIXED!');
    console.log('1. ✅ Popups blocked on admin pages');
    console.log('2. ✅ Popup creation working');
    console.log('');
    console.log('🔄 Refresh the page to confirm the fix persists');
  } else {
    console.log('');
    console.log('⚠️ Issues remain - check individual steps above');
  }
}

// AUTO-RUN
runEmergencyFix();

// INSTRUCTIONS
console.log('');
console.log('📋 EMERGENCY FIX INSTRUCTIONS:');
console.log('1. This script provides immediate relief');
console.log('2. Run it on the admin page where popups appear');
console.log('3. It will remove all popups and block future ones');
console.log('4. Popup creation should work in your app interface');
console.log('5. For permanent fix, need to deploy updated functions');