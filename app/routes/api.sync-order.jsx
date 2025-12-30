import { data as json } from "react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return json({ ok: true }, { headers: corsHeaders });
};

export const action = async ({ request }) => {
  const body = await request.json();
  const { orderId, shopifyOrderId, orderNumber, status = "draft_created" } = body || {};

  if (!orderId || !shopifyOrderId) {
    return json(
      { error: "Missing orderId or shopifyOrderId" },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(
      { error: "Supabase service credentials are missing" },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          shopify_order_id: shopifyOrderId,
          shopify_order_number: orderNumber || null,
          status,
        }),
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return json(
        {
          error: "Supabase update failed",
          details: payload,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    return json(
      {
        ok: true,
        orderId,
        shopifyOrderId,
        orderNumber: orderNumber || null,
        status,
        updatedRows: Array.isArray(payload) ? payload.length : 0,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return json(
      {
        error: "Supabase update failed",
        message: error?.message || "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
};
