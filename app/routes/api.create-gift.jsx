import { data as json } from "react-router";
import { getAdminClient } from "../lib/shopify-admin.server";

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
  // 1. Get the data sent from your React UI
  const body = await request.json();
  const {
    shop,
    variantId,
    email,
    orderId,
    shippingAddress,
    influencerInfo = {},
    orderMode = "draft",
  } = body;
  const sanitizedShippingAddress = shippingAddress
    ? {
        address1: shippingAddress.address1 || shippingAddress.line1 || "",
        address2: shippingAddress.address2 || shippingAddress.line2 || "",
        city: shippingAddress.city || "",
        province: shippingAddress.province || shippingAddress.state || "",
        provinceCode: shippingAddress.provinceCode || "",
        country: shippingAddress.country || "",
        countryCode:
          shippingAddress.countryCode ||
          (typeof shippingAddress.country === "string" &&
          shippingAddress.country.length === 2
            ? shippingAddress.country
            : ""),
        zip: shippingAddress.zip || shippingAddress.postalCode || "",
        firstName: shippingAddress.firstName || "",
        lastName: shippingAddress.lastName || "",
        phone: shippingAddress.phone || "",
        company: shippingAddress.company || "",
      }
    : null;

  // 2. Access Shopify WITHOUT a browser session (The "Bridge" power)
  const admin = await getAdminClient({ request, shop });
  if (!admin) {
    return json(
      {
        error: shop
          ? "Missing Shopify access token for this shop."
          : "Missing Shopify shop domain for this request.",
      },
      { status: shop ? 401 : 400, headers: corsHeaders }
    );
  }

  try {
    const noteParts = ["Gifty Influencer Fulfillment"];
    if (influencerInfo?.name) noteParts.push(`Name: ${influencerInfo.name}`);
    if (influencerInfo?.handle) noteParts.push(`Handle: ${influencerInfo.handle}`);
    if (influencerInfo?.email) noteParts.push(`Email: ${influencerInfo.email}`);

    if (orderId) {
      noteParts.push(`SupabaseOrderId:${orderId}`);
    }
    const response =
      orderMode === "order"
        ? await admin.graphql(
            `#graphql
            mutation orderCreate($input: OrderInput!) {
              orderCreate(input: $input) {
                order { id name }
                userErrors { message field }
              }
            }`,
            {
              variables: {
                input: {
                  email: email,
                  note: noteParts.join(" | "),
                  lineItems: [{ variantId: variantId, quantity: 1 }],
                  shippingAddress: sanitizedShippingAddress,
                  tags: ["Gifty-Influencer-Claim"],
                },
              },
            }
          )
        : await admin.graphql(
            `#graphql
            mutation draftOrderCreate($input: DraftOrderInput!) {
              draftOrderCreate(input: $input) {
                draftOrder { id name }
                userErrors { message }
              }
            }`,
            {
              variables: {
                input: {
                  email: email,
                  note: noteParts.join(" | "),
                  lineItems: [{ variantId: variantId, quantity: 1 }],
                  shippingAddress: sanitizedShippingAddress,
                  tags: ["Gifty-Influencer-Claim"],
                  appliedDiscount: {
                    title: "Influencer Gift",
                    value: 100,
                    valueType: "PERCENTAGE",
                  },
                },
              },
            }
          );

    const responseJson = await response.json();
    const draftOrder = responseJson.data?.draftOrderCreate?.draftOrder;
    const order = responseJson.data?.orderCreate?.order;
    const data = draftOrder || order;
    const userErrors =
      responseJson.data?.draftOrderCreate?.userErrors ||
      responseJson.data?.orderCreate?.userErrors ||
      [];

    if (userErrors.length) {
      console.warn("Shopify userErrors", { shop, orderMode, userErrors });
      return json(
        {
          error: "Shopify request failed",
          message: userErrors[0]?.message || "Unknown error",
          details: userErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!data) {
      console.error("Shopify response missing data", {
        shop,
        orderMode,
        responseJson,
      });
      return json(
        {
          error: "Shopify request failed",
          message: "Draft order response missing",
          details: responseJson,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    return json(
      {
        ok: true,
        shopifyOrderId: data.id,
        orderNumber: data.name,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Shopify request failed", {
      shop,
      orderMode,
      message: error?.message,
      details: error?.response?.errors || error?.errors || null,
      error,
    });
    return json(
      {
        error: "Shopify request failed",
        message: error?.message || "Unknown error",
        details: error?.response?.errors || error?.errors || null,
      },
      { status: 400, headers: corsHeaders }
    );
  }
};
