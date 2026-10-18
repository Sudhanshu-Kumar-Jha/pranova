import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  RadioButton,
  Divider,
  Snackbar,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mockCheckout, createPaymentOrder, CasePayment } from '../api/payments';
import { palette } from '../theme';

interface PaymentModalProps {
  visible: boolean;
  onDismiss: () => void;
  caseId: string;
  caseNumber: string;
  amount: number;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onDismiss,
  caseId,
  caseNumber,
  amount,
  onPaymentSuccess,
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [simulateFail, setSimulateFail] = useState(false);
  const [successTxn, setSuccessTxn] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Create or ensure gateway order exists
      const order = await createPaymentOrder(caseId, amount);
      const gatewayOrderId = order.orderId || `order_${Date.now()}`;
      // 2. Perform mock checkout
      return await mockCheckout(gatewayOrderId, paymentMethod, simulateFail);
    },
    onSuccess: (data) => {
      setSuccessTxn(data.payment.transactionId || 'TXN_SUCCESS');
      void queryClient.invalidateQueries({ queryKey: ['patient-cases'] });
      void queryClient.invalidateQueries({ queryKey: ['patient-case', caseId] });
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || 'Payment simulation failed. Please try again.');
    },
  });

  const handleClose = () => {
    setSuccessTxn(null);
    setErrorMessage(null);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={styles.container}
      >
        {successTxn ? (
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check-bold" size={36} color="#ffffff" />
            </View>
            <Text variant="headlineSmall" style={{ fontWeight: '800', marginTop: 16, color: palette.success }}>
              Payment Received!
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8, color: palette.muted }}>
              Your payment for Case #{caseNumber} has been successfully settled.
            </Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Paid</Text>
                <Text style={styles.receiptValue}>₹{amount.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Transaction ID</Text>
                <Text style={[styles.receiptValue, { fontSize: 11, fontFamily: 'monospace' }]}>
                  {successTxn}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Method</Text>
                <Text style={styles.receiptValue}>{paymentMethod}</Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleClose}
              style={{ width: '100%', marginTop: 24, borderRadius: 10 }}
            >
              Done
            </Button>
          </View>
        ) : (
          <View>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: palette.ink }}>
                  PRANOVA Pay
                </Text>
                <Text variant="bodySmall" style={{ color: palette.muted }}>
                  Case #{caseNumber} Settlement
                </Text>
              </View>
              <MaterialCommunityIcons name="shield-check" size={28} color={theme.colors.primary} />
            </View>

            <Divider style={{ marginVertical: 14 }} />

            {/* Bill Summary */}
            <View style={styles.billBox}>
              <Text variant="bodyMedium" style={{ color: palette.muted }}>
                Total Invoiced Amount
              </Text>
              <Text variant="headlineMedium" style={{ fontWeight: '800', color: palette.ink, marginTop: 4 }}>
                ₹{amount.toFixed(2)}
              </Text>
            </View>

            {/* Method selection */}
            <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
              Select Payment Method
            </Text>

            <RadioButton.Group
              onValueChange={(val) => setPaymentMethod(val as any)}
              value={paymentMethod}
            >
              <TouchableOpacity
                style={[styles.methodOption, paymentMethod === 'UPI' && styles.methodSelected]}
                onPress={() => setPaymentMethod('UPI')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RadioButton value="UPI" />
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={palette.ink} style={{ marginLeft: 4 }} />
                  <Text style={styles.methodLabel}>UPI (GPay / PhonePe / Paytm)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodOption, paymentMethod === 'CARD' && styles.methodSelected]}
                onPress={() => setPaymentMethod('CARD')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RadioButton value="CARD" />
                  <MaterialCommunityIcons name="credit-card-outline" size={20} color={palette.ink} style={{ marginLeft: 4 }} />
                  <Text style={styles.methodLabel}>Credit / Debit Card</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodOption, paymentMethod === 'NETBANKING' && styles.methodSelected]}
                onPress={() => setPaymentMethod('NETBANKING')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RadioButton value="NETBANKING" />
                  <MaterialCommunityIcons name="bank-outline" size={20} color={palette.ink} style={{ marginLeft: 4 }} />
                  <Text style={styles.methodLabel}>Net Banking</Text>
                </View>
              </TouchableOpacity>
            </RadioButton.Group>

            {/* Error banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Actions */}
            <Button
              mode="contained"
              loading={checkoutMutation.isPending}
              disabled={checkoutMutation.isPending}
              onPress={() => checkoutMutation.mutate()}
              style={{ marginTop: 20, borderRadius: 10, paddingVertical: 4 }}
              icon="lock-check"
            >
              {checkoutMutation.isPending ? 'Processing Payment...' : `Pay ₹${amount.toFixed(2)}`}
            </Button>

            <Button
              mode="text"
              onPress={handleClose}
              disabled={checkoutMutation.isPending}
              style={{ marginTop: 8 }}
            >
              Cancel
            </Button>
          </View>
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  billBox: {
    backgroundColor: '#F4F7F8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  methodOption: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  methodSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
    marginLeft: 8,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#F4F7F8',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 13,
    color: palette.muted,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  errorBox: {
    backgroundColor: '#FBEAE7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
    textAlign: 'center',
  },
});
