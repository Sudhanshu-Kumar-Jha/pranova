import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Searchbar,
  SegmentedButtons,
  Chip,
  Card,
  Button,
  Snackbar,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLabTests,
  listMyLabBookings,
  DiagnosticTest,
  LabBooking,
} from '../../src/api/diagnostics';
import { LabTestCard } from '../../src/components/LabTestCard';
import { StatusChip } from '../../src/components/StatusChip';
import { BookLabTestModal } from '../../src/components/BookLabTestModal';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { CardSkeleton, LabTestCardSkeleton } from '../../src/components/LoadingSkeleton';

export default function DiagnosticsScreen() {
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<'tests' | 'bookings'>('tests');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const [bookingTest, setBookingTest] = useState<DiagnosticTest | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Queries
  const testsQuery = useQuery({
    queryKey: ['lab-tests', { q: searchQuery, category: selectedCategory }],
    queryFn: () =>
      listLabTests({
        q: searchQuery.trim() || undefined,
        category: selectedCategory,
        perPage: 30,
      }),
  });

  const bookingsQuery = useQuery({
    queryKey: ['lab-bookings', 'mine'],
    queryFn: () => listMyLabBookings({ perPage: 30 }),
  });

  const isRefreshing =
    mainTab === 'tests' ? testsQuery.isRefetching : bookingsQuery.isRefetching;

  const onRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleBook = (test: DiagnosticTest) => {
    setBookingTest(test);
    setBookingModalVisible(true);
  };

  const handleBookingSuccess = (bookingNumber: string) => {
    setSnackbarMessage(`Lab test booked successfully! Reference: ${bookingNumber}`);
    queryClient.invalidateQueries({ queryKey: ['lab-bookings'] });
    setMainTab('bookings');
  };

  const categories = [
    { label: 'All', value: undefined },
    { label: 'Biochemistry', value: 'Biochemistry' },
    { label: 'Hematology', value: 'Hematology' },
    { label: 'Diabetology', value: 'Diabetology' },
    { label: 'Endocrinology', value: 'Endocrinology' },
  ];

  return (
    <View style={styles.root}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'tests' | 'bookings')}
          buttons={[
            {
              value: 'tests',
              label: 'Diagnostic Tests',
              icon: 'test-tube',
            },
            {
              value: 'bookings',
              label: bookingsQuery.isError
                ? 'My Bookings'
                : `My Bookings (${bookingsQuery.data?.data.length || 0})`,
              icon: 'calendar-clock',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {mainTab === 'tests' ? (
          <>
            <Searchbar
              placeholder="Search tests (e.g. CBC, Lipid, Thyroid)..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              inputStyle={{ minHeight: 44 }}
            />

            {/* Category filter chips */}
            <View style={styles.categorySection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <Chip
                      key={cat.label}
                      selected={isSelected}
                      onPress={() => setSelectedCategory(cat.value)}
                      style={[styles.chip, isSelected && styles.selectedChip]}
                    >
                      {cat.label}
                    </Chip>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.resultsHeader}>
              <Text variant="titleSmall" style={styles.resultsCount}>
                {testsQuery.isError
                  ? 'Packages Offline'
                  : `${testsQuery.data?.total ?? 0} Diagnostic Packages Available`}
              </Text>
            </View>

            {testsQuery.isLoading ? (
              <>
                <LabTestCardSkeleton />
                <LabTestCardSkeleton />
                <LabTestCardSkeleton />
              </>
            ) : testsQuery.isError ? (
              <NetworkErrorState
                title="Diagnostics Directory Offline"
                message="Cannot connect to laboratory test directory. Check your connection and tap retry."
                onRetry={() => void testsQuery.refetch()}
              />
            ) : testsQuery.data?.data.length === 0 ? (
              <EmptyState
                icon="test-tube-empty"
                title="No Lab Tests Found"
                description="We couldn't find tests matching your query. Please adjust your keywords."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory(undefined);
                }}
              />
            ) : (
              testsQuery.data?.data.map((test) => (
                <LabTestCard key={test.id} test={test} onBook={handleBook} />
              ))
            )}
          </>
        ) : (
          <>
            {bookingsQuery.isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : bookingsQuery.isError ? (
              <NetworkErrorState
                title="Lab Bookings Offline"
                message="Cannot retrieve your test bookings. Check your connection and tap retry."
                onRetry={() => void bookingsQuery.refetch()}
              />
            ) : bookingsQuery.data?.data.length === 0 ? (
              <EmptyState
                icon="clipboard-pulse-outline"
                title="No Lab Bookings"
                description="You have not scheduled any diagnostic tests yet. Book full-body profiles or routine blood tests."
                actionLabel="Explore Tests"
                onAction={() => setMainTab('tests')}
              />
            ) : (
              bookingsQuery.data?.data.map((booking: LabBooking) => {
                const dateStr = new Date(booking.scheduledDate).toLocaleDateString(
                  'en-IN',
                  {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );
                const isHome = booking.collectionType === 'HOME_COLLECTION';

                return (
                  <Card key={booking.id} style={styles.bookingCard} mode="outlined">
                    <Card.Content style={styles.bookingContent}>
                      <View style={styles.bookingHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bookingNumber}>
                            {booking.bookingNumber}
                          </Text>
                          <Text style={styles.testNameTitle}>
                            {booking.test?.name || 'Diagnostic Test'}
                          </Text>
                        </View>
                        <StatusChip status={booking.status} />
                      </View>

                      <Divider style={{ marginVertical: 8 }} />

                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons
                            name={isHome ? 'home-outline' : 'hospital-building'}
                            size={16}
                            color="#0f766e"
                          />
                          <Text style={styles.detailText}>
                            {isHome ? 'Home Sample Pickup' : 'Visit Center'}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons
                            name="calendar-clock"
                            size={16}
                            color="#64748b"
                          />
                          <Text style={styles.detailText}>{dateStr}</Text>
                        </View>
                      </View>

                      {isHome && booking.address && (
                        <View style={styles.addressBox}>
                          <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={14}
                            color="#64748b"
                          />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {booking.address}
                          </Text>
                        </View>
                      )}

                      <Divider style={{ marginVertical: 8 }} />

                      <View style={styles.bookingFooter}>
                        <Text style={styles.amountText}>Amount: ₹{booking.amount}</Text>
                        {booking.status === 'REPORT_READY' && (
                          <Button
                            mode="contained-tonal"
                            icon="file-download-outline"
                            compact
                            onPress={() =>
                              setSnackbarMessage('Report ready for download.')
                            }
                          >
                            Download Report
                          </Button>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <BookLabTestModal
        visible={bookingModalVisible}
        test={bookingTest}
        onDismiss={() => {
          setBookingModalVisible(false);
          setBookingTest(null);
        }}
        onSuccess={handleBookingSuccess}
      />

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
        style={{ backgroundColor: '#0f766e' }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  searchbar: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 0,
  },
  categorySection: {
    marginVertical: 4,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedChip: {
    backgroundColor: '#f0fdfa',
    borderColor: '#2dd4bf',
  },
  resultsHeader: {
    marginVertical: 4,
  },
  resultsCount: {
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  bookingCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  bookingContent: {
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  testNameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f766e',
  },
});
