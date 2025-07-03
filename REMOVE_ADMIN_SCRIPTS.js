/**
 * REMOVE ADMIN SCRIPTS - Clean up old script tags causing admin popups
 * Run this in any browser tab to remove problematic script tags
 */

console.log('🧹 REMOVING ADMIN SCRIPTS');
console.log('='.repeat(40));

// Function to remove script tags via Shopify Admin API
async function removeShopifyScriptTags() {
  console.log('🔍 Checking for Shopify script tags...');
  
  // For now, let's just show what would be done
  // You'll need to get an access token and run this manually
  
  console.log('📋 MANUAL REMOVAL STEPS:');
  console.log('');
  console.log('1. Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps');
  console.log('2. Click "Develop apps" → Create/Select app');
  console.log('3. Generate Admin API access token with "write_script_tags" permission');
  console.log('4. Run these commands in console:');
  console.log('');
  console.log('// Step 1: Get all script tags');
  console.log('fetch("https://testingstoresumeet.myshopify.com/admin/api/2023-10/script_tags.json", {');
  console.log('  headers: { "X-Shopify-Access-Token": "YOUR_TOKEN_HERE" }');
  console.log('}).then(r => r.json()).then(data => {');
  console.log('  console.log("Script tags:", data.script_tags);');
  console.log('  // Look for SmartPop scripts and note their IDs');
  console.log('});');
  console.log('');
  console.log('// Step 2: Delete specific script tag');
  console.log('fetch("https://testingstoresumeet.myshopify.com/admin/api/2023-10/script_tags/SCRIPT_ID.json", {');
  console.log('  method: "DELETE",');
  console.log('  headers: { "X-Shopify-Access-Token": "YOUR_TOKEN_HERE" }');
  console.log('});');
}

// Function to immediately stop all SmartPop activity on current page
function emergencyStopSmartPop() {
  console.log('🛑 Emergency stop of all SmartPop activity...');
  
  // Remove all popup elements
  const popups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
  console.log(`Found ${popups.length} popup elements to remove`);
  
  popups.forEach((popup, i) => {
    console.log(`Removing popup ${i}: ${popup.id || popup.className}`);
    popup.remove();
  });
  
  // Stop all SmartPop scripts
  if (window.smartPop) {
    if (window.smartPop.stop) window.smartPop.stop();
    delete window.smartPop;
    console.log('Stopped window.smartPop');
  }
  
  if (window.smartPopTracker) {
    if (window.smartPopTracker.stop) window.smartPopTracker.stop();
    delete window.smartPopTracker;
    console.log('Stopped window.smartPopTracker');
  }
  
  if (window.SmartPop) {
    delete window.SmartPop;
    console.log('Removed window.SmartPop');
  }
  
  if (window.smartPopInitialized) {
    delete window.smartPopInitialized;
    console.log('Cleared window.smartPopInitialized');
  }
  
  // Block future popup creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    // Block any div that looks like a popup
    if (tagName.toLowerCase() === 'div') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'id' && value.includes('smartpop')) {
          console.log('🚫 Blocked popup element creation:', value);
          return; // Don't set the ID
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  console.log('✅ Emergency stop complete');
}

// Function to run comprehensive cleanup
function runComprehensiveCleanup() {
  console.log('🧹 Running comprehensive cleanup...');
  
  emergencyStopSmartPop();
  
  // Also clear any intervals/timeouts that might be running
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
  }
  
  const highestIntervalId = setInterval(() => {}, 999999);
  for (let i = 0; i < highestIntervalId; i++) {
    clearInterval(i);
  }
  
  console.log('✅ Cleared all timeouts and intervals');
  
  // Report current state
  setTimeout(() => {
    const remainingPopups = document.querySelectorAll('[id*="smartpop"], [id*="popup"], .smartpop-overlay');
    console.log('');
    console.log('📊 CLEANUP RESULTS:');
    console.log(`  Remaining popups: ${remainingPopups.length}`);
    console.log(`  SmartPop variables: ${Object.keys(window).filter(k => k.toLowerCase().includes('smartpop')).length}`);
    console.log(`  Current page: ${window.location.hostname}`);
    
    if (remainingPopups.length === 0) {
      console.log('🎉 Page successfully cleaned!');
    } else {
      console.log('⚠️ Some popups may still be present');
    }
  }, 1000);
}

// Auto-run cleanup
runComprehensiveCleanup();

// Also show Shopify script removal steps
removeShopifyScriptTags();

console.log('');
console.log('📋 USAGE:');
console.log('1. Run this script on any page with popup issues');
console.log('2. For permanent fix, remove script tags from Shopify admin');
console.log('3. Use the manual steps shown above');