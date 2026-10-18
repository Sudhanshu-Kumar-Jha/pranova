import { randomInt } from 'crypto';

/**
 * Generates a human-readable, reasonably-unique reference code for
 * appointments, orders, and lab bookings, e.g. "APT-2026-4821907".
 */
export function generateReference(prefix: string): string {
  const year = new Date().getFullYear();
  const suffix = randomInt(1_000_000, 9_999_999);
  return `${prefix}-${year}-${suffix}`;
}
