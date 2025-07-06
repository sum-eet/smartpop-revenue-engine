const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing Progressive Popup Strategy...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  const page = await browser.newPage();
  
  // Listen for console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SmartPop') || text.includes('popup') || text.includes('points') || text.includes('Progressive')) {
      console.log('📄 Store Console:', text);
    }
  });
  
  try {
    console.log('🌐 Loading store page...');
    await page.goto('https://testingstoresumeet.myshopify.com/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Check if password page exists
    const hasPasswordForm = await page.$('form[action*="password"]');
    if (hasPasswordForm) {
      console.log('🔒 Store is password protected, entering password...');
      await page.type('input[name="password"]', 'eaneus');
      await page.click('button[type="submit"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      console.log('✅ Password entered, now on store page');
    }
    
    console.log('⏱️ Waiting 3 seconds for script to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Testing Progressive Popup Strategy...');
    
    // Test Level 1: Generate 60+ points
    console.log('\n🔵 Testing Level 1 (60+ points)...');
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(Math.random() * 800 + 100, Math.random() * 200 + 50);
      await page.mouse.move(Math.random() * 50, Math.random() * 50, { steps: 1 });
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Wait and check for Level 1 popup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let level1Popup = await page.$('#smartpop-progressive-1');
    if (level1Popup) {
      console.log('✅ Level 1 popup appeared!');
      await page.click('#smartpop-progressive-1 button');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('❌ Level 1 popup did not appear');
    }
    
    // Test Level 2: Generate 120+ points
    console.log('\n🟡 Testing Level 2 (120+ points)...');
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(Math.random() * 1000 + 100, Math.random() * 100 + 30);
      await page.mouse.move(Math.random() * 30, Math.random() * 30, { steps: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Wait and check for Level 2 popup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let level2Popup = await page.$('#smartpop-progressive-2');
    if (level2Popup) {
      console.log('✅ Level 2 popup appeared!');
      await page.click('#smartpop-progressive-2 button');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('❌ Level 2 popup did not appear');
    }
    
    // Test Level 3: Generate 180+ points
    console.log('\n🔴 Testing Level 3 (180+ points)...');
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(Math.random() * 1200 + 100, Math.random() * 80 + 20);
      await page.mouse.move(Math.random() * 20, Math.random() * 20, { steps: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait and check for Level 3 popup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let level3Popup = await page.$('#smartpop-progressive-3');
    if (level3Popup) {
      console.log('✅ Level 3 popup appeared!');
      await page.click('#smartpop-progressive-3 button');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('❌ Level 3 popup did not appear');
    }
    
    // Check final state
    const finalState = await page.evaluate(() => {
      return {
        smartPopInitialized: typeof window.smartPopInitialized !== 'undefined',
        progressivePopups: document.querySelectorAll('[id^="smartpop-progressive-"]').length,
        consoleErrors: []
      };
    });
    
    console.log('\n📊 FINAL TEST RESULTS:');
    console.log('========================');
    console.log('SmartPop Initialized:', finalState.smartPopInitialized);
    console.log('Progressive Popups Found:', finalState.progressivePopups);
    console.log('Level 1 Popup:', level1Popup ? '✅ Appeared' : '❌ Did not appear');
    console.log('Level 2 Popup:', level2Popup ? '✅ Appeared' : '❌ Did not appear');
    console.log('Level 3 Popup:', level3Popup ? '✅ Appeared' : '❌ Did not appear');
    
    if (level1Popup && level2Popup && level3Popup) {
      console.log('\n🎉 ALL PROGRESSIVE LEVELS WORKING!');
    } else {
      console.log('\n⚠️ Some progressive levels need debugging');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser staying open for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();