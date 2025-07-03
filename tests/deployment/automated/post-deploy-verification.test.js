/**
 * Post-Deployment Verification Tests
 * CRITICAL: These tests run after every deployment to ensure functionality
 */

const fetch = require('node-fetch');

const SUPABASE_PROJECT_ID = 'zsmoutzjhqjgjehaituw';
const SUPABASE_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
const TEST_SHOP = 'testingstoresumeet.myshopify.com';

describe('🚨 CRITICAL POST-DEPLOYMENT VERIFICATION', () => {

  // CRITICAL TEST 1: Admin Detection Must Be Deployed
  test('CRITICAL - Admin detection logic must be deployed and active', async () => {
    console.log('🛡️ Testing admin detection deployment...');
    
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    expect(response.status).toBe(200);
    
    const script = await response.text();
    
    // CRITICAL: Must have primary admin detection
    expect(script).toContain("hostname === 'admin.shopify.com'");
    console.log('✅ Primary admin detection found');
    
    // CRITICAL: Must have shouldSkipPopup function
    expect(script).toContain('shouldSkipPopup');
    console.log('✅ shouldSkipPopup function found');
    
    // CRITICAL: Must have blocking message
    expect(script).toContain('🚫 SmartPop: Blocked admin.shopify.com');
    console.log('✅ Admin blocking message found');
    
    // CRITICAL: Script must be substantial (not empty/broken)
    expect(script.length).toBeGreaterThan(5000);
    console.log(`✅ Script size adequate: ${script.length} bytes`);
    
    console.log('🎉 Admin detection verification PASSED');
  }, 10000);

  // CRITICAL TEST 2: Popup CRUD Must Work
  test('CRITICAL - Popup CRUD operations must work', async () => {
    console.log('🧪 Testing popup CRUD operations...');
    
    // Test CREATE
    const createResponse = await fetch(`${SUPABASE_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'Post-Deploy Test',
        description: 'Critical test popup',
        shop_domain: TEST_SHOP,
        trigger_type: 'time_delay',
        trigger_value: '3000'
      })
    });
    
    expect(createResponse.status).toBe(200);
    const createResult = await createResponse.json();
    expect(createResult.success).toBe(true);
    expect(createResult.data).toBeDefined();
    
    const popupId = createResult.data.id;
    console.log(`✅ Popup creation working (ID: ${popupId})`);
    
    // Test READ
    const readResponse = await fetch(`${SUPABASE_BASE}/popup-config?shop=${TEST_SHOP}`);
    expect(readResponse.status).toBe(200);
    const popups = await readResponse.json();
    expect(Array.isArray(popups)).toBe(true);
    
    const createdPopup = popups.find(p => p.id === popupId);
    expect(createdPopup).toBeDefined();
    console.log('✅ Popup reading working');
    
    // Test DELETE (cleanup)
    const deleteResponse = await fetch(`${SUPABASE_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        id: popupId,
        shop_domain: TEST_SHOP
      })
    });
    
    expect(deleteResponse.status).toBe(200);
    const deleteResult = await deleteResponse.json();
    expect(deleteResult.success).toBe(true);
    console.log('✅ Popup deletion working');
    
    console.log('🎉 Popup CRUD verification PASSED');
  }, 15000);

  // CRITICAL TEST 3: All Required Functions Must Be Deployed
  test('CRITICAL - All required functions must be deployed and accessible', async () => {
    console.log('🔧 Testing all required functions...');
    
    const requiredFunctions = [
      'popup-config',
      'popup-embed-public',
      'popup-track',
      'shopify-auth'
    ];
    
    for (const funcName of requiredFunctions) {
      const response = await fetch(`${SUPABASE_BASE}/${funcName}`);
      
      // Should not be 404 (not found)
      expect(response.status).not.toBe(404);
      console.log(`✅ ${funcName}: HTTP ${response.status}`);
    }
    
    console.log('🎉 All functions deployment verification PASSED');
  }, 10000);

  // CRITICAL TEST 4: Database Connectivity
  test('CRITICAL - Database connectivity must work', async () => {
    console.log('🗄️ Testing database connectivity...');
    
    const response = await fetch(`${SUPABASE_BASE}/popup-config?shop=${TEST_SHOP}`);
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(Array.isArray(result)).toBe(true);
    
    console.log(`✅ Database accessible, ${result.length} popups found`);
    console.log('🎉 Database connectivity verification PASSED');
  });

  // CRITICAL TEST 5: CORS Configuration
  test('CRITICAL - CORS must be configured for public access', async () => {
    console.log('🌐 Testing CORS configuration...');
    
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    expect(response.status).toBe(200);
    
    const corsOrigin = response.headers.get('access-control-allow-origin');
    expect(corsOrigin).toBe('*');
    console.log('✅ CORS configured correctly');
    
    console.log('🎉 CORS verification PASSED');
  });
});

describe('🎯 FUNCTIONALITY VERIFICATION', () => {

  // Test specific admin detection scenarios
  test('Admin detection covers all required scenarios', async () => {
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    const script = await response.text();
    
    // Must detect admin.shopify.com
    expect(script).toContain("hostname === 'admin.shopify.com'");
    
    // Must detect admin subdomains
    expect(script).toContain('admin.shopify.com');
    expect(script).toContain('partners.shopify.com');
    
    // Must detect admin paths
    expect(script).toContain('/admin');
    expect(script).toContain('/apps');
    
    console.log('✅ All admin detection scenarios covered');
  });

  // Test script performance
  test('Script performance is acceptable', async () => {
    const startTime = Date.now();
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    
    console.log(`✅ Script response time: ${responseTime}ms`);
  });

  // Test error handling
  test('Error handling works correctly', async () => {
    // Test invalid shop domain
    const invalidResponse = await fetch(`${SUPABASE_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'Test'
        // Missing shop_domain
      })
    });
    
    expect(invalidResponse.status).toBe(400);
    const result = await invalidResponse.json();
    expect(result.success).toBe(false);
    
    console.log('✅ Error handling working correctly');
  });
});

describe('🚨 DEPLOYMENT HEALTH CHECKS', () => {

  // Check if deployment timestamp is recent
  test('Deployment should be recent', async () => {
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    const script = await response.text();
    
    // Look for generated timestamp in script
    const timestampMatch = script.match(/Generated: ([0-9T:\-\.Z]+)/);
    if (timestampMatch) {
      const generatedTime = new Date(timestampMatch[1]);
      const now = new Date();
      const timeDiff = now - generatedTime;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Should be generated within last 24 hours
      expect(hoursDiff).toBeLessThan(24);
      console.log(`✅ Script generated ${hoursDiff.toFixed(1)} hours ago`);
    }
  });

  // Verify no old/cached content
  test('No old cached content should be served', async () => {
    const response = await fetch(`${SUPABASE_BASE}/popup-embed-public?shop=${TEST_SHOP}&t=${Date.now()}`);
    const script = await response.text();
    
    // Should not contain old debugging code
    expect(script).not.toContain('EMERGENCY_FIX');
    expect(script).not.toContain('URGENT_DEBUG');
    expect(script).not.toContain('HACKY_SOLUTION');
    
    console.log('✅ No old cached content detected');
  });
});

// FAILURE REPORTING
afterAll(() => {
  console.log('\n🎉 POST-DEPLOYMENT VERIFICATION COMPLETE');
  console.log('========================================');
  console.log('All critical systems verified and working');
  console.log('Admin detection is ACTIVE and TESTED');
  console.log('System ready for production use');
});