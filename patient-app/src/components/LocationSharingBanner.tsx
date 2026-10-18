import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLiveLocation } from '../providers/LiveLocationProvider';
import { palette, tint } from '../theme';

/**
 * Tells the patient, in plain words, that their location is being shared and
 * why. Sharing that a patient cannot see is not consent, so this appears
 * whenever a case is open and disappears the moment it closes.
 */
export const LocationSharingBanner: React.FC = () => {
  const theme = useTheme();
  const { sharing, activeCase, lastReportedAt, problem } = useLiveLocation();

  if (!sharing || !activeCase) return null;

  const failing = Boolean(problem);
  const tone = failing ? palette.warning : theme.colors.primary;

  return (
    <View style={[styles.row, { backgroundColor: tint(tone, 0.93), borderColor: `${tone}33` }]}>
      <MaterialCommunityIcons
        name={failing ? 'map-marker-alert-outline' : 'map-marker-radius'}
        size={18}
        color={tone}
      />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: tone }]}>
          {failing ? 'Location not shared' : 'Sharing your location'}
        </Text>
        <Text style={styles.body}>
          {failing
            ? `${problem} Your response team cannot see where you are for case ${activeCase.caseNumber}.`
            : `Your response team can see where you are while case ${activeCase.caseNumber} is open${
                lastReportedAt
                  ? `. Updated ${lastReportedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''
              }.`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    fontSize: 12.5,
    color: palette.body,
    lineHeight: 17,
  },
});
