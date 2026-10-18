import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  IconButton,
  HelperText,
  Divider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCartStore, estimateDeliveryFee } from '../store/cartStore';
import { placeOrder, PaymentMethod } from '../api/pharmacy';
import { getMe } from '../api/auth';
import { useBrand } from '../providers/AppConfigProvider';
import { getCurrentLocationDetails } from '../utils/location';
import { ProductImage } from './ProductImage';
import { palette, formatINR, tint, onColor } from '../theme';

interface CartCheckoutModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (orderNumber: string) => void;
}

/** Bagisto-style checkout: cart, address, payment, then a review before paying. */
type Step = 'cart' | 'address' | 'payment' | 'review';

const STEPS: Array<{ key: Step; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { key: 'cart', label: 'Cart', icon: 'cart-outline' },
  { key: 'address', label: 'Delivery', icon: 'map-marker-outline' },
  { key: 'payment', label: 'Payment', icon: 'wallet-outline' },
  { key: 'review', label: 'Review', icon: 'clipboard-check-outline' },
];

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  visible,
  onDismiss,
  onSuccess,
}) => {
  const theme = useTheme();
  const brand = useBrand();
  const pharmacy = brand.pharmacy;

  const itemsMap = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const savings = useCartStore((s) => s.getSavings());

  const cartList = Object.values(itemsMap);
  const deliveryFee = estimateDeliveryFee(subtotal, pharmacy);
  const total = subtotal + deliveryFee;

  const [step, setStep] = useState<Step>('cart');
  const [loading, setLoading] = useState(false);
  const [locDetecting, setLocDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery details start from the patient's saved profile — never from
  // invented sample values.
  const profileQuery = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: visible });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  useEffect(() => {
    if (visible && profileQuery.data) {
      const p = profileQuery.data.profile;
      setDeliveryAddress(p?.primaryAddress ?? '');
      setCity(p?.city ?? '');
      setPincode(p?.pincode ?? '');
      setPhone(profileQuery.data.phone ?? '');
      setPrefilled(true);
    }
  }, [visible, profileQuery.data]);

  const handleDetectLocation = async () => {
    setLocDetecting(true);
    setError(null);
    try {
      const outcome = await getCurrentLocationDetails();
      if (!outcome.success || !outcome.data) {
        setError(outcome.error || 'Could not fetch device location.');
        return;
      }
      const loc = outcome.data;
      if (loc.primaryAddress) setDeliveryAddress(loc.primaryAddress);
      if (loc.city) setCity(loc.city);
      if (loc.pincode) setPincode(loc.pincode);
    } catch (err: any) {
      setError(err?.message || 'Error detecting location.');
    } finally {
      setLocDetecting(false);
    }
  };

  // Pick whichever payment method the administrator has actually enabled.
  useEffect(() => {
    if (!pharmacy.codEnabled && pharmacy.onlinePaymentEnabled) setPaymentMethod('ONLINE');
    else if (pharmacy.codEnabled) setPaymentMethod('COD');
  }, [pharmacy.codEnabled, pharmacy.onlinePaymentEnabled]);

  // Reopening the sheet starts a fresh pass through the steps.
  useEffect(() => {
    if (visible) {
      setStep('cart');
      setError(null);
    }
  }, [visible]);

  const belowMinimum = pharmacy.minOrderAmount > 0 && subtotal < pharmacy.minOrderAmount;
  const noPaymentMethod = !pharmacy.codEnabled && !pharmacy.onlinePaymentEnabled;

  const addressValid = deliveryAddress.trim().length >= 3 && phone.trim().length >= 7;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const canContinue = useMemo(() => {
    if (step === 'cart') return cartList.length > 0 && !belowMinimum;
    if (step === 'address') return addressValid;
    if (step === 'payment') return !noPaymentMethod;
    return true;
  }, [step, cartList.length, belowMinimum, addressValid, noPaymentMethod]);

  const goNext = () => {
    setError(null);
    if (step === 'cart') setStep('address');
    else if (step === 'address') {
      if (!addressValid) {
        setError('Add a delivery address and a contact number we can reach you on.');
        return;
      }
      setStep('payment');
    } else if (step === 'payment') setStep('review');
  };

  const goBack = () => {
    setError(null);
    if (step === 'review') setStep('payment');
    else if (step === 'payment') setStep('address');
    else if (step === 'address') setStep('cart');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await placeOrder({
        items: cartList.map((item) => ({ medicineId: item.medicine.id, quantity: item.quantity })),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
        phone: phone.trim(),
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      clearCart();
      onSuccess(order.orderNumber);
      onDismiss();
    } catch (err: any) {
      // The server is the authority on stock and pricing, so show exactly
      // what it said rather than a generic failure.
      setError(
        err?.response?.data?.message ||
          'The order could not be placed. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const Stepper = () => (
    <View style={styles.stepper}>
      {STEPS.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        const bg = done || active ? theme.colors.primary : palette.hairline;
        return (
          <React.Fragment key={s.key}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: bg }]}>
                <MaterialCommunityIcons
                  name={done ? 'check' : s.icon}
                  size={14}
                  color={done || active ? onColor(theme.colors.primary) : palette.subtle}
                />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: active ? theme.colors.primary : palette.subtle, fontWeight: active ? '700' : '500' },
                ]}
              >
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: i < stepIndex ? theme.colors.primary : palette.line }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const BillSummary = () => (
    <View style={styles.billBox}>
      <View style={styles.billRow}>
        <Text style={styles.billLabel}>Subtotal</Text>
        <Text style={styles.billValue}>{formatINR(subtotal)}</Text>
      </View>
      {savings > 0 && (
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Savings on MRP</Text>
          <Text style={[styles.billValue, { color: palette.success }]}>-{formatINR(savings)}</Text>
        </View>
      )}
      <View style={styles.billRow}>
        <Text style={styles.billLabel}>
          Delivery{pharmacy.freeDeliveryThreshold > 0 ? ` (free over ${formatINR(pharmacy.freeDeliveryThreshold)})` : ''}
        </Text>
        <Text style={[styles.billValue, deliveryFee === 0 ? { color: palette.success, fontWeight: '700' } : null]}>
          {deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}
        </Text>
      </View>
      <Divider style={{ marginVertical: 6 }} />
      <View style={styles.billRow}>
        <Text style={styles.totalLabel}>Total payable</Text>
        <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{formatINR(total)}</Text>
      </View>
      <Text style={styles.billNote}>Confirmed by the pharmacy when your order is accepted.</Text>
    </View>
  );

  const PaymentOption: React.FC<{
    value: PaymentMethod;
    title: string;
    description: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    enabled: boolean;
  }> = ({ value, title, description, icon, enabled }) => {
    const selected = paymentMethod === value && enabled;
    return (
      <View
        style={[
          styles.payOption,
          selected && { borderColor: theme.colors.primary, backgroundColor: tint(theme.colors.primary, 0.94) },
          !enabled && styles.payOptionDisabled,
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !enabled }}
      >
        <Button
          mode="text"
          onPress={() => enabled && setPaymentMethod(value)}
          disabled={!enabled}
          contentStyle={styles.payOptionBtn}
          style={{ flex: 1 }}
          textColor={palette.ink}
        >
          <View style={styles.payOptionInner}>
            <MaterialCommunityIcons
              name={selected ? 'radiobox-marked' : 'radiobox-blank'}
              size={20}
              color={selected ? theme.colors.primary : palette.subtle}
            />
            <MaterialCommunityIcons name={icon} size={20} color={enabled ? palette.body : palette.subtle} />
            <View style={styles.payOptionText}>
              <Text style={[styles.payTitle, !enabled && { color: palette.subtle }]}>{title}</Text>
              <Text style={styles.payDescription}>{description}</Text>
            </View>
          </View>
        </Button>
      </View>
    );
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.title}>
                Checkout
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                {cartList.length === 1 ? '1 item' : `${cartList.length} items`} · {formatINR(total)}
              </Text>
            </View>
            <IconButton icon="close" onPress={onDismiss} accessibilityLabel="Close checkout" />
          </View>

          <Stepper />
          <Divider />

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* ---------------- Step 1: cart ---------------- */}
            {step === 'cart' && (
              <>
                {cartList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons name="cart-outline" size={40} color={palette.subtle} />
                    <Text style={styles.emptyText}>Your cart is empty.</Text>
                  </View>
                ) : (
                  <View style={styles.itemsSection}>
                    {cartList.map(({ medicine, quantity }) => (
                      <View key={medicine.id} style={styles.itemRow}>
                        <ProductImage uri={medicine.imageUrl} size={52} />
                        <View style={styles.itemInfo}>
                          <Text variant="bodyMedium" style={styles.itemBrand} numberOfLines={1}>
                            {medicine.brand || medicine.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.itemName} numberOfLines={1}>
                            {medicine.name}
                          </Text>
                          <Text style={[styles.itemPrice, { color: theme.colors.primary }]}>
                            {formatINR(medicine.sellingPrice)} × {quantity} ={' '}
                            {formatINR(medicine.sellingPrice * quantity)}
                          </Text>
                        </View>

                        <View style={styles.itemActions}>
                          <View style={styles.qtyControl}>
                            <IconButton
                              icon="minus"
                              size={14}
                              onPress={() => updateQuantity(medicine.id, -1)}
                              style={styles.smallQtyBtn}
                              accessibilityLabel={`Remove one ${medicine.name}`}
                            />
                            <Text style={styles.qtyNumber}>{quantity}</Text>
                            <IconButton
                              icon="plus"
                              size={14}
                              onPress={() => updateQuantity(medicine.id, 1)}
                              style={styles.smallQtyBtn}
                              disabled={quantity >= medicine.stock}
                              accessibilityLabel={`Add one more ${medicine.name}`}
                            />
                          </View>
                          <IconButton
                            icon="trash-can-outline"
                            size={16}
                            iconColor={palette.danger}
                            onPress={() => removeItem(medicine.id)}
                            style={styles.smallQtyBtn}
                            accessibilityLabel={`Remove ${medicine.name} from cart`}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {belowMinimum && (
                  <View style={styles.warnBox}>
                    <MaterialCommunityIcons name="information-outline" size={16} color={palette.warning} />
                    <Text style={styles.warnText}>
                      Minimum order is {formatINR(pharmacy.minOrderAmount)}. Add{' '}
                      {formatINR(pharmacy.minOrderAmount - subtotal)} more to continue.
                    </Text>
                  </View>
                )}

                {cartList.length > 0 && <BillSummary />}
              </>
            )}

            {/* ---------------- Step 2: delivery ---------------- */}
            {step === 'address' && (
              <>
                {profileQuery.isLoading ? (
                  <ActivityIndicator style={{ marginVertical: 24 }} />
                ) : (
                  <>
                    <View style={styles.addressHeaderRow}>
                      <Text style={styles.sectionLabel}>Where should we deliver?</Text>
                      <Button
                        mode="text"
                        compact
                        icon="crosshairs-gps"
                        loading={locDetecting}
                        disabled={locDetecting || loading}
                        onPress={handleDetectLocation}
                        textColor="#0f766e"
                        labelStyle={{ fontWeight: '700', fontSize: 13 }}
                      >
                        {locDetecting ? 'Detecting...' : 'Use Current Location'}
                      </Button>
                    </View>
                    <TextInput
                      label="Street address *"
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                      mode="outlined"
                      multiline
                      style={styles.input}
                      placeholder="Flat / house number, street, landmark"
                    />
                    <View style={styles.row}>
                      <TextInput
                        label="City"
                        value={city}
                        onChangeText={setCity}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                      />
                      <TextInput
                        label="Pincode"
                        value={pincode}
                        onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        mode="outlined"
                        keyboardType="number-pad"
                        style={[styles.input, { width: 120 }]}
                      />
                    </View>
                    <TextInput
                      label="Contact number *"
                      value={phone}
                      onChangeText={setPhone}
                      mode="outlined"
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                    <TextInput
                      label="Delivery instructions (optional)"
                      value={notes}
                      onChangeText={setNotes}
                      mode="outlined"
                      placeholder="e.g. Leave with security, ring the bell"
                      style={styles.input}
                    />
                    <Text style={styles.helpNote}>
                      Prefilled from your profile. Changing it here applies to this order only.
                    </Text>
                  </>
                )}
              </>
            )}

            {/* ---------------- Step 3: payment ---------------- */}
            {step === 'payment' && (
              <>
                <Text style={styles.sectionLabel}>How would you like to pay?</Text>
                <PaymentOption
                  value="COD"
                  title="Cash on delivery"
                  description="Pay the delivery partner when your order arrives."
                  icon="cash"
                  enabled={pharmacy.codEnabled}
                />
                <PaymentOption
                  value="ONLINE"
                  title={pharmacy.onlinePaymentEnabled ? 'Pay online' : 'Pay online (not available yet)'}
                  description={
                    pharmacy.onlinePaymentEnabled
                      ? 'Pay securely before dispatch.'
                      : 'Online payment has not been switched on for this pharmacy.'
                  }
                  icon="credit-card-outline"
                  enabled={pharmacy.onlinePaymentEnabled}
                />
                {noPaymentMethod && (
                  <View style={styles.warnBox}>
                    <MaterialCommunityIcons name="alert-outline" size={16} color={palette.warning} />
                    <Text style={styles.warnText}>
                      No payment method is available right now. Please try again later or contact support
                      {brand.supportPhone ? ` on ${brand.supportPhone}` : ''}.
                    </Text>
                  </View>
                )}
                <BillSummary />
              </>
            )}

            {/* ---------------- Step 4: review ---------------- */}
            {step === 'review' && (
              <>
                <Text style={styles.sectionLabel}>Review your order</Text>

                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <MaterialCommunityIcons name="package-variant-closed" size={16} color={palette.muted} />
                    <Text style={styles.reviewTitle}>
                      {cartList.length === 1 ? '1 item' : `${cartList.length} items`}
                    </Text>
                  </View>
                  {cartList.map(({ medicine, quantity }) => (
                    <View key={medicine.id} style={styles.reviewLine}>
                      <ProductImage uri={medicine.imageUrl} size={34} />
                      <Text style={styles.reviewLineName} numberOfLines={1}>
                        {medicine.brand || medicine.name} × {quantity}
                      </Text>
                      <Text style={styles.reviewLineAmount}>
                        {formatINR(medicine.sellingPrice * quantity)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={palette.muted} />
                    <Text style={styles.reviewTitle}>Delivering to</Text>
                    <Button compact onPress={() => setStep('address')} textColor={theme.colors.primary}>
                      Change
                    </Button>
                  </View>
                  <Text style={styles.reviewBody}>
                    {[deliveryAddress, city, pincode].filter(Boolean).join(', ')}
                  </Text>
                  <Text style={styles.reviewBody}>{phone}</Text>
                  {Boolean(notes) && <Text style={styles.reviewNote}>“{notes}”</Text>}
                </View>

                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <MaterialCommunityIcons name="wallet-outline" size={16} color={palette.muted} />
                    <Text style={styles.reviewTitle}>Payment</Text>
                    <Button compact onPress={() => setStep('payment')} textColor={theme.colors.primary}>
                      Change
                    </Button>
                  </View>
                  <Text style={styles.reviewBody}>
                    {paymentMethod === 'COD' ? 'Cash on delivery' : 'Online payment'}
                  </Text>
                </View>

                <BillSummary />
              </>
            )}

            {error && (
              <HelperText type="error" visible style={styles.errorText}>
                {error}
              </HelperText>
            )}
          </ScrollView>

          <Divider />
          <View style={styles.footer}>
            {step !== 'cart' ? (
              <Button mode="outlined" onPress={goBack} disabled={loading} style={styles.backBtn} icon="chevron-left">
                Back
              </Button>
            ) : (
              <Button mode="outlined" onPress={onDismiss} style={styles.backBtn}>
                Keep shopping
              </Button>
            )}

            {step === 'review' ? (
              <Button
                mode="contained"
                onPress={handlePlaceOrder}
                loading={loading}
                disabled={loading || cartList.length === 0 || noPaymentMethod}
                style={styles.primaryBtn}
                labelStyle={{ color: onColor(theme.colors.primary) }}
                icon="check"
              >
                Place order · {formatINR(total)}
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={goNext}
                disabled={!canContinue}
                style={styles.primaryBtn}
                labelStyle={{ color: onColor(theme.colors.primary) }}
                icon="chevron-right"
                contentStyle={{ flexDirection: 'row-reverse' }}
              >
                Continue
              </Button>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: palette.surface,
    marginHorizontal: 16,
    marginVertical: 40,
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 14,
  },
  title: {
    fontWeight: '800',
    color: palette.ink,
  },
  subtitle: {
    color: palette.muted,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    width: 62,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10.5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
    borderRadius: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyText: {
    color: palette.muted,
  },
  itemsSection: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: palette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemBrand: {
    fontWeight: '700',
    color: palette.ink,
  },
  itemName: {
    color: palette.muted,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'center',
    gap: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.line,
  },
  smallQtyBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
  qtyNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
    minWidth: 18,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    backgroundColor: palette.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  helpNote: {
    fontSize: 11.5,
    color: palette.subtle,
    marginTop: 2,
  },
  payOption: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payOptionDisabled: {
    backgroundColor: palette.canvas,
  },
  payOptionBtn: {
    height: 'auto',
    paddingVertical: 10,
    justifyContent: 'flex-start',
  },
  payOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payOptionText: {
    flex: 1,
    minWidth: 0,
  },
  payTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    textAlign: 'left',
  },
  payDescription: {
    fontSize: 11.5,
    color: palette.muted,
    textAlign: 'left',
    marginTop: 1,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewLineName: {
    flex: 1,
    fontSize: 13,
    color: palette.body,
  },
  reviewLineAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  reviewBody: {
    fontSize: 13,
    color: palette.body,
  },
  reviewNote: {
    fontSize: 12,
    color: palette.muted,
    fontStyle: 'italic',
  },
  billBox: {
    backgroundColor: palette.canvas,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 6,
    marginTop: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 13,
    color: palette.muted,
    flex: 1,
    paddingRight: 8,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink,
  },
  billNote: {
    fontSize: 11,
    color: palette.subtle,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.warningSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 10,
  },
  warnText: {
    flex: 1,
    fontSize: 12.5,
    color: '#92400e',
  },
  errorText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  backBtn: {
    borderRadius: 10,
    borderColor: palette.line,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});

export default CartCheckoutModal;
