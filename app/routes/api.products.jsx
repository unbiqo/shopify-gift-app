import { data as json } from "react-router";
import shopify, { authenticate } from "../shopify.server";
import { getMerchantByShop } from "../lib/merchant.server";

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

  let admin;
  try {
    ({ admin } = await authenticate.admin(request));
  } catch (error) {
    if (!shop) {
      throw error;
    }
    const merchant = await getMerchantByShop(shop);
    if (!merchant?.shopify_access_token) {
      throw error;
    }
    const session = shopify.api.session.customAppSession(shop);
    session.accessToken = merchant.shopify_access_token;
    admin = new shopify.api.clients.Graphql({ session });
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

    return json({ products }, { headers: corsHeaders });
  } catch (error) {
    return json(
      {
        error: "Shopify request failed",
        message: error?.message || "Unknown error",
        details: error?.response?.errors || error?.errors || null,
      },
      { status: 400, headers: corsHeaders },
    );
  }
};
