#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_SIZE_KB = 5; // Target initial bundle size
const WARNING_SIZE_KB = 10; // Warning threshold

function getBundleStats() {
  const distPath = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Dist folder not found. Run `npm run build` first.');
    process.exit(1);
  }

  const stats = [];
  const files = fs.readdirSync(distPath, { recursive: true });
  
  files.forEach(file => {
    if (file.endsWith('.js') && !file.includes('.map')) {
      const filePath = path.join(distPath, file);
      const stat = fs.statSync(filePath);
      const sizeKB = (stat.size / 1024).toFixed(2);
      
      stats.push({
        file: file,
        sizeKB: parseFloat(sizeKB),
        isAdmin: file.includes('admin/') || file.includes('admin-dashboard') || file.includes('shopify-admin') || file.includes('ui-admin'),
        isCore: file.includes('index.') && !file.includes('admin'),
        isPopupSDK: file.includes('popup-sdk')
      });
    }
  });
  
  return stats.sort((a, b) => b.sizeKB - a.sizeKB);
}

function analyzePerformance(stats) {
  const coreBundle = stats.find(s => s.isCore);
  const popupSDK = stats.find(s => s.isPopupSDK);
  const adminBundles = stats.filter(s => s.isAdmin);
  const minimalPopup = stats.find(s => s.file.includes('popup-minimal.min.js'));
  const ultraPopup = stats.find(s => s.file.includes('popup-ultra.min.js'));
  
  // Check for minimal popup (target solution)
  const minimalPopupSize = ultraPopup?.sizeKB || minimalPopup?.sizeKB || 0;
  const initialBundleSize = minimalPopupSize > 0 ? minimalPopupSize : (coreBundle?.sizeKB || 0) + (popupSDK?.sizeKB || 0);
  const adminTotalSize = adminBundles.reduce((sum, bundle) => sum + bundle.sizeKB, 0);
  
  console.log('\n🎯 BUNDLE SIZE ANALYSIS\n');
  console.log('═'.repeat(50));
  
  // Initial bundle analysis
  console.log(`📦 CUSTOMER-FACING POPUP BUNDLE`);
  console.log(`   Target: < ${TARGET_SIZE_KB}KB`);
  console.log(`   Actual: ${initialBundleSize.toFixed(2)}KB`);
  
  if (ultraPopup) {
    console.log(`   🎯 USING ULTRA-MINIMAL POPUP: popup-ultra.min.js`);
  } else if (minimalPopup) {
    console.log(`   🎯 USING MINIMAL POPUP: popup-minimal.min.js`);
  }
  
  if (initialBundleSize <= TARGET_SIZE_KB) {
    console.log(`   ✅ EXCELLENT: ${((TARGET_SIZE_KB - initialBundleSize) / TARGET_SIZE_KB * 100).toFixed(1)}% under target`);
  } else if (initialBundleSize <= WARNING_SIZE_KB) {
    console.log(`   ⚠️  WARNING: ${(initialBundleSize - TARGET_SIZE_KB).toFixed(2)}KB over target`);
  } else {
    console.log(`   ❌ CRITICAL: ${(initialBundleSize - TARGET_SIZE_KB).toFixed(2)}KB over target`);
  }
  
  console.log('\n📊 CHUNK BREAKDOWN:');
  console.log('─'.repeat(30));
  
  // Customer-facing chunks
  console.log('\n🏪 Customer-facing (loaded immediately):');
  stats.filter(s => !s.isAdmin).forEach(chunk => {
    const status = chunk.sizeKB <= 25 ? '✅' : chunk.sizeKB <= 50 ? '⚠️' : '❌';
    console.log(`   ${status} ${chunk.file}: ${chunk.sizeKB}KB`);
  });
  
  // Admin chunks (lazy loaded)
  console.log('\n👩‍💼 Admin dashboard (lazy loaded):');
  adminBundles.forEach(chunk => {
    const status = chunk.sizeKB <= 100 ? '✅' : chunk.sizeKB <= 300 ? '⚠️' : '❌';
    console.log(`   ${status} ${chunk.file}: ${chunk.sizeKB}KB`);
  });
  
  console.log(`\n📈 PERFORMANCE METRICS:`);
  console.log(`   • Customer bundle: ${initialBundleSize.toFixed(2)}KB (${initialBundleSize <= TARGET_SIZE_KB ? 'PASS' : 'FAIL'})`);
  console.log(`   • Admin bundle: ${adminTotalSize.toFixed(2)}KB (lazy loaded)`);
  console.log(`   • Total chunks: ${stats.length}`);
  console.log(`   • Admin chunks: ${adminBundles.length}`);
  
  return {
    pass: initialBundleSize <= TARGET_SIZE_KB,
    initialSize: initialBundleSize,
    adminSize: adminTotalSize,
    target: TARGET_SIZE_KB
  };
}

function main() {
  console.log('🔍 Analyzing bundle sizes...\n');
  
  try {
    const stats = getBundleStats();
    const analysis = analyzePerformance(stats);
    
    console.log('\n═'.repeat(50));
    console.log('\n🎯 OPTIMIZATION STATUS:');
    
    if (analysis.pass) {
      console.log(`✅ SUCCESS: Customer bundle is ${analysis.initialSize.toFixed(2)}KB (target: ${analysis.target}KB)`);
      console.log(`📱 Customer experience: EXCELLENT`);
      console.log(`💡 Admin dashboard lazy loads ${analysis.adminSize.toFixed(2)}KB when needed`);
    } else {
      console.log(`❌ NEEDS WORK: Customer bundle is ${analysis.initialSize.toFixed(2)}KB (target: ${analysis.target}KB)`);
      console.log(`📱 Customer experience: NEEDS IMPROVEMENT`);
      console.log(`🔧 Recommendation: Further split customer-facing code`);
    }
    
    // Exit with appropriate code for CI/CD
    process.exit(analysis.pass ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error analyzing bundles:', error.message);
    process.exit(1);
  }
}

main();