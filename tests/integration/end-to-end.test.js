/**
 * End-to-end integration tests
 * Tests complete user workflows from start to finish
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const API_BASE = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1';
const TEST_SHOP = 'testingstoresumeet.myshopify.com';

describe('End-to-End Workflows', () => {

  let createdPopupId = null;

  // Complete popup lifecycle test
  test('FULL LIFECYCLE - Create, deploy, view, delete popup', async () => {
    
    // Step 1: Create popup via API
    console.log('Step 1: Creating popup...');
    const createResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'E2E Test Popup',
        content: 'Get 15% off your first order!',
        trigger_type: 'time_delay',
        trigger_value: '2000',
        position: 'center',
        shop_domain: TEST_SHOP
      })
    });

    expect(createResponse.status).toBe(200);
    const createResult = await createResponse.json();
    expect(createResult.success).toBe(true);
    createdPopupId = createResult.popup.id;
    console.log(`✅ Popup created with ID: ${createdPopupId}`);

    // Step 2: Verify popup appears in list
    console.log('Step 2: Verifying popup in list...');
    const listResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
    const listResult = await listResponse.json();
    
    const foundPopup = listResult.popups.find(p => p.id === createdPopupId);
    expect(foundPopup).toBeDefined();
    expect(foundPopup.title).toBe('E2E Test Popup');
    console.log('✅ Popup found in list');

    // Step 3: Get embed script and verify it contains our popup
    console.log('Step 3: Testing embed script...');
    const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
    expect(embedResponse.status).toBe(200);
    
    const scriptContent = await embedResponse.text();
    expect(scriptContent).toContain('SmartPop');
    expect(scriptContent).toContain('admin.shopify.com');
    console.log('✅ Embed script generated successfully');

    // Step 4: Simulate script execution on customer store
    console.log('Step 4: Simulating customer store visit...');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: `https://${TEST_SHOP}/products/test-product`
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.console = { log: jest.fn() };
    
    // Mock fetch for the script to load popup data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        popups: [foundPopup]
      })
    });

    // Execute the script
    eval(scriptContent);
    
    // Verify customer store was detected (not admin)
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('✅')
    );
    console.log('✅ Customer store access confirmed');

    // Step 5: Simulate admin page blocking
    console.log('Step 5: Testing admin page blocking...');
    const adminDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://admin.shopify.com/store/test/apps/smart-popup2'
    });

    global.window = adminDom.window;
    global.document = adminDom.window.document;
    global.console = { log: jest.fn() };

    eval(scriptContent);
    
    // Verify admin was blocked
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('🚫')
    );
    console.log('✅ Admin page blocking confirmed');

    // Step 6: Update popup
    console.log('Step 6: Updating popup...');
    const updateResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        id: createdPopupId,
        title: 'Updated E2E Test Popup',
        content: 'Get 20% off your first order!',
        shop_domain: TEST_SHOP
      })
    });

    const updateResult = await updateResponse.json();
    expect(updateResult.success).toBe(true);
    expect(updateResult.popup.title).toBe('Updated E2E Test Popup');
    console.log('✅ Popup updated successfully');

    // Step 7: Clean up - delete popup
    console.log('Step 7: Cleaning up...');
    const deleteResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        id: createdPopupId,
        shop_domain: TEST_SHOP
      })
    });

    const deleteResult = await deleteResponse.json();
    expect(deleteResult.success).toBe(true);
    console.log('✅ Popup deleted successfully');

    // Step 8: Verify popup is gone
    console.log('Step 8: Verifying deletion...');
    const finalListResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
    const finalListResult = await finalListResponse.json();
    
    const deletedPopup = finalListResult.popups.find(p => p.id === createdPopupId);
    expect(deletedPopup).toBeUndefined();
    console.log('✅ Popup deletion verified');

    console.log('🎉 Full lifecycle test completed successfully!');
  });

  // Multi-popup scenario
  test('MULTI-POPUP - Handle multiple popups for same shop', async () => {
    const popupIds = [];

    try {
      // Create multiple popups
      for (let i = 1; i <= 3; i++) {
        const response = await fetch(`${API_BASE}/popup-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            title: `Multi-Test Popup ${i}`,
            content: `Test content ${i}`,
            trigger_type: 'time_delay',
            trigger_value: `${i * 1000}`,
            shop_domain: TEST_SHOP
          })
        });

        const result = await response.json();
        expect(result.success).toBe(true);
        popupIds.push(result.popup.id);
      }

      // Verify all popups in list
      const listResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
      const listResult = await listResponse.json();
      
      const ourPopups = listResult.popups.filter(p => 
        p.title.startsWith('Multi-Test Popup')
      );
      expect(ourPopups.length).toBe(3);

      // Test embed script includes all popups
      const embedResponse = await fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`);
      const scriptContent = await embedResponse.text();
      expect(scriptContent).toContain('SmartPop');

    } finally {
      // Cleanup all created popups
      for (const id of popupIds) {
        await fetch(`${API_BASE}/popup-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            id: id,
            shop_domain: TEST_SHOP
          })
        });
      }
    }
  });

  // Performance test
  test('PERFORMANCE - System should handle load efficiently', async () => {
    const startTime = Date.now();

    // Test concurrent API calls
    const promises = [];
    
    // Create multiple popups concurrently
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${API_BASE}/popup-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            title: `Perf Test ${i}`,
            content: 'Performance test popup',
            shop_domain: TEST_SHOP
          })
        })
      );
    }

    // Add embed script requests
    for (let i = 0; i < 3; i++) {
      promises.push(
        fetch(`${API_BASE}/popup-embed-public?shop=${TEST_SHOP}`)
      );
    }

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Should complete within reasonable time
    expect(totalTime).toBeLessThan(10000); // 10 seconds for 8 concurrent requests

    // Cleanup created popups
    const listResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
    const listResult = await listResponse.json();
    
    const perfTestPopups = listResult.popups.filter(p => 
      p.title.startsWith('Perf Test')
    );

    for (const popup of perfTestPopups) {
      await fetch(`${API_BASE}/popup-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: popup.id,
          shop_domain: TEST_SHOP
        })
      });
    }
  });

  // Error recovery test
  test('ERROR RECOVERY - System should handle errors gracefully', async () => {
    
    // Test invalid shop domain
    const invalidShopResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'Test Popup',
        content: 'Test content'
        // Missing shop_domain
      })
    });

    expect(invalidShopResponse.status).toBe(400);

    // Test invalid popup ID for deletion
    const invalidDeleteResponse = await fetch(`${API_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        id: 'nonexistent-id',
        shop_domain: TEST_SHOP
      })
    });

    const deleteResult = await invalidDeleteResponse.json();
    expect(deleteResult.success).toBe(false);

    // Test malformed embed request
    const malformedEmbedResponse = await fetch(`${API_BASE}/popup-embed-public`);
    expect(malformedEmbedResponse.status).toBe(400);

    // System should still work normally after errors
    const normalResponse = await fetch(`${API_BASE}/popup-config?action=list&shop_domain=${TEST_SHOP}`);
    expect(normalResponse.status).toBe(200);
  });
});