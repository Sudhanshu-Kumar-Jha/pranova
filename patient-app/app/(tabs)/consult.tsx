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
  Dialog,
  Portal,
  TextInput,
  Button,
  Snackbar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listSpecialties, listDoctors, Doctor } from '../../src/api/doctors';
import {
  listMyAppointments,
  cancelAppointment,
  Appointment,
} from '../../src/api/appointments';
import { DoctorCard } from '../../src/components/DoctorCard';
import { AppointmentCard } from '../../src/components/AppointmentCard';
import { BookAppointmentModal } from '../../src/components/BookAppointmentModal';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import {
  CardSkeleton,
  DoctorCardSkeleton,
  SpecialtyChipsSkeleton,
  AppointmentCardSkeleton,
} from '../../src/components/LoadingSkeleton';

export default function ConsultScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<'find' | 'mine'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | undefined>(undefined);
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // Cancellation dialog state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('Personal schedule clash');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Queries
  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: listSpecialties,
  });

  const doctorsQuery = useQuery({
    queryKey: ['doctors', { q: searchQuery, specialtyId: selectedSpecialtyId }],
    queryFn: () =>
      listDoctors({
        q: searchQuery.trim() || undefined,
        specialtyId: selectedSpecialtyId,
        perPage: 20,
      }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: () => listMyAppointments({ perPage: 50 }),
  });

  const isRefreshing =
    mainTab === 'find'
      ? doctorsQuery.isRefetching || specialtiesQuery.isRefetching
      : appointmentsQuery.isRefetching;

  const onRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleBook = (doctor: Doctor) => {
    setBookingDoctor(doctor);
    setBookingModalVisible(true);
  };

  const handleBookingSuccess = (appointmentNumber: string) => {
    setSnackbarMessage(`Appointment booked successfully! Reference: ${appointmentNumber}`);
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    setMainTab('mine');
  };

  const handleJoinVideo = (apt: Appointment) => {
    router.push({
      pathname: '/video/[appointmentId]',
      params: { appointmentId: apt.id },
    });
  };

  const handleInitiateCancel = (apt: Appointment) => {
    setCancellingAppointment(apt);
    setCancelReason('Personal schedule clash');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;
    setCancelLoading(true);
    try {
      await cancelAppointment(cancellingAppointment.id, cancelReason.trim());
      setSnackbarMessage('Appointment cancelled.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setCancelModalVisible(false);
    } catch (err: any) {
      setSnackbarMessage(err?.response?.data?.message || 'Could not cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filter appointments
  const filteredAppointments = (appointmentsQuery.data?.data || []).filter((apt) => {
    if (appointmentFilter === 'UPCOMING') {
      return apt.status === 'CONFIRMED' || apt.status === 'REQUESTED';
    }
    if (appointmentFilter === 'COMPLETED') {
      return apt.status === 'COMPLETED';
    }
    if (appointmentFilter === 'CANCELLED') {
      return apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
    }
    return true;
  });

  return (
    <View style={styles.root}>
      {/* Top Main Navigation Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'find' | 'mine')}
          buttons={[
            {
              value: 'find',
              label: 'Find Doctors',
              icon: 'magnify',
            },
            {
              value: 'mine',
              label: appointmentsQuery.isError
                ? 'My Consultations'
                : `My Consultations (${appointmentsQuery.data?.data.length || 0})`,
              icon: 'calendar-account',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {mainTab === 'find' ? (
          <>
            {/* Search Input */}
            <Searchbar
              placeholder="Search doctor or condition..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              inputStyle={{ minHeight: 44 }}
            />

            {/* Specialty Horizontal Chips */}
            <View style={styles.specialtiesSection}>
              {specialtiesQuery.isLoading ? (
                <SpecialtyChipsSkeleton />
              ) : specialtiesQuery.isError ? (
                <NetworkErrorState
                  compact
                  message="Specialties unavailable"
                  onRetry={() => void specialtiesQuery.refetch()}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  <Chip
                    selected={selectedSpecialtyId === undefined}
                    onPress={() => setSelectedSpecialtyId(undefined)}
                    style={[
                      styles.chip,
                      selectedSpecialtyId === undefined && styles.selectedChip,
                    ]}
                  >
                    All Specialties
                  </Chip>
                  {specialtiesQuery.data?.map((specialty) => {
                    const isSelected = selectedSpecialtyId === specialty.id;
                    return (
                      <Chip
                        key={specialty.id}
                        selected={isSelected}
                        onPress={() =>
                          setSelectedSpecialtyId(isSelected ? undefined : specialty.id)
                        }
                        style={[styles.chip, isSelected && styles.selectedChip]}
                      >
                        {specialty.name}
                      </Chip>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Doctors List */}
            <View style={styles.resultsHeader}>
              <Text variant="titleSmall" style={styles.resultsCount}>
                {doctorsQuery.isError
                  ? 'Directory Offline'
                  : `${doctorsQuery.data?.total ?? 0} Specialists Available`}
              </Text>
            </View>

            {doctorsQuery.isLoading ? (
              <>
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
              </>
            ) : doctorsQuery.isError ? (
              <NetworkErrorState
                title="Specialists Directory Offline"
                message="Cannot connect to medical directory. Check your connection and tap retry."
                onRetry={() => void doctorsQuery.refetch()}
              />
            ) : doctorsQuery.data?.data.length === 0 ? (
              <EmptyState
                icon="account-search-outline"
                title="No Specialists Found"
                description="Try clearing your search query or selecting another medical specialty."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedSpecialtyId(undefined);
                }}
              />
            ) : (
              doctorsQuery.data?.data.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={handleBook}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* Appointment Status Filters */}
            <View style={styles.subFilterRow}>
              {(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((filter) => (
                <Chip
                  key={filter}
                  selected={appointmentFilter === filter}
                  onPress={() => setAppointmentFilter(filter)}
                  style={[
                    styles.subChip,
                    appointmentFilter === filter && styles.selectedSubChip,
                  ]}
                >
                  {filter}
                </Chip>
              ))}
            </View>

            {appointmentsQuery.isLoading ? (
              <>
                <AppointmentCardSkeleton />
                <AppointmentCardSkeleton />
              </>
            ) : appointmentsQuery.isError ? (
              <NetworkErrorState
                title="Consultations Offline"
                message="Could not load your consultations history. Check your connection and tap retry."
                onRetry={() => void appointmentsQuery.refetch()}
              />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState
                icon="calendar-blank-outline"
                title="No Appointments Found"
                description={
                  appointmentFilter === 'ALL'
                    ? "You haven't scheduled any consultations yet."
                    : `No ${appointmentFilter.toLowerCase()} consultations on record.`
                }
                actionLabel="Find a Doctor"
                onAction={() => setMainTab('find')}
              />
            ) : (
              filteredAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onJoinVideo={handleJoinVideo}
                  onCancel={handleInitiateCancel}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <BookAppointmentModal
        visible={bookingModalVisible}
        doctor={bookingDoctor}
        onDismiss={() => {
          setBookingModalVisible(false);
          setBookingDoctor(null);
        }}
        onSuccess={handleBookingSuccess}
      />

      {/* Cancellation Dialog */}
      <Portal>
        <Dialog
          visible={cancelModalVisible}
          onDismiss={() => setCancelModalVisible(false)}
          style={{ backgroundColor: '#ffffff', borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '700', color: '#0f172a' }}>
            Cancel Consultation
          </Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="bodyMedium" style={{ color: '#475569' }}>
              Are you sure you wish to cancel this appointment with Dr.{' '}
              {cancellingAppointment?.doctor?.firstName}{' '}
              {cancellingAppointment?.doctor?.lastName}?
            </Text>
            <TextInput
              label="Reason for cancellation"
              value={cancelReason}
              onChangeText={setCancelReason}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setCancelModalVisible(false)}
              disabled={cancelLoading}
            >
              Keep
            </Button>
            <Button
              onPress={handleConfirmCancel}
              loading={cancelLoading}
              disabled={cancelLoading}
              textColor="#dc2626"
            >
              Confirm Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  specialtiesSection: {
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
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
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
  subFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  subChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedSubChip: {
    backgroundColor: '#f0fdfa',
    borderColor: '#2dd4bf',
  },
});
