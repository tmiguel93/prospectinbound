import { describe, expect, it } from 'vitest';
import { calculateInitialCommission } from '../src/modules/commissions/commission.service.js';

describe('MVP commercial calculation flow', () => {
  it('calculates the initial configured commission without floating point values', () => {
    expect(calculateInitialCommission(3000, 1000, 12990)).toEqual({
      fixedCents: 3000,
      recurringCents: 1299,
      totalCents: 4299
    });
    expect(calculateInitialCommission(7500, 1500, 12990)).toEqual({
      fixedCents: 7500,
      recurringCents: 1949,
      totalCents: 9449
    });
  });

  it('calculates a recurring-only payment without charging activation again', () => {
    expect(calculateInitialCommission(0, 1250, 9999)).toEqual({
      fixedCents: 0,
      recurringCents: 1250,
      totalCents: 1250
    });
  });
});
