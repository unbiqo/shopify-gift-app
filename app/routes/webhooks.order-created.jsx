import { authenticate } from "../shopify.server";

const getSupabaseOrderIdFromNote = (note) => {
  if (!note) return null;
  const text = String(note);
  const match = text.match(/SupabaseOrderId:([a-f0-9-]+)/i);
  return match?.[1] || null;
};

const updateSupabaseOrder = async ({ orderId, orderGid, orderNumber, supabaseOrderId, draftOrderId }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase service credentials are missing.");
    return;
  }

  let query = "";
  if (supabaseOrderId) {
    query = `id=eq.${supabaseOrderId}`;
  } else if (draftOrderId) {
    const draftGid = `gid://shopify/DraftOrder/${draftOrderId}`;
    query = `or=(${`shopify_order_id.eq.${draftOrderId}`},${`shopify_order_id.eq.${draftGid}`})`;
  } else if (orderGid) {
    query = `shopify_order_id.eq.${orderGid}`;
  } else if (orderId) {
    query = `or=(${`shopify_order_id.eq.${orderId}`},${`shopify_order_id.eq.gid://shopify/Order/${orderId}`})`;
  }

  if (!query) {
    console.warn("No Supabase match criteria found for order update.");
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?${query}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      shopify_order_id: orderGid || `gid://shopify/Order/${orderId}`,
      shopify_order_number: orderNumber || null,
      status: "processing",
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Supabase update failed", payload);
    return;
  }

  const updatedRows = Array.isArray(payload) ? payload.length : 0;
  console.log("Supabase order mapped to real order", { orderId, updatedRows });
};

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const orderId = payload?.id || payload?.order_id || payload?.order?.id;
  const orderGid = payload?.admin_graphql_api_id || payload?.order?.admin_graphql_api_id;
  const orderNumber = payload?.name || payload?.order?.name;
  const draftOrderId =
    payload?.draft_order_id ||
    payload?.draftOrderId ||
    payload?.draft_order?.id ||
    payload?.draft_order?.legacyResourceId;
  const supabaseOrderId = getSupabaseOrderIdFromNote(payload?.note);

  await updateSupabaseOrder({
    orderId: orderId ? String(orderId) : null,
    orderGid,
    orderNumber,
    supabaseOrderId,
    draftOrderId: draftOrderId ? String(draftOrderId) : null,
  });

  return new Response(null, { status: 200 });
};
