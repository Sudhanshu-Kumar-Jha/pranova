import { prisma } from '../utils/prisma.js';
import { UpdateSettingsInput } from '../validators/settings.validator.js';

/**
 * Global application settings. Branding and storefront config live as
 * key/value rows; sensible defaults are returned on first-time use so both the
 * console and the mobile apps look complete before anything is configured.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  // Identity — shared by the console, the sign-in screens and the mobile apps.
  app_name: 'PRANOVA',
  app_tagline: 'Operations console',
  app_logo: '',
  app_favicon: '',
  primary_color: '#0B6E6E',
  support_email: 'support@pranova.health',

  // Mobile apps.
  mobile_app_name: 'PRANOVA',
  mobile_tagline: 'Care, coordinated',
  support_phone: '',
  emergency_number: '108',

  // Pharmacy storefront rules. Stored as strings; read through the typed
  // getters below so a bad value can never reach pricing as NaN.
  pharmacy_delivery_fee: '40',
  pharmacy_free_delivery_threshold: '500',
  pharmacy_cod_enabled: 'true',
  pharmacy_online_payment_enabled: 'false',
  pharmacy_min_order_amount: '0',
};

/** Branding + storefront rules a mobile client needs before sign-in. */
export interface PublicAppConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  emergencyNumber: string;
  pharmacy: {
    deliveryFee: number;
    freeDeliveryThreshold: number;
    minOrderAmount: number;
    codEnabled: boolean;
    onlinePaymentEnabled: boolean;
  };
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

export class SettingsService {
  static async getAll(): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      map[row.key] = row.value ?? '';
    }
    return map;
  }

  static async update(input: UpdateSettingsInput): Promise<Record<string, string>> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value: value == null ? null : String(value) },
          update: { value: value == null ? null : String(value) },
        })
      )
    );
    return this.getAll();
  }

  /**
   * Pricing rules for the pharmacy, read fresh so an admin change takes effect
   * on the next order without a restart. The order service prices from this —
   * clients only ever display it.
   */
  static async getPharmacyConfig() {
    const s = await this.getAll();
    return {
      deliveryFee: toNumber(s.pharmacy_delivery_fee, 40),
      freeDeliveryThreshold: toNumber(s.pharmacy_free_delivery_threshold, 500),
      minOrderAmount: toNumber(s.pharmacy_min_order_amount, 0),
      codEnabled: toBoolean(s.pharmacy_cod_enabled, true),
      onlinePaymentEnabled: toBoolean(s.pharmacy_online_payment_enabled, false),
    };
  }

  /**
   * The public, client-safe projection of settings. Mobile apps read this
   * before sign-in to brand themselves, so it must never expose a secret —
   * only keys an admin has explicitly set for display.
   */
  static async getPublicAppConfig(): Promise<PublicAppConfig> {
    const s = await this.getAll();
    return {
      appName: s.mobile_app_name || s.app_name || 'PRANOVA',
      tagline: s.mobile_tagline || '',
      logoUrl: s.app_logo || '',
      primaryColor: s.primary_color || '#0B6E6E',
      supportEmail: s.support_email || '',
      supportPhone: s.support_phone || '',
      emergencyNumber: s.emergency_number || '108',
      pharmacy: await this.getPharmacyConfig(),
    };
  }
}
