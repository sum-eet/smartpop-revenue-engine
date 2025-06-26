import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'POST') {
      // Create new popup
      const popupData = JSON.parse(event.body || '{}');
      
      // Get shop ID from shop domain (you'll need to implement this)
      const shopDomain = popupData.shopDomain || 'testingstoresumeet.myshopify.com'; // Default for now
      
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', shopDomain)
        .single();

      if (!shop) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Shop not found' }),
        };
      }

      const { data, error } = await supabase
        .from('popups')
        .insert([{
          name: popupData.name,
          trigger_type: popupData.triggerType,
          trigger_value: popupData.triggerValue,
          page_target: popupData.pageTarget,
          popup_type: popupData.popupType,
          title: popupData.title,
          description: popupData.description,
          button_text: popupData.buttonText,
          email_placeholder: popupData.emailPlaceholder,
          discount_code: popupData.discountCode,
          discount_percent: popupData.discountPercent,
          is_active: popupData.isActive,
          shop_id: shop.id
        }])
        .select()
        .single();

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    if (event.httpMethod === 'GET') {
      // Get popups for shop
      const shopDomain = event.queryStringParameters?.shop || 'testingstoresumeet.myshopify.com';
      
      const { data, error } = await supabase
        .from('popups')
        .select(`
          *,
          shops!inner(shop_domain)
        `)
        .eq('shops.shop_domain', shopDomain)
        .eq('is_active', true);

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};