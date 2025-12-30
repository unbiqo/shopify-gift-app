export const PLAN_KEYS = {
  FREE: 'FREE',
  GROWTH: 'GROWTH',
  UNLIMITED: 'UNLIMITED'
};

export const PLAN_DEFINITIONS = {
  [PLAN_KEYS.FREE]: {
    label: 'Free',
    price: 0,
    limit: 5
  },
  [PLAN_KEYS.GROWTH]: {
    label: 'Growth',
    price: 69,
    limit: 100
  },
  [PLAN_KEYS.UNLIMITED]: {
    label: 'Unlimited',
    price: 379,
    limit: null
  }
};

export const PLAN_ORDER = [PLAN_KEYS.FREE, PLAN_KEYS.GROWTH, PLAN_KEYS.UNLIMITED];

export const normalizePlan = (value) => {
  if (!value) return PLAN_KEYS.FREE;
  const upper = String(value).trim().toUpperCase();
  if (upper in PLAN_DEFINITIONS) return upper;
  return PLAN_KEYS.FREE;
};

export const getPlanLimit = (planKey) => PLAN_DEFINITIONS[normalizePlan(planKey)].limit;

export const isLimitReached = (totalClaims, planKey) => {
  const limit = getPlanLimit(planKey);
  if (limit == null) return false;
  return (totalClaims || 0) >= limit;
};

export const getUsagePercent = (totalClaims, planKey) => {
  const limit = getPlanLimit(planKey);
  if (limit == null) return 0;
  if (!limit) return 0;
  return Math.min((totalClaims || 0) / limit, 1);
};

export const getNextPlan = (planKey) => {
  const normalized = normalizePlan(planKey);
  const index = PLAN_ORDER.indexOf(normalized);
  if (index < 0 || index === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[index + 1];
};
