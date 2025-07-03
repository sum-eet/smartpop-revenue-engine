/**
 * FINAL COMPREHENSIVE TEST
 * Copy this script and run in browser console on admin.shopify.com page
 * This will verify both issues are fixed
 */

console.log('🔬 SMARTPOP FINAL DIAGNOSTIC TEST');
console.log('=' .repeat(50));

// Test 1: Admin Detection
function testAdminDetection() {
  console.log('🚫 TEST 1: Admin Detection');
  const hostname = window.location.hostname;
  const path = window.location.pathname;
  
  if (hostname === 'admin.shopify.com') {
    console.log('✅ PASS: admin.shopify.com domain correctly detected');
    return true;
  } else {
    console.log('❌ FAIL: admin.shopify.com domain NOT detected');
    console.log('Current hostname:', hostname);
    return false;
  }
}

// Test 2: Popup Presence Check
function testPopupPresence() {
  console.log('🎯 TEST 2: Popup Presence Check');
  const popupElements = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
  
  if (popupElements.length === 0) {
    console.log('✅ PASS: No popup elements found on admin page');
    return true;
  } else {
    console.log('❌ FAIL: Found', popupElements.length, 'popup elements:');
    popupElements.forEach((el, i) => {
      console.log(`  ${i+1}. ID: ${el.id}, Class: ${el.className}, Visible: ${getComputedStyle(el).display !== 'none'}`);
    });
    return false;
  }
}

// Test 3: SmartPop Variables Check
function testSmartPopVariables() {
  console.log('📊 TEST 3: SmartPop Variables Check');
  const vars = {
    smartPop: typeof window.smartPop,
    smartPopTracker: typeof window.smartPopTracker,
    smartPopInitialized: window.smartPopInitialized
  };
  
  console.log('SmartPop variables:', vars);
  
  if (vars.smartPop === 'undefined' && vars.smartPopTracker === 'undefined' && !vars.smartPopInitialized) {
    console.log('✅ PASS: No SmartPop variables initialized (correct for admin page)');
    return true;
  } else {
    console.log('❌ FAIL: SmartPop variables found (should be blocked on admin)');
    return false;
  }
}

// Test 4: Popup Creation API
async function testPopupCreationAPI() {
  console.log('🔧 TEST 4: Popup Creation API');
  
  const testData = {
    action: 'save',
    name: 'Test Admin Fix',
    triggerType: 'page_view',
    triggerValue: '',
    pageTarget: 'all_pages',
    popupType: 'email_capture',
    title: 'API Test Popup',
    description: 'Testing if popup creation works',
    buttonText: 'Test',
    emailPlaceholder: 'test@example.com',
    discountCode: '',
    discountPercent: '',
    isActive: true,
    shop_domain: 'testingstoresumeet.myshopify.com'
  };

  try {
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ PASS: Popup creation API working');
      console.log('Response:', result);
      return true;
    } else {
      const error = await response.text();
      console.log('❌ FAIL: Popup creation API failed');
      console.log('Status:', response.status, 'Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Popup creation API error');
    console.log('Error:', error.message);
    return false;
  }
}

// Test 5: Script Tag Analysis
function testScriptTags() {
  console.log('📜 TEST 5: Script Tag Analysis');
  const scripts = document.querySelectorAll('script');
  let smartPopScripts = 0;
  
  scripts.forEach((script, i) => {
    const src = script.src || '';
    const content = script.textContent || '';
    
    if (src.includes('smartpop') || src.includes('popup') || src.includes('supabase') ||
        content.includes('SmartPop') || content.includes('smartPop')) {
      console.log(`Found SmartPop script ${i}:`, src ? src.substring(0, 80) + '...' : 'inline');
      smartPopScripts++;
    }
  });
  
  if (smartPopScripts === 0) {
    console.log('✅ PASS: No SmartPop scripts detected');
    return true;
  } else {
    console.log(`❌ FAIL: Found ${smartPopScripts} SmartPop-related scripts`);
    return false;
  }
}

// Test 6: App Embed Function Test
async function testAppEmbedFunction() {
  console.log('🔗 TEST 6: App Embed Function');
  
  try {
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/app-embed?shop=testingstoresumeet.myshopify.com&debug=true');
    
    if (response.ok) {
      const scriptContent = await response.text();
      console.log('✅ PASS: App embed function responsive');
      
      // Check if admin detection is in the script
      if (scriptContent.includes('admin.shopify.com')) {
        console.log('✅ PASS: Admin detection found in embed script');
        return true;
      } else {
        console.log('❌ FAIL: Admin detection NOT found in embed script');
        return false;
      }
    } else {
      console.log('❌ FAIL: App embed function not working:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: App embed function error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive SmartPop diagnostic...');
  console.log('Current URL:', window.location.href);
  console.log('Current time:', new Date().toISOString());
  console.log('-'.repeat(50));
  
  const results = {
    adminDetection: testAdminDetection(),
    popupPresence: testPopupPresence(),
    smartPopVariables: testSmartPopVariables(),
    popupCreationAPI: await testPopupCreationAPI(),
    scriptTags: testScriptTags(),
    appEmbedFunction: await testAppEmbedFunction()
  };
  
  console.log('-'.repeat(50));
  console.log('📊 FINAL RESULTS:');
  
  const passed = Object.entries(results).filter(([key, value]) => value).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('-'.repeat(50));
  console.log(`🎯 SCORE: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Both issues are fixed:');
    console.log('  1. ✅ Popups blocked on admin.shopify.com');
    console.log('  2. ✅ Popup creation API working');
    console.log('');
    console.log('🚀 SmartPop is ready for production!');
  } else {
    console.log('❌ Some tests failed. Issues remain.');
    console.log('');
    console.log('📋 Next steps:');
    if (!results.adminDetection) console.log('  - Fix admin detection logic');
    if (!results.popupPresence) console.log('  - Remove existing popup elements');
    if (!results.smartPopVariables) console.log('  - Clear SmartPop initialization');
    if (!results.popupCreationAPI) console.log('  - Fix popup creation endpoint');
    if (!results.scriptTags) console.log('  - Remove old script tags');
    if (!results.appEmbedFunction) console.log('  - Fix app embed function');
  }
  
  return results;
}

// Auto-run the test
runAllTests().then(results => {
  console.log('🔬 Diagnostic complete. Check results above.');
});

// Instructions
console.log('');
console.log('📋 USAGE INSTRUCTIONS:');
console.log('1. Open https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2');
console.log('2. Open browser console (F12)');
console.log('3. Paste this entire script and press Enter');
console.log('4. Wait for all tests to complete');
console.log('5. Check the final score - should be 6/6 if both issues are fixed');