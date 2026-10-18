import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CaseStatus, updateCaseStatus } from '../api/cases';
import { ensureLocationPermission, getCoords, formatCoords } from '../location';
import { CASE_STATUS_COLORS, humanize, palette } from '../theme';

/**
 * Every status the backend accepts. The transition rules themselves are
 * server-authoritative, so this list is deliberately not filtered down to a
 * client-side guess — an illegal transition comes back as the server's own
 * message and is shown as it arrived.
 */
const ALL_STATUSES: CaseStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];

interface StatusUpdateDialogProps {
  visible: boolean;
  caseId: string;
  caseNumber: string;
  currentStatus: CaseStatus;
  /** Preselects a status, e.g. the one-tap Start / Resolve action. */
  initialStatus?: CaseStatus;
  onDismiss: () => void;
  onUpdated?: (status: CaseStatus) => void;
}

export const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  visible,
  caseId,
  caseNumber,
  currentStatus,
  initialStatus,
  onDismiss,
  onUpdated,
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<CaseStatus | null>(initialStatus ?? null);
  const [notes, setNotes] = useState('');
  const [attachLocation, setAttachLocation] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset each time the sheet opens so a previous attempt never leaks through.
  useEffect(() => {
    if (!visible) return;
    setStatus(initialStatus ?? null);
    setNotes('');
    setError(null);
    setCoords(null);
    setLocationNote(null);
    setAttachLocation(true);
  }, [visible, initialStatus]);

  // Warm the fix up front so submitting is not held up by the GPS radio.
  useEffect(() => {
    if (!visible || !attachLocation) return;
    let cancelled = false;

    (async () => {
      const permission = await ensureLocationPermission();
      if (cancelled) return;
      if (permission !== 'granted') {
        setLocationNote(
          permission === 'denied'
            ? 'Location permission is off — the update will be sent without a pin.'
            : 'No location provider on this device — sending without a pin.'
        );
        return;
      }
      const fix = await getCoords();
      if (cancelled) return;
      setCoords(fix);
      setLocationNote(fix ? null : 'No GPS fix yet — the update will be sent without a pin.');
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, attachLocation]);

  const mutation = useMutation({
    mutationFn: async () => {
      let finalCoords = coords;
      if (attachLocation && !finalCoords) {
        // Automatically fetch and await fresh coordinates right now before sending
        finalCoords = await getCoords({ forceFresh: true }).catch(() => null);
      }
      return updateCaseStatus(caseId, {
        status: status as CaseStatus,
        notes: notes.trim() || undefined,
        latitude: attachLocation ? finalCoords?.latitude : undefined,
        longitude: attachLocation ? finalCoords?.longitude : undefined,
      });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cm-case', caseId] });
      void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
      onUpdated?.(updated.status);
      onDismiss();
    },
    onError: (e: any) => {
      setError(
        e?.response?.data?.message ||
          'The update could not be saved. Check your connection and try again.'
      );
    },
  });

  const submit = () => {
    if (!status) {
      setError('Choose the status that reflects what is happening on site.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={mutation.isPending ? () => {} : onDismiss}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.title}>Update {caseNumber}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          {/* Scrollable: on a small screen the options, notes field and the
              on-screen keyboard together overflow the dialog. */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.label}>New status</Text>
            <View style={styles.options}>
              {ALL_STATUSES.filter((s) => s !== currentStatus).map((s) => {
                const selected = status === s;
                const tone = CASE_STATUS_COLORS[s] ?? palette.muted;
                return (
                  <TouchableRipple
                    key={s}
                    onPress={() => {
                      setStatus(s);
                      setError(null);
                    }}
                    style={[
                      styles.option,
                      { borderColor: selected ? tone : palette.line },
                      selected ? { backgroundColor: `${tone}12` } : null,
                    ]}
                    borderless
                  >
                    <View style={styles.optionRow}>
                      <MaterialCommunityIcons
                        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                        size={19}
                        color={selected ? tone : palette.subtle}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          selected ? { color: tone, fontWeight: '700' } : null,
                        ]}
                      >
                        {humanize(s)}
                      </Text>
                    </View>
                  </TouchableRipple>
                );
              })}
            </View>

            <TextInput
              label="Field notes (optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="What did you find, and what did you do?"
              style={styles.notes}
              disabled={mutation.isPending}
            />

            <View style={styles.locationRow}>
              <View style={styles.locationCopy}>
                <Text style={styles.locationTitle}>Attach my location</Text>
                <Text style={styles.locationSub}>
                  {attachLocation
                    ? coords
                      ? `Pin ready · ${formatCoords(coords.latitude, coords.longitude)}`
                      : 'Getting a GPS fix…'
                    : 'The timeline entry will have no pin.'}
                </Text>
              </View>
              <Switch
                value={attachLocation}
                onValueChange={setAttachLocation}
                disabled={mutation.isPending}
                color={theme.colors.primary}
              />
            </View>

            {attachLocation && locationNote ? (
              <Text style={styles.locationWarn}>{locationNote}</Text>
            ) : null}

            {error ? (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            ) : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={mutation.isPending} textColor={palette.muted}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={submit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
          >
            Save update
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: palette.surface,
    borderRadius: 18,
  },
  title: {
    fontWeight: '800',
    color: palette.ink,
    fontSize: 18,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  options: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 14.5,
    color: palette.body,
  },
  notes: {
    backgroundColor: palette.surface,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: palette.canvas,
    borderRadius: 12,
    padding: 12,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  locationSub: {
    fontSize: 12,
    color: palette.muted,
  },
  locationWarn: {
    fontSize: 12,
    color: palette.warning,
  },
  error: {
    paddingHorizontal: 0,
    fontSize: 13,
  },
});
