import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CaseRow, CaseStatus, getProfile, listCases } from '../../src/api/cases';
import { BrandLogo } from '../../src/components/BrandLogo';
import { CaseCard } from '../../src/components/CaseCard';
import { CaseCardSkeleton } from '../../src/components/LoadingSkeleton';
import { DutyToggle } from '../../src/components/DutyToggle';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { StatusUpdateDialog } from '../../src/components/StatusUpdateDialog';
import { useEmergency } from '../../src/socket/EmergencyProvider';
import { humanize, palette, tint } from '../../src/theme';

/** Server-side filter values; `null` means every case assigned to me. */
const FILTERS: { label: string; value: CaseStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MyCases() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { connected } = useEmergency();

  const [filter, setFilter] = useState<CaseStatus | null>(null);
  const [updating, setUpdating] = useState<CaseRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ['cm-me'], queryFn: getProfile });
  const casesQuery = useQuery({
    queryKey: ['cm-cases', filter],
    queryFn: () => listCases({ status: filter ?? undefined, perPage: 50 }),
  });

  const profile = meQuery.data;
  const cases = casesQuery.data?.data ?? [];
  const total = casesQuery.data?.total ?? 0;

  // The real name, read from `GET /cm/me`. With no name we greet without one —
  // a role label is not a name.
  const firstName = profile?.firstName?.trim();

  const emergencyCount = useMemo(
    () => cases.filter((c) => c.priority === 'P1' && c.status !== 'RESOLVED' && c.status !== 'CANCELLED').length,
    [cases]
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
    void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
  };

  const openCase = (id: string) =>
    router.push({ pathname: '/cases/[id]', params: { id } });

  return (
    <View style={styles.root}>
      {/* Branded header — the tab navigator's own header is disabled for this
          screen so there is never a second bar stacked above this one. */}
      <Surface style={[styles.header, { paddingTop: insets.top + 12 }]} elevation={1}>
        <View style={styles.headerTop}>
          <BrandLogo size={34} />
          <DutyToggle profile={profile} variant="pill" loading={meQuery.isLoading} />
        </View>

        <View style={styles.greetBlock}>
          <Text variant="titleLarge" style={styles.greeting}>
            {firstName ? `${greeting()}, ${firstName}` : greeting()}
          </Text>
          <View style={styles.liveRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: connected ? palette.success : palette.subtle },
              ]}
            />
            <Text style={styles.liveText}>
              {connected ? 'Live — emergency alerts on' : 'Connecting to alert stream…'}
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <Stat
            label="Active cases"
            value={meQuery.isLoading || meQuery.isError || !profile ? '—' : String(profile.activeCases)}
            icon="briefcase-clock-outline"
            tone={theme.colors.primary}
          />
          <Stat
            label={filter ? humanize(filter) : 'Assigned to me'}
            value={casesQuery.isLoading || casesQuery.isError ? '—' : String(total)}
            icon="clipboard-list-outline"
            tone={palette.info}
          />
          <Stat
            label="P1 open"
            value={casesQuery.isLoading || casesQuery.isError ? '—' : String(emergencyCount)}
            icon="alert-octagon-outline"
            tone={palette.danger}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Button
                key={f.label}
                mode={active ? 'contained' : 'outlined'}
                compact
                onPress={() => setFilter(f.value)}
                style={styles.filterChip}
                labelStyle={styles.filterLabel}
                textColor={active ? undefined : palette.body}
              >
                {f.label}
              </Button>
            );
          })}
        </ScrollView>
      </Surface>

      {casesQuery.isLoading ? (
        <View style={styles.listPad}>
          <CaseCardSkeleton />
          <CaseCardSkeleton />
          <CaseCardSkeleton />
        </View>
      ) : casesQuery.isError ? (
        <View style={styles.listPad}>
          <NetworkErrorState
            title="Coordination Server Offline"
            message="Your cases could not be loaded. Check your connection, then try again."
            onRetry={() => void casesQuery.refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={casesQuery.isRefetching}
              onRefresh={refresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <CaseCard
              item={item}
              onPress={() => openCase(item.id)}
              onUpdate={() => setUpdating(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-check-outline"
              title={filter ? `No ${humanize(filter).toLowerCase()} cases` : 'No cases assigned yet'}
              description={
                filter
                  ? 'Nothing matches this filter right now. Switch to All to see everything assigned to you.'
                  : 'When an administrator dispatches a case to you it appears here, and an emergency raises an alert straight away.'
              }
              actionLabel={filter ? 'Show all cases' : undefined}
              onAction={filter ? () => setFilter(null) : undefined}
            />
          }
        />
      )}

      {updating ? (
        <StatusUpdateDialog
          visible
          caseId={updating.id}
          caseNumber={updating.caseNumber}
          currentStatus={updating.status}
          onDismiss={() => setUpdating(null)}
          onUpdated={(status) => setToast(`${updating.caseNumber} is now ${humanize(status)}`)}
        />
      ) : null}

      <Snackbar visible={Boolean(toast)} onDismiss={() => setToast(null)} duration={3500}>
        {toast ?? ''}
      </Snackbar>
    </View>
  );
}

const Stat: React.FC<{
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: string;
}> = ({ label, value, icon, tone }) => (
  <View style={[styles.stat, { backgroundColor: tint(tone, 0.93), borderColor: `${tone}33` }]}>
    <MaterialCommunityIcons name={icon} size={16} color={tone} />
    <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  header: {
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The duty pill grows when it reads "Updating…"; wrapping keeps it off the
    // logo instead of overlapping it on a narrow screen.
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 12,
  },
  greetBlock: {
    gap: 4,
  },
  greeting: {
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -0.3,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    color: palette.muted,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 1,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10.5,
    color: palette.muted,
    fontWeight: '600',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderColor: palette.line,
  },
  filterLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginVertical: 5,
  },
  listPad: {
    padding: 16,
    paddingBottom: 40,
  },
});
