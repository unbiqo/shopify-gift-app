import { data as json } from "react-router";
import { getAdminClientResult } from "../lib/shopify-admin.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                status
                featuredImage {
                  url
                  altText
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      legacyResourceId
                      price
                      availableForSale
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }`,
      { variables: { first: 50 } },
    );

    const responseJson = await response.json();
    const edges = responseJson.data?.products?.edges || [];
    const products = edges
      .map(({ node }) => {
        const variant = node.variants?.edges?.[0]?.node;
        if (!variant) return null;
        return {
          id: String(variant.legacyResourceId ?? variant.id),
          variantId: variant.id,
          variantLegacyId: variant.legacyResourceId,
          title: node.title,
          price: variant.price,
          image: node.featuredImage?.url || "",
          status: node.status || "ACTIVE",
          availableForSale: variant.availableForSale ?? true,
          inventoryQuantity: variant.inventoryQuantity ?? null,
        };
      })
      .filter(Boolean);

    const payload = { products };
    if (debugEnabled) {
      payload.debug = {
        auth: debug || null,
        shopifyErrors: responseJson.errors || null,
        edgesCount: edges.length,
        productsCount: products.length,
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
