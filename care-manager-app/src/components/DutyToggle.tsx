import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CmProfile, setAvailability } from '../api/cases';
import { getCoords } from '../location';
import { palette, timeAgo } from '../theme';

interface DutyToggleProps {
  profile?: CmProfile | null;
  /** `pill` is the compact header control; `row` is the full card on Profile. */
  variant?: 'pill' | 'row';
  loading?: boolean;
}

/**
 * On-duty switch. Going on duty also pushes the current position so dispatch
 * can rank care managers by distance; the toggle still succeeds when location
 * is refused — availability matters more than the pin.
 */
export const DutyToggle: React.FC<DutyToggleProps> = ({ profile, variant = 'row', loading }) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      // Only worth a GPS read when coming on duty.
      const coords = isAvailable ? await getCoords() : null;
      if (isAvailable && !coords) {
        setNote('On duty — location unavailable, so no pin was sent.');
      } else {
        setNote(null);
      }
      return setAvailability({
        isAvailable,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
    },
    onError: (e: any) => {
      setNote(e?.response?.data?.message || 'Could not change your duty status. Try again.');
    },
  });

  const isAvailable = Boolean(profile?.isAvailable);
  const busy = mutation.isPending || Boolean(loading);
  const tone = isAvailable ? palette.success : palette.muted;

  if (variant === 'pill') {
    return (
      <TouchableRipple
        onPress={() => !busy && profile && mutation.mutate(!isAvailable)}
        disabled={busy || !profile}
        style={[styles.pill, { borderColor: `${tone}55`, backgroundColor: `${tone}14` }]}
        borderless
        accessibilityRole="switch"
        accessibilityState={{ checked: isAvailable, disabled: busy || !profile }}
        accessibilityLabel={isAvailable ? 'On duty. Tap to go off duty.' : 'Off duty. Tap to go on duty.'}
      >
        <View style={styles.pillRow}>
          <MaterialCommunityIcons
            name={isAvailable ? 'shield-check' : 'shield-off-outline'}
            size={15}
            color={tone}
          />
          <Text style={[styles.pillText, { color: tone }]}>
            {busy ? 'Updating…' : isAvailable ? 'On duty' : 'Off duty'}
          </Text>
        </View>
      </TouchableRipple>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.copy}>
          <Text variant="titleMedium" style={styles.title}>
            On duty
          </Text>
          <Text style={styles.sub}>
            {isAvailable
              ? 'You are in the dispatch pool for new cases.'
              : 'You will not receive new assignments.'}
          </Text>
        </View>
        <Switch
          value={isAvailable}
          disabled={busy || !profile}
          onValueChange={(v) => mutation.mutate(v)}
          color={theme.colors.primary}
        />
      </View>

      {profile?.lastLocationUpdate ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="crosshairs-gps" size={14} color={palette.subtle} />
          <Text style={styles.meta}>Location shared {timeAgo(profile.lastLocationUpdate)}</Text>
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '700',
    color: palette.ink,
  },
  sub: {
    fontSize: 12.5,
    color: palette.muted,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 12,
    color: palette.subtle,
  },
  note: {
    fontSize: 12,
    color: palette.warning,
  },
});
