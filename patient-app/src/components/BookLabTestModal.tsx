import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  SegmentedButtons,
  HelperText,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { bookLabTest, SampleCollectionType } from '../api/diagnostics';
import { getMe } from '../api/auth';
import { getCurrentLocationDetails } from '../utils/location';
import type { DiagnosticTest } from '../api/diagnostics';

interface BookLabTestModalProps {
  visible: boolean;
  test: DiagnosticTest | null;
  onDismiss: () => void;
  onSuccess: (bookingNumber: string) => void;
}

export const BookLabTestModal: React.FC<BookLabTestModalProps> = ({
  visible,
  test,
  onDismiss,
  onSuccess,
}) => {
  // Collection details come from the patient's saved profile, never from
  // sample values typed into the source.
  const profileQuery = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: visible });

  const [collectionType, setCollectionType] =
    useState<SampleCollectionType>('HOME_COLLECTION');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locDetecting, setLocDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && profileQuery.data) {
      const p = profileQuery.data.profile;
      setAddress(p?.primaryAddress ?? '');
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
      if (loc.primaryAddress) setAddress(loc.primaryAddress);
      if (loc.city) setCity(loc.city);
      if (loc.pincode) setPincode(loc.pincode);
    } catch (err: any) {
      setError(err?.message || 'Error detecting location.');
    } finally {
      setLocDetecting(false);
    }
  };

  if (!test) return null;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(7, 30, 0, 0);

  const handleBook = async () => {
    if (!phone.trim()) {
      setError('Contact phone number is required');
      return;
    }
    if (collectionType === 'HOME_COLLECTION' && !address.trim()) {
      setError('Please provide a sample pickup address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await bookLabTest({
        testId: test.id,
        collectionType,
        scheduledDate: nextDate.toISOString(),
        address: collectionType === 'HOME_COLLECTION' ? address.trim() : undefined,
        city: collectionType === 'HOME_COLLECTION' ? city.trim() : undefined,
        pincode: collectionType === 'HOME_COLLECTION' ? pincode.trim() : undefined,
        phone: phone.trim(),
      });
      onSuccess(result.bookingNumber);
      onDismiss();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Could not complete test booking. Please verify details and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.title}>
                Book Diagnostic Test
              </Text>
              <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
                {test.name}
              </Text>
            </View>
            <Button compact icon="close" onPress={onDismiss} textColor="#64748b">
              Close
            </Button>
          </View>

          <Divider style={{ marginVertical: 6 }} />

          <Text style={styles.sectionLabel}>Sample Collection Mode</Text>
          <SegmentedButtons
            value={collectionType}
            onValueChange={(v) => setCollectionType(v as SampleCollectionType)}
            buttons={[
              {
                value: 'HOME_COLLECTION',
                label: 'Home Sample',
                icon: 'home-outline',
                disabled: !test.homeCollectionAvailable,
              },
              {
                value: 'LAB_VISIT',
                label: 'Visit Partner Lab',
                icon: 'hospital-building',
              },
            ]}
          />

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#0f766e" />
            <Text style={styles.infoText}>
              Collection Schedule: Tomorrow ({nextDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}) at 7:30 AM
            </Text>
          </View>

          {collectionType === 'HOME_COLLECTION' && (
            <>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.addressSectionLabel}>Sample Pickup Address</Text>
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
                label="Home Address *"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                style={styles.input}
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
                  onChangeText={setPincode}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, { width: 110 }]}
                />
              </View>
            </>
          )}

          <TextInput
            label="Patient Contact Phone *"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <View style={styles.feeSummary}>
            <View>
              <Text style={styles.feeLabel}>Total Test Fee:</Text>
              <Text style={styles.mrpText}>MRP: ₹{test.mrp}</Text>
            </View>
            <Text style={styles.feeAmount}>₹{test.sellingPrice}</Text>
          </View>

          {error && (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleBook}
            loading={loading}
            disabled={loading}
            style={styles.confirmBtn}
            icon="calendar-check"
          >
            Confirm Booking (₹{test.sellingPrice})
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f766e',
    flex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  feeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  feeLabel: {
    fontWeight: '700',
    color: '#0f172a',
  },
  mrpText: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f766e',
  },
  confirmBtn: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    marginTop: 4,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  addressSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
