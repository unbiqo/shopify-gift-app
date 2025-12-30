import { apiVersion, authenticate, sessionStorage } from "../shopify.server";
import { getMerchantByShop } from "./merchant.server";

const normalizeShopDomain = (value = "") =>
  value.replace(/^https?:\/\//, "").split("/")[0].trim().toLowerCase();

const resolveApiVersion = () =>
  typeof apiVersion === "string" ? apiVersion : String(apiVersion);

const buildAdminClient = (shop, accessToken) => {
  if (!shop || !accessToken) return null;
  const normalizedShop = normalizeShopDomain(shop);
  const version = resolveApiVersion();
  const endpoint = `https://${normalizedShop}/admin/api/${version}/graphql.json`;
  return {
    graphql: async (query, options = {}) => {
      const payload = {
        query: String(query),
        variables: options?.variables || undefined,
      };
      const headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
        ...(options?.headers || {}),
      };
      return fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
  };
};

const loadOfflineAdminClient = async (shop) => {
  if (!sessionStorage?.loadSession) return null;
  const normalizedShop = normalizeShopDomain(shop);
  const offlineSessionId = `offline_${normalizedShop}`;
  const session = await sessionStorage.loadSession(offlineSessionId);
  if (!session?.accessToken) return null;
  return buildAdminClient(shop, session.accessToken);
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
        const adminClient = buildAdminClient(shop, merchant.shopify_access_token);
        if (!adminClient) {
          debug.supabase.error = "Failed to build Shopify admin client.";
        }
        return {
          admin: adminClient,
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
