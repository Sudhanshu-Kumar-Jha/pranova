import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CASE_STATUS_COLORS, palette } from '../theme';

interface StatusChipProps {
  status: string;
  label?: string;
}

/** Case status as a soft badge — the same visual language as the patient app. */
export const StatusChip: React.FC<StatusChipProps> = ({ status, label }) => {
  const color = CASE_STATUS_COLORS[status] || palette.muted;
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
