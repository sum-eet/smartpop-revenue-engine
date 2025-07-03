/**
 * URGENT DEBUG - Figure out why logic is backwards
 * Run this on BOTH admin page and customer store page
 */

console.log('🚨 URGENT LOGIC DEBUG');
console.log('='.repeat(40));
console.log('Current URL:', window.location.href);
console.log('Current hostname:', window.location.hostname);
console.log('');

// Check what SmartPop scripts are running
console.log('📜 SmartPop Scripts Analysis:');
const scripts = document.querySelectorAll('script');
let smartPopScripts = [];

scripts.forEach((script, i) => {
  const src = script.src || '';
  const content = script.textContent || '';
  
  if (src.includes('smartpop') || src.includes('popup') || 
      content.includes('SmartPop') || content.includes('smartPop') ||
      content.includes('shouldSkipPopup')) {
    
    console.log(`Script ${i}:`);
    console.log('  Source:', src || 'inline');
    console.log('  Content preview:', content.substring(0, 200) + '...');
    console.log('  Contains admin detection:', content.includes('admin.shopify.com'));
    console.log('  Contains shouldSkipPopup:', content.includes('shouldSkipPopup'));
    console.log('');
    
    smartPopScripts.push({
      index: i,
      src: src,
      content: content,
      hasAdminDetection: content.includes('admin.shopify.com'),
      hasSkipLogic: content.includes('shouldSkipPopup')
    });
  }
});

console.log(`Found ${smartPopScripts.length} SmartPop-related scripts`);

// Check SmartPop variables
console.log('📊 SmartPop Variables:');
console.log('  window.smartPop:', typeof window.smartPop);
console.log('  window.smartPopTracker:', typeof window.smartPopTracker);
console.log('  window.smartPopInitialized:', window.smartPopInitialized);

// Check popup elements
console.log('🎯 Popup Elements:');
const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
console.log(`  Found ${popups.length} popup elements`);
popups.forEach((popup, i) => {
  console.log(`  Popup ${i}: ID=${popup.id}, visible=${getComputedStyle(popup).display !== 'none'}`);
});

// Test the logic manually
console.log('🔍 Manual Logic Test:');
const hostname = window.location.hostname;

function testShouldSkipLogic() {
  // Test the logic from our app-embed function
  if (hostname === 'admin.shopify.com') {
    console.log('  ❌ SHOULD SKIP: admin.shopify.com detected');
    return true;
  }
  
  if (hostname.includes('admin.shopify.com')) {
    console.log('  ❌ SHOULD SKIP: admin subdomain detected');
    return true;
  }
  
  console.log('  ✅ SHOULD SHOW: customer store confirmed');
  return false;
}

const shouldSkip = testShouldSkipLogic();
console.log(`  Logic result: ${shouldSkip ? 'SKIP POPUPS' : 'SHOW POPUPS'}`);

// Check if logic matches reality
const hasPopups = popups.length > 0;
const logicMatches = (shouldSkip && !hasPopups) || (!shouldSkip && hasPopups);

console.log('');
console.log('🎯 LOGIC vs REALITY:');
console.log(`  Should skip popups: ${shouldSkip}`);
console.log(`  Actually has popups: ${hasPopups}`);
console.log(`  Logic matches reality: ${logicMatches ? '✅' : '❌ BROKEN'}`);

if (!logicMatches) {
  console.log('');
  console.log('🚨 LOGIC IS BROKEN!');
  if (hostname === 'admin.shopify.com' && hasPopups) {
    console.log('  Problem: Popups showing on admin (should be blocked)');
  }
  if (hostname !== 'admin.shopify.com' && !hasPopups) {
    console.log('  Problem: No popups on customer store (should be showing)');
  }
}

console.log('');
console.log('📋 NEXT STEPS:');
console.log('1. Run this script on BOTH admin and customer pages');
console.log('2. Compare the results');
console.log('3. Identify which script is causing the wrong behavior');