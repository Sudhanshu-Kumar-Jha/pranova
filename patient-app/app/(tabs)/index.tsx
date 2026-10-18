import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Chip,
  Button,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../../src/providers/AppConfigProvider';
import { BrandLogo } from '../../src/components/BrandLogo';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { listSpecialties, listDoctors, Doctor } from '../../src/api/doctors';
import { listMyAppointments } from '../../src/api/appointments';
import { listMyOrders } from '../../src/api/pharmacy';
import { listMyLabBookings } from '../../src/api/diagnostics';
import { DoctorCard } from '../../src/components/DoctorCard';
import { AppointmentCard } from '../../src/components/AppointmentCard';
import { BookAppointmentModal } from '../../src/components/BookAppointmentModal';
import { EmergencySosModal } from '../../src/components/EmergencySosModal';
import { LocationSharingBanner } from '../../src/components/LocationSharingBanner';
import {
  CardSkeleton,
  DoctorCardSkeleton,
  SpecialtyChipsSkeleton,
} from '../../src/components/LoadingSkeleton';
import { getMe } from '../../src/api/auth';
import { listMyCases, PatientCase } from '../../src/api/cases';
import { PaymentModal } from '../../src/components/PaymentModal';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { palette } from '../../src/theme';

export default function HomeDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [paymentModalCase, setPaymentModalCase] = useState<PatientCase | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe });
  const profile = meQuery.data?.profile;

  // Real backend queries
  const casesQuery = useQuery({
    queryKey: ['patient-cases'],
    queryFn: listMyCases,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: listSpecialties,
  });

  const doctorsQuery = useQuery({
    queryKey: ['doctors', 'featured'],
    queryFn: () => listDoctors({ perPage: 4 }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => listMyAppointments({ perPage: 5 }),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => listMyOrders({ perPage: 2 }),
  });

  const labBookingsQuery = useQuery({
    queryKey: ['lab-bookings', 'recent'],
    queryFn: () => listMyLabBookings({ perPage: 2 }),
  });

  const isRefreshing =
    specialtiesQuery.isRefetching ||
    doctorsQuery.isRefetching ||
    appointmentsQuery.isRefetching;

  const onRefresh = () => {
    queryClient.invalidateQueries();
  };

  // Find next upcoming active appointment
  const upcomingAppointment = appointmentsQuery.data?.data.find(
    (apt) => apt.status === 'CONFIRMED' || apt.status === 'REQUESTED'
  );

  const activeOrder = ordersQuery.data?.data.find(
    (ord) => ord.status !== 'DELIVERED' && ord.status !== 'CANCELLED'
  );

  const activeBooking = labBookingsQuery.data?.data.find(
    (b) => b.status !== 'REPORT_READY' && b.status !== 'CANCELLED'
  );

  const awaitingPaymentCase = casesQuery.data?.find(
    (c) => c.status === 'COMPLETED_AWAITING_PAYMENT'
  );

  const activeCoordinationCase = casesQuery.data?.find(
    (c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS'
  );

  const handleBook = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingModalVisible(true);
  };

  const handleBookingSuccess = (appointmentNumber: string) => {
    setSnackbarMessage(`Consultation booked successfully! Reference: ${appointmentNumber}`);
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };

  const handleJoinVideo = (apt: any) => {
    router.push({ pathname: '/video/[appointmentId]', params: { appointmentId: apt.id } });
  };

  const brand = useBrand();
  const insets = useSafeAreaInsets();

  // The profile fetched above is the source of truth for the patient's name.
  // The session object cached at sign-in is only a fallback, and "Patient" is
  // a label, not a name — greet without one rather than with the wrong one.
  const firstName = profile?.firstName?.trim() || user?.firstName?.trim() || '';
  const greetingName = firstName || null;
  const avatarLabel = (firstName || profile?.lastName || '?').charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Live location sharing is never silent: while a case is open the
          patient is told their position is visible to the response team. */}
      <LocationSharingBanner />

      {/* Patient Greeting & Emergency bar */}
      <View style={styles.greetingCard}>
        <View style={styles.brandRow}>
          <BrandLogo size={26} />
          <Text style={styles.brandName}>{brand.appName}</Text>
        </View>

        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={styles.greetingTitle}>
              {greetingName ? `Hello, ${greetingName}` : 'Hello'}
            </Text>
            <Text variant="bodySmall" style={styles.greetingSub}>
              How can we assist your health today?
            </Text>
          </View>
          <Avatar.Text
            label={avatarLabel}
            size={46}
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            color="#ffffff"
          />
        </View>

        {/* High-Urgency Emergency SOS & Call 108 Dispatch Card */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => setSosModalVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open Emergency SOS and Call 108 Options"
        >
          <View style={styles.emergencyIconPulse}>
            <MaterialCommunityIcons name="shield-alert" size={24} color="#dc2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Emergency SOS & 108 Ambulance</Text>
            <Text style={styles.emergencySub}>
              Direct 108 Hotline · Instant P1 Triage Dispatch
            </Text>
          </View>
          <View style={styles.sosButtonPill}>
            <Text style={styles.sosButtonPillText}>SOS 108</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Active Case Payment Due Alert */}
      {awaitingPaymentCase && (
        <View style={styles.section}>
          <Card
            style={{
              backgroundColor: '#fffbeb',
              borderWidth: 1.5,
              borderColor: '#f59e0b',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <Card.Content style={{ padding: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#fef3c7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#d97706" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      variant="titleSmall"
                      style={{ fontWeight: '800', color: '#92400e' }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Payment Due · #{awaitingPaymentCase.caseNumber}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#b45309', fontSize: 11, fontWeight: '600' }}>
                      Field Care Complete
                    </Text>
                  </View>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: '#fef3c7', alignSelf: 'flex-start' }}
                  textStyle={{ color: '#b45309', fontWeight: '700', fontSize: 11 }}
                >
                  ₹{awaitingPaymentCase.paymentAmount ?? 750}
                </Chip>
              </View>
              <Text variant="bodySmall" style={{ color: '#78350f', marginTop: 8, lineHeight: 18 }}>
                Your field care response is complete. Settle invoice to finalize clinical records.
              </Text>
              <Button
                mode="contained"
                icon="credit-card-check"
                buttonColor="#d97706"
                textColor="#ffffff"
                style={{ marginTop: 12, borderRadius: 8 }}
                onPress={() => setPaymentModalCase(awaitingPaymentCase)}
              >
                Pay Now ₹{awaitingPaymentCase.paymentAmount ?? 750}
              </Button>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Active Field Coordination Case */}
      {activeCoordinationCase && (
        <View style={styles.section}>
          <Card
            style={{
              backgroundColor: '#f0fdfa',
              borderWidth: 1.5,
              borderColor: '#5eead4',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <Card.Content style={{ padding: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#ccfbf1',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="ambulance" size={20} color="#0f766e" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      variant="titleSmall"
                      style={{ fontWeight: '800', color: '#115e59' }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Case #{activeCoordinationCase.caseNumber}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: '#0f766e', fontSize: 11, fontWeight: '600' }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {activeCoordinationCase.status === 'IN_PROGRESS'
                        ? 'In Field Response'
                        : 'Care Team Assigned'}
                    </Text>
                  </View>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: '#ccfbf1', alignSelf: 'flex-start' }}
                  textStyle={{ color: '#0f766e', fontWeight: '700', fontSize: 10 }}
                >
                  {activeCoordinationCase.priority || 'ACTIVE'}
                </Chip>
              </View>

              {activeCoordinationCase.careManagerName ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#ccfbf1',
                  }}
                >
                  <MaterialCommunityIcons name="account-tie" size={16} color="#0f766e" />
                  <Text
                    variant="bodySmall"
                    style={{ color: '#134e4a', fontWeight: '600', flex: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Care Manager: {activeCoordinationCase.careManagerName}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#ccfbf1',
                  }}
                >
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#0f766e" />
                  <Text variant="bodySmall" style={{ color: '#134e4a', fontWeight: '600' }}>
                    Triage & dispatch underway
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Real Next Upcoming Appointment Card */}
      {upcomingAppointment && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Upcoming Consultation
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => router.push('/(tabs)/consult')}
              textColor={theme.colors.primary}
            >
              View All
            </Button>
          </View>
          <AppointmentCard
            appointment={upcomingAppointment}
            onJoinVideo={handleJoinVideo}
          />
        </View>
      )}

      {/* Quick Healthcare Actions Grid */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Healthcare Services
        </Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#bae6fd' }]}
            onPress={() => router.push('/(tabs)/consult')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}>
              <MaterialCommunityIcons name="doctor" size={26} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Find Doctors</Text>
            <Text style={styles.actionDesc}>Video or in-clinic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#a7f3d0' }]}
            onPress={() => router.push('/(tabs)/pharmacy')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
              <MaterialCommunityIcons name="pill" size={26} color="#059669" />
            </View>
            <Text style={styles.actionTitle}>Pharmacy</Text>
            <Text style={styles.actionDesc}>Genuine medicines</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#99f6e4' }]}
            onPress={() => router.push('/(tabs)/diagnostics')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#f0fdfa' }]}>
              <MaterialCommunityIcons name="test-tube" size={26} color="#0f766e" />
            </View>
            <Text style={styles.actionTitle}>Diagnostics</Text>
            <Text style={styles.actionDesc}>Home sample pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#e2e8f0' }]}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#f8fafc' }]}>
              <MaterialCommunityIcons name="account-circle-outline" size={26} color="#475569" />
            </View>
            <Text style={styles.actionTitle}>My Profile</Text>
            <Text style={styles.actionDesc}>Records &amp; vitals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Tracking Status (Real orders & Lab bookings) */}
      {(activeOrder || activeBooking) && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Active Deliveries &amp; Tests
          </Text>
          {activeOrder && (
            <Card style={styles.trackerCard} mode="outlined">
              <Card.Content style={styles.trackerContent}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackerNumber}>{activeOrder.orderNumber}</Text>
                  <Text style={styles.trackerSub}>Pharmacy Order · Status: {activeOrder.status}</Text>
                </View>
                <Button
                  compact
                  mode="text"
                  onPress={() => router.push('/(tabs)/pharmacy')}
                  textColor={theme.colors.primary}
                >
                  Track
                </Button>
              </Card.Content>
            </Card>
          )}

          {activeBooking && (
            <Card style={styles.trackerCard} mode="outlined">
              <Card.Content style={styles.trackerContent}>
                <MaterialCommunityIcons name="needle" size={24} color="#0f766e" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackerNumber}>{activeBooking.bookingNumber}</Text>
                  <Text style={styles.trackerSub}>
                    {activeBooking.test?.name || 'Lab Test'} · {activeBooking.status}
                  </Text>
                </View>
                <Button
                  compact
                  mode="text"
                  onPress={() => router.push('/(tabs)/diagnostics')}
                  textColor="#0f766e"
                >
                  Track
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* Specialties Browse */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Medical Specialties
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => router.push('/(tabs)/consult')}
            textColor={theme.colors.primary}
          >
            See Directory
          </Button>
        </View>

        {specialtiesQuery.isLoading ? (
          <SpecialtyChipsSkeleton />
        ) : specialtiesQuery.isError ? (
          <NetworkErrorState
            compact
            message="Unable to load specialties"
            onRetry={() => void specialtiesQuery.refetch()}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {specialtiesQuery.data?.map((specialty) => (
              <Chip
                key={specialty.id}
                icon="stethoscope"
                style={styles.specialtyChip}
                onPress={() => router.push('/(tabs)/consult')}
              >
                {specialty.name}
              </Chip>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Featured / Top Doctors */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Verified Healthcare Specialists
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => router.push('/(tabs)/consult')}
            textColor={theme.colors.primary}
          >
            All Doctors
          </Button>
        </View>

        {doctorsQuery.isLoading ? (
          <>
            <DoctorCardSkeleton />
            <DoctorCardSkeleton />
          </>
        ) : doctorsQuery.isError ? (
          <NetworkErrorState
            title="Doctors unavailable"
            message="Could not connect to directory. Tap retry to reload."
            onRetry={() => void doctorsQuery.refetch()}
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
      </View>

      {/* Booking Modal */}
      <BookAppointmentModal
        visible={bookingModalVisible}
        doctor={selectedDoctor}
        onDismiss={() => {
          setBookingModalVisible(false);
          setSelectedDoctor(null);
        }}
        onSuccess={handleBookingSuccess}
      />

      {/* Emergency SOS & 108 Ambulance Options Modal */}
      <EmergencySosModal
        visible={sosModalVisible}
        onDismiss={() => setSosModalVisible(false)}
        patientProfile={profile}
      />

      {/* Mock Payment Settlement Modal */}
      {paymentModalCase && (
        <PaymentModal
          visible={Boolean(paymentModalCase)}
          onDismiss={() => setPaymentModalCase(null)}
          caseId={paymentModalCase.id}
          caseNumber={paymentModalCase.caseNumber}
          amount={paymentModalCase.paymentAmount ?? 750}
          onPaymentSuccess={() => {
            setSnackbarMessage('Payment processed successfully! Case completed.');
            void queryClient.invalidateQueries({ queryKey: ['patient-cases'] });
          }}
        />
      )}

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
        style={{ backgroundColor: '#0f766e' }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 16,
    paddingBottom: 48,
    gap: 20,
  },
  greetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  greetingSub: {
    color: '#64748b',
    marginTop: 2,
  },
  avatar: {
    backgroundColor: palette.info,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    gap: 10,
  },
  emergencyIconPulse: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  emergencySub: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 1,
  },
  sosButtonPill: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sosButtonPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  trackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  trackerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  trackerNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  trackerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  specialtyChip: {
    backgroundColor: '#e0f2fe',
  },
  chipSkeleton: {
    backgroundColor: '#f1f5f9',
  },
});
