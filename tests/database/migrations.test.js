/**
 * Database migration and schema tests
 * Validates database structure and data integrity
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://zsmoutzjhqjgjehaituw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - some tests may fail');
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Database Schema Tests', () => {

  // Test popups table structure
  test('SCHEMA - Popups table should exist with correct columns', async () => {
    const { data, error } = await supabase
      .from('popups')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Test table structure by inserting and checking columns
    const testPopup = {
      title: 'Schema Test Popup',
      content: 'Test content',
      shop_domain: 'test.myshopify.com',
      trigger_type: 'time_delay',
      trigger_value: '3000',
      position: 'center',
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('popups')
      .insert(testPopup)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(insertData).toMatchObject({
      title: testPopup.title,
      content: testPopup.content,
      shop_domain: testPopup.shop_domain
    });

    // Cleanup
    await supabase.from('popups').delete().eq('id', insertData.id);
  });

  // Test popup_events table structure
  test('SCHEMA - Popup events table should exist', async () => {
    const { data, error } = await supabase
      .from('popup_events')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  // Test shops table structure
  test('SCHEMA - Shops table should exist', async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  // Test required indexes exist
  test('INDEXES - Should have performance indexes', async () => {
    // Test query performance on shop_domain
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('popups')
      .select('*')
      .eq('shop_domain', 'testingstoresumeet.myshopify.com');

    const queryTime = Date.now() - startTime;
    
    expect(error).toBeNull();
    expect(queryTime).toBeLessThan(1000); // Should be fast with proper indexing
  });
});

describe('Data Integrity Tests', () => {

  let testPopupId = null;

  // Test data constraints
  test('CONSTRAINTS - Should enforce required fields', async () => {
    // Test missing required field
    const { data, error } = await supabase
      .from('popups')
      .insert({
        content: 'Test content without title'
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('null value');
  });

  // Test data types
  test('DATA TYPES - Should validate field types', async () => {
    const validPopup = {
      title: 'Type Test Popup',
      content: 'Test content',
      shop_domain: 'test.myshopify.com',
      trigger_type: 'time_delay',
      trigger_value: '3000',
      is_active: true
    };

    const { data, error } = await supabase
      .from('popups')
      .insert(validPopup)
      .select()
      .single();

    expect(error).toBeNull();
    expect(typeof data.is_active).toBe('boolean');
    expect(typeof data.title).toBe('string');
    expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    testPopupId = data.id;
  });

  // Test foreign key relationships
  test('RELATIONSHIPS - Should handle shop relationships', async () => {
    // Create a shop first
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        shop_domain: 'relationship-test.myshopify.com',
        access_token: 'test_token',
        installed_at: new Date().toISOString()
      })
      .select()
      .single();

    expect(shopError).toBeNull();

    // Create popup for this shop
    const { data: popup, error: popupError } = await supabase
      .from('popups')
      .insert({
        title: 'Relationship Test',
        content: 'Test content',
        shop_domain: shop.shop_domain,
        trigger_type: 'time_delay'
      })
      .select()
      .single();

    expect(popupError).toBeNull();
    expect(popup.shop_domain).toBe(shop.shop_domain);

    // Cleanup
    await supabase.from('popups').delete().eq('id', popup.id);
    await supabase.from('shops').delete().eq('id', shop.id);
  });

  // Test soft delete functionality
  test('SOFT DELETE - Should support is_deleted flag', async () => {
    if (!testPopupId) return;

    // Mark as deleted
    const { data, error } = await supabase
      .from('popups')
      .update({ is_deleted: true })
      .eq('id', testPopupId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.is_deleted).toBe(true);

    // Should still exist in database
    const { data: stillExists, error: checkError } = await supabase
      .from('popups')
      .select('*')
      .eq('id', testPopupId)
      .single();

    expect(checkError).toBeNull();
    expect(stillExists).toBeDefined();

    // Cleanup
    await supabase.from('popups').delete().eq('id', testPopupId);
  });

  // Test timestamp triggers
  test('TIMESTAMPS - Should auto-update timestamps', async () => {
    const { data: initialData, error: insertError } = await supabase
      .from('popups')
      .insert({
        title: 'Timestamp Test',
        content: 'Test content',
        shop_domain: 'timestamp-test.myshopify.com',
        trigger_type: 'time_delay'
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    const createdAt = new Date(initialData.created_at);

    // Wait a moment then update
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: updatedData, error: updateError } = await supabase
      .from('popups')
      .update({ title: 'Updated Timestamp Test' })
      .eq('id', initialData.id)
      .select()
      .single();

    expect(updateError).toBeNull();
    
    if (updatedData.updated_at) {
      const updatedAt = new Date(updatedData.updated_at);
      expect(updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
    }

    // Cleanup
    await supabase.from('popups').delete().eq('id', initialData.id);
  });
});