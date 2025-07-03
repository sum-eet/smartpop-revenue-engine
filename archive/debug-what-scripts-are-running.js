/**
 * DEBUG SCRIPT - Add this temporarily to see what SmartPop scripts are actually running
 * This will help us identify which script is causing the popup on admin pages
 */

(function() {
  'use strict';
  
  console.log('🕵️ DEBUG: SmartPop Script Detective Starting...');
  console.log('📍 Current URL:', window.location.href);
  console.log('🏢 Current Domain:', window.location.hostname);
  console.log('📁 Current Path:', window.location.pathname);
  
  // Check what SmartPop variables exist
  console.log('🔍 Global SmartPop Variables:');
  console.log('  - window.smartPopInitialized:', window.smartPopInitialized);
  console.log('  - window.smartPop:', typeof window.smartPop);
  console.log('  - window.testSmartPop:', typeof window.testSmartPop);
  
  // Check for SmartPop DOM elements
  console.log('🎯 SmartPop DOM Elements:');
  const debugPanel = document.getElementById('smartpop-debug');
  console.log('  - Debug panel:', debugPanel ? 'FOUND' : 'NOT FOUND');
  if (debugPanel) {
    console.log('    - Panel content:', debugPanel.textContent.substring(0, 100));
  }
  
  const overlays = document.querySelectorAll('[id*="popup"], [id*="smartpop"]');
  console.log('  - Popup overlays:', overlays.length, 'found');
  overlays.forEach((overlay, i) => {
    console.log(`    - Overlay ${i}: ID=${overlay.id}, visible=${getComputedStyle(overlay).display !== 'none'}`);
  });
  
  // Check all script tags for SmartPop
  console.log('📜 Script Tags Analysis:');
  const scripts = document.querySelectorAll('script');
  let smartPopScriptCount = 0;
  scripts.forEach((script, i) => {
    if (script.src && (script.src.includes('smartpop') || script.src.includes('popup') || script.src.includes('supabase'))) {
      console.log(`  ✅ External SmartPop script ${i}:`, script.src);
      smartPopScriptCount++;
    }
    if (script.textContent && (script.textContent.includes('SmartPop') || script.textContent.includes('smartPop'))) {
      console.log(`  ✅ Inline SmartPop script ${i}:`, script.textContent.substring(0, 100) + '...');
      smartPopScriptCount++;
    }
  });
  console.log(`📊 Total SmartPop scripts found: ${smartPopScriptCount}`);
  
  // Check if we should skip (admin detection test)
  console.log('🚫 Admin Detection Test:');
  const hostname = window.location.hostname;
  const path = window.location.pathname;
  
  if (hostname === 'admin.shopify.com') {
    console.log('  ❌ SHOULD BE BLOCKED: admin.shopify.com domain detected');
  } else if (hostname.includes('admin.shopify.com')) {
    console.log('  ❌ SHOULD BE BLOCKED: admin.shopify.com subdomain detected');
  } else if (path.includes('/admin')) {
    console.log('  ❌ SHOULD BE BLOCKED: /admin path detected');
  } else if (window !== window.top) {
    console.log('  ❌ SHOULD BE BLOCKED: iframe context detected');
  } else {
    console.log('  ✅ SHOULD BE ALLOWED: customer page detected');
  }
  
  // Set up a popup detector
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName.toLowerCase() === 'div' && arguments.length > 0) {
      // Monitor div creation for popups
      setTimeout(() => {
        if (element.id && element.id.includes('popup')) {
          console.log('🚨 POPUP CREATED:', element.id, 'at', new Date().toISOString());
        }
      }, 100);
    }
    return element;
  };
  
  console.log('🕵️ SmartPop Detective initialized. Will monitor for popup creation...');
  
})();