import { authenticate } from "../shopify.server";

const updateSupabaseOrder = async ({ draftId, draftGid }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase service credentials are missing.");
    return;
  }

  const numericId = draftId ? String(draftId) : "";
  const gid = draftGid || (numericId ? `gid://shopify/DraftOrder/${numericId}` : "");
  const query = gid
    ? `or=(${`shopify_order_id.eq.${numericId}`},${`shopify_order_id.eq.${gid}`})`
    : `shopify_order_id.eq.${numericId}`;

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?${query}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Supabase update failed", payload);
    return;
  }

  const updatedRows = Array.isArray(payload) ? payload.length : 0;
  console.log("Supabase draft order cancelled update", { draftId, updatedRows });
};

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const draftId = payload?.id || payload?.draft_order_id;
  const draftGid = payload?.admin_graphql_api_id;

  if (!draftId && !draftGid) {
    console.warn("Draft order deleted webhook missing id", payload);
    return new Response(null, { status: 200 });
  }

  await updateSupabaseOrder({ draftId, draftGid });
  return new Response(null, { status: 200 });
};
