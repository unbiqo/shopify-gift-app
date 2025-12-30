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

const isDebugRequested = (request) => {
  if (!request) return false;
  try {
    const url = new URL(request.url);
    return url.searchParams.get("debug") === "1";
  } catch {
    return false;
  }
};

export const getAdminClientResult = async ({ request, shop }) => {
  const debugEnabled = isDebugRequested(request);
  const debug = {
    shop,
    appBridge: { attempted: false, success: false, error: null },
    supabase: {
      attempted: false,
      configPresent: Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      merchantFound: false,
      hasToken: false,
      error: null,
    },
    prismaSession: { attempted: false, sessionFound: false, error: null },
  };

  if (request) {
    debug.appBridge.attempted = true;
    try {
      const { admin } = await authenticate.admin(request);
      if (admin) {
        debug.appBridge.success = true;
        return { admin, debug: debugEnabled ? debug : null };
      }
    } catch (error) {
      debug.appBridge.error = error?.message || String(error);
    }
  }

  if (!shop) return { admin: null, debug: debugEnabled ? debug : null };

  if (debug.supabase.configPresent) {
    debug.supabase.attempted = true;
    try {
      const merchant = await getMerchantByShop(shop);
      debug.supabase.merchantFound = Boolean(merchant);
      debug.supabase.hasToken = Boolean(merchant?.shopify_access_token);
      if (merchant?.shopify_access_token) {
        return {
          admin: buildAdminClient(shop, merchant.shopify_access_token),
          debug: debugEnabled ? debug : null,
        };
      }
    } catch (error) {
      debug.supabase.error = error?.message || String(error);
    }
  }

  debug.prismaSession.attempted = true;
  try {
    const admin = await loadOfflineAdminClient(shop);
    debug.prismaSession.sessionFound = Boolean(admin);
    return { admin, debug: debugEnabled ? debug : null };
  } catch (error) {
    debug.prismaSession.error = error?.message || String(error);
    return { admin: null, debug: debugEnabled ? debug : null };
  }
};

export const getAdminClient = async ({ request, shop }) => {
  const result = await getAdminClientResult({ request, shop });
  return result.admin;
};
