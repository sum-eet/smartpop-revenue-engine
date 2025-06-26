import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export async function createPopup(popupData: any) {
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
      created_at: popupData.createdAt,
      shop_id: popupData.shopId // We'll need to get this from the current shop
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPopupsForShop(shopDomain: string) {
  const { data, error } = await supabase
    .from('popups')
    .select(`
      *,
      shops!inner(shop_domain)
    `)
    .eq('shops.shop_domain', shopDomain)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return data;
}

export async function trackPopupEvent(popupId: string, eventData: any) {
  const { data, error } = await supabase
    .from('popup_events')
    .insert([{
      popup_id: popupId,
      event_type: eventData.eventType,
      shop_domain: eventData.shop,
      page_url: eventData.pageUrl,
      timestamp: eventData.timestamp
    }]);

  if (error) {
    throw error;
  }

  return data;
}