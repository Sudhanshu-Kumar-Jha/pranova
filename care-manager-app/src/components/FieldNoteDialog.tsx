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
  useTheme,
} from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCaseNote } from '../api/cases';
import { ensureLocationPermission, getCoords, formatCoords } from '../location';
import { palette } from '../theme';

interface FieldNoteDialogProps {
  visible: boolean;
  caseId: string;
  caseNumber: string;
  onDismiss: () => void;
  onAdded?: () => void;
}

export const FieldNoteDialog: React.FC<FieldNoteDialogProps> = ({
  visible,
  caseId,
  caseNumber,
  onDismiss,
  onAdded,
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');
  const [attachLocation, setAttachLocation] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNotes('');
    setError(null);
    setCoords(null);
    setLocationNote(null);
    setAttachLocation(true);
  }, [visible]);

  useEffect(() => {
    if (!visible || !attachLocation) return;
    let cancelled = false;

    (async () => {
      const permission = await ensureLocationPermission();
      if (cancelled) return;
      if (permission !== 'granted') {
        setLocationNote(
          permission === 'denied'
            ? 'Location permission is off — note will be logged without GPS.'
            : 'No location provider on this device — sending without GPS.'
        );
        return;
      }
      const fix = await getCoords();
      if (cancelled) return;
      setCoords(fix);
      setLocationNote(fix ? null : 'Acquiring GPS fix…');
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, attachLocation]);

  const mutation = useMutation({
    mutationFn: async () => {
      let finalCoords = coords;
      if (attachLocation && !finalCoords) {
        finalCoords = await getCoords({ forceFresh: true }).catch(() => null);
      }
      return addCaseNote(caseId, {
        notes: notes.trim(),
        latitude: attachLocation ? finalCoords?.latitude : undefined,
        longitude: attachLocation ? finalCoords?.longitude : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cm-case', caseId] });
      void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
      onAdded?.();
      onDismiss();
    },
    onError: (e: any) => {
      setError(
        e?.response?.data?.message ||
          'The note could not be saved. Check your connection and try again.'
      );
    },
  });

  const submit = () => {
    if (!notes.trim()) {
      setError('Please enter your observations or clinical field notes.');
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
        <Dialog.Title style={styles.title}>Add Field Note · {caseNumber}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <TextInput
              label="Clinical observation / Field update *"
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                if (error) setError(null);
              }}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="e.g. Patient stabilized, vitals: BP 120/80, pulse 72. Waiting for ambulance handover."
              style={styles.notes}
              disabled={mutation.isPending}
            />

            <View style={styles.locationRow}>
              <View style={styles.locationCopy}>
                <Text style={styles.locationTitle}>Pin my location</Text>
                <Text style={styles.locationSub}>
                  {attachLocation
                    ? coords
                      ? `GPS ready · ${formatCoords(coords.latitude, coords.longitude)}`
                      : 'Getting a GPS fix…'
                    : 'The timeline note will have no GPS pin.'}
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
            Add Note
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
    maxHeight: 400,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
  },
  notes: {
    backgroundColor: palette.surface,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  locationCopy: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  locationSub: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
  locationWarn: {
    fontSize: 11.5,
    color: palette.warning,
  },
  error: {
    paddingHorizontal: 0,
  },
});
