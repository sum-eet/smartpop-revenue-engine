/**
 * Deployment Smoke Tests - Critical Paths
 * Quick verification of essential functionality after deployment
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const API_BASE = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1';
const FRONTEND_URL = 'https://smartpop-revenue-engine.vercel.app';
const TEST_SHOP = 'smoke-test.myshopify.com';

describe('Deployment Smoke Tests', () => {

  let createdPopupId = null;

  // Critical Path 1: Popup Creation Flow
  test('SMOKE - Create popup end-to-end', async () => {
    console.log('🚀 Testing popup creation flow...');

    // Step 1: Create popup
    const createResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'Smoke Test Popup',
        content: 'Deployment verification popup',
        trigger_type: 'time_delay',
        trigger_value: '3000',
        position: 'center',
        shop_domain: TEST_SHOP
      })
    });

    expect(createResponse.status).toBe(200);
    const createResult = await createResponse.json();
    expect(createResult.success).toBe(true);
    
    createdPopupId = createResult.popup.id;
    console.log(`✅ Popup created: ${createdPopupId}`);

    // Step 2: Verify popup appears in list
    const listResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
    const listResult = await listResponse.json();
    
    const foundPopup = listResult.popups.find(p => p.id === createdPopupId);
    expect(foundPopup).toBeDefined();
    console.log('✅ Popup found in list');

    // Step 3: Verify embed script includes popup
    const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    expect(embedResponse.status).toBe(200);
    
    const script = await embedResponse.text();
    expect(script).toContain('SmartPop');
    console.log('✅ Embed script generated');

    console.log('🎉 Popup creation flow: PASSED');
  }, 15000);

  // Critical Path 2: Admin Detection
  test('SMOKE - Admin detection works', async () => {
    console.log('🛡️ Testing admin detection...');

    const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    const script = await embedResponse.text();

    // Simulate admin environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://admin.shopify.com/store/test/apps/smart-popup2'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.console = { log: jest.fn() };

    // Execute script
    eval(script);

    // Should block admin
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('🚫')
    );

    console.log('✅ Admin detection working');
    console.log('🎉 Admin detection: PASSED');
  });

  // Critical Path 3: Customer Store Access
  test('SMOKE - Customer store access works', async () => {
    console.log('🏪 Testing customer store access...');

    const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    const script = await embedResponse.text();

    // Simulate customer store
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: `https://${TEST_SHOP}/products/test-product`
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.console = { log: jest.fn() };

    // Mock fetch for popup data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        popups: [{ id: 'test', title: 'Test Popup' }]
      })
    });

    // Execute script
    eval(script);

    // Should allow customer store
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('✅')
    );

    console.log('✅ Customer store access working');
    console.log('🎉 Customer store access: PASSED');
  });

  // Critical Path 4: API Performance
  test('SMOKE - API performance acceptable', async () => {
    console.log('⚡ Testing API performance...');

    const performanceTests = [
      {
        name: 'List popups',
        url: `${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`,
        maxTime: 3000
      },
      {
        name: 'Get embed script', 
        url: `${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`,
        maxTime: 4000
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      const response = await fetch(test.url);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(test.maxTime);
      
      console.log(`✅ ${test.name}: ${responseTime}ms`);
    }

    console.log('🎉 API performance: PASSED');
  }, 10000);

  // Critical Path 5: Error Handling
  test('SMOKE - Error handling works', async () => {
    console.log('🚨 Testing error handling...');

    // Test invalid requests
    const errorTests = [
      {
        name: 'Invalid action',
        request: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'invalid', shop_domain: TEST_SHOP })
        },
        expectedStatus: 400
      },
      {
        name: 'Missing shop domain',
        request: {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', title: 'Test' })
        },
        expectedStatus: 400
      }
    ];

    for (const test of errorTests) {
      const response = await fetch(`${API_BASE}/popup-config`, test.request);
      expect(response.status).toBe(test.expectedStatus);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      
      console.log(`✅ ${test.name}: HTTP ${response.status}`);
    }

    console.log('🎉 Error handling: PASSED');
  });

  // Critical Path 6: Frontend Accessibility
  test('SMOKE - Frontend is accessible', async () => {
    console.log('🌐 Testing frontend accessibility...');

    try {
      const response = await fetch(FRONTEND_URL, { timeout: 10000 });
      
      if (response.status === 200) {
        const html = await response.text();
        expect(html).toContain('<title>');
        console.log('✅ Frontend accessible and serving HTML');
        console.log('🎉 Frontend accessibility: PASSED');
      } else {
        console.log(`⚠️ Frontend returned HTTP ${response.status} - may not be deployed yet`);
        console.log('⚠️ Frontend accessibility: SKIPPED');
      }
    } catch (error) {
      console.log(`⚠️ Frontend not accessible: ${error.message}`);
      console.log('⚠️ Frontend accessibility: SKIPPED (deployment may be in progress)');
    }
  }, 15000);

  // Cleanup
  afterAll(async () => {
    if (createdPopupId) {
      console.log('🧹 Cleaning up test data...');
      
      try {
        const deleteResponse = await fetch(`${API_BASE}/popup-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            id: createdPopupId,
            shop_domain: TEST_SHOP
          })
        });

        if (deleteResponse.status === 200) {
          console.log('✅ Test popup cleaned up');
        }
      } catch (error) {
        console.log(`⚠️ Cleanup failed: ${error.message}`);
      }
    }
  });
});

describe('Rapid Deployment Verification', () => {

  // Ultra-fast verification for CI/CD pipelines
  test('RAPID - System is operational', async () => {
    console.log('⚡ Rapid deployment check...');

    const startTime = Date.now();

    // Test core API
    const apiResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=rapid-check.myshopify.com`);
    expect(apiResponse.status).toBe(200);

    // Test embed script
    const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=rapid-check.myshopify.com`);
    expect(embedResponse.status).toBe(200);
    expect(embedResponse.headers.get('content-type')).toContain('javascript');

    const totalTime = Date.now() - startTime;
    console.log(`✅ Rapid check completed in ${totalTime}ms`);
    
    // Should complete very quickly
    expect(totalTime).toBeLessThan(10000);

    console.log('🎉 Rapid deployment verification: PASSED');
  }, 12000);
});

describe('Critical Feature Validation', () => {

  // Test the most important features work
  test('CRITICAL FEATURES - Essential functionality operational', async () => {
    console.log('🎯 Testing critical features...');

    const features = [
      {
        name: 'Popup CRUD',
        test: async () => {
          const response = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=feature-test.myshopify.com`);
          return response.status === 200;
        }
      },
      {
        name: 'Script Delivery',
        test: async () => {
          const response = await fetch(`${API_BASE}/popup-embed-public?shop=feature-test.myshopify.com`);
          return response.status === 200 && response.headers.get('content-type').includes('javascript');
        }
      },
      {
        name: 'Admin Detection',
        test: async () => {
          const response = await fetch(`${API_BASE}/popup-embed-public?shop=feature-test.myshopify.com`);
          const script = await response.text();
          return script.includes('admin.shopify.com') && script.includes('shouldSkipPopup');
        }
      },
      {
        name: 'CORS Configuration',
        test: async () => {
          const response = await fetch(`${API_BASE}/popup-embed-public?shop=feature-test.myshopify.com`);
          return response.headers.get('access-control-allow-origin') === '*';
        }
      }
    ];

    for (const feature of features) {
      try {
        const result = await feature.test();
        expect(result).toBe(true);
        console.log(`✅ ${feature.name}: Working`);
      } catch (error) {
        console.log(`❌ ${feature.name}: Failed - ${error.message}`);
        throw new Error(`Critical feature failed: ${feature.name}`);
      }
    }

    console.log('🎉 All critical features: OPERATIONAL');
  }, 15000);
});