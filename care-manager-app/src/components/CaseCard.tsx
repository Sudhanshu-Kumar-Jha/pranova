import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CaseRow, patientName } from '../api/cases';
import { PRIORITY_COLORS, onColor, palette, timeAgo } from '../theme';
import { StatusChip } from './StatusChip';
import { PriorityBadge } from './PriorityBadge';

interface CaseCardProps {
  item: CaseRow;
  onPress: () => void;
  /**
   * Opens the status sheet straight from the list. Offered only on non-terminal
   * cases: RESOLVED and CANCELLED are terminal per the API contract. Which
   * status is legal from here stays the server's call — the sheet asks.
   */
  onUpdate?: () => void;
}

/**
 * One assigned case. Tapping anywhere opens the detail screen; the phone pill
 * is the only competing target because calling the patient is the action a
 * care manager needs fastest in the field.
 */
export const CaseCard: React.FC<CaseCardProps> = ({ item, onPress, onUpdate }) => {
  const theme = useTheme();
  const name = patientName(item);
  const phone = item.patient?.phone ?? null;
  const accent = PRIORITY_COLORS[item.priority] ?? palette.line;
  const isTerminal = item.status === 'RESOLVED' || item.status === 'CANCELLED';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Surface style={styles.card} elevation={1}>
        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.caseNumber}>{item.caseNumber}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>

          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.badges}>
            <PriorityBadge priority={item.priority} />
            <StatusChip status={item.status} />
          </View>

          {(name || item.incidentAddress) && (
            <View style={styles.metaBlock}>
              {name && (
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="account-outline" size={15} color={palette.muted} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {name}
                    {item.patient?.patientProfile?.bloodGroup
                      ? ` · ${item.patient.patientProfile.bloodGroup}`
                      : ''}
                  </Text>
                </View>
              )}
              {Boolean(item.incidentAddress) && (
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color={palette.muted} />
                  <Text style={styles.metaText} numberOfLines={2}>
                    {item.incidentAddress}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionRow}>
            {phone && (
              <TouchableOpacity
                style={[styles.callPill, { borderColor: theme.colors.primary }]}
                onPress={() => void Linking.openURL(`tel:${phone}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${name ?? 'patient'}`}
              >
                <MaterialCommunityIcons name="phone" size={14} color={theme.colors.primary} />
                <Text style={[styles.callText, { color: theme.colors.primary }]}>{phone}</Text>
              </TouchableOpacity>
            )}

            {onUpdate && !isTerminal && (
              <TouchableOpacity
                style={[styles.updatePill, { backgroundColor: theme.colors.primary }]}
                onPress={onUpdate}
                accessibilityRole="button"
                accessibilityLabel={`Update status of ${item.caseNumber}`}
              >
                <MaterialCommunityIcons
                  name="progress-check"
                  size={14}
                  color={onColor(theme.colors.primary)}
                />
                <Text style={[styles.updateText, { color: onColor(theme.colors.primary) }]}>
                  Update status
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={palette.subtle}
          style={styles.chevron}
        />
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: palette.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseNumber: {
    fontSize: 11.5,
    fontWeight: '700',
    color: palette.subtle,
    letterSpacing: 0.4,
  },
  time: {
    fontSize: 11.5,
    color: palette.subtle,
  },
  title: {
    fontWeight: '700',
    color: palette.ink,
    lineHeight: 21,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBlock: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: palette.body,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  callText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  updatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  updateText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  chevron: {
    alignSelf: 'center',
    marginRight: 6,
  },
});
