import { data as json } from "react-router";
import { authenticate } from "../shopify.server";
import { PLAN_KEYS, normalizePlan } from "../gifty/lib/plans";

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return { supabaseUrl, serviceKey };
};

const getActivePlanFromBilling = (billingCheck) => {
  const names = (billingCheck?.appSubscriptions || []).map((sub) =>
    normalizePlan(sub?.name)
  );
  if (names.includes(PLAN_KEYS.UNLIMITED)) return PLAN_KEYS.UNLIMITED;
  if (names.includes(PLAN_KEYS.GROWTH)) return PLAN_KEYS.GROWTH;
  return PLAN_KEYS.FREE;
};

const fetchMerchantByShop = async ({ supabaseUrl, serviceKey, shop }) => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/merchants?shop=eq.${encodeURIComponent(
      shop
    )}&select=id,shop,active_plan,total_claims_count,is_trial_active,plan_started_at`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(`Supabase merchant fetch failed: ${response.status}`);
  }
  return Array.isArray(payload) ? payload[0] : null;
};

const insertMerchant = async ({ supabaseUrl, serviceKey, shop, plan }) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/merchants`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        shop,
        active_plan: plan,
        total_claims_count: 0,
        is_trial_active: false,
        plan_started_at: new Date().toISOString(),
      },
    ]),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(`Supabase merchant insert failed: ${JSON.stringify(payload)}`);
  }
};

const updateMerchantPlan = async ({ supabaseUrl, serviceKey, shop, plan }) => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/merchants?shop=eq.${encodeURIComponent(shop)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        active_plan: plan,
        plan_started_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(`Supabase merchant update failed: ${JSON.stringify(payload)}`);
  }
};

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = session?.shop;
  const billingCheck = await billing.check({ plans: [PLAN_KEYS.GROWTH, PLAN_KEYS.UNLIMITED] });
  const activePlan = getActivePlanFromBilling(billingCheck);

  const supabaseConfig = getSupabaseConfig();
  let totalClaimsCount = 0;
  let merchantId = null;
  let isTrialActive = false;
  let planStartedAt = null;
  if (supabaseConfig && shop) {
    try {
      const existing = await fetchMerchantByShop({
        ...supabaseConfig,
        shop,
      });
      if (!existing) {
        await insertMerchant({ ...supabaseConfig, shop, plan: activePlan });
      } else {
        merchantId = existing.id || null;
        totalClaimsCount = existing.total_claims_count || 0;
        isTrialActive = Boolean(existing.is_trial_active);
        planStartedAt = existing.plan_started_at || null;
        if (normalizePlan(existing.active_plan) !== activePlan) {
          await updateMerchantPlan({ ...supabaseConfig, shop, plan: activePlan });
        }
      }
    } catch (error) {
      console.error("Failed to sync merchant plan", error);
    }
  }

  return json({
    shop,
    activePlan,
    totalClaimsCount,
    merchantId,
    isTrialActive,
    planStartedAt,
  });
};
