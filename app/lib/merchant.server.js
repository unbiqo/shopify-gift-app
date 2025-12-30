const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return { supabaseUrl, serviceKey };
};

const buildHeaders = (serviceKey) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
});

export const getMerchantByShop = async (shop) => {
  const config = getSupabaseConfig();
  if (!config || !shop) return null;
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/merchants?shop=eq.${encodeURIComponent(
      shop
    )}&select=id,shop,active_plan,total_claims_count,is_trial_active,plan_started_at,shopify_access_token,shopify_scope`,
    { headers: buildHeaders(config.serviceKey) }
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(`Supabase merchant lookup failed: ${response.status}`);
  }
  return Array.isArray(payload) ? payload[0] : payload;
};

export const upsertMerchantSession = async ({ shop, accessToken, scope }) => {
  const config = getSupabaseConfig();
  if (!config || !shop || !accessToken) return;

  const existing = await getMerchantByShop(shop);
  if (!existing) {
    const insertPayload = [
      {
        shop,
        active_plan: "FREE",
        total_claims_count: 0,
        is_trial_active: false,
        plan_started_at: new Date().toISOString(),
        shopify_access_token: accessToken,
        shopify_scope: scope || null,
      },
    ];
    const response = await fetch(`${config.supabaseUrl}/rest/v1/merchants`, {
      method: "POST",
      headers: buildHeaders(config.serviceKey),
      body: JSON.stringify(insertPayload),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(`Supabase merchant insert failed: ${JSON.stringify(payload)}`);
    }
    return;
  }

  const updatePayload = {
    shopify_access_token: accessToken,
    shopify_scope: scope || existing.shopify_scope || null,
  };
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/merchants?shop=eq.${encodeURIComponent(shop)}`,
    {
      method: "PATCH",
      headers: buildHeaders(config.serviceKey),
      body: JSON.stringify(updatePayload),
    }
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(`Supabase merchant update failed: ${JSON.stringify(payload)}`);
  }
};
