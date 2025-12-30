import { authenticate } from "../shopify.server";

const updateSupabaseOrder = async ({ orderId }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase service credentials are missing.");
    return;
  }

  const gid = `gid://shopify/Order/${orderId}`;
  const params = new URLSearchParams({
    or: `(${`shopify_order_id.eq.${orderId}`},${`shopify_order_id.eq.${gid}`})`,
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?${params.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "shipped" }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Supabase update failed", payload);
    return;
  }

  const updatedRows = Array.isArray(payload) ? payload.length : 0;
  console.log("Supabase order shipped update", { orderId, updatedRows });
};

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const orderId =
    payload?.order_id ||
    payload?.order?.id ||
    payload?.orderId ||
    payload?.order?.legacyResourceId;

  if (!orderId) {
    console.warn("Fulfillment webhook missing order_id", payload);
    return new Response(null, { status: 200 });
  }

  await updateSupabaseOrder({ orderId: String(orderId) });
  return new Response(null, { status: 200 });
};
