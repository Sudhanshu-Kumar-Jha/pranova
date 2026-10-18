import { api } from './client';

/**
 * Branding configured by an administrator in the console. Served publicly from
 * `GET /cm/config` (mounted before the requireCareManager guard) so the sign-in
 * screen can brand itself before a care manager has a token.
 *
 * The payload is shared with the patient surface and carries a `pharmacy` block;
 * this app has no storefront, so that block is deliberately not modelled here.
 */
export interface AppConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  emergencyNumber: string;
}

/**
 * Used until the API answers, and if it cannot be reached at all. Display
 * defaults only — nothing here is used for a decision the server makes.
 */
export const FALLBACK_CONFIG: AppConfig = {
  appName: 'PRANOVA',
  tagline: '',
  logoUrl: '',
  primaryColor: '#0f766e',
  supportEmail: '',
  supportPhone: '',
  emergencyNumber: '108',
};

export async function getAppConfig(): Promise<AppConfig> {
  const res = await api.get('/cm/config');
  const data = res.data?.data ?? {};
  // Merge over the fallback so a partially configured server cannot leave a
  // screen with `undefined` where it expects a string.
  return { ...FALLBACK_CONFIG, ...data };
}
