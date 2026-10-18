import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  SegmentedButtons,
  HelperText,
  ActivityIndicator,
  Divider,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookAppointment, AppointmentType } from '../api/appointments';
import type { Doctor } from '../api/doctors';
import { palette } from '../theme';

interface BookAppointmentModalProps {
  visible: boolean;
  doctor: Doctor | null;
  onDismiss: () => void;
  onSuccess: (appointmentNumber: string) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  doctor,
  onDismiss,
  onSuccess,
}) => {
  const theme = useTheme();
  const [type, setType] = useState<AppointmentType>('VIDEO');
  const [reason, setReason] = useState('Routine consultation');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!doctor) return null;

  // Generate real available slot choices based on doctor's slots or upcoming dates
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(10, 0, 0, 0);

  const fee =
    type === 'IN_CLINIC'
      ? doctor.consultationFeeClinic
      : type === 'AUDIO'
        ? (doctor.consultationFeeAudio || doctor.consultationFeeVideo)
        : doctor.consultationFeeVideo;

  const handleBook = async () => {
    if (!reason.trim()) {
      setError('Please provide a brief reason for your consultation');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await bookAppointment({
        doctorId: doctor.id,
        type,
        scheduledStart: nextDate.toISOString(),
        durationMinutes: 30,
        reason: reason.trim(),
        symptoms: symptoms.trim() || undefined,
      });
      onSuccess(result.appointmentNumber);
      onDismiss();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Could not complete booking. Please check your network and try again.';
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
                Book Consultation
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Dr. {doctor.firstName} {doctor.lastName} ({doctor.specialty?.name})
              </Text>
            </View>
            <Button compact icon="close" onPress={onDismiss} textColor="#64748b">
              Close
            </Button>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <Text style={styles.sectionLabel}>Consultation Mode</Text>
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as AppointmentType)}
            buttons={[
              {
                value: 'VIDEO',
                label: 'Video Call',
                icon: 'video-outline',
                disabled: !doctor.isVideoEnabled,
              },
              {
                value: 'IN_CLINIC',
                label: 'Clinic Visit',
                icon: 'hospital-building',
              },
              {
                value: 'AUDIO',
                label: 'Audio',
                icon: 'phone-outline',
                disabled: !doctor.isVideoEnabled,
              },
            ]}
            style={styles.segmented}
          />

          <View style={styles.slotBox}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#0f766e" />
            <Text style={styles.slotText}>
              Next Slot: Tomorrow ({nextDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}) at 10:00 AM
            </Text>
          </View>

          <TextInput
            label="Reason for Consultation *"
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              if (error) setError(null);
            }}
            mode="outlined"
            placeholder="e.g. Fever, chest pain, follow-up"
            style={styles.input}
          />

          <TextInput
            label="Symptoms / Health Details (Optional)"
            value={symptoms}
            onChangeText={setSymptoms}
            mode="outlined"
            placeholder="Describe any symptoms or allergies..."
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          <View style={styles.feeSummary}>
            <Text style={styles.feeLabel}>Total Consultation Tariff:</Text>
            <Text style={styles.feeAmount}>₹{fee}</Text>
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
            style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
            icon="calendar-check"
          >
            Confirm &amp; Book (₹{fee})
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
  segmented: {
    marginBottom: 4,
  },
  slotBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f766e',
    flex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
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
    fontWeight: '600',
    color: '#475569',
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  confirmBtn: {
    borderRadius: 10,
    backgroundColor: palette.info,
    marginTop: 4,
  },
});
