import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Medicine } from '../api/pharmacy';
import type { PharmacyConfig } from '../api/config';

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface CartState {
  items: Record<string, CartItem>;
  hydrated: boolean;
  restore: () => Promise<void>;
  addItem: (medicine: Medicine) => void;
  removeItem: (medicineId: string) => void;
  updateQuantity: (medicineId: string, delta: number) => void;
  setQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getSavings: () => number;
}

const CART_KEY = 'pranova_cart_v1';

/**
 * The cart survives an app restart, so a patient who gets interrupted does
 * not lose what they picked. Prices are re-read from the catalogue and
 * re-priced by the server at checkout, so a stale cart can never carry a
 * stale price into an order.
 */
async function persist(items: Record<string, CartItem>) {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* a cart that cannot be cached still works for this session */
  }
}

export const useCartStore = create<CartState>((set, get) => {
  /** Applies a change and writes the result through to storage. */
  const commit = (next: Record<string, CartItem>) => {
    set({ items: next });
    void persist(next);
  };

  return {
    items: {},
    hydrated: false,

    restore: async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, CartItem>;
          // Drop anything malformed rather than crashing a screen later.
          const clean: Record<string, CartItem> = {};
          for (const [id, item] of Object.entries(parsed)) {
            if (item?.medicine?.id && typeof item.quantity === 'number' && item.quantity > 0) {
              clean[id] = item;
            }
          }
          set({ items: clean });
        }
      } catch {
        /* start with an empty cart */
      } finally {
        set({ hydrated: true });
      }
    },

    addItem: (medicine) => {
      const state = get();
      const current = state.items[medicine.id];
      const nextQuantity = (current?.quantity ?? 0) + 1;
      if (nextQuantity > medicine.stock) return; // respect stock limit
      // Re-snapshot the medicine so an updated price or stock count replaces
      // whatever the cart was holding.
      commit({ ...state.items, [medicine.id]: { medicine, quantity: nextQuantity } });
    },

    removeItem: (medicineId) => {
      const copy = { ...get().items };
      delete copy[medicineId];
      commit(copy);
    },

    updateQuantity: (medicineId, delta) => {
      const current = get().items[medicineId];
      if (!current) return;
      const next = current.quantity + delta;
      if (next <= 0) {
        const copy = { ...get().items };
        delete copy[medicineId];
        commit(copy);
        return;
      }
      if (next > current.medicine.stock) return;
      commit({ ...get().items, [medicineId]: { ...current, quantity: next } });
    },

    setQuantity: (medicineId, quantity) => {
      const current = get().items[medicineId];
      if (!current) return;
      if (quantity <= 0) {
        const copy = { ...get().items };
        delete copy[medicineId];
        commit(copy);
        return;
      }
      const capped = Math.min(quantity, current.medicine.stock);
      commit({ ...get().items, [medicineId]: { ...current, quantity: capped } });
    },

    clearCart: () => commit({}),

    getItemCount: () =>
      Object.values(get().items).reduce((acc, item) => acc + item.quantity, 0),

    getSubtotal: () =>
      Object.values(get().items).reduce(
        (acc, item) => acc + item.medicine.sellingPrice * item.quantity,
        0
      ),

    getSavings: () =>
      Object.values(get().items).reduce(
        (acc, item) => acc + Math.max(0, item.medicine.mrp - item.medicine.sellingPrice) * item.quantity,
        0
      ),
  };
});

/**
 * Delivery pricing mirrors the server's rule, using the admin-configured
 * numbers that arrive with the app config. It exists only so the patient sees
 * the bill before they commit — `OrderService.place` is what actually prices
 * the order, and the order it returns is what gets displayed afterwards.
 */
export function estimateDeliveryFee(subtotal: number, pharmacy: PharmacyConfig): number {
  if (subtotal <= 0) return 0;
  return subtotal >= pharmacy.freeDeliveryThreshold ? 0 : pharmacy.deliveryFee;
}

export function estimateTotal(subtotal: number, pharmacy: PharmacyConfig): number {
  return subtotal + estimateDeliveryFee(subtotal, pharmacy);
}
