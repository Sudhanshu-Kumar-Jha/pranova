import React, { useState } from 'react';
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Snackbar,
  Surface,
  Text,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CaseTimelineEntry,
  getCase,
  patientName,
  updateCaseStatus,
  checkPatientConsent,
  getPatientDocuments,
  completeAwaitingPayment,
  getPatientLocation,
} from '../../src/api/cases';
import { PriorityBadge } from '../../src/components/PriorityBadge';
import { StatusChip } from '../../src/components/StatusChip';
import { StatusUpdateDialog } from '../../src/components/StatusUpdateDialog';
import { FieldNoteDialog } from '../../src/components/FieldNoteDialog';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { formatCoords, getCoords } from '../../src/location';
import {
  CASE_STATUS_COLORS,
  PRIORITY_LABELS,
  formatDateTime,
  humanize,
  palette,
  timeAgo,
} from '../../src/theme';

/**
 * One assigned case, with its append-only coordination timeline and the field
 * actions a care manager needs on site: call the patient, navigate to the
 * incident, and record a status update with notes and a GPS pin.
 *
 * The backend answers 404 for a case that is not assigned to this care manager,
 * which is a real outcome here — an emergency alert is broadcast platform-wide
 * before anyone is assigned — so it is shown as a plain explanation.
 */
export default function CaseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [updating, setUpdating] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const caseQuery = useQuery({
    queryKey: ['cm-case', id],
    queryFn: () => getCase(id as string),
    enabled: Boolean(id),
  });

  const item = caseQuery.data;
  const notFound = (caseQuery.error as any)?.response?.status === 404;
  const name = patientName(item);
  const phone = item?.patient?.phone ?? null;
  const pin = formatCoords(item?.incidentLatitude, item?.incidentLongitude);
  const isTerminal = item?.status === 'RESOLVED' || item?.status === 'CANCELLED';
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  // The patient's own device position. Asked for only while the case is open:
  // sharing ends with the case, so a closed case would be a guaranteed refusal.
  const locationQuery = useQuery({
    queryKey: ['cm-patient-location', id],
    queryFn: () => getPatientLocation(id as string),
    enabled: Boolean(id) && !isTerminal,
    refetchInterval: 60_000,
    retry: false,
  });

  // Consent & Documents queries
  const patientId = item?.patient?.id;
  const consentQuery = useQuery({
    queryKey: ['cm-patient-consent', patientId],
    queryFn: () => checkPatientConsent(patientId as string),
    enabled: Boolean(patientId),
  });

  const docsQuery = useQuery({
    queryKey: ['cm-patient-docs', patientId],
    queryFn: () => getPatientDocuments(patientId as string),
    enabled: Boolean(patientId && consentQuery.data?.hasConsent),
  });

  // Billing & Payment Dialog state
  const [billingVisible, setBillingVisible] = useState(false);
  const [billAmount, setBillAmount] = useState('750');
  const [billNotes, setBillNotes] = useState('');
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const handleCompleteAndBill = async () => {
    if (!item) return;
    const num = parseFloat(billAmount);
    if (isNaN(num) || num <= 0) {
      setToast('Please enter a valid amount');
      return;
    }
    try {
      setBillingSubmitting(true);
      await completeAwaitingPayment(item.id, {
        amount: num,
        notes: billNotes.trim() || 'Field care completed. Invoice sent to patient.',
      });
      setBillingVisible(false);
      void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cm-case', id] });
      setToast('Case completed — Patient billed and awaiting payment');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Could not bill case.');
    } finally {
      setBillingSubmitting(false);
    }
  };

  const handleStartResponse = async () => {
    if (!item) return;
    try {
      setStarting(true);
      const fix = await getCoords({ forceFresh: true }).catch(() => null);
      await updateCaseStatus(item.id, {
        status: 'IN_PROGRESS',
        notes: 'Care Manager acknowledged dispatch and started field response (location fetched automatically)',
        latitude: fix?.latitude,
        longitude: fix?.longitude,
      });
      void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
      void queryClient.invalidateQueries({ queryKey: ['cm-case', id] });
      void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
      setToast('Response started — Case is now In Progress with your live GPS pinned');
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Could not update status. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  /**
   * Hands a destination to whatever maps app the device uses rather than
   * embedding a map. Takes coordinates or an address string.
   */
  const openMaps = (query?: string | null) => {
    if (!query) return;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${encodeURIComponent(query)}`
        : `google.navigation:q=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      ).catch(() => setToast('No maps application is available on this device.'))
    );
  };

  const openDirections = () =>
    openMaps(
      item?.incidentLatitude != null && item?.incidentLongitude != null
        ? `${item.incidentLatitude},${item.incidentLongitude}`
        : item?.incidentAddress
    );

  return (
    <View style={styles.root}>
      <Surface style={[styles.header, { paddingTop: insets.top + 8 }]} elevation={1}>
        <IconButton icon="arrow-left" size={24} onPress={goBack} accessibilityLabel="Back" />
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Case</Text>
          <Text variant="titleMedium" style={styles.headerTitle} numberOfLines={1}>
            {item?.caseNumber ?? '—'}
          </Text>
        </View>
        {caseQuery.isRefetching ? <ActivityIndicator size="small" style={styles.headerSpinner} /> : null}
      </Surface>

      {caseQuery.isLoading ? (
        <View style={styles.content}>
          <LoadingSkeleton height={120} borderRadius={16} />
          <LoadingSkeleton height={160} borderRadius={16} />
          <LoadingSkeleton height={200} borderRadius={16} />
        </View>
      ) : notFound ? (
        <View style={styles.content}>
          <EmptyState
            icon="account-off-outline"
            title="Not assigned to you"
            description="This case is not in your queue. An administrator has to dispatch it to you before you can see its details or update it."
            actionLabel="Back to my cases"
            onAction={() => router.replace('/(tabs)')}
          />
        </View>
      ) : caseQuery.isError || !item ? (
        <View style={styles.content}>
          <NetworkErrorState
            title="Case could not be loaded"
            message="Check your connection, then try again."
            onRetry={() => void caseQuery.refetch()}
          />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={caseQuery.isRefetching}
                onRefresh={() => void caseQuery.refetch()}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {/* Triage summary */}
            <Surface style={styles.card} elevation={1}>
              <View style={styles.badgeRow}>
                <PriorityBadge priority={item.priority} />
                <StatusChip status={item.status} />
              </View>

              <Text variant="titleLarge" style={styles.title}>
                {item.title}
              </Text>

              <Text style={styles.priorityNote}>
                {PRIORITY_LABELS[item.priority] ?? item.priority}
                {item.triggerSource ? ` · ${humanize(item.triggerSource)}` : ''}
              </Text>

              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

              <Divider style={styles.divider} />

              <View style={styles.facts}>
                <Fact icon="clock-outline" label="Raised" value={formatDateTime(item.createdAt)} />
                <Fact
                  icon="account-arrow-right-outline"
                  label="Assigned to me"
                  value={item.assignedAt ? formatDateTime(item.assignedAt) : null}
                />
                <Fact
                  icon="check-circle-outline"
                  label="Resolved"
                  value={item.resolvedAt ? formatDateTime(item.resolvedAt) : null}
                />
              </View>
            </Surface>

            {/* Patient */}
            {name || phone || item.patient?.patientProfile?.bloodGroup ? (
              <Surface style={styles.card} elevation={1}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Patient
                </Text>
                <View style={styles.facts}>
                  <Fact icon="account-outline" label="Name" value={name} />
                  <Fact
                    icon="water-outline"
                    label="Blood group"
                    value={item.patient?.patientProfile?.bloodGroup ?? null}
                  />
                  <Fact
                    icon="home-outline"
                    label="Home address"
                    value={item.patient?.patientProfile?.primaryAddress ?? null}
                  />
                </View>
                {phone ? (
                  <Button
                    mode="contained-tonal"
                    icon="phone"
                    onPress={() => void Linking.openURL(`tel:${phone}`)}
                    style={styles.inlineBtn}
                  >
                    Call {phone}
                  </Button>
                ) : null}

                {/* Patient records — access follows the sharing window the
                    case opened; no document is reachable without it. */}
                <Divider style={styles.divider} />
                <View style={styles.recordsHeader}>
                  <Text variant="titleSmall" style={styles.sectionTitle} numberOfLines={2}>
                    Patient records
                  </Text>
                  {consentQuery.data?.hasConsent && consentQuery.data.expiresAt ? (
                    <Text style={styles.recordsMeta}>
                      Shared until{' '}
                      {new Date(consentQuery.data.expiresAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>

                {consentQuery.isLoading ? (
                  <LoadingSkeleton height={14} width="60%" />
                ) : consentQuery.data?.hasConsent ? (
                  docsQuery.data?.length ? (
                    docsQuery.data.map((d: any) => (
                      <TouchableOpacity
                        key={d.id}
                        style={styles.recordRow}
                        disabled={!d.fileUrl}
                        onPress={() => {
                          if (d.fileUrl) Linking.openURL(d.fileUrl).catch(() => {});
                        }}
                      >
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <View style={styles.recordCopy}>
                          <Text style={styles.recordTitle} numberOfLines={1}>
                            {d.title}
                          </Text>
                          <Text style={styles.recordMeta}>
                            {humanize(d.category || d.documentType || 'Document')}
                          </Text>
                        </View>
                        {d.fileUrl ? (
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={palette.subtle}
                          />
                        ) : null}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.recordsEmpty}>
                      The patient has not uploaded any records.
                    </Text>
                  )
                ) : (
                  <Text style={styles.recordsEmpty}>
                    Records open once the patient confirms sharing in their app. Call them if you
                    need their history before then.
                  </Text>
                )}
              </Surface>
            ) : null}

            {/* Patient live location — the position the patient's device
                reported, which is what to drive to. The registered address is
                shown on the patient card above and is never used here. */}
            {!isTerminal ? (
              <Surface style={styles.card} elevation={1}>
                <View style={styles.recordsHeader}>
                  <Text variant="titleSmall" style={styles.sectionTitle} numberOfLines={2}>
                    Patient live location
                  </Text>
                  {locationQuery.data?.available && locationQuery.data.freshness ? (
                    <Text
                      style={[
                        styles.freshnessPill,
                        {
                          color:
                            locationQuery.data.freshness === 'LIVE'
                              ? palette.success
                              : palette.warning,
                          backgroundColor:
                            locationQuery.data.freshness === 'LIVE'
                              ? palette.successSoft
                              : palette.warningSoft,
                        },
                      ]}
                    >
                      {locationQuery.data.freshness === 'LIVE' ? 'Live' : 'Last known'}
                    </Text>
                  ) : null}
                </View>

                {locationQuery.isLoading ? (
                  <LoadingSkeleton height={16} width="55%" />
                ) : locationQuery.isError ? (
                  <Text style={styles.recordsEmpty}>
                    {(locationQuery.error as any)?.response?.data?.message ||
                      'The patient position could not be loaded.'}
                  </Text>
                ) : locationQuery.data?.available ? (
                  <>
                    <Text style={styles.locationUpdated}>
                      Updated{' '}
                      {locationQuery.data.ageMinutes === 0
                        ? 'just now'
                        : `${locationQuery.data.ageMinutes} min ago`}
                      {locationQuery.data.sharingExpiresAt
                        ? ` · sharing until ${new Date(
                            locationQuery.data.sharingExpiresAt
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </Text>
                    <Button
                      mode="contained"
                      icon="navigation-variant-outline"
                      style={styles.inlineBtn}
                      onPress={() =>
                        openMaps(
                          `${locationQuery.data?.latitude},${locationQuery.data?.longitude}`
                        )
                      }
                    >
                      Navigate to patient
                    </Button>
                  </>
                ) : (
                  <Text style={styles.recordsEmpty}>
                    {locationQuery.data?.reason ||
                      'The patient device has not reported a position yet.'}
                  </Text>
                )}
              </Surface>
            ) : null}

            {/* Incident location */}
            {item.incidentAddress || pin ? (
              <Surface style={styles.card} elevation={1}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Incident location
                </Text>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.locationText}>
                    {item.incidentAddress ?? 'Pinned location'}
                    {!item.incidentAddress && pin ? `\n${pin}` : ''}
                  </Text>
                </View>
                <Button
                  mode="contained"
                  icon="navigation-variant-outline"
                  onPress={openDirections}
                  style={styles.inlineBtn}
                >
                  Get directions
                </Button>
              </Surface>
            ) : null}

            {/* Facility */}
            {item.provider ? (
              <Surface style={styles.card} elevation={1}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Linked facility
                </Text>
                <View style={styles.facts}>
                  <Fact icon="hospital-building" label="Facility" value={item.provider.name} />
                  <Fact
                    icon="shape-outline"
                    label="Type"
                    value={item.provider.type ? humanize(item.provider.type) : null}
                  />
                  <Fact icon="city-variant-outline" label="City" value={item.provider.city ?? null} />
                </View>
                {item.provider.phone ? (
                  <Button
                    mode="contained-tonal"
                    icon="phone-outline"
                    onPress={() => void Linking.openURL(`tel:${item.provider?.phone}`)}
                    style={styles.inlineBtn}
                  >
                    Call facility
                  </Button>
                ) : null}
              </Surface>
            ) : null}

            {/* Coordination timeline */}
            <Surface style={styles.card} elevation={1}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Coordination timeline
              </Text>
              {item.timeline?.length ? (
                item.timeline.map((entry, index) => (
                  <TimelineRow
                    key={entry.id}
                    entry={entry}
                    isLast={index === item.timeline.length - 1}
                  />
                ))
              ) : (
                <Text style={styles.timelineEmpty}>
                  No entries yet. Your next status update will open this history.
                </Text>
              )}
            </Surface>
          </ScrollView>

          {/* Action bar */}
          <Surface style={[styles.actionBar, { paddingBottom: insets.bottom + 10 }]} elevation={3}>
            {isTerminal ? (
              <View style={styles.closedRow}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={18}
                  color={CASE_STATUS_COLORS[item.status]}
                />
                <Text style={styles.closedText}>
                  This case is {humanize(item.status).toLowerCase()} and can no longer be changed.
                </Text>
              </View>
            ) : item.status === 'ASSIGNED' ? (
              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  icon="map-marker-radius"
                  onPress={handleStartResponse}
                  loading={starting}
                  disabled={starting}
                  style={styles.actionBtn}
                  contentStyle={{ height: 46 }}
                >
                  Start Response (In Progress)
                </Button>
                <Button
                  mode="outlined"
                  icon="dots-horizontal"
                  onPress={() => setUpdating(true)}
                  disabled={starting}
                  style={{ borderRadius: 12 }}
                  contentStyle={{ height: 46 }}
                >
                  Options
                </Button>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  icon="note-plus-outline"
                  onPress={() => setAddingNote(true)}
                  style={styles.actionBtn}
                  contentStyle={{ height: 46 }}
                >
                  Add note
                </Button>
                {item.status === 'IN_PROGRESS' ? (
                  <Button
                    mode="contained"
                    icon="currency-inr"
                    onPress={() => setBillingVisible(true)}
                    style={[styles.actionBtn, { backgroundColor: palette.success }]}
                    contentStyle={{ height: 46 }}
                  >
                    Complete & Bill
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    icon="progress-check"
                    onPress={() => setUpdating(true)}
                    style={styles.actionBtn}
                    contentStyle={{ height: 46 }}
                  >
                    Update status
                  </Button>
                )}
              </View>
            )}
          </Surface>

          {/* Complete Case & Request Patient Payment Dialog */}
          <Portal>
            <Dialog visible={billingVisible} onDismiss={() => setBillingVisible(false)}>
              <Dialog.Title>Complete & Request Payment</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodySmall" style={{ color: palette.muted, marginBottom: 12 }}>
                  Conclude field response and issue invoice to the patient. Once submitted, the patient can settle via UPI or card.
                </Text>
                <TextInput
                  label="Invoiced Fee (₹ INR)"
                  value={billAmount}
                  onChangeText={setBillAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Field Service Notes / Invoice Remarks"
                  value={billNotes}
                  onChangeText={setBillNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Field triage performed, wound dressing applied, patient vitals stabilized."
                />
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setBillingVisible(false)} disabled={billingSubmitting}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCompleteAndBill}
                  loading={billingSubmitting}
                  disabled={billingSubmitting}
                >
                  Issue Invoice
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          <FieldNoteDialog
            visible={addingNote}
            caseId={item.id}
            caseNumber={item.caseNumber}
            onDismiss={() => setAddingNote(false)}
            onAdded={() => setToast('Field note and location recorded')}
          />

          <StatusUpdateDialog
            visible={updating}
            caseId={item.id}
            caseNumber={item.caseNumber}
            currentStatus={item.status}
            onDismiss={() => setUpdating(false)}
            onUpdated={(status) => setToast(`Status recorded — now ${humanize(status)}`)}
          />
        </>
      )}

      <Snackbar visible={Boolean(toast)} onDismiss={() => setToast(null)} duration={3500}>
        {toast ?? ''}
      </Snackbar>
    </View>
  );
}

const Fact: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | null;
}> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.factRow}>
      <MaterialCommunityIcons name={icon} size={17} color={palette.muted} />
      <View style={styles.factCopy}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
};

/** One immutable timeline entry: who did what, when, and from where. */
const TimelineRow: React.FC<{ entry: CaseTimelineEntry; isLast: boolean }> = ({ entry, isLast }) => {
  const tone = entry.newStatus ? CASE_STATUS_COLORS[entry.newStatus] ?? palette.muted : palette.muted;
  const pin = formatCoords(entry.locationLatitude, entry.locationLongitude);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: tone }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.timelineBody}>
        <Text style={styles.timelineAction}>{humanize(entry.action)}</Text>

        {entry.oldStatus || entry.newStatus ? (
          <Text style={styles.timelineTransition}>
            {entry.oldStatus ? `${humanize(entry.oldStatus)} → ` : ''}
            <Text style={{ color: tone, fontWeight: '700' }}>
              {entry.newStatus ? humanize(entry.newStatus) : ''}
            </Text>
          </Text>
        ) : null}

        {entry.notes ? <Text style={styles.timelineNotes}>{entry.notes}</Text> : null}

        <View style={styles.timelineMetaRow}>
          <Text style={styles.timelineMeta}>
            {formatDateTime(entry.createdAt)} · {timeAgo(entry.createdAt)}
            {entry.actorRole ? ` · ${humanize(entry.actorRole)}` : ''}
          </Text>
        </View>

        {pin ? (
          <View style={styles.timelinePinRow}>
            <MaterialCommunityIcons name="crosshairs-gps" size={13} color={palette.subtle} />
            <Text style={styles.timelineMeta}>{pin}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    paddingBottom: 8,
    paddingRight: 12,
    gap: 2,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: palette.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontWeight: '800',
    color: palette.ink,
  },
  headerSpinner: {
    marginLeft: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontWeight: '800',
    color: palette.ink,
    lineHeight: 26,
  },
  priorityNote: {
    fontSize: 12.5,
    fontWeight: '600',
    color: palette.muted,
  },
  description: {
    fontSize: 14,
    color: palette.body,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: palette.hairline,
  },
  facts: {
    gap: 10,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  factCopy: {
    flex: 1,
    gap: 1,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  factValue: {
    fontSize: 13.5,
    color: palette.body,
    lineHeight: 19,
  },
  sectionTitle: {
    fontWeight: '800',
    color: palette.ink,
    // Takes the leftover width and wraps instead of running under the pill
    // beside it. Without this the two collide at ~320dp.
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  inlineBtn: {
    borderRadius: 12,
    marginTop: 2,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Wraps to a second line on small phones rather than letting the title and
    // the status pill overlap.
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: 8,
    marginBottom: 2,
  },
  recordsMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    color: palette.muted,
    flexShrink: 0,
  },
  recordsEmpty: {
    fontSize: 13,
    color: palette.muted,
    lineHeight: 19,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  recordCopy: {
    flex: 1,
    gap: 1,
  },
  recordTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: palette.ink,
  },
  recordMeta: {
    fontSize: 11.5,
    color: palette.subtle,
  },
  freshnessPill: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  locationUpdated: {
    fontSize: 13,
    color: palette.body,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: palette.body,
    lineHeight: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    alignItems: 'center',
    width: 14,
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: palette.line,
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 16,
    gap: 3,
  },
  timelineAction: {
    fontSize: 13.5,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: 0.2,
  },
  timelineTransition: {
    fontSize: 12.5,
    color: palette.muted,
  },
  timelineNotes: {
    fontSize: 13.5,
    color: palette.body,
    lineHeight: 19,
    marginTop: 2,
  },
  timelineMetaRow: {
    marginTop: 2,
  },
  timelineMeta: {
    fontSize: 11.5,
    color: palette.subtle,
  },
  timelinePinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timelineEmpty: {
    fontSize: 13.5,
    color: palette.muted,
    lineHeight: 19,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  closedText: {
    flex: 1,
    fontSize: 13,
    color: palette.muted,
  },
});
