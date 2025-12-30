import { data as json } from "react-router";
import { getAdminClientResult } from "../lib/shopify-admin.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const debugEnabled = url.searchParams.get("debug") === "1";

  const { admin, debug } = await getAdminClientResult({ request, shop });
  if (!admin) {
    const payload = {
      error: shop
        ? "Missing Shopify access token for this shop."
        : "Missing shop query parameter.",
    };
    if (debug) payload.debug = debug;
    return json(payload, { status: shop ? 401 : 400, headers: corsHeaders });
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query getWebhooks($first: Int!) {
          webhookSubscriptions(first: $first) {
            edges {
              node {
                id
                topic
                endpoint {
                  __typename
                  ... on WebhookHttpEndpoint {
                    callbackUrl
                  }
                }
              }
            }
          }
        }`,
      { variables: { first: 50 } },
    );

    const responseJson = await response.json();
    const edges = responseJson.data?.webhookSubscriptions?.edges || [];
    const webhooks = edges.map(({ node }) => ({
      id: node.id,
      topic: node.topic,
      endpointType: node.endpoint?.__typename || null,
      callbackUrl: node.endpoint?.callbackUrl || null,
    }));

    const payload = { webhooks };
    if (debugEnabled) {
      payload.debug = {
        auth: debug || null,
        shopifyErrors: responseJson.errors || null,
        webhooksCount: webhooks.length,
      };
    }
    return json(payload, { headers: corsHeaders });
  } catch (error) {
    const payload = {
      error: "Shopify request failed",
      message: error?.message || "Unknown error",
      details: error?.response?.errors || error?.errors || null,
    };
    if (debugEnabled) payload.debug = { auth: debug || null };
    return json(payload, { status: 400, headers: corsHeaders });
  }
};
