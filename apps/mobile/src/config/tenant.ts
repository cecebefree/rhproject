export interface TenantConfig {
  features: {
    devotional: boolean;
  };
}

export const TENANT_CONFIG: TenantConfig = {
  features: {
    devotional: false,
  },
};

export function isFeatureEnabled(feature: keyof TenantConfig['features']): boolean {
  return TENANT_CONFIG.features[feature];
}
