import { supabase } from '../lib/supabaseClient';

// --- STATIC PRODUCT CATALOG ---
const PRODUCT_CATALOG = [
  { id: 'p1', title: 'Vintage Leather Jacket', price: 650, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600', variantId: 'gid://shopify/ProductVariant/42687186927706' },
  { id: 'p2', title: 'Performance Energy Drink', price: 45, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300', variantId: 'gid://shopify/ProductVariant/42687186927706' },
  { id: 'p3', title: 'Hydrating Face Cream', price: 120, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300', variantId: 'gid://shopify/ProductVariant/42687186927706' },
  { id: 'p4', title: 'Ceramic Diffuser', price: 55, image: 'https://images.unsplash.com/photo-1595433707802-68267d349c2d?auto=format&fit=crop&q=80&w=600', variantId: 'gid://shopify/ProductVariant/42687186927706' },
  { id: 'p5', title: 'Silk Pillowcase', price: 85, image: 'https://images.unsplash.com/photo-1576014131795-d4c3a283033f?auto=format&fit=crop&q=80&w=300', variantId: 'gid://shopify/ProductVariant/42687186927706' },
  { id: 'p6', title: 'Matcha Kit (Sold Out)', price: 40, image: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&q=80&w=300', variantId: 'gid://shopify/ProductVariant/42687186927706' },
];

const buildConfigFromCampaignData = (campaignData = {}) => {
  return {
    selectedProductIds: campaignData.selectedProductIds || [],
    brandName: campaignData.brandName || '',
    itemLimit: campaignData.itemLimit || 1,
    orderLimitPerLink: campaignData.orderLimitPerLink ? parseInt(campaignData.orderLimitPerLink, 10) : null,
    maxCartValue: campaignData.maxCartValue ? parseFloat(campaignData.maxCartValue) : null,
    blockDuplicateOrders: Boolean(campaignData.blockDuplicateOrders),
    shippingZone: campaignData.shippingZone || '',
    restrictedCountries: campaignData.restrictedCountries || '',
    showPhoneField: Boolean(campaignData.showPhoneField),
    showInstagramField: Boolean(campaignData.showInstagramField),
    showTiktokField: Boolean(campaignData.showTiktokField),
    askCustomQuestion: Boolean(campaignData.askCustomQuestion),
    customQuestionLabel: campaignData.customQuestionLabel || '',
    customQuestionRequired: Boolean(campaignData.customQuestionRequired),
    showConsentCheckbox: Boolean(campaignData.showConsentCheckbox),
    termsConsentText: campaignData.termsConsentText || '',
    requireSecondConsent: Boolean(campaignData.requireSecondConsent),
    secondConsentText: campaignData.secondConsentText || '',
    emailOptIn: Boolean(campaignData.emailOptIn),
    emailConsentText: campaignData.emailConsentText || '',
    submitButtonText: campaignData.submitButtonText || '',
    linkToStore: campaignData.linkToStore || '',
    linkText: campaignData.linkText || '',
    gridTwoByTwo: 'gridTwoByTwo' in campaignData ? Boolean(campaignData.gridTwoByTwo) : true,
    showSoldOut: 'showSoldOut' in campaignData ? Boolean(campaignData.showSoldOut) : true,
    hideInactiveProducts: 'hideInactiveProducts' in campaignData
      ? Boolean(campaignData.hideInactiveProducts)
      : true,
  };
};

const mapCampaignConfig = (config = {}) => ({
  selectedProductIds: config.selectedProductIds || [],
  itemLimit: config.itemLimit || 1,
  orderLimitPerLink: config.orderLimitPerLink ?? null,
  maxCartValue: config.maxCartValue ?? null,
  blockDuplicateOrders: config.blockDuplicateOrders ?? false,
  shippingZone: config.shippingZone || '',
  restrictedCountries: config.restrictedCountries || '',
  showPhoneField: config.showPhoneField ?? false,
  showInstagramField: config.showInstagramField ?? false,
  showTiktokField: config.showTiktokField ?? false,
  askCustomQuestion: config.askCustomQuestion ?? false,
  customQuestionLabel: config.customQuestionLabel || '',
  customQuestionRequired: config.customQuestionRequired ?? false,
  showConsentCheckbox: config.showConsentCheckbox ?? false,
  termsConsentText: config.termsConsentText || '',
  requireSecondConsent: config.requireSecondConsent ?? false,
  secondConsentText: config.secondConsentText || '',
  emailOptIn: config.emailOptIn ?? false,
  emailConsentText: config.emailConsentText || '',
  submitButtonText: config.submitButtonText || '',
  linkToStore: config.linkToStore || '',
  linkText: config.linkText || '',
  gridTwoByTwo: config.gridTwoByTwo ?? true,
  showSoldOut: config.showSoldOut ?? true,
  hideInactiveProducts: config.hideInactiveProducts ?? true,
  brandName: config.brandName || '',
});

export const campaignService = {
  
  /**
   * INFLUENCER VIEW: Fetch a campaign by its public link (slug)
   */
  async getCampaignBySlug(slug) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }

    const config = mapCampaignConfig(data.config || {});
    const selectedProductIds = Array.isArray(data.selected_product_ids)
      ? data.selected_product_ids
      : (data.selectedProductIds || config.selectedProductIds);

    return {
      id: data.id,
      merchantId: data.merchant_id || data.merchantId || null,
      shop: data.shop || data.shop_domain || data.shopDomain || null,
      name: data.name,
      slug: data.slug,
      welcomeMessage: data.welcome_message,
      brandName: config.brandName || data.brand_name || '',
      brandColor: data.brand_color,
      claimsCount: data.claims_count ?? 0,
      ...config,
      selectedProductIds,
    };
  },

  /**
   * ADMIN DASHBOARD: Fetch all campaigns
   */
  async getAllCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .neq('status', 'archived');
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
    return data;
  },

  /**
   * ADMIN BUILDER: Create a new campaign
   * Maps camelCase frontend state to snake_case DB columns
   */
  async createCampaign(campaignData) {
    const config = buildConfigFromCampaignData(campaignData);
    const payload = {
      name: campaignData.name,
      slug: campaignData.slug,
      welcome_message: campaignData.welcomeMessage,
      brand_color: campaignData.brandColor,
      shop: campaignData.shop || null,
      merchant_id: campaignData.merchantId || null,
      config,
      selected_product_ids: campaignData.selectedProductIds || [],
      status: 'active',
      claims_count: 0
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * ADMIN DASHBOARD: Soft-delete a campaign by marking its status.
   */
  async deleteCampaign(id) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
    return { id };
  },

  async getCampaignProducts(campaignId) {
    if (!campaignId) return [];
    const { data, error } = await supabase
      .from('campaign_products')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error fetching campaign products:', error);
      return [];
    }

    return (data || []).map((product) => ({
      id: product.product_gid || product.product_id || product.productId || product.gid || '',
      title: product.product_title || product.title || product.productTitle || 'Untitled product',
      imageUrl: product.product_image_url || product.image_url || product.imageUrl || product.original_source || '',
      status: product.product_status || product.status || '',
      availableForSale: product.available_for_sale ?? product.availableForSale ?? null,
      inventoryQuantity: product.inventory_quantity ?? product.inventoryQuantity ?? null
    })).filter((product) => product.id);
  },

  async saveCampaignProducts(campaignId, products = []) {
    if (!campaignId) return [];

    const { error: deleteError } = await supabase
      .from('campaign_products')
      .delete()
      .eq('campaign_id', campaignId);

    if (deleteError) throw deleteError;
    if (!products.length) return [];

    const payload = products.map((product) => ({
      campaign_id: campaignId,
      product_gid: product.id,
      product_title: product.title,
      product_image_url: product.imageUrl || null,
      product_status: product.status || null,
      available_for_sale: product.availableForSale ?? null,
      inventory_quantity: product.inventoryQuantity ?? null
    }));

    const basePayload = payload.map(({ campaign_id, product_gid, product_title, product_image_url }) => ({
      campaign_id,
      product_gid,
      product_title,
      product_image_url
    }));

    const { data, error } = await supabase
      .from('campaign_products')
      .insert(payload)
      .select();

    if (!error) return data;
    if (error?.code !== 'PGRST204') throw error;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('campaign_products')
      .insert(basePayload)
      .select();

    if (fallbackError) throw fallbackError;
    return fallbackData;
  },

  getProducts() {
    return PRODUCT_CATALOG;
  }
};
