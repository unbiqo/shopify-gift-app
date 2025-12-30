import { supabase } from '../lib/supabaseClient';

const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;

  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
};

const deriveOrderValue = (items) => {
  return parseItems(items).reduce((sum, item) => {
    const value = Number(item?.price ?? item?.value ?? 0);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
};

const normalizeOrderStatus = (status) => {
  if (!status) return 'pending';
  if (status === 'synced') return 'draft_created';
  if (status === 'fulfilled') return 'shipped';
  return status;
};

const mapRecord = (record) => ({
  id: record.id,
  campaignId: record.campaign_id,
  campaignName: record.campaigns?.name || 'Standard Campaign',
  createdAt: record.created_at,
  influencerEmail: record.influencer_email,
  influencerPhone: record.influencer_phone,
  influencerInstagram: record.influencer_handle_instagram || record.influencer_handle,
  influencerTiktok: record.influencer_handle_tiktok || record.influencer_tiktok,
  influencerName: record.influencer_name,
  items: parseItems(record.items),
  shippingAddress: record.shipping_address,
  shopifyOrderId: record.shopify_order_id,
  shopifyOrderNumber: record.shopify_order_number,
  shopifyFulfillmentId: record.shopify_fulfillment_id,
  status: normalizeOrderStatus(record.status),
  termsConsent: record.terms_consent_accepted ?? record.terms_consent,
  marketingOptIn: record.marketing_opt_in_accepted ?? record.marketing_opt_in,
  value: deriveOrderValue(record.items),
});

const mapDuplicateRecord = (record) => ({
  id: record.id,
  campaignId: record.campaign_id,
  campaignName: record.campaigns?.name || 'Standard Campaign',
  influencerInfo: (() => {
    if (!record.influencer_info) return {};
    if (typeof record.influencer_info === 'string') {
      try {
        return JSON.parse(record.influencer_info);
      } catch {
        return {};
      }
    }
    return record.influencer_info;
  })(),
  decision: (typeof record.influencer_info === 'object' && record.influencer_info?.decision) || 'pending',
  reason: record.reason || 'Duplicate Attempt',
  createdAt: record.created_at,
});

export const orderService = {
  async listOrders({ limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('orders')
      .select('*,campaigns(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load orders', error);
      throw error;
    }

    return (data ?? []).map(mapRecord);
  },

  async createOrder(orderData) {
    const payload = {
      campaign_id: orderData.campaign_id,
      influencer_name: orderData.influencer_name,
      influencer_email: orderData.influencer_email,
      influencer_handle: orderData.influencer_handle,
      shipping_address: orderData.shipping_address,
      items: orderData.items,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrderShopify(orderId, { shopifyOrderId, orderNumber }) {
    const payload = {
      shopify_order_id: shopifyOrderId,
      shopify_order_number: orderNumber,
      status: 'draft_created'
    };

    console.log('✅ Supabase update payload', { orderId, ...payload });
    const { data, error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .select('id');

    if (error) {
      console.error('❌ Supabase update failed', { orderId, error });
      throw error;
    }
    console.log('✅ Supabase update ok', { orderId, updatedRows: data?.length ?? 0, data });
    return data;
  },

  async checkDuplicate(campaignId, { email, instagram, tiktok }) {
    const filters = [];
    if (email) filters.push(`influencer_email.eq.${email}`);
    if (instagram) filters.push(`influencer_handle.eq.${instagram}`);
    if (tiktok) filters.push(`influencer_handle.eq.${tiktok}`);
    if (!filters.length) return false;

    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('campaign_id', campaignId)
      .or(filters.join(','))
      .limit(1);

    if (error) {
      console.error('Failed to check duplicates', error);
      return false;
    }
    return Boolean(data && data.length);
  },

  async logDuplicateAttempt({ campaignId, influencerInfo, reason }) {
    const payload = {
      campaign_id: campaignId,
      influencer_info: { ...influencerInfo, decision: influencerInfo?.decision || 'pending' },
      reason,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('duplicate_attempts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to log duplicate attempt', error);
      throw error;
    }
    return data;
  },

  async listDuplicateAttempts({ limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('*,campaigns(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load duplicate attempts', error);
      throw error;
    }
    return (data ?? []).map(mapDuplicateRecord);
  },

  async acceptDuplicateAttempt(id) {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Failed to load duplicate attempt for accept', error);
      throw error || new Error('Duplicate attempt not found');
    }

    const info = data.influencer_info || {};
    const orderPayload = {
      campaign_id: data.campaign_id,
      influencer_name: info.name || `${info.firstName || ''} ${info.lastName || ''}`.trim(),
      influencer_email: info.email,
      influencer_handle: info.instagram || info.tiktok || '',
      shipping_address: info.shippingDetails || info.address,
      items: info.items || []
    };

    await this.createOrder(orderPayload);

    const { error: deleteError } = await supabase
      .from('duplicate_attempts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete duplicate attempt after accept', deleteError);
    }
  },

  async declineDuplicateAttempt(id) {
    const { error } = await supabase
      .from('duplicate_attempts')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to decline duplicate attempt', error);
      throw error;
    }
  },

  async setDuplicateDecision(id, decision = 'pending') {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('influencer_info')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Failed to load duplicate attempt for update', error);
      return;
    }
    const currentInfo = data?.influencer_info || {};
    const nextInfo = { ...currentInfo, decision };
    const { error: updateError } = await supabase
      .from('duplicate_attempts')
      .update({ influencer_info: nextInfo })
      .eq('id', id);
    if (updateError) {
      console.error('Failed to set duplicate decision', updateError);
    }
  }
};
