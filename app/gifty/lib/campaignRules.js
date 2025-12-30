const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCountry = (value = '') => value.trim().toLowerCase();

export const getItemLimit = (campaign = {}) => {
  const limit = normalizeNumber(campaign.itemLimit);
  if (!limit || limit <= 0) return 1;
  return Math.max(1, Math.floor(limit));
};

export const getMaxCartValue = (campaign = {}) => {
  const maxValue = normalizeNumber(campaign.maxCartValue);
  return maxValue && maxValue > 0 ? maxValue : null;
};

export const getOrderLimit = (campaign = {}) => {
  const limit = normalizeNumber(campaign.orderLimitPerLink);
  return limit && limit > 0 ? Math.floor(limit) : null;
};

export const getSelectedTotal = (items = []) => {
  return items.reduce((sum, item) => {
    const raw = item?.price ?? item?.value ?? item?.amount ?? 0;
    const numeric = typeof raw === 'string'
      ? Number(raw.replace(/[^0-9.]/g, ''))
      : Number(raw);
    if (!Number.isFinite(numeric)) return sum;
    return sum + numeric;
  }, 0);
};

export const isMaxCartExceeded = (campaign = {}, items = []) => {
  const maxValue = getMaxCartValue(campaign);
  if (!maxValue) return false;
  return getSelectedTotal(items) > maxValue;
};

export const parseRestrictedCountries = (value = '') => {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((entry) => normalizeCountry(entry))
      .filter(Boolean)
  );
};

export const isCountryAllowed = (campaign = {}, countryName = '') => {
  if (!countryName) return { allowed: true, reason: '' };
  const normalizedCountry = normalizeCountry(countryName);
  const restricted = parseRestrictedCountries(campaign.restrictedCountries);

  if (restricted.has(normalizedCountry)) {
    return {
      allowed: false,
      reason: `Sorry, this campaign does not ship to ${countryName}.`
    };
  }

  const shippingZone = campaign.shippingZone;
  if (shippingZone && shippingZone !== 'World') {
    const normalizedZone = normalizeCountry(shippingZone);
    if (normalizedZone !== normalizedCountry) {
      return {
        allowed: false,
        reason: `Sorry, this campaign is only available in ${shippingZone}.`
      };
    }
  }

  return { allowed: true, reason: '' };
};

export const isOrderLimitReached = (campaign = {}) => {
  const limit = getOrderLimit(campaign);
  if (!limit) return false;
  const count = Number(campaign.claimsCount ?? campaign.claims_count ?? 0);
  if (!Number.isFinite(count)) return false;
  return count >= limit;
};

export const shouldBlockDuplicateOrders = (campaign = {}) =>
  Boolean(campaign.blockDuplicateOrders);
