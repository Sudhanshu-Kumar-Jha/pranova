import { api } from './client';

/**
 * Branding and storefront rules configured by an administrator in the console.
 * Served publicly from `GET /app/config` so the sign-in screen can brand
 * itself before a patient has a token.
 */
export interface PharmacyConfig {
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
}

export interface AppConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  emergencyNumber: string;
  pharmacy: PharmacyConfig;
}

/**
 * Used until the API answers, and if it cannot be reached at all. These are
 * display defaults only — the server always prices an order itself, so a stale
 * fee here can never change what a patient is actually charged.
 */
export const FALLBACK_CONFIG: AppConfig = {
  appName: 'PRANOVA',
  tagline: '',
  logoUrl: '',
  primaryColor: '#0f766e',
  supportEmail: '',
  supportPhone: '',
  emergencyNumber: '108',
  pharmacy: {
    deliveryFee: 40,
    freeDeliveryThreshold: 500,
    minOrderAmount: 0,
    codEnabled: true,
    onlinePaymentEnabled: false,
  },
};

export async function getAppConfig(): Promise<AppConfig> {
  const res = await api.get('/app/config');
  const data = res.data?.data ?? {};
  // Merge over the fallback so a partially configured server cannot leave a
  // screen with `undefined` where it expects a string or a number.
  return {
    ...FALLBACK_CONFIG,
    ...data,
    pharmacy: { ...FALLBACK_CONFIG.pharmacy, ...(data.pharmacy ?? {}) },
  };
}
