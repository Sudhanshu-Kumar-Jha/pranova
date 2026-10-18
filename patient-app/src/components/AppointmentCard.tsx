import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusChip } from './StatusChip';
import type { Appointment } from '../api/appointments';
import { palette } from '../theme';

interface AppointmentCardProps {
  appointment: Appointment;
  onJoinVideo?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onJoinVideo,
  onCancel,
}) => {
  const theme = useTheme();
  const dateObj = new Date(appointment.scheduledStart);
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isVideo = appointment.type === 'VIDEO';
  const isAudio = appointment.type === 'AUDIO';
  const canJoin = (isVideo || isAudio) && appointment.status !== 'CANCELLED';
  const canCancel =
    appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED';

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.typeBadge}>
            <MaterialCommunityIcons
              name={
                isVideo
                  ? 'video-outline'
                  : isAudio
                  ? 'phone-outline'
                  : 'hospital-building'
              }
              size={15}
              color={theme.colors.primary}
            />
            <Text style={styles.typeText}>{appointment.type}</Text>
          </View>
          <StatusChip status={appointment.status} />
        </View>

        <View style={styles.doctorSection}>
          <Text variant="titleMedium" style={styles.doctorName}>
            Dr. {appointment.doctor?.firstName || 'Assigned'}{' '}
            {appointment.doctor?.lastName || 'Doctor'}
          </Text>
          <Text variant="bodySmall" style={styles.specialty}>
            {appointment.doctor?.specialty?.name || 'Healthcare Specialist'}
          </Text>
        </View>

        <View style={styles.scheduleRow}>
          <View style={styles.timeCol}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748b" />
            <Text style={styles.dateText}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>
          <Text style={styles.feeText}>₹{appointment.fee}</Text>
        </View>

        {appointment.reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason for visit:</Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              {appointment.reason}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          {canJoin && (
            <Button
              mode="contained"
              icon="video"
              onPress={() => onJoinVideo?.(appointment)}
              style={styles.joinBtn}
              contentStyle={{ height: 38 }}
            >
              Join Video Call
            </Button>
          )}
          {canCancel && (
            <Button
              mode="text"
              textColor="#dc2626"
              onPress={() => onCancel?.(appointment)}
              style={styles.cancelBtn}
            >
              Cancel
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.info,
  },
  doctorSection: {
    marginTop: 2,
  },
  doctorName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  specialty: {
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  feeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reasonBox: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 12,
    color: '#1e293b',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  joinBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    flex: 1,
  },
  cancelBtn: {
    borderRadius: 8,
  },
});
