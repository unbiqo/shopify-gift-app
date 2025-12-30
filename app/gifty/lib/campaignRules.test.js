import { describe, it, expect } from 'vitest';
import {
  getItemLimit,
  getMaxCartValue,
  getSelectedTotal,
  isMaxCartExceeded,
  isCountryAllowed,
  isOrderLimitReached,
  shouldBlockDuplicateOrders
} from './campaignRules';

describe('campaign rules', () => {
  it('normalizes item limits', () => {
    expect(getItemLimit({ itemLimit: 3 })).toBe(3);
    expect(getItemLimit({ itemLimit: 0 })).toBe(1);
    expect(getItemLimit({ itemLimit: -2 })).toBe(1);
    expect(getItemLimit({ itemLimit: '4.9' })).toBe(4);
  });

  it('normalizes max cart value', () => {
    expect(getMaxCartValue({ maxCartValue: '50' })).toBe(50);
    expect(getMaxCartValue({ maxCartValue: 0 })).toBeNull();
    expect(getMaxCartValue({ maxCartValue: '' })).toBeNull();
  });

  it('sums selected items with mixed price formats', () => {
    const items = [
      { price: '19.99' },
      { price: '$10.00' },
      { price: 5 }
    ];
    expect(getSelectedTotal(items)).toBeCloseTo(34.99, 2);
  });

  it('detects when max cart value is exceeded', () => {
    const campaign = { maxCartValue: 25 };
    const items = [{ price: 10 }, { price: '20' }];
    expect(isMaxCartExceeded(campaign, items)).toBe(true);
  });

  it('blocks countries outside the shipping zone', () => {
    const campaign = { shippingZone: 'Canada' };
    const result = isCountryAllowed(campaign, 'United States');
    expect(result.allowed).toBe(false);
  });

  it('blocks restricted countries even when shipping zone is World', () => {
    const campaign = { shippingZone: 'World', restrictedCountries: 'Iran, North Korea' };
    const result = isCountryAllowed(campaign, 'Iran');
    expect(result.allowed).toBe(false);
  });

  it('flags order limits when claims exceed the cap', () => {
    const campaign = { orderLimitPerLink: 2, claimsCount: 2 };
    expect(isOrderLimitReached(campaign)).toBe(true);
  });

  it('respects the duplicate-order toggle', () => {
    expect(shouldBlockDuplicateOrders({ blockDuplicateOrders: true })).toBe(true);
    expect(shouldBlockDuplicateOrders({ blockDuplicateOrders: false })).toBe(false);
  });
});
