import { data as json } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "../shopify.server";

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return { supabaseUrl, serviceKey };
};

const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;

  try {
    const parsed = typeof items === "string" ? JSON.parse(items) : items;
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
  if (!status) return "pending";
  if (status === "synced") return "draft_created";
  if (status === "fulfilled") return "shipped";
  return status;
};

const mapRecord = (record) => ({
  id: record.id,
  campaignId: record.campaign_id,
  campaignName: record.campaigns?.name || "Standard Campaign",
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

const parseConsentParam = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const getStartDateForPeriod = (timePeriod) => {
  const now = new Date();
  const start = new Date(now);
  switch (timePeriod) {
    case "day":
      start.setDate(now.getDate() - 1);
      return start;
    case "week":
      start.setDate(now.getDate() - 7);
      return start;
    case "month":
      start.setMonth(now.getMonth() - 1);
      return start;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      return start;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      return start;
    default:
      return null;
  }
};

const SORT_FIELDS = {
  date: "created_at",
  status: "status",
  value: "value",
};

const applyStatusFilter = (query, status) => {
  if (!status || status === "all") return query;
  if (status === "draft_created") {
    return query.in("status", ["draft_created", "synced"]);
  }
  if (status === "shipped") {
    return query.in("status", ["shipped", "fulfilled"]);
  }
  return query.eq("status", status);
};

export const loader = async ({ request }) => {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return json(
      { error: "Supabase service credentials missing." },
      { status: 500 },
    );
  }

  let session;
  try {
    ({ session } = await authenticate.admin(request));
  } catch (error) {
    return json(
      { error: "Missing Shopify session." },
      { status: 401 },
    );
  }

  if (!session?.shop) {
    return json(
      { error: "Missing Shopify session." },
      { status: 401 },
    );
  }

  const supabase = createClient(
    supabaseConfig.supabaseUrl,
    supabaseConfig.serviceKey,
    { auth: { persistSession: false } },
  );

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("id,shopify_access_token")
    .eq("shop", session.shop)
    .maybeSingle();

  if (merchantError) {
    console.error("Failed to verify merchant", merchantError);
    return json(
      { error: "Failed to verify merchant." },
      { status: 500 },
    );
  }

  if (!merchant?.shopify_access_token) {
    return json(
      { error: "Missing Shopify access token." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const campaignName = url.searchParams.get("campaign_name")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const consentParam = url.searchParams.get("consent");
  const sortBy = url.searchParams.get("sort_by") || "date";
  const sortDirection = url.searchParams.get("sort_direction") || "desc";
  const timePeriod = url.searchParams.get("time_period") || "year";

  let query = supabase
    .from("orders")
    .select(
      "id,campaign_id,created_at,influencer_email,influencer_phone,influencer_handle_instagram,influencer_handle_tiktok,influencer_handle,influencer_tiktok,influencer_name,items,shipping_address,shopify_order_id,shopify_order_number,shopify_fulfillment_id,status,terms_consent_accepted,terms_consent,marketing_opt_in_accepted,marketing_opt_in,campaigns!inner(name,shop)",
    )
    .eq("campaigns.shop", session.shop);

  if (campaignName && campaignName !== "all") {
    query = query.eq("campaigns.name", campaignName);
  }

  if (status && status !== "all") {
    query = applyStatusFilter(query, status);
  }

  const consent = parseConsentParam(consentParam);
  if (consent === true) {
    query = query.or("terms_consent_accepted.eq.true,terms_consent.eq.true");
  } else if (consent === false) {
    query = query.or(
      "terms_consent_accepted.eq.false,terms_consent.eq.false,terms_consent_accepted.is.null,terms_consent.is.null",
    );
  }

  const startDate = getStartDateForPeriod(timePeriod);
  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  const sortField = SORT_FIELDS[sortBy] || SORT_FIELDS.date;
  query = query.order(sortField, { ascending: sortDirection === "asc" });

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load orders", error);
    return json({ error: "Failed to load orders." }, { status: 500 });
  }

  return json({ orders: (data || []).map(mapRecord) });
};
