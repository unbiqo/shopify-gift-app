import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Layout, Package, Palette, Settings, ChevronRight, ChevronLeft,
  Info, Plus, Home, Users, Download,
  AlertTriangle, CheckCircle, Search,
  Loader2, Shield, MapPin, ShoppingCart, DollarSign, Globe, FileText,
  Signal, Wifi, Battery, RefreshCw, ArrowUpDown, Edit3, CircleHelp
} from 'lucide-react';
import { googleAddressService } from './services/googleAddressService';
import { orderService } from './services/orderService';
import { campaignService } from './services/campaignService';
import { merchantService } from './services/merchantService';
import { COUNTRY_OPTIONS } from './constants/countries';
import { supabase } from './lib/supabaseClient';
import { CampaignProductPicker } from './components/CampaignProductPicker';
import { env } from './lib/env';
import {
  getItemLimit,
  getMaxCartValue,
  isCountryAllowed,
  isMaxCartExceeded,
  isOrderLimitReached,
  shouldBlockDuplicateOrders
} from './lib/campaignRules';
import {
  PLAN_DEFINITIONS,
  PLAN_KEYS,
  getNextPlan,
  getUsagePercent
} from './lib/plans';

const GIFT_BRIDGE_URL = env.VITE_GIFT_BRIDGE_URL;
const SHOPIFY_SHOP = env.VITE_SHOPIFY_SHOP;
const SHOW_PLANS = false;

const fetchWithShopifyToken = async (input, init = {}) => {
  if (typeof window === 'undefined' || !window.shopify?.idToken) {
    return fetch(input, init);
  }
  const token = await window.shopify.idToken();
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
  return fetch(input, { ...init, headers });
};

/**
 * ==========================================
 * SECTION 4: UI COMPONENTS & APP
 * ==========================================
 */

const PRIMARY_SHIPPING_ZONES = [
  'World',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia'
];
const SHIPPING_ZONES = [
  ...PRIMARY_SHIPPING_ZONES,
  ...COUNTRY_OPTIONS.map((country) => country.name).filter(
    (name) => !PRIMARY_SHIPPING_ZONES.includes(name)
  )
];
const MIN_ADDRESS_LENGTH = 10;

const campaignShape = {
  askCustomQuestion: PropTypes.bool,
  brandColor: PropTypes.string,
  brandLogo: PropTypes.string,
  brandName: PropTypes.string,
  customQuestionLabel: PropTypes.string,
  customQuestionRequired: PropTypes.bool,
  gridTwoByTwo: PropTypes.bool,
  hideInactiveProducts: PropTypes.bool,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  linkText: PropTypes.string,
  linkToStore: PropTypes.string,
  merchantId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  requireSecondConsent: PropTypes.bool,
  secondConsentText: PropTypes.string,
  selectedProductIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),
  shippingZone: PropTypes.string,
  shop: PropTypes.string,
  showConsentCheckbox: PropTypes.bool,
  showInstagramField: PropTypes.bool,
  showPhoneField: PropTypes.bool,
  showSoldOut: PropTypes.bool,
  showTiktokField: PropTypes.bool,
  submitButtonText: PropTypes.string,
  termsConsentText: PropTypes.string,
  welcomeMessage: PropTypes.string
};

const campaignConfigShape = {
  ...campaignShape,
  allowQuantitySelector: PropTypes.bool,
  blockDuplicateOrders: PropTypes.bool,
  customerTags: PropTypes.string,
  discountCode: PropTypes.string,
  emailConsentText: PropTypes.string,
  emailOptIn: PropTypes.bool,
  enableBilling: PropTypes.bool,
  itemLimit: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  keepDraft: PropTypes.bool,
  maxCartValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  orderLimitPerLink: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  orderTags: PropTypes.string,
  restrictedCountries: PropTypes.string,
  slug: PropTypes.string
};

const merchantUsageShape = {
  activePlan: PropTypes.string,
  limitReached: PropTypes.bool,
  merchantId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shop: PropTypes.string,
  totalClaimsCount: PropTypes.number
};

const usageShape = {
  limitReached: PropTypes.bool
};

const Toggle = ({ enabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
      enabled ? 'bg-indigo-600' : 'bg-gray-200'
    }`}
  >
    <span className="sr-only">{label}</span>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

Toggle.propTypes = {
  enabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired
};

const RuleSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
      <Icon size={16} className="text-indigo-600" />
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</span>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

RuleSection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired
};

const RuleToggle = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2 mr-4">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && (
        <div className="group relative flex items-center">
          <Info size={14} className="text-gray-400 hover:text-indigo-600 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
            {description}
          </div>
        </div>
      )}
    </div>
    <Toggle enabled={enabled} onChange={onChange} label={label} />
  </div>
);

RuleToggle.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  enabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700'
  },
  draft_created: {
    label: 'Draft Created',
    className: 'bg-blue-50 text-blue-700'
  },
  processing: {
    label: 'Processing',
    className: 'bg-orange-50 text-orange-700'
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-green-50 text-green-700'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700'
  }
};

const STATUS_TOOLTIPS = {
  pending: 'Not yet in Shopify.',
  draft_created: 'Order is in Drafts; waiting for merchant review.',
  processing: 'Draft finalized; awaiting fulfillment.',
  shipped: 'Package is on its way.',
  cancelled: 'Order/Draft was deleted or voided.'
};

const normalizeStatus = (status) => {
  if (!status) return 'pending';
  if (status === 'synced') return 'draft_created';
  if (status === 'fulfilled') return 'shipped';
  return status;
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.pending;
  const tooltip = STATUS_TOOLTIPS[normalized];

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
      {tooltip && (
        <span className="relative group inline-flex">
          <CircleHelp size={14} className="text-gray-400" />
          <span className="absolute left-1/2 top-full mt-2 w-52 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {tooltip}
          </span>
        </span>
      )}
    </div>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string
};

/* --- CLAIM EXPERIENCE --- */
const ClaimExperience = ({ campaign, products, isPreview = false, onSubmit, usage }) => {
  const sanitizeName = (value = '') => {
    if (!value) return '';
    return value
      .replace(/[0-9]/g, '')
      .replace(/[^a-zA-Z\s'-]/g, '')
      .slice(0, 50);
  };
  const sanitizePhone = (value = '', previous = '', maxLength = 15) => {
    const digitsOnly = (value || '').replace(/\D/g, '');
    if (digitsOnly.length <= maxLength) return digitsOnly;
    if ((previous || '').length >= maxLength) return previous;
    return digitsOnly.slice(0, maxLength);
  };
  const getProductImage = (product) => {
    if (!product) return '';
    const image =
      product.image ||
      product.imageUrl ||
      product.image_url ||
      product.product_image_url ||
      product.featuredImage ||
      product.featured_image ||
      '';
    if (typeof image === 'string') return image;
    return (
      image?.url ||
      image?.src ||
      image?.originalSrc ||
      image?.originalSource ||
      ''
    );
  };

  const [step, setStep] = useState('selection');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionError, setSelectionError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    customAnswer: '',
    address: '',
    consentPrimary: false,
    consentSecondary: false
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [structuredAddress, setStructuredAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countrySearchRef = useRef(null);
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const match = COUNTRY_OPTIONS.find((c) => c.name === campaign.shippingZone);
    return match || COUNTRY_OPTIONS.find((c) => c.code === 'US') || COUNTRY_OPTIONS[0];
  });
  const suppressNextBlur = useRef(null);
  const [successVariant, setSuccessVariant] = useState('standard');

  const isAddressValid = useCallback((addressValue, structured) => {
    if (structured) return true;
    if (!addressValue) return false;
    return addressValue.trim().length >= MIN_ADDRESS_LENGTH;
  }, []);

  const showPhoneField = Boolean(campaign.showPhoneField);
  const showInstagramField = Boolean(campaign.showInstagramField);
  const showTiktokField = Boolean(campaign.showTiktokField);
  const askCustomQuestion = Boolean(campaign.askCustomQuestion);
  const customQuestionRequired = Boolean(campaign.customQuestionRequired);
  const showConsentCheckbox = Boolean(campaign.showConsentCheckbox);
  const requireSecondConsent = showConsentCheckbox && Boolean(campaign.requireSecondConsent);
  const brandName = campaign.brandName?.trim() || 'Your Brand';

  useEffect(() => {
    if (structuredAddress && addressQuery === formData.address) {
      setAddressSuggestions([]);
      return;
    }
    if (addressQuery.length > 2) {
      const timeout = setTimeout(async () => {
        try {
          const results = await googleAddressService.searchAddresses(addressQuery);
          setAddressSuggestions(results);
        } catch (err) {
          console.error('Google Maps Error', err);
        }
      }, 300);
      return () => clearTimeout(timeout);
    }
    setAddressSuggestions([]);
  }, [addressQuery, structuredAddress, formData.address]);

  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    if (!term) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) => (
      c.name.toLowerCase().includes(term) ||
      c.dialCode.includes(term)
    ));
  }, [countrySearch]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const showSoldOut = campaign.showSoldOut !== false;
    const hideInactive = campaign.hideInactiveProducts !== false;
    const normalizeId = (value) => {
      if (value == null) return '';
      const str = String(value);
      return str.startsWith('gid://') ? str.split('/').pop() : str;
    };
    const selectedIds = (campaign.selectedProductIds || []).map(normalizeId);
    return products.filter((p) => {
      const productId = normalizeId(p.variantLegacyId ?? p.variantId ?? p.id);
      if (!selectedIds.includes(productId)) return false;
      const status = p.status || p.product_status || '';
      if (hideInactive && status && status !== 'ACTIVE') return false;
      if (!showSoldOut && p.availableForSale === false) return false;
      return true;
    });
  }, [products, campaign]);

  const itemLimit = getItemLimit(campaign);
  const orderLimitReached = isOrderLimitReached(campaign);
  const selectedProductsForCart = useMemo(
    () => filteredProducts.filter((p) => selectedIds.includes(p.id)),
    [filteredProducts, selectedIds]
  );
  const maxCartValue = getMaxCartValue(campaign);
  const maxCartExceeded = isMaxCartExceeded(campaign, selectedProductsForCart);
  const selectionBlocked = orderLimitReached || maxCartExceeded;
  const selectionNotice = selectionError
    || (orderLimitReached ? 'This campaign has reached its order limit.' : null)
    || (maxCartExceeded && maxCartValue ? `Selected gifts exceed $${maxCartValue}.` : null);

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((pid) => pid !== id));
      setSelectionError(null);
    } else {
    if (selectedIds.length >= itemLimit) return;
      const nextSelected = [...selectedIds, id];
      const nextItems = filteredProducts.filter((p) => nextSelected.includes(p.id));
      if (isMaxCartExceeded(campaign, nextItems)) {
        const maxLabel = maxCartValue ? `$${maxCartValue}` : 'the limit';
        setSelectionError(`Selected gifts exceed ${maxLabel}.`);
        return;
      }
      setSelectionError(null);
      setSelectedIds(nextSelected);
    }
  };

  const handleAddressSelect = async (addr) => {
    setFormData((prev) => ({ ...prev, address: addr.label }));
    setAddressQuery(addr.label);
    setAddressSuggestions([]);
    setError(null);

    if (isPreview) return;
    try {
      const details = await googleAddressService.getPlaceDetails(addr.id);
      const normalizedDetails = {
        ...details,
        countryCode: details?.countryCode || details?.country_code || ''
      };
      setStructuredAddress(normalizedDetails);
      const countryCheck = isCountryAllowed(campaign, details.country);
      if (!countryCheck.allowed) {
        setError(countryCheck.reason);
        setStructuredAddress(null);
      }
    } catch (err) {
      console.error('Failed to get address details', err);
    }
  };

  const getLengthRules = useCallback((country) => ({
    minLength: Math.min(Math.max(country?.minLength || 5, 5), 15),
    maxLength: Math.min(Math.max(country?.maxLength || 15, 5), 15)
  }), []);

  const handleCountrySelect = useCallback((country) => {
    const { maxLength } = getLengthRules(country);
    const trimmedDigits = phoneDigits.slice(0, maxLength);
    const fullE164 = trimmedDigits ? `+${country.dialCode}${trimmedDigits}` : '';
    setSelectedCountry(country);
    setPhoneDigits(trimmedDigits);
    setFormData((prev) => ({ ...prev, phone: fullE164 }));
    setCountrySearch('');
    setFieldErrors((prev) => {
      if (!('phone' in prev)) return prev;
      const next = { ...prev };
      delete next.phone;
      return next;
    });
    setIsCountryOpen(false);
  }, [getLengthRules, phoneDigits]);

  useEffect(() => {
    const match = COUNTRY_OPTIONS.find((c) => c.name === campaign.shippingZone);
    if (!match) return;
    const { maxLength } = getLengthRules(match);
    const trimmedDigits = phoneDigits.slice(0, maxLength);
    const fullE164 = trimmedDigits ? `+${match.dialCode}${trimmedDigits}` : '';
    setSelectedCountry(match);
    setPhoneDigits(trimmedDigits);
    setFormData((prev) => ({ ...prev, phone: fullE164 }));
    setFieldErrors((prev) => {
      if (!('phone' in prev)) return prev;
      const next = { ...prev };
      delete next.phone;
      return next;
    });
  }, [campaign.shippingZone, getLengthRules, phoneDigits]);

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!Object.keys(fieldErrors).length) return;
      if (event.target.closest('[data-error-keep="true"]')) return;
      suppressNextBlur.current = activeField === 'phone' ? 'phone' : null;
      setFieldErrors({});
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [fieldErrors, activeField]);

  useEffect(() => {
    if (isCountryOpen && countrySearchRef.current) {
      countrySearchRef.current.focus();
      countrySearchRef.current.select();
    }
  }, [isCountryOpen]);

  const ensureHandleFormat = (value = '') => {
    if (!value) return '';
    const trimmed = value.trim().replace(/\s+/g, '');
    const withoutLeading = trimmed.replace(/^@+/, '');
    const sanitized = withoutLeading.replace(/[^a-zA-Z0-9._]/g, '');
    return sanitized ? `@${sanitized}` : '';
  };

  const isValidEmail = (value = '') => {
    const email = value.trim();
    if (!email) return false;
    if (email.length > 254) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (local.includes('..')) return false;
    const localValid = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local);
    if (!localValid) return false;
    const domainLabels = domain.split('.');
    if (domainLabels.length < 2) return false;
    const domainValid = domainLabels.every((label) => {
      if (!label) return false;
      if (label.length > 63) return false;
      if (!/^[A-Za-z0-9-]+$/.test(label)) return false;
      if (label.startsWith('-') || label.endsWith('-')) return false;
      return true;
    });
    if (!domainValid) return false;
    if (domainLabels[domainLabels.length - 1].length < 2) return false;
    return true;
  };

  const hasValidHandle = (value = '') => {
    if (!value) return false;
    const stripped = value.replace(/^@+/, '');
    if (!stripped) return false;
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(stripped);
    const charactersAllowed = /^[a-zA-Z0-9._]+$/.test(stripped);
    return hasAlphanumeric && charactersAllowed;
  };

  const validateField = useCallback((field, value, options = {}) => {
    const digitsOverride = options.digitsOverride;
    const countryOverride = options.countryOverride;
    switch (field) {
      case 'email': {
        if (!isValidEmail(value)) return 'Please enter a valid email address.';
        return '';
      }
      case 'phone': {
        if (!showPhoneField) return '';
        const digits = digitsOverride ?? phoneDigits ?? '';
        const country = countryOverride || selectedCountry;
        const { minLength, maxLength } = getLengthRules(country);
        if (!/^\d*$/.test(digits)) return 'Phone number must contain digits only.';
        if (digits.length < minLength || digits.length > maxLength) {
          const range = minLength === maxLength ? `${minLength}` : `${minLength}-${maxLength}`;
          return `Phone number must be ${range} digits for ${country?.name || 'this country'}.`;
        }
        return '';
      }
      case 'instagram': {
        if (!showInstagramField) return '';
        if (!hasValidHandle(value)) return 'Instagram handle must include letters or numbers.';
        return '';
      }
      case 'tiktok': {
        if (!showTiktokField) return '';
        if (!hasValidHandle(value)) return 'TikTok handle must include letters or numbers.';
        return '';
      }
      default:
        return '';
    }
  }, [showPhoneField, showInstagramField, showTiktokField, phoneDigits, selectedCountry, getLengthRules]);

  const upsertFieldError = (field, value, options = {}) => {
    const message = validateField(field, value, options);
    setFieldErrors((prev) => {
      if (!message) {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });
  };

  const handleFieldChange = (field, rawValue) => {
    let value = rawValue || '';
    const maybeUpdateError = (options = {}) => {
      if (!fieldErrors[field]) return;
      upsertFieldError(field, value, options);
    };

    if (field === 'firstName' || field === 'lastName') {
      value = sanitizeName(value);
    } else if (field === 'phone') {
      const { maxLength } = getLengthRules(selectedCountry);
      const sanitizedDigits = sanitizePhone(value, phoneDigits, maxLength);
      setPhoneDigits(sanitizedDigits);
      value = sanitizedDigits ? `+${selectedCountry.dialCode}${sanitizedDigits}` : '';
      maybeUpdateError({ digitsOverride: sanitizedDigits, countryOverride: selectedCountry });
    } else if (field === 'instagram' || field === 'tiktok') {
      value = ensureHandleFormat(value);
      maybeUpdateError();
    }

    if (!['phone', 'instagram', 'tiktok'].includes(field)) {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) {
        maybeUpdateError();
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleBlur = (field) => {
    if (suppressNextBlur.current === field) {
      suppressNextBlur.current = null;
      return;
    }
    upsertFieldError(field, formData[field]);
  };

  const handleFocus = (field) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (activeField && activeField !== field) {
        delete next[activeField];
      }
      delete next[field];
      return next;
    });
    setActiveField(field);
  };

  const forceValidateFields = () => {
    const fieldsToCheck = ['email'];
    if (showPhoneField) fieldsToCheck.push('phone');
    if (showInstagramField) fieldsToCheck.push('instagram');
    if (showTiktokField) fieldsToCheck.push('tiktok');

    const errors = {};
    fieldsToCheck.forEach((field) => {
      const message = validateField(field, formData[field]);
      if (message) errors[field] = message;
    });
    setFieldErrors(errors);
    return errors;
  };

  const baseFieldsComplete = Boolean(formData.email && isAddressValid(formData.address, structuredAddress));
  const phoneRules = getLengthRules(selectedCountry);
  const phoneMeetsRules = phoneDigits.length >= phoneRules.minLength && phoneDigits.length <= phoneRules.maxLength;
  const contactFieldsComplete =
    (!showPhoneField || phoneMeetsRules) &&
    (!showInstagramField || hasValidHandle(formData.instagram)) &&
    (!showTiktokField || hasValidHandle(formData.tiktok));
  const customAnswered = (!askCustomQuestion || !customQuestionRequired || Boolean(formData.customAnswer?.trim()));
  const canSubmit = !isSubmitting && baseFieldsComplete && contactFieldsComplete && customAnswered;
  const limitReached = Boolean(usage?.limitReached);
  const limitNotice =
    "This brand's gifting limit has been reached. Please contact them directly.";

  const createGiftDraft = async ({ shop, email, shippingAddress, variantId, influencerInfo, orderId }) => {
    console.log('🛠️ Attempting Bridge Call with:', { GIFT_BRIDGE_URL, variantId });

    if (!GIFT_BRIDGE_URL) {
      alert('Error: VITE_GIFT_BRIDGE_URL is missing in .env.local');
      return null;
    }
    if (!shop) {
      alert('Error: Missing Shopify shop domain for this campaign.');
      return null;
    }
    if (!variantId) {
      alert('Error: Missing Shopify variant ID for this product.');
      return null;
    }

    try {
      const normalizedShipping = {
        ...shippingAddress,
        countryCode: shippingAddress?.countryCode || shippingAddress?.country || 'US'
      };
      const response = await fetch(`${GIFT_BRIDGE_URL}/api/create-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          shop,
          variantId,
          email,
          influencerInfo,
          orderId,
          shippingAddress: normalizedShipping,
          orderMode: env.VITE_SHOPIFY_ORDER_MODE || 'draft'
        })
      });

      console.log('📡 Bridge Response Status:', response.status);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'Failed to create Shopify order.';
        console.error('Bridge error response:', {
          status: response.status,
          message,
          payload
        });
        throw new Error(message);
      }

      return payload;
    } catch (err) {
      console.error('❌ Fetch failed entirely:', {
        message: err?.message,
        details: err?.details || err?.response?.errors || null,
        error: err
      });
      alert('Bridge Connection Failed. Check if your Shopify Terminal is running!');
      return null;
    }
  };

  const resolveVariantId = async (item) => {
    if (!item) return null;
    if (item.variantId) return item.variantId;
    const shopDomain = campaign.shop || SHOPIFY_SHOP;
    if (!GIFT_BRIDGE_URL || !shopDomain) return null;

    try {
      const response = await fetch(
        `${GIFT_BRIDGE_URL}/api/products?shop=${encodeURIComponent(shopDomain)}`
      );
      if (!response.ok) return null;
      const payload = await response.json().catch(() => ({}));
      const match = (payload.products || []).find(
        (product) => String(product.id) === String(item.id)
      );
      return match?.variantId || null;
    } catch (err) {
      console.error('Failed to resolve Shopify variant ID', err);
      return null;
    }
  };

  const handleClaim = async () => {
    console.log('DEBUG: Calling Bridge at:', GIFT_BRIDGE_URL);
    if (isPreview) return;
    if (limitReached) {
      setError(limitNotice);
      return;
    }
    if (orderLimitReached) {
      setError('This campaign has reached its order limit.');
      return;
    }
    if (maxCartExceeded) {
      const maxLabel = maxCartValue ? `$${maxCartValue}` : 'the limit';
      setError(`Selected gifts exceed ${maxLabel}.`);
      return;
    }
    
    const forceShopifyDraft = env.VITE_FORCE_SHOPIFY_DRAFT === 'true';
    const validationErrors = forceValidateFields();
    const consentMissing = showConsentCheckbox && (!formData.consentPrimary || (requireSecondConsent && !formData.consentSecondary));
    
    if (!isAddressValid(formData.address, structuredAddress)) {
      setError('Please enter a complete address to continue.');
      return;
    }
    
    if (Object.keys(validationErrors).length > 0 || consentMissing || !customAnswered || !contactFieldsComplete) {
      setError(consentMissing ? 'Please accept the consent terms to continue.' : 'Please fix highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Check for Duplicate Influencers in Cloud DB
      const shouldCheckDuplicates = shouldBlockDuplicateOrders(campaign);
      const isDuplicate = shouldCheckDuplicates
        ? await orderService.checkDuplicate(campaign.id, {
          email: formData.email,
          phone: formData.phone,
          instagram: formData.instagram,
          tiktok: formData.tiktok
        })
        : false;

      if (isDuplicate && !forceShopifyDraft) {
        // This will now successfully write to your new cloud table
        await orderService.logDuplicateAttempt({
          campaignId: campaign.id,
          influencerInfo: {
            name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
            email: formData.email,
            phone: formData.phone,
            instagram: formData.instagram,
            tiktok: formData.tiktok,
            address: formData.address,
            items: products.filter((p) => selectedIds.includes(p.id))
          },
          reason: 'Duplicate influencer details'
        }).catch(err => console.error('Cloud log failed:', err));
        
        setSuccessVariant('duplicate');
        setStep('success');
        return;
      }

      // 2. Save Successfull Order to Supabase Cloud
      const selectedItems = products.filter((p) => selectedIds.includes(p.id));
      const influencerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
      const orderPayload = {
        campaign_id: campaign.id,
        influencer_name: influencerName,
        influencer_email: formData.email,
        influencer_handle: formData.instagram || formData.tiktok || '',
        shipping_address: structuredAddress || formData.address,
        items: selectedItems
      };
      const createdOrder = await orderService.createOrder(orderPayload);
      console.log('Order saved to Cloud DB', { orderId: createdOrder?.id });

      if (GIFT_BRIDGE_URL) {
        try {
          await fetch(`${GIFT_BRIDGE_URL}/api/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
              shop: campaign.shop || SHOPIFY_SHOP,
              merchantId: campaign.merchantId || null,
              delta: 1
            })
          });
        } catch (error) {
          console.error('Failed to update merchant claim count', error);
        }
      }
      // 3. Format Address for Shopify (The Fix for 500 error)
      const primaryItem = selectedItems[0];
      let gid = primaryItem?.variantId;
      if (!gid && primaryItem?.id) {
        gid = await resolveVariantId(primaryItem);
      }

      if (gid) {
        // Map Google fields to Shopify's MailingAddressInput schema
        const shopifyAddress = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address1: structuredAddress?.address1 || formData.address, // fallback to raw string if structured fails
          city: structuredAddress?.city || '',
          province: structuredAddress?.state || structuredAddress?.province || '',
          zip: structuredAddress?.zipCode || structuredAddress?.zip || '',
          country: structuredAddress?.country || '',
          countryCode: structuredAddress?.countryCode || selectedCountry?.code || 'US'
        };

        const draftResponse = await createGiftDraft({
          shop: campaign.shop || SHOPIFY_SHOP,
          email: formData.email,
          influencerInfo: {
            name: influencerName,
            email: formData.email,
            handle: formData.instagram || formData.tiktok || ''
          },
          orderId: createdOrder.id,
          shippingAddress: shopifyAddress, 
          variantId: gid
        });

        if (draftResponse?.shopifyOrderId && createdOrder?.id) {
          console.log('✅ Syncing order to Supabase', {
            orderId: createdOrder.id,
            shopifyOrderId: draftResponse.shopifyOrderId,
            orderNumber: draftResponse.orderNumber
          });
          const syncResponse = await fetch(`${GIFT_BRIDGE_URL}/api/sync-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
              orderId: createdOrder.id,
              shopifyOrderId: draftResponse.shopifyOrderId,
              orderNumber: draftResponse.orderNumber,
              status: 'draft_created'
            })
          });
          const syncPayload = await syncResponse.json().catch(() => null);
          if (!syncResponse.ok || !syncPayload?.ok) {
            throw new Error(syncPayload?.message || 'Failed to sync order to Supabase.');
          }
        } else {
          console.warn('⚠️ Missing sync data', {
            orderId: createdOrder?.id,
            shopifyOrderId: draftResponse?.shopifyOrderId
          });
        }
      } else {
        console.warn('⚠️ No Shopify Variant ID found!');
      }

      if (onSubmit) onSubmit(campaign.id);
      setStep('success');
    } catch (err) {
      console.error('Submission Error:', err);
      setError(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTooltip = (message) => {
    if (!message) return null;
    return (
      <div className="tooltip-fade absolute right-0 -top-1 -translate-y-full transform pointer-events-none shadow-lg">
        <div className="relative bg-red-500 text-white text-xs rounded-lg px-2 py-1">
          {message}
          <span className="absolute -bottom-1 right-4 w-2 h-2 bg-red-500 rotate-45" />
        </div>
      </div>
    );
  };

  if (step === 'success') {
    const isReview = successVariant === 'duplicate';
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className={`w-16 h-16 ${isReview ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'} rounded-full flex items-center justify-center mb-4`}>
          <Package size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{isReview ? 'Submission Received' : 'Order Confirmed!'}</h2>
        <p className="text-gray-500 text-sm">
          {isReview ? 'Thanks! Your submission is under review.' : 'Your gifts are on the way.'}
        </p>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 pb-2 text-center">
          {campaign.brandLogo ? (
            <div className="h-8 w-20 mx-auto bg-gray-200 rounded animate-pulse" />
          ) : (
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: campaign.brandColor }}>
              {brandName}
            </div>
          )}
          <h1 className="text-xl font-medium text-gray-900 leading-tight">{campaign.welcomeMessage}</h1>
        </div>
        {selectionNotice && (
          <div className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {selectionNotice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide">
          {filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
              No products available.
            </div>
          ) : (
            <div className={`grid gap-3 ${campaign.gridTwoByTwo ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isSoldOut = p.availableForSale === false;
                const isDisabled = (selectedIds.length >= itemLimit && !isSelected) || isSoldOut;
                const showSoldOut = campaign.showSoldOut !== false;
                if (isSoldOut && !showSoldOut) return null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) toggleSelection(p.id);
                    }}
                    disabled={isDisabled}
                    className={`group relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''} ${isDisabled ? 'opacity-50' : ''}`}
                    style={{ ringColor: isSelected ? campaign.brandColor : 'transparent' }}
                  >
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-2 relative">
                      {getProductImage(p) ? (
                        <img
                          src={getProductImage(p)}
                          className="w-full h-full object-cover"
                          alt={p.title}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Package size={20} />
                        </div>
                      )}
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200">
                            Sold out
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1 shadow-sm">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: campaign.brandColor }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-1">
                      <div className="text-xs font-medium text-gray-900 truncate">{p.title}</div>
                      <div className="text-[11px] text-gray-500">${p.price}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {campaign.linkToStore && (
          <div className="px-4 pb-2 text-center">
            <a
              href={campaign.linkToStore.startsWith('http') ? campaign.linkToStore : `https://${campaign.linkToStore}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {campaign.linkText || 'Visit the store'}
            </a>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur-sm sticky bottom-0">
          <button
            onClick={() => setStep('shipping')}
            disabled={selectedIds.length === 0 || selectionBlocked}
            className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: campaign.brandColor }}
          >
            Claim {selectedIds.length > 0 ? `${selectedIds.length} Gift${selectedIds.length > 1 ? 's' : ''}` : 'Gifts'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
        <button onClick={() => setStep('selection')} className="p-2 hover:bg-gray-50 rounded-full">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">Shipping Details</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="First name"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.firstName}
            onFocus={() => handleFocus('firstName')}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
          />
          <input
            placeholder="Last name"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.lastName}
            onFocus={() => handleFocus('lastName')}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
          />
        </div>

        <div className="relative pb-5">
          <input
            placeholder="Email address"
            type="email"
            className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.email ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
            value={formData.email}
            onFocus={() => handleFocus('email')}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
          />
          {renderTooltip(fieldErrors.email)}
        </div>

        {showPhoneField && (
          <div className="relative pb-5">
            <div
              className={`relative flex items-center rounded-xl border overflow-visible focus-within:ring-2 ${
                fieldErrors.phone ? 'border-red-400 focus-within:ring-red-400' : 'border-gray-200 focus-within:ring-indigo-500'
              }`}
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setIsCountryOpen((prev) => !prev)}
                  className="h-full px-3 flex items-center gap-2 bg-gray-50 text-sm text-gray-900 border-r border-gray-200"
                >
                  <span className="text-lg leading-none">{selectedCountry.flag}</span>
                  <span className="font-medium">+{selectedCountry.dialCode}</span>
                  <ChevronRight size={14} className="text-gray-400 -rotate-90" />
                </button>
                {isCountryOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50" data-error-keep="true">
                    <div className="p-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                        <Search size={14} className="text-gray-400" />
                        <input
                          ref={countrySearchRef}
                          className="w-full bg-transparent text-sm outline-none"
                          placeholder="Search country"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleCountrySelect(c)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <span className="text-lg leading-none">{c.flag}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500">+{c.dialCode}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                placeholder="Phone number"
                type="tel"
                className="flex-1 px-3 py-3 text-sm focus:ring-0 border-0 outline-none"
                value={phoneDigits}
                onFocus={() => handleFocus('phone')}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
              />
            </div>
            {renderTooltip(fieldErrors.phone, 'right')}
          </div>
        )}

        {showInstagramField && (
          <div className="relative pb-5">
            <input
              placeholder="@instagram"
              className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.instagram ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
              value={formData.instagram}
              onFocus={() => handleFocus('instagram')}
              onChange={(e) => handleFieldChange('instagram', e.target.value)}
              onBlur={() => handleBlur('instagram')}
            />
            {renderTooltip(fieldErrors.instagram)}
          </div>
        )}

        {showTiktokField && (
          <div className="relative pb-5">
            <input
              placeholder="@tiktok"
              className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.tiktok ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
              value={formData.tiktok}
              onFocus={() => handleFocus('tiktok')}
              onChange={(e) => handleFieldChange('tiktok', e.target.value)}
              onBlur={() => handleBlur('tiktok')}
            />
            {renderTooltip(fieldErrors.tiktok)}
          </div>
        )}

        {askCustomQuestion && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{campaign.customQuestionLabel || 'Additional Details'}</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={3}
              value={formData.customAnswer}
              onFocus={() => handleFocus('customAnswer')}
              onChange={(e) => setFormData((prev) => ({ ...prev, customAnswer: e.target.value }))}
            />
          </div>
        )}

        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
          <input
            placeholder="Search address..."
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value);
              setFormData((prev) => ({ ...prev, address: e.target.value }));
              if (structuredAddress) setStructuredAddress(null);
            }}
          />
          {addressSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {addressSuggestions.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  onClick={() => handleAddressSelect(addr)}
                >
                  {addr.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {showConsentCheckbox && (
          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700">Consent</p>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={formData.consentPrimary}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, consentPrimary: e.target.checked }));
                  setError(null);
                }}
              />
              <span>{campaign.termsConsentText || 'I agree to the campaign terms.'}</span>
            </label>
            {requireSecondConsent && (
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={formData.consentSecondary}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, consentSecondary: e.target.checked }));
                    setError(null);
                  }}
                />
                <span>{campaign.secondConsentText || 'I agree to the additional consent.'}</span>
              </label>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleClaim}
          disabled={!canSubmit || limitReached}
          className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{ backgroundColor: canSubmit && !limitReached ? campaign.brandColor : '#d1d5db' }}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (campaign.submitButtonText || 'Confirm & Ship')}
        </button>
        {limitReached && (
          <p className="mt-3 text-xs text-rose-600 text-center">
            {limitNotice}
          </p>
        )}
      </div>
    </div>
  );
};
ClaimExperience.propTypes = {
  campaign: PropTypes.shape(campaignShape).isRequired,
  products: PropTypes.arrayOf(PropTypes.object),
  isPreview: PropTypes.bool,
  onSubmit: PropTypes.func,
  usage: PropTypes.shape(usageShape)
};
/* --- ORDERS DASHBOARD --- */
const OrdersDashboard = ({ onNavigateDashboard, campaigns }) => {
  const [orders, setOrders] = useState([]);
  const [duplicateAttempts, setDuplicateAttempts] = useState([]);
  const [duplicateError, setDuplicateError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    campaign: 'all',
    status: 'all',
    consent: 'all'
  });
  const defaultTimePeriod = 'year';
  const [timePeriod, setTimePeriod] = useState(defaultTimePeriod);
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  const buildConsentStatus = useCallback((order) => {
    const hasTerms = Boolean(order?.termsConsent);
    const hasMarketing = Boolean(order?.marketingOptIn);
    if (hasTerms && hasMarketing) return 'Fully Consented';
    if (hasTerms) return 'Standard Only';
    return 'No Consent Recorded';
  }, []);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }), []);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }), []);

  const campaignOptions = useMemo(() => {
    const names = Array.from(new Set((campaigns || []).map((c) => c.name).filter(Boolean)));
    return names;
  }, [campaigns]);

  const statusOptions = useMemo(() => Object.keys(STATUS_CONFIG), []);

  const consentOptions = useMemo(() => ([
    { value: 'true', label: 'Consent Given' },
    { value: 'false', label: 'No Consent' }
  ]), []);

  const timePeriodOptions = useMemo(() => ([
    { value: 'day', label: 'Last 24 hours' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'quarter', label: 'Last 90 days' },
    { value: 'year', label: 'Last 12 months' }
  ]), []);

  const fetchDuplicates = useCallback(async () => {
    setDuplicateError(null);
    try {
      const dupes = await orderService.listDuplicateAttempts({ limit: 100 });
      setDuplicateAttempts(dupes);
    } catch (dupErr) {
      console.error('Unable to load duplicate attempts', dupErr);
      setDuplicateError('Unable to load duplicate attempts. Check Supabase policies.');
    }
  }, []);

  const buildOrdersQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.campaign !== 'all') params.set('campaign_name', filters.campaign);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.consent !== 'all') params.set('consent', filters.consent);
    if (timePeriod) params.set('time_period', timePeriod);
    params.set('sort_by', sortConfig.key);
    params.set('sort_direction', sortConfig.direction);
    return params.toString();
  }, [filters, sortConfig, timePeriod]);

  const fetchOrders = useCallback(async ({ reason } = {}) => {
    if (reason === 'refresh') {
      setRefreshing(true);
    }
    setLoading(true);
    setError(null);
    try {
      const query = buildOrdersQuery();
      const response = await fetchWithShopifyToken(`/api/orders?${query}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || 'Unable to load orders right now. Please try again in a moment.';
        setError(message);
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    } catch (err) {
      console.error('Unable to load orders from Supabase', err);
      setError('Unable to load orders right now. Please try again in a moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildOrdersQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const dashboardStats = useMemo(() => {
    return orders.reduce((acc, order) => {
      const status = normalizeStatus(order?.status);
      const value = Number(order?.value ?? 0);
      if (status === 'shipped') acc.fulfilled += 1;
      if (status !== 'shipped' && status !== 'cancelled') acc.actionNeeded += 1;
      if (status !== 'cancelled') acc.totalValue += Number.isNaN(value) ? 0 : value;
      return acc;
    }, { fulfilled: 0, actionNeeded: 0, totalValue: 0 });
  }, [orders]);

  useEffect(() => {
    const channel = supabase
      .channel('orders-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const duplicateByCampaign = useMemo(() => {
    return duplicateAttempts.reduce((acc, attempt) => {
      const key = attempt.campaignName || attempt.campaignId || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(attempt);
      return acc;
    }, {});
  }, [duplicateAttempts]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: key === 'date' ? 'desc' : 'asc' };
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return currencyFormatter.format(value);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return dateFormatter.format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatCsvDate = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      const pad = (num) => String(num).padStart(2, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return value;
    }
  };

  const formatDisplayOrderId = (order) => {
    const external = order.shopifyOrderNumber;
    if (external) return `#${external}`;
    if (order.id) return `#${order.id.slice(0, 8)}`;
    return '#—';
  };

  const getOrderThumbnail = (order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return '';
    const image = firstItem.image || firstItem.featuredImage || firstItem.featured_image;
    if (typeof image === 'string') return image;
    return (
      image?.originalSrc ||
      image?.originalSource ||
      image?.src ||
      image?.url ||
      firstItem.imageUrl ||
      firstItem.image_url ||
      ''
    );
  };

  const formatCsvOrderId = (order) => {
    if (order.shopifyOrderNumber) return order.shopifyOrderNumber;
    if (order.id) return `#${order.id.slice(0, 8)}`;
    return '';
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const consentBadgeClass = (order) => {
    const status = buildConsentStatus(order);
    if (status === 'Fully Consented') return 'bg-green-50 text-green-700 border border-green-100';
    if (status === 'Standard Only') return 'bg-blue-50 text-blue-700 border border-blue-100';
    return 'bg-gray-50 text-gray-500 border border-gray-100';
  };

  const handleExportCSV = () => {
    if (!orders.length) return;

    const headers = [
      'Order ID',
      'Date',
      'Influencer',
      'Email',
      'Phone',
      'Instagram',
      'TikTok',
      'Campaign',
      'Status',
      'Fulfillment ID',
      'Value',
      'Consent'
    ];

    const rows = orders.map((order) => {
      const orderId = formatCsvOrderId(order);
      const orderDate = ` ${formatCsvDate(order.createdAt)}`;
      const orderValue = typeof order.value === 'number'
        ? order.value.toFixed(2)
        : (order.value || '0');

      const csvRow = [
        orderId,
        orderDate,
        order.influencerName || '',
        order.influencerEmail || '',
        order.influencerPhone || '',
        order.influencerInstagram || '',
        order.influencerTiktok || '',
        order.campaignName || '',
        order.status || '',
        order.shopifyFulfillmentId || '',
        orderValue,
        buildConsentStatus(order)
      ];

      return csvRow.map(escapeCsvValue).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `influencer_orders_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderContactBlock = (order) => {
    const hasPhone = Boolean(order.influencerPhone);
    const hasInstagram = Boolean(order.influencerInstagram);
    const hasTiktok = Boolean(order.influencerTiktok);

    if (!hasPhone && !hasInstagram && !hasTiktok) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    return (
      <div className="space-y-1">
        {hasPhone && <div className="text-sm text-gray-900">{order.influencerPhone}</div>}
        {hasInstagram && <div className="text-xs text-gray-500">IG: {order.influencerInstagram}</div>}
        {hasTiktok && <div className="text-xs text-gray-500">TT: {order.influencerTiktok}</div>}
      </div>
    );
  };

  const tableState = () => {
    if (loading) {
      return (
        <tr>
          <td className="px-6 py-10 text-center text-gray-500 text-sm" colSpan={7}>
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span>Loading orders from Supabase…</span>
            </div>
          </td>
        </tr>
      );
    }

    if (orders.length === 0) {
      const isFiltered = filters.campaign !== 'all'
        || filters.status !== 'all'
        || filters.consent !== 'all'
        || timePeriod !== defaultTimePeriod;
      const emptyMessage = isFiltered
        ? 'No orders match the current filters.'
        : 'No orders yet. Share a claim link to see activity here.';
      return (
        <tr>
          <td className="px-6 py-10 text-center text-gray-500 text-sm" colSpan={7}>
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return orders.map((order) => {
      const displayOrderId = formatDisplayOrderId(order);
      const displayDate = formatDate(order.createdAt);
      const thumbnailUrl = getOrderThumbnail(order);
      return (
        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package size={16} className="text-gray-400" />
                )}
              </div>
              <div>
                <div className="font-mono text-xs text-indigo-600">{displayOrderId}</div>
                <div className="text-xs text-gray-500">{displayDate}</div>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="font-medium text-gray-900 text-sm">{order.influencerName || 'Unnamed Influencer'}</div>
            <div className="text-xs text-gray-500">{order.influencerEmail || '—'}</div>
          </td>
          <td className="px-6 py-4">
            {renderContactBlock(order)}
          </td>
          <td className="px-6 py-4">
            <div className="font-medium text-gray-900 text-sm">
              {order.campaignName || '—'}
            </div>
            <div className="text-xs text-gray-500">{(order.items?.length || 0)} items</div>
          </td>
          <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
          <td className="px-6 py-4">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${consentBadgeClass(order)}`}>
              {buildConsentStatus(order)}
            </span>
          </td>
          <td className="px-6 py-4 text-right font-medium text-gray-900 text-sm">{formatCurrency(order.value)}</td>
        </tr>
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button onClick={onNavigateDashboard} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            <Home size={18} /> Dashboard
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">
            <Package size={18} /> Orders
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        </header>

        <main className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><DollarSign size={14}/> Total Gifted Value</p>
              <div className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.totalValue)}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Package size={14}/> Total Orders</p>
              <div className="mt-2 text-2xl font-bold text-gray-900">{orders.length}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><CheckCircle size={14}/> Fulfilled</p>
               <div className="mt-2 text-2xl font-bold text-green-600">{dashboardStats.fulfilled}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><AlertTriangle size={14}/> Action Needed</p>
               <div className="mt-2 text-2xl font-bold text-orange-600">{dashboardStats.actionNeeded}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {duplicateAttempts.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 max-h-72 overflow-y-auto">
                <div className="bg-amber-200 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide inline-flex">Duplicate Attempts</div>
                {duplicateError && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded px-3 py-2">
                    {duplicateError}
                  </div>
                )}
                <div className="mt-3 space-y-3">
                  {Object.entries(duplicateByCampaign).map(([campaignName, attempts]) => (
                    <div key={campaignName} className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                      <div className="text-sm font-semibold text-amber-900 mb-2">{campaignName}</div>
                      <div className="space-y-2">
                        {attempts.map((a) => (
                          <div key={a.id} className="bg-white/80 border border-amber-100 rounded-lg p-3 text-sm flex items-start justify-between gap-3 min-h-[120px]">
                            <div className="space-y-1 text-amber-900">
                              <div className="font-semibold text-amber-900">
                                {a.influencerInfo?.name?.trim() || a.influencerInfo?.fullName?.trim() || a.influencerInfo?.email || 'Unnamed Influencer'}
                              </div>
                              <div className="text-xs text-amber-700">{a.influencerInfo?.email || 'No email'}</div>
                              <div className="text-xs text-amber-700">IG: {a.influencerInfo?.instagram || '—'} | TT: {a.influencerInfo?.tiktok || '—'}</div>
                              <div className="text-xs text-amber-700">Phone: {a.influencerInfo?.phone || '—'}</div>
                              <div className="text-xs text-amber-700">Reason: {a.reason}</div>
                              <div className="text-xs text-amber-700">Decision: {a.decision || 'pending'}</div>
                              <div className="text-xs text-amber-700">At: {formatDate(a.createdAt)}</div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={async () => {
                                  await orderService.acceptDuplicateAttempt(a.id);
                                  await fetchDuplicates();
                                  await fetchOrders();
                                }}
                                className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                              >
                                Accept
                              </button>
                              <button
                                onClick={async () => {
                                  await orderService.declineDuplicateAttempt(a.id);
                                  await fetchDuplicates();
                                }}
                                className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded hover:bg-red-100"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <p className="text-xs text-gray-500">Synced from Supabase Testing DB</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => { await fetchOrders({ reason: 'refresh' }); await fetchDuplicates(); }}
                    disabled={refreshing || loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={!orders.length}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download size={16} />
                    Download CSV
                  </button>
                </div>
                <div className="text-xs text-gray-400">Auto refresh disabled</div>
              </div>
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="px-6 py-3 border-b border-gray-200 bg-white">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Campaign</span>
                  <select
                    value={filters.campaign}
                    onChange={(e) => handleFilterChange('campaign', e.target.value)}
                    className="min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Campaigns</option>
                    {campaignOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Status</span>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="min-w-[140px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Consent</span>
                  <select
                    value={filters.consent}
                    onChange={(e) => handleFilterChange('consent', e.target.value)}
                    className="min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Consent</option>
                    {consentOptions.map((consent) => (
                      <option key={consent.value} value={consent.value}>{consent.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Time Period</span>
                  <select
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    className="min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {timePeriodOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                    >
                      Order
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'date' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                  <th className="px-6 py-3">Influencer</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                    >
                      Status
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'status' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                  <th className="px-6 py-3">Consent</th>
                  <th className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('value')}
                      className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900 w-full"
                    >
                      Value
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'value' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'value' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableState()}
              </tbody>
            </table>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-2">
              <AlertTriangle size={12} />
              <span>Status updates reflect Shopify draft, order, and fulfillment events.</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

OrdersDashboard.propTypes = {
  onNavigateDashboard: PropTypes.func.isRequired,
  campaigns: PropTypes.arrayOf(PropTypes.object)
};

/* --- CAMPAIGN DASHBOARD --- */
const DashboardHome = ({
  campaigns,
  merchantUsage,
  currentView,
  onCreateCampaign,
  onDeleteCampaign,
  onEditCampaign,
  onViewOrders,
  onViewSettings
}) => {
  const showPlans = SHOW_PLANS;
  const activePlan = merchantUsage?.activePlan || PLAN_KEYS.FREE;
  const planDefinition = PLAN_DEFINITIONS[activePlan] || PLAN_DEFINITIONS[PLAN_KEYS.FREE];
  const totalClaimsCount = merchantUsage?.totalClaimsCount || 0;
  const limit = planDefinition.limit;
  const usagePercent = getUsagePercent(totalClaimsCount, activePlan);
  const nextPlan = getNextPlan(activePlan);
  const limitReached = Boolean(merchantUsage?.limitReached);
  const showUpgradeBanner = showPlans && limit != null && usagePercent >= 0.8 && Boolean(nextPlan);
  const showNudgeBanner = showPlans && (
    (activePlan === PLAN_KEYS.FREE && totalClaimsCount >= 4) ||
    (activePlan === PLAN_KEYS.GROWTH && totalClaimsCount >= 80)
  );

  const handleUpgrade = (planKey = nextPlan) => {
    if (!planKey) return;
    window.location.assign(`/billing?plan=${planKey}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button
            onClick={() => window.location.hash = ''}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'dashboard'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Home size={18} /> Dashboard
          </button>
          <button
            onClick={onViewOrders}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'orders'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package size={18} /> Orders
          </button>
        </div>
        <div className="mt-auto p-4">
          <button
            onClick={onViewSettings}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'settings'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10">
          {showNudgeBanner && nextPlan && (
            <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 text-sm text-amber-900 flex items-center justify-between gap-4">
              <span>You have almost reached your limit. Unlock more orders to keep your campaign running.</span>
              <button
                type="button"
                onClick={() => handleUpgrade(nextPlan)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200"
              >
                Unlock more orders
              </button>
            </div>
          )}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
            <div className="flex items-center gap-3">
              {showPlans && activePlan === PLAN_KEYS.FREE && nextPlan && (
                <button
                  onClick={() => handleUpgrade(nextPlan)}
                  className="px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50"
                >
                  Upgrade
                </button>
              )}
              <button onClick={onCreateCampaign} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm">
                <Plus size={16} /> New Campaign
              </button>
            </div>
          </header>
        </div>
        <main className="p-8 max-w-6xl mx-auto space-y-8">
          {showPlans && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Usage</p>
                  <h2 className="text-lg font-semibold text-gray-900">Plan usage</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {limit == null
                      ? `You have used ${totalClaimsCount} gifts on your ${planDefinition.label} plan.`
                      : `You have used ${totalClaimsCount} out of ${limit} gifts on your current plan.`}
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {planDefinition.label} Plan
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${Math.round(usagePercent * 100)}%` }}
                />
              </div>
              {showUpgradeBanner && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-amber-900">
                    You are approaching your limit. Upgrade to the {PLAN_DEFINITIONS[nextPlan].label} plan for more gifting capacity.
                  </p>
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="px-3 py-2 text-sm font-semibold text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200"
                  >
                    Upgrade
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400"><Package size={20} /></div>
                <h3 className="text-sm font-medium text-gray-900">No campaigns yet</h3>
                <button onClick={onCreateCampaign} className="text-sm font-medium text-indigo-600 hover:underline mt-2">Create Link</button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Campaign</th>
                    <th className="px-6 py-3">Link</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Claims</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <span>{c.name}</span>
                        <button
                          onClick={() => onEditCampaign(c)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Edit campaign"
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/claim/${c.slug}`} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:text-indigo-600">gift.app/{c.slug}</a>
                      </td>
                      <td className="px-6 py-4">
                        {showPlans && limitReached && nextPlan ? (
                          <button
                            type="button"
                            onClick={() => handleUpgrade(nextPlan)}
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100"
                          >
                            Paused - Upgrade
                          </button>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              c.status === 'inactive'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {c.status || 'active'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">{c.claims_count || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onDeleteCampaign(c.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

DashboardHome.propTypes = {
  campaigns: PropTypes.arrayOf(PropTypes.object).isRequired,
  merchantUsage: PropTypes.shape(merchantUsageShape),
  currentView: PropTypes.string,
  onCreateCampaign: PropTypes.func.isRequired,
  onDeleteCampaign: PropTypes.func.isRequired,
  onEditCampaign: PropTypes.func.isRequired,
  onViewOrders: PropTypes.func.isRequired,
  onViewSettings: PropTypes.func.isRequired
};

const SettingsPage = ({
  merchantUsage,
  currentView,
  onViewDashboard,
  onViewOrders,
  onViewSettings
}) => {
  const showPlans = SHOW_PLANS;
  const activePlan = merchantUsage?.activePlan || PLAN_KEYS.FREE;
  const planDefinition = PLAN_DEFINITIONS[activePlan] || PLAN_DEFINITIONS[PLAN_KEYS.FREE];
  const totalClaimsCount = merchantUsage?.totalClaimsCount || 0;
  const nextPlan = getNextPlan(activePlan);
  const showNudgeBanner = showPlans && (
    (activePlan === PLAN_KEYS.FREE && totalClaimsCount >= 4) ||
    (activePlan === PLAN_KEYS.GROWTH && totalClaimsCount >= 80)
  );
  const shopDomain = merchantUsage?.shop || '';
  const shopHandle = shopDomain ? shopDomain.split('.')[0] : '';
  const manageUrl = shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/settings/billing`
    : null;

  const handleUpgrade = (planKey) => {
    if (!planKey) return;
    window.location.assign(`/billing?plan=${planKey}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button
            onClick={onViewDashboard}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'dashboard'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Home size={18} /> Dashboard
          </button>
          <button
            onClick={onViewOrders}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'orders'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package size={18} /> Orders
          </button>
        </div>
        <div className="mt-auto p-4">
          <button
            onClick={onViewSettings}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg ${
              currentView === 'settings'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10">
          {showNudgeBanner && nextPlan && (
            <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 text-sm text-amber-900 flex items-center justify-between gap-4">
              <span>You have almost reached your limit. Unlock more orders to keep your campaign running.</span>
              <button
                type="button"
                onClick={() => handleUpgrade(nextPlan)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg hover:bg-amber-200"
              >
                Unlock more orders
              </button>
            </div>
          )}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </header>
        </div>
        <main className="p-8 max-w-6xl mx-auto space-y-8">
          {showPlans && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Billing & Plan</h2>
                  <p className="text-xs text-gray-500">Manage your subscription and gifting limits.</p>
                </div>
                <button
                  type="button"
                  onClick={() => manageUrl && window.location.assign(manageUrl)}
                  disabled={!manageUrl}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                >
                  Manage Subscription
                </button>
              </div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current plan</p>
                  <h3 className="text-lg font-semibold text-gray-900">{planDefinition.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {planDefinition.limit == null
                      ? `You have used ${totalClaimsCount} gifts on your ${planDefinition.label} plan.`
                      : `You have used ${totalClaimsCount} out of ${planDefinition.limit} gifts.`}
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {planDefinition.label} Plan
                </span>
              </div>
            </div>
          </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Policies & Resources</h2>
              <p className="text-xs text-gray-500">Stay informed and help merchants self-serve.</p>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2">
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-white p-4 text-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Privacy</div>
                <div className="mt-1 text-base font-semibold text-gray-900 group-hover:text-indigo-700">
                  Privacy Policy
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  How we collect, use, and protect merchant data.
                </div>
              </a>
              <a
                href="/resources"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-white p-4 text-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resources</div>
                <div className="mt-1 text-base font-semibold text-gray-900 group-hover:text-indigo-700">
                  Resources & FAQs
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Setup tips, troubleshooting, and common questions.
                </div>
              </a>
            </div>
          </div>

          {showPlans && (
            <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col">
              <div className="text-sm font-semibold text-gray-900">Free</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">$0<span className="text-sm font-medium text-gray-500">/mo</span></div>
              <p className="mt-2 text-sm text-gray-500">5 total gifts</p>
              <button
                type="button"
                onClick={() => handleUpgrade(PLAN_KEYS.FREE)}
                disabled={activePlan === PLAN_KEYS.FREE}
                className="mt-6 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                {activePlan === PLAN_KEYS.FREE ? 'Current Plan' : 'Start with Free'}
              </button>
            </div>

            <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-md p-6 flex flex-col relative">
              <span className="absolute -top-3 left-4 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                Most Popular
              </span>
              <div className="text-sm font-semibold text-gray-900">Growth</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">$69<span className="text-sm font-medium text-gray-500">/mo</span></div>
              <p className="mt-2 text-sm text-gray-500">100 total gifts</p>
              <button
                type="button"
                onClick={() => handleUpgrade(PLAN_KEYS.GROWTH)}
                disabled={activePlan === PLAN_KEYS.GROWTH}
                className="mt-6 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {activePlan === PLAN_KEYS.GROWTH ? 'Current Plan' : 'Unlock 100 Orders'}
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col">
              <div className="text-sm font-semibold text-gray-900">Unlimited</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">$379<span className="text-sm font-medium text-gray-500">/mo</span></div>
              <p className="mt-2 text-sm text-gray-500">Unlimited gifts</p>
              <button
                type="button"
                onClick={() => handleUpgrade(PLAN_KEYS.UNLIMITED)}
                disabled={activePlan === PLAN_KEYS.UNLIMITED}
                className="mt-6 px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                {activePlan === PLAN_KEYS.UNLIMITED ? 'Current Plan' : 'Go Unlimited'}
              </button>
            </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

SettingsPage.propTypes = {
  merchantUsage: PropTypes.shape(merchantUsageShape),
  currentView: PropTypes.string,
  onViewDashboard: PropTypes.func.isRequired,
  onViewOrders: PropTypes.func.isRequired,
  onViewSettings: PropTypes.func.isRequired
};

/* --- CAMPAIGN BUILDER (Restored Full Functionality) --- */
const CampaignBuilder = ({ onPublish, onCancel, initialData = null, merchantShop, merchantId }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [data, setData] = useState({
    name: initialData?.name || 'My Influencer Seeding',
    slug: initialData?.slug || 'summer-seeding',
    welcomeMessage: initialData?.welcomeMessage || 'Hey! We love your content. Here is a gift on us.',
    selectedProductIds: initialData?.selectedProductIds || [],
    brandName: initialData?.brandName || '',
    brandColor: initialData?.brandColor || '#4f46e5',
    brandLogo: initialData?.brandLogo || null,
    itemLimit: initialData?.itemLimit || 1,
    shippingZone: initialData?.shippingZone || 'United States',
    restrictedCountries: initialData?.restrictedCountries || '',
    
    // Limits
    orderLimitPerLink: initialData?.orderLimitPerLink || '',
    maxCartValue: initialData?.maxCartValue || '',
    blockDuplicateOrders: initialData?.blockDuplicateOrders || false,

    // Contact
    showPhoneField: initialData?.showPhoneField || false,
    showInstagramField: initialData?.showInstagramField ?? true,
    showTiktokField: initialData?.showTiktokField || false,
    askCustomQuestion: initialData?.askCustomQuestion || false,
    customQuestionLabel: initialData?.customQuestionLabel || '',
    customQuestionRequired: initialData?.customQuestionRequired || false,

    // Product Settings
    showSoldOut: initialData?.showSoldOut ?? true,
    hideInactiveProducts: initialData?.hideInactiveProducts ?? true,
    allowQuantitySelector: initialData?.allowQuantitySelector || false,
    linkToStore: initialData?.linkToStore || '',
    linkText: initialData?.linkText || '',
    gridTwoByTwo: initialData?.gridTwoByTwo ?? true,

    // Content & Consent
    showConsentCheckbox: initialData?.showConsentCheckbox ?? true,
    termsConsentText: initialData?.termsConsentText || '',
    requireSecondConsent: initialData?.requireSecondConsent || false,
    secondConsentText: initialData?.secondConsentText || '',
    emailOptIn: initialData?.emailOptIn ?? true,
    emailConsentText: initialData?.emailConsentText || '',
    submitButtonText: initialData?.submitButtonText || '',

    // Order Processing
    orderTags: initialData?.orderTags || '',
    customerTags: initialData?.customerTags || '',
    discountCode: initialData?.discountCode || 'INFLUENCERGIFT',
    keepDraft: initialData?.keepDraft || false,
    enableBilling: initialData?.enableBilling || false,
  });

  const updateField = (field, val) => setData(p => ({ ...p, [field]: val }));

  useEffect(() => {
    if (!initialData?.id) return;
    let isMounted = true;

    const loadCampaignProducts = async () => {
      const products = await campaignService.getCampaignProducts(initialData.id);
      if (!isMounted) return;
      setSelectedProducts(products);
      updateField('selectedProductIds', products.map((product) => product.id));
    };

    loadCampaignProducts();

    return () => {
      isMounted = false;
    };
  }, [initialData?.id]);

  const handleProductsSelected = (products) => {
    setSelectedProducts(products);
    updateField('selectedProductIds', products.map((product) => product.id));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => {
      const next = prev.filter((product) => product.id !== productId);
      updateField('selectedProductIds', next.map((product) => product.id));
      return next;
    });
  };

  const handlePublish = async () => {
    setIsSaving(true);
    
    // 1. Generate a base slug from the CURRENT name
    const baseSlug = data.name.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/[\s_-]+/g, '-'); // Replace spaces with dashes

    // 2. Append a random timestamp to GUARANTEE uniqueness
    // Example: "summer-seeding-1715629"
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    
    try {
      // 3. Send the uniqueSlug instead of data.slug
      const createdCampaign = await campaignService.createCampaign({
        ...data,
        slug: uniqueSlug,
        shop: merchantShop || data.shop || null,
        merchantId: merchantId || data.merchantId || null
      });

      await campaignService.saveCampaignProducts(createdCampaign.id, selectedProducts);
      
      onPublish(); 
    } catch (e) {
      console.error("Failed to publish", e);
      alert(`Error publishing campaign: ${e.message || "Unknown error"}. Check console.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tab Button Helper
  const TabBtn = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  TabBtn.propTypes = {
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Editor Panel */}
      <div className="w-full md:w-1/2 flex flex-col h-full bg-white border-r border-gray-200 z-10">
        <div className="h-16 px-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-md"><ChevronLeft size={20}/></button>
            <span className="font-semibold text-gray-900">New Campaign</span>
          </div>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Save Draft</button>
        </div>

        <div className="px-8 py-6 border-b border-gray-100 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <TabBtn id="details" icon={Layout} label="Details" />
            <TabBtn id="products" icon={Package} label="Products" />
            <TabBtn id="branding" icon={Palette} label="Branding" />
            <TabBtn id="rules" icon={Settings} label="Rules" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          <div className="max-w-xl mx-auto space-y-8">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="campaign-name">Campaign Name</label>
                  <input 
                    id="campaign-name"
                    value={data.name} onChange={e => updateField('name', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="campaign-welcome-message">Welcome Message</label>
                  <textarea 
                    id="campaign-welcome-message"
                    value={data.welcomeMessage} onChange={e => updateField('welcomeMessage', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <CampaignProductPicker
                selectedProducts={selectedProducts}
                onProductsSelected={handleProductsSelected}
                onRemoveProduct={handleRemoveProduct}
              />
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="campaign-brand-name">Brand Name</label>
                  <input
                    id="campaign-brand-name"
                    value={data.brandName}
                    onChange={(e) => updateField('brandName', e.target.value)}
                    placeholder="Your Brand"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3" htmlFor="campaign-brand-color">Brand Color</label>
                  <div className="flex gap-4">
                    <input id="campaign-brand-color" type="color" value={data.brandColor} onChange={e => updateField('brandColor', e.target.value)} className="h-10 w-10 p-1 rounded border" />
                    <input type="text" value={data.brandColor} onChange={e => updateField('brandColor', e.target.value)} className="flex-1 px-4 rounded-lg border" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-6">
                <RuleSection title="General Limits" icon={ShoppingCart}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700" htmlFor="campaign-item-limit">Item Limit</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Max items an influencer can select per order.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input id="campaign-item-limit" type="number" min="1" max="10" value={data.itemLimit} onChange={e => updateField('itemLimit', parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700" htmlFor="campaign-order-limit">Order Limit per Link</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Total number of orders allowed for this campaign link.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input id="campaign-order-limit" type="number" value={data.orderLimitPerLink} onChange={e => updateField('orderLimitPerLink', e.target.value)} placeholder="Unlimited" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700" htmlFor="campaign-max-cart-value">Max Cart Value ($)</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Maximum total retail value allowed in the cart.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input id="campaign-max-cart-value" type="number" value={data.maxCartValue} onChange={e => updateField('maxCartValue', e.target.value)} placeholder="No Limit" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <RuleToggle 
                      label="Block Duplicate Orders" 
                      description="Prevent the same person (email/handle) from ordering more than once."
                      enabled={data.blockDuplicateOrders} 
                      onChange={v => updateField('blockDuplicateOrders', v)} 
                    />
                  </div>
                </RuleSection>

                <RuleSection title="Contact Fields" icon={Users}>
                  <RuleToggle label="Show Phone Field" description="Ask for phone number during checkout." enabled={data.showPhoneField} onChange={v => updateField('showPhoneField', v)} />
                  <RuleToggle label="Show Instagram" description="Ask for Instagram handle." enabled={data.showInstagramField} onChange={v => updateField('showInstagramField', v)} />
                  <RuleToggle label="Show TikTok" description="Ask for TikTok handle." enabled={data.showTiktokField} onChange={v => updateField('showTiktokField', v)} />
                  
                  <div className="pt-2 border-t border-gray-100">
                    <RuleToggle label="Ask Custom Question" description="Add a custom text field to the form." enabled={data.askCustomQuestion} onChange={v => updateField('askCustomQuestion', v)} />
                    {data.askCustomQuestion && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-indigo-100">
                        <input 
                          placeholder="e.g. What is your shirt size?" 
                          className="w-full px-3 py-2 text-sm rounded-lg border" 
                          value={data.customQuestionLabel}
                          onChange={e => updateField('customQuestionLabel', e.target.value)}
                        />
                        <RuleToggle label="Required?" description="Is this question mandatory?" enabled={data.customQuestionRequired} onChange={v => updateField('customQuestionRequired', v)} />
                      </div>
                    )}
                  </div>
                </RuleSection>

                <RuleSection title="Content & Consent" icon={Shield}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="campaign-terms-consent-text">Terms Consent Text</label>
                    <textarea id="campaign-terms-consent-text" rows={2} className="w-full px-3 py-2 rounded-lg border text-sm" value={data.termsConsentText} onChange={e => updateField('termsConsentText', e.target.value)} placeholder="I consent to..." />
                  </div>
                  
                  <div className="pt-3">
                    <RuleToggle label="Require Second Consent" description="Add an additional mandatory checkbox." enabled={data.requireSecondConsent} onChange={v => updateField('requireSecondConsent', v)} />
                    {data.requireSecondConsent && (
                      <textarea rows={2} className="w-full mt-2 px-3 py-2 rounded-lg border text-sm" value={data.secondConsentText} onChange={e => updateField('secondConsentText', e.target.value)} placeholder="Additional consent text..." />
                    )}
                  </div>

                  <div className="pt-3">
                    <RuleToggle label="Email Subscription Opt-in" description="Show a checkbox to subscribe to marketing emails." enabled={data.emailOptIn} onChange={v => updateField('emailOptIn', v)} />
                    {data.emailOptIn && (
                      <input className="w-full mt-2 px-3 py-2 rounded-lg border text-sm" value={data.emailConsentText} onChange={e => updateField('emailConsentText', e.target.value)} placeholder="Subscribe to emails text..." />
                    )}
                  </div>

                  <div className="pt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="campaign-submit-text">Submit Button Text</label>
                    <input id="campaign-submit-text" className="w-full px-3 py-2 rounded-lg border text-sm" value={data.submitButtonText} onChange={e => updateField('submitButtonText', e.target.value)} placeholder="Confirm & Ship" />
                  </div>
                </RuleSection>

                <RuleSection title="Product Settings" icon={Package}>
                    <RuleToggle label="2x2 Grid View" description="Display products in a 2-column grid instead of a list." enabled={data.gridTwoByTwo} onChange={v => updateField('gridTwoByTwo', v)} />
                    <RuleToggle label="Show Sold Out" description="Display out-of-stock items as disabled." enabled={data.showSoldOut} onChange={v => updateField('showSoldOut', v)} />
                    <RuleToggle label="Hide Inactive" description="Hide products that are archived in Shopify." enabled={data.hideInactiveProducts} onChange={v => updateField('hideInactiveProducts', v)} />
                    
                    <div className="pt-3 border-t border-gray-100">
                      <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="campaign-link-to-store">Link to Store</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input id="campaign-link-to-store" className="px-3 py-2 rounded-lg border text-sm" placeholder="myshop.com" value={data.linkToStore} onChange={e => updateField('linkToStore', e.target.value)} />
                        <input className="px-3 py-2 rounded-lg border text-sm" placeholder="Link Text" value={data.linkText} onChange={e => updateField('linkText', e.target.value)} />
                      </div>
                    </div>
                </RuleSection>

                <RuleSection title="Shipping" icon={Globe}>
                    <div className="relative">
                      <select 
                        value={data.shippingZone}
                        onChange={(e) => updateField('shippingZone', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                      >
                        {SHIPPING_ZONES.map(zone => (
                          <option key={zone}>{zone}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none text-gray-500">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="campaign-restricted-countries">Restricted Countries</label>
                      <input id="campaign-restricted-countries" className="w-full px-3 py-2 rounded-lg border text-sm" placeholder="Russia, North Korea..." value={data.restrictedCountries} onChange={e => updateField('restrictedCountries', e.target.value)} />
                    </div>
                </RuleSection>

                {/* Order Processing Section (Moved to Bottom) */}
                <RuleSection title="Order Processing" icon={FileText}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700" htmlFor="campaign-order-tags">Tag Orders</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Tags added to the Shopify Order for filtering/automation.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input 
                        id="campaign-order-tags"
                        placeholder="e.g. summer-gift" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.orderTags}
                        onChange={e => updateField('orderTags', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700" htmlFor="campaign-customer-tags">Tag Customers</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Tags added to the Shopify Customer profile for segmentation.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input 
                        id="campaign-customer-tags"
                        placeholder="e.g. influencer" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.customerTags}
                        onChange={e => updateField('customerTags', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="campaign-discount-code">Discount Code</label>
                      <input 
                        id="campaign-discount-code"
                        placeholder="INFLUENCER100" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.discountCode}
                        onChange={e => updateField('discountCode', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <RuleToggle 
                      label="Keep Order in Draft" 
                      description="Requires manual approval in Shopify before fulfilling."
                      enabled={data.keepDraft} 
                      onChange={v => updateField('keepDraft', v)} 
                    />
                    <RuleToggle 
                      label="Enable Billing Address" 
                      description="Collect billing details from influencer (usually not needed)."
                      enabled={data.enableBilling} 
                      onChange={v => updateField('enableBilling', v)} 
                    />
                  </div>
                </RuleSection>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handlePublish} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? 'Publishing...' : initialData ? 'Save Campaign' : 'Publish Campaign'}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="hidden md:flex flex-1 bg-gray-100 flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#d4d4ff 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
        <div className="relative w-[320px] h-[640px] z-10">
          <div className="absolute inset-0 rounded-[48px] bg-slate-900 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.8)]"></div>
          <div className="absolute inset-[10px] rounded-[40px] bg-white overflow-hidden flex flex-col">
            <div className="h-10 px-5 flex items-center justify-between text-[11px] text-gray-600">
              <span>9:41</span>
              <div className="flex gap-1"><Signal size={12} /><Wifi size={12} /><Battery size={12} /></div>
            </div>
            <div className="flex-1 overflow-hidden relative">
          <ClaimExperience campaign={data} products={selectedProducts} isPreview={true} usage={null} />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-800 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

CampaignBuilder.propTypes = {
  onPublish: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialData: PropTypes.shape(campaignConfigShape),
  merchantShop: PropTypes.string,
  merchantId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

/* --- MAIN APP ORCHESTRATOR --- */
export default function App() {
  const [route, setRoute] = useState(
    typeof window !== 'undefined'
      ? window.location.hash || window.location.pathname
      : ''
  );
  const [campaigns, setCampaigns] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [merchantUsage, setMerchantUsage] = useState(null);

  // Initial Load from Supabase
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await campaignService.getAllCampaigns();
      setCampaigns(data || []);
    } catch (e) {
      console.error("Failed to load campaigns", e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    const shouldDelete = window.confirm('Delete this campaign? This only marks it as deleted in the database.');
    if (!shouldDelete) return;

    try {
      await campaignService.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Failed to delete campaign', e);
      alert('Unable to delete campaign right now. Please try again.');
    }
  };

  useEffect(() => {
    loadCampaigns();
    const updateRoute = () => {
      setRoute(window.location.hash || window.location.pathname);
    };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('popstate', updateRoute);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('popstate', updateRoute);
    };
  }, []);

  useEffect(() => {
    if (route.startsWith('#claim/') || route.startsWith('/claim/')) return;
    const loadMerchantUsage = async () => {
      try {
        const response = await fetchWithShopifyToken('/api/merchant');
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          console.error('Failed to load merchant usage', payload);
          return;
        }
        setMerchantUsage(payload);
      } catch (error) {
        console.error('Failed to load merchant usage', error);
      }
    };
    loadMerchantUsage();
  }, [route]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  // --- ROUTER: PUBLIC CLAIM PAGE ---
  if (route.startsWith('#claim/') || route.startsWith('/claim/')) {
    const slug = route.includes('#claim/')
      ? route.split('#claim/')[1]
      : route.split('/claim/')[1];
    
    // We need a separate state here because we need to fetch the single campaign async
    // This is a simple implementation; normally you'd use a useEffect to fetch by slug
    return <PublicClaimLoader slug={slug} />;
  }
  
  if (route === '#create') {
    return (
      <CampaignBuilder
        merchantShop={merchantUsage?.shop || null}
        merchantId={merchantUsage?.merchantId || null}
        onPublish={() => { loadCampaigns(); setEditingCampaign(null); window.location.hash = ''; }}
        onCancel={() => { setEditingCampaign(null); window.location.hash = ''; }}
      />
    );
  }

  if (route === '#edit') {
    return (
      <CampaignBuilder
        initialData={editingCampaign}
        merchantShop={merchantUsage?.shop || null}
        merchantId={merchantUsage?.merchantId || null}
        onPublish={() => { loadCampaigns(); setEditingCampaign(null); window.location.hash = ''; }}
        onCancel={() => { setEditingCampaign(null); window.location.hash = ''; }}
      />
    );
  }
  
  if (view === 'orders') {
    return (
      <OrdersDashboard
        campaigns={campaigns}
        onNavigateDashboard={() => setView('dashboard')}
      />
    );
  }
  if (view === 'settings') {
    return (
      <SettingsPage
        merchantUsage={merchantUsage}
        currentView="settings"
        onViewDashboard={() => setView('dashboard')}
        onViewOrders={() => setView('orders')}
        onViewSettings={() => setView('settings')}
      />
    );
  }
  
  return (
    <DashboardHome
      campaigns={campaigns}
      merchantUsage={merchantUsage}
      currentView="dashboard"
      onCreateCampaign={() => (window.location.hash = '#create')}
      onDeleteCampaign={handleDeleteCampaign}
      onEditCampaign={(c) => { setEditingCampaign({ ...c.config, id: c.id, name: c.name, welcomeMessage: c.welcome_message || c.welcomeMessage, brandColor: c.brand_color || c.brandColor, slug: c.slug }); window.location.hash = '#edit'; }}
      onViewOrders={() => setView('orders')}
      onViewSettings={() => setView('settings')}
    />
  );
}

// Helper component to load a single campaign for the public view
const PublicClaimLoader = ({ slug }) => {
  const [campaign, setCampaign] = useState(null);
  const [products, setProducts] = useState([]); // Add state for real products
  const [merchantUsage, setMerchantUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const campaignData = await campaignService.getCampaignBySlug(slug);
        setCampaign(campaignData);

        let nextProducts = [];
        const shopDomain =
          campaignData?.shop ||
          campaignData?.shopDomain ||
          campaignData?.shop_domain ||
          env.VITE_SHOPIFY_SHOP ||
          '';
        if (shopDomain) {
          try {
            const baseUrl = env.VITE_GIFT_BRIDGE_URL || '';
            const productResponse = await fetch(
              `${baseUrl}/api/products?shop=${encodeURIComponent(shopDomain)}`
            );
            if (productResponse.ok) {
              const productData = await productResponse.json().catch(() => ({}));
              if (Array.isArray(productData.products) && productData.products.length) {
                nextProducts = productData.products;
              }
            }
          } catch (error) {
            console.error('Failed to load live products, falling back.', error);
          }
        }
        if (!nextProducts.length && campaignData?.id) {
          nextProducts = await campaignService.getCampaignProducts(campaignData.id);
        }
        setProducts(nextProducts);

        const usage = await merchantService.getUsage({
          shop: campaignData?.shop || SHOPIFY_SHOP,
          merchantId: campaignData?.merchantId
        });
        setMerchantUsage(usage);
      } catch (err) {
        console.error("Failed to sync Shopify products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!campaign) return <div className="h-screen flex items-center justify-center text-gray-500">Campaign not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white h-[800px] max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden relative">
        {/* Pass the real products state here */}
        <ClaimExperience campaign={campaign} products={products} usage={merchantUsage} />
      </div>
    </div>
  );
};

PublicClaimLoader.propTypes = {
  slug: PropTypes.string.isRequired
};





