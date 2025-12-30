import shopify, { authenticate, sessionStorage } from "../shopify.server";
import { getMerchantByShop } from "./merchant.server";

const buildAdminClient = (shop, accessToken) => {
  const session = shopify.api.session.customAppSession(shop);
  session.accessToken = accessToken;
  return new shopify.api.clients.Graphql({ session });
};

const loadOfflineAdminClient = async (shop) => {
  const offlineSessionId = shopify.api.session.getOfflineId(shop);
  const session = await sessionStorage.loadSession(offlineSessionId);
  if (!session?.accessToken) return null;
  return new shopify.api.clients.Graphql({ session });
};

export const getAdminClient = async ({ request, shop }) => {
  if (request) {
    try {
      const { admin } = await authenticate.admin(request);
      if (admin) return admin;
    } catch (error) {
      // Fall through to token-based auth for public requests.
    }
  }

  if (!shop) return null;

  try {
    const merchant = await getMerchantByShop(shop);
    if (merchant?.shopify_access_token) {
      return buildAdminClient(shop, merchant.shopify_access_token);
    }
  } catch (error) {
    console.error("Failed to load merchant token", error);
  }

  try {
    return await loadOfflineAdminClient(shop);
  } catch (error) {
    console.error("Failed to load offline session", error);
    return null;
  }
};
