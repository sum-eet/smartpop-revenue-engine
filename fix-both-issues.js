/**
 * COMPREHENSIVE FIX: Remove all SmartPop scripts and test both issues
 * Run this in browser console on admin.shopify.com page
 */

// First, let's see what's actually running
console.log('🔍 DIAGNOSTIC: Current page details');
console.log('URL:', window.location.href);
console.log('Domain:', window.location.hostname);
console.log('Path:', window.location.pathname);
console.log('Parent window:', window.parent?.location?.href);

// Check for SmartPop presence
console.log('🎯 SmartPop presence check:');
console.log('window.smartPopTracker:', typeof window.smartPopTracker);
console.log('window.smartPopInitialized:', window.smartPopInitialized);
console.log('Popup overlays:', document.querySelectorAll('[id*="smartpop"], [id*="popup"]').length);

// Admin detection test
function testAdminDetection() {
  console.log('🚫 Admin detection test:');
  const hostname = window.location.hostname;
  
  if (hostname === 'admin.shopify.com') {
    console.log('✅ CORRECT: admin.shopify.com detected - should block popups');
    return true;
  } else {
    console.log('❌ WRONG: admin.shopify.com NOT detected');
    return false;
  }
}

const shouldBlock = testAdminDetection();

// Remove any existing popups
function removeAllPopups() {
  console.log('🗑️ Removing all popup elements...');
  const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
  popups.forEach((popup, i) => {
    console.log(`Removing popup ${i}:`, popup.id || popup.className);
    popup.remove();
  });
  console.log(`Removed ${popups.length} popup elements`);
}

removeAllPopups();

// Test popup creation API
async function testPopupCreation() {
  console.log('🧪 Testing popup creation API...');
  
  const testData = {
    action: 'save',
    name: 'Test Admin Block Popup',
    triggerType: 'page_view',
    triggerValue: '',
    pageTarget: 'all_pages',
    popupType: 'email_capture',
    title: 'Should Not Appear on Admin',
    description: 'This popup should be blocked on admin pages',
    buttonText: 'Test Button',
    emailPlaceholder: 'test@example.com',
    discountCode: '',
    discountPercent: '',
    isActive: true,
    shop_domain: 'testingstoresumeet.myshopify.com'
  };

  try {
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Popup creation API working:', result);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Popup creation failed:', response.status, error);
      return false;
    }
  } catch (error) {
    console.log('❌ Popup creation error:', error.message);
    return false;
  }
}

// Run comprehensive test
async function runComprehensiveTest() {
  console.log('🔬 COMPREHENSIVE TEST STARTING...');
  console.log('================================');
  
  const results = {
    adminDetection: shouldBlock,
    popupCreation: await testPopupCreation(),
    currentPopups: document.querySelectorAll('[id*="smartpop"], [id*="popup"]').length
  };
  
  console.log('📊 TEST RESULTS:');
  console.log('Admin detection working:', results.adminDetection ? '✅' : '❌');
  console.log('Popup creation working:', results.popupCreation ? '✅' : '❌');
  console.log('Popups on admin page:', results.currentPopups === 0 ? '✅ NONE' : `❌ ${results.currentPopups} found`);
  
  if (results.adminDetection && results.popupCreation && results.currentPopups === 0) {
    console.log('🎉 ALL TESTS PASSED! Both issues should be fixed.');
  } else {
    console.log('❌ Some tests failed. Issues remain.');
  }
  
  return results;
}

// Auto-run the test
runComprehensiveTest();

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Copy this entire script');
console.log('2. Go to https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2');
console.log('3. Open browser console (F12)');
console.log('4. Paste and run this script');
console.log('5. Check if popups are gone and creation works');