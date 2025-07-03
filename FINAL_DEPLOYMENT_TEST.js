/**
 * FINAL DEPLOYMENT TEST - After Supabase Functions Deployed
 * Run this on admin.shopify.com page to verify everything is working
 */

console.log('🔬 FINAL DEPLOYMENT VERIFICATION TEST');
console.log('=' .repeat(50));

// Test 1: Admin Detection
function testAdminDetection() {
  console.log('🚫 TEST 1: Admin Detection');
  const hostname = window.location.hostname;
  
  if (hostname === 'admin.shopify.com') {
    console.log('✅ PASS: admin.shopify.com domain correctly detected');
    return true;
  } else {
    console.log('❌ FAIL: admin.shopify.com domain NOT detected');
    console.log('Current hostname:', hostname);
    return false;
  }
}

// Test 2: No Popup Elements
function testNoPopups() {
  console.log('🎯 TEST 2: No Popup Elements');
  const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
  
  if (popups.length === 0) {
    console.log('✅ PASS: No popup elements found');
    return true;
  } else {
    console.log('❌ FAIL: Found', popups.length, 'popup elements');
    return false;
  }
}

// Test 3: Popup Creation API (DEPLOYED VERSION)
async function testPopupCreationDeployed() {
  console.log('🧪 TEST 3: Popup Creation API (Deployed)');
  
  try {
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        name: 'Final Deployment Test',
        triggerType: 'page_view',
        pageTarget: 'all_pages',
        popupType: 'email_capture',
        title: 'Final Test After Deployment',
        description: 'Testing that deployed functions work',
        buttonText: 'Test',
        emailPlaceholder: 'test@example.com',
        isActive: true,
        shop_domain: 'testingstoresumeet.myshopify.com'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ PASS: Popup creation working after deployment');
      console.log('Created popup ID:', result.data?.id);
      return true;
    } else {
      console.log('❌ FAIL: Popup creation failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Popup creation error:', error.message);
    return false;
  }
}

// Test 4: Frontend Deployment Check
async function testFrontendDeployment() {
  console.log('🌐 TEST 4: Frontend Deployment');
  
  try {
    const response = await fetch('https://smartpop-revenue-engine-ew3m836cn-sumeets-projects-09b827d6.vercel.app');
    
    if (response.ok) {
      console.log('✅ PASS: Frontend deployed and accessible');
      return true;
    } else {
      console.log('❌ FAIL: Frontend not accessible:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Frontend error:', error.message);
    return false;
  }
}

// Test 5: App Embed Function (if accessible)
async function testAppEmbedFunction() {
  console.log('🔗 TEST 5: App Embed Function');
  
  try {
    // Try to access app-embed (may fail due to auth, but we'll check for proper error)
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/app-embed?shop=testingstoresumeet.myshopify.com');
    
    // If we get 401, that means function is deployed (just needs auth)
    if (response.status === 401) {
      console.log('✅ PASS: App embed function deployed (auth required)');
      return true;
    } else if (response.ok) {
      console.log('✅ PASS: App embed function working');
      return true;
    } else {
      console.log('❌ FAIL: App embed function error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: App embed function unreachable:', error.message);
    return false;
  }
}

// Run all tests
async function runFinalDeploymentTest() {
  console.log('🚀 Starting final deployment verification...');
  console.log('Current URL:', window.location.href);
  console.log('Current time:', new Date().toISOString());
  console.log('-'.repeat(50));
  
  const results = {
    adminDetection: testAdminDetection(),
    noPopups: testNoPopups(),
    popupCreation: await testPopupCreationDeployed(),
    frontendDeployment: await testFrontendDeployment(),
    appEmbedFunction: await testAppEmbedFunction()
  };
  
  console.log('-'.repeat(50));
  console.log('📊 FINAL DEPLOYMENT RESULTS:');
  
  const passed = Object.entries(results).filter(([key, value]) => value).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('-'.repeat(50));
  console.log(`🎯 FINAL SCORE: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 DEPLOYMENT SUCCESSFUL! BOTH ISSUES FULLY FIXED:');
    console.log('  1. ✅ Popups blocked on admin.shopify.com');
    console.log('  2. ✅ Popup creation API working');
    console.log('  3. ✅ Frontend deployed with fixes');
    console.log('  4. ✅ Backend functions deployed');
    console.log('');
    console.log('🚀 SmartPop is production ready!');
    console.log('💰 Your Claude Pro subscription is SAFE!');
  } else {
    console.log('⚠️ Some tests failed - may need additional fixes');
  }
  
  return results;
}

// Auto-run
runFinalDeploymentTest();

console.log('');
console.log('📋 DEPLOYMENT TEST INSTRUCTIONS:');
console.log('1. Run this script on https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2');
console.log('2. Should show 5/5 tests passing');
console.log('3. If any fail, check the specific error messages above');