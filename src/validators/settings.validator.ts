import { z } from 'zod';

// Known branding keys plus passthrough for forward-compatibility (Bagisto-style
// key/value config). Values may be plain strings, URLs, or data: URLs (images).
export const updateSettingsSchema = z
  .object({
    app_name: z.string().max(120).optional(),
    app_logo: z.string().optional(),
    app_favicon: z.string().optional(),
    primary_color: z.string().max(32).optional(),
    support_email: z.string().optional(),

    // Mobile apps
    mobile_app_name: z.string().max(120).optional(),
    mobile_tagline: z.string().max(200).optional(),
    support_phone: z.string().max(32).optional(),
    emergency_number: z.string().max(32).optional(),

    // Pharmacy storefront rules (stored as strings, parsed by SettingsService)
    pharmacy_delivery_fee: z.string().optional(),
    pharmacy_free_delivery_threshold: z.string().optional(),
    pharmacy_min_order_amount: z.string().optional(),
    pharmacy_cod_enabled: z.enum(['true', 'false']).optional(),
    pharmacy_online_payment_enabled: z.enum(['true', 'false']).optional(),
  })
  .passthrough();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
