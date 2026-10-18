import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEmergency } from '../socket/EmergencyProvider';
import { formatCoords } from '../location';
import { palette, PRIORITY_COLORS, formatDateTime } from '../theme';

/**
 * Raised the moment the backend broadcasts a P1 emergency. The alert is a
 * platform-wide dispatch signal, not an assignment: a case only appears in
 * "My cases" once an administrator assigns it, so "Open case" may legitimately
 * answer "not assigned to you" — the detail screen says so plainly.
 */
export const EmergencyAlertModal: React.FC = () => {
  const { alert, dismiss } = useEmergency();
  const router = useRouter();

  if (!alert) return null;

  const accent = PRIORITY_COLORS[alert.priority] ?? PRIORITY_COLORS.P1;
  const pin = formatCoords(alert.incidentLatitude, alert.incidentLongitude);

  const openCase = () => {
    dismiss();
    router.push({ pathname: '/cases/[id]', params: { id: alert.caseId } });
  };

  return (
    <Portal>
      <Dialog visible onDismiss={dismiss} style={styles.dialog}>
        <View style={[styles.banner, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name="alert-octagon" size={22} color="#ffffff" />
          <Text style={styles.bannerText}>
            {alert.priority} emergency · {alert.caseNumber}
          </Text>
        </View>

        <Dialog.Content style={styles.content}>
          <Text variant="titleMedium" style={styles.title}>
            {alert.title}
          </Text>

          {Boolean(alert.description) && (
            <Text style={styles.description} numberOfLines={4}>
              {alert.description}
            </Text>
          )}

          <View style={styles.facts}>
            {Boolean(alert.patientName) && (
              <Row icon="account-outline" text={
                alert.patientBloodGroup
                  ? `${alert.patientName} · ${alert.patientBloodGroup}`
                  : (alert.patientName as string)
              } />
            )}
            {Boolean(alert.incidentAddress) && (
              <Row icon="map-marker-outline" text={alert.incidentAddress as string} />
            )}
            {pin && <Row icon="crosshairs-gps" text={pin} />}
            <Row icon="clock-outline" text={formatDateTime(alert.timestamp)} />
          </View>
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <Button onPress={dismiss} textColor={palette.muted}>
            Dismiss
          </Button>
          {Boolean(alert.patientPhone) && (
            <Button
              onPress={() => void Linking.openURL(`tel:${alert.patientPhone}`)}
              icon="phone"
              textColor={accent}
            >
              Call
            </Button>
          )}
          <Button mode="contained" onPress={openCase} buttonColor={accent} textColor="#ffffff">
            Open case
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const Row: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }> = ({
  icon,
  text,
}) => (
  <View style={styles.row}>
    <MaterialCommunityIcons name={icon} size={16} color={palette.muted} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  bannerText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  content: {
    paddingTop: 16,
    gap: 10,
  },
  title: {
    fontWeight: '800',
    color: palette.ink,
    lineHeight: 22,
  },
  description: {
    fontSize: 13.5,
    color: palette.body,
    lineHeight: 19,
  },
  facts: {
    gap: 6,
    backgroundColor: palette.canvas,
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    color: palette.body,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
