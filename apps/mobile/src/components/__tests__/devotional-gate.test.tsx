import { describe, expect, test } from 'vitest';
import { TENANT_CONFIG, isFeatureEnabled } from '../../config/tenant';

describe('tenant config', () => {
  test('devotional feature defaults to disabled', () => {
    expect(TENANT_CONFIG.features.devotional).toBe(false);
  });

  test('isFeatureEnabled returns false for disabled devotional', () => {
    expect(isFeatureEnabled('devotional')).toBe(false);
  });
});
