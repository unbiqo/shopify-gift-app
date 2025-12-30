import { data as json } from "react-router";

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return { supabaseUrl, serviceKey };
};

const fetchMerchant = async ({ supabaseUrl, serviceKey, shop, merchantId }) => {
  const params = shop
    ? `shop=eq.${encodeURIComponent(shop)}`
    : `id=eq.${encodeURIComponent(merchantId)}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/merchants?${params}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(`Supabase merchant fetch failed: ${response.status}`);
  }
  return Array.isArray(payload) ? payload[0] : null;
};

const updateMerchantClaims = async ({ supabaseUrl, serviceKey, shop, merchantId, totalClaimsCount }) => {
  const params = shop
    ? `shop=eq.${encodeURIComponent(shop)}`
    : `id=eq.${encodeURIComponent(merchantId)}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/merchants?${params}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ total_claims_count: totalClaimsCount }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase merchant update failed: ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload[0] : payload;
};

const insertMerchant = async ({ supabaseUrl, serviceKey, shop, merchantId, totalClaimsCount }) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/merchants`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        id: merchantId || undefined,
        shop: shop || null,
        active_plan: "FREE",
        total_claims_count: totalClaimsCount,
      },
    ]),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase merchant insert failed: ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload[0] : payload;
};

export const action = async ({ request }) => {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return json({ ok: false, error: "Supabase service credentials missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { shop, merchantId, delta = 1 } = body || {};
  if (!shop && !merchantId) {
    return json({ ok: false, error: "Missing shop or merchantId." }, { status: 400 });
  }

  try {
    const merchant = await fetchMerchant({ ...supabaseConfig, shop, merchantId });
    const currentCount = merchant?.total_claims_count || 0;
    const nextCount = currentCount + Number(delta || 0);
    if (!merchant) {
      const inserted = await insertMerchant({
        ...supabaseConfig,
        shop,
        merchantId,
        totalClaimsCount: nextCount,
      });
      return json({ ok: true, totalClaimsCount: inserted?.total_claims_count ?? nextCount });
    }
    const updated = await updateMerchantClaims({
      ...supabaseConfig,
      shop,
      merchantId,
      totalClaimsCount: nextCount,
    });
    return json({ ok: true, totalClaimsCount: updated?.total_claims_count ?? nextCount });
  } catch (error) {
    console.error("Failed to update merchant claims", error);
    return json({ ok: false, error: "Failed to update merchant claims." }, { status: 500 });
  }
};
