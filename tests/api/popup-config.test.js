/**
 * Tests for popup-config API endpoint
 * Tests CRUD operations for popup management
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config';
const TEST_SHOP = 'testingstoresumeet.myshopify.com';

describe('Popup Config API', () => {
  let testPopupId = null;

  const testPopupData = {
    title: 'Test Popup',
    content: 'Get 10% off your first order!',
    trigger_type: 'time_delay',
    trigger_value: '3000',
    position: 'center',
    shop_domain: TEST_SHOP
  };

  // Test popup creation
  test('CREATE - Should create a new popup', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'save',
        ...testPopupData
      })
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.popup).toBeDefined();
    expect(result.popup.title).toBe(testPopupData.title);
    
    testPopupId = result.popup.id;
  });

  // Test popup listing
  test('READ - Should list popups for shop', async () => {
    const response = await fetch(`${BASE_URL}?action=list&shop_domain=${TEST_SHOP}`);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.popups)).toBe(true);
    expect(result.popups.length).toBeGreaterThan(0);
    
    const createdPopup = result.popups.find(p => p.id === testPopupId);
    expect(createdPopup).toBeDefined();
  });

  // Test popup update
  test('UPDATE - Should update existing popup', async () => {
    const updatedData = {
      action: 'save',
      id: testPopupId,
      title: 'Updated Test Popup',
      content: 'Get 20% off your first order!',
      shop_domain: TEST_SHOP
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.popup.title).toBe('Updated Test Popup');
    expect(result.popup.content).toBe('Get 20% off your first order!');
  });

  // Test popup deletion
  test('DELETE - Should delete popup', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        id: testPopupId,
        shop_domain: TEST_SHOP
      })
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  // Test popup not found after deletion
  test('VERIFY DELETE - Should not find deleted popup', async () => {
    const response = await fetch(`${BASE_URL}?action=list&shop_domain=${TEST_SHOP}`);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    
    const deletedPopup = result.popups.find(p => p.id === testPopupId);
    expect(deletedPopup).toBeUndefined();
  });

  // Test error handling - invalid action
  test('ERROR - Should handle invalid action', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'invalid_action',
        shop_domain: TEST_SHOP
      })
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
  });

  // Test error handling - missing shop domain
  test('ERROR - Should handle missing shop domain', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'save',
        title: 'Test Popup'
      })
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
  });
});

module.exports = {
  testPopupData,
  TEST_SHOP,
  BASE_URL
};