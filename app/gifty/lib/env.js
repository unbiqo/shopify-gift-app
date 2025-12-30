const getEnvValue = (key, fallback = '') => {
  if (typeof window !== 'undefined' && window.__ENV) {
    return window.__ENV[key] ?? fallback
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? fallback
  }
  return fallback
}

export const env = {
  VITE_GIFT_BRIDGE_URL: getEnvValue('VITE_GIFT_BRIDGE_URL'),
  VITE_SHOPIFY_SHOP: getEnvValue('VITE_SHOPIFY_SHOP'),
  VITE_SHOPIFY_ORDER_MODE: getEnvValue('VITE_SHOPIFY_ORDER_MODE'),
  VITE_FORCE_SHOPIFY_DRAFT: getEnvValue('VITE_FORCE_SHOPIFY_DRAFT'),
  VITE_SHOPIFY_API_KEY: getEnvValue('VITE_SHOPIFY_API_KEY'),
  VITE_SUPABASE_URL: getEnvValue('VITE_SUPABASE_URL'),
  VITE_SUPABASE_KEY: getEnvValue('VITE_SUPABASE_KEY'),
  VITE_GOOGLE_MAPS_KEY: getEnvValue('VITE_GOOGLE_MAPS_KEY')
}
