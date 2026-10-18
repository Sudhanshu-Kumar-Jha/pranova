import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Avatar,
  Card,
  Button,
  Divider,
  Chip,
  Modal,
  Portal,
  TextInput,
  HelperText,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, updateProfile } from '../../src/api/auth';
import { listMyAppointments } from '../../src/api/appointments';
import { listMyOrders } from '../../src/api/pharmacy';
import { listMyLabBookings } from '../../src/api/diagnostics';
import { useAuthStore } from '../../src/store/authStore';
import { CardSkeleton, ProfileCardSkeleton } from '../../src/components/LoadingSkeleton';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { getCurrentLocationDetails } from '../../src/utils/location';
import { palette, onColor } from '../../src/theme';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: () => listMyAppointments({ perPage: 100 }),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => listMyOrders({ perPage: 100 }),
  });

  const labBookingsQuery = useQuery({
    queryKey: ['lab-bookings', 'mine'],
    queryFn: () => listMyLabBookings({ perPage: 100 }),
  });

  const onRefresh = () => {
    queryClient.invalidateQueries();
  };

  const user = meQuery.data;
  const profile = user?.profile;

  // Edit Profile Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [primaryAddress, setPrimaryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locDetecting, setLocDetecting] = useState(false);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Prefill form whenever modal opens or profile loads
  const openEditModal = () => {
    setFirstName(profile?.firstName || '');
    setLastName(profile?.lastName || '');
    setEmail(user?.email || '');
    setGender(profile?.gender || 'Male');
    setBloodGroup(profile?.bloodGroup || 'B+');
    setPrimaryAddress(profile?.primaryAddress || '');
    setCity(profile?.city || '');
    setPincode(profile?.pincode || '');
    setLatitude(profile?.latitude ?? null);
    setLongitude(profile?.longitude ?? null);
    setEmergencyContactName(profile?.emergencyContactName || '');
    setEmergencyContactPhone(profile?.emergencyContactPhone || '');
    setSaveError(null);
    setEditVisible(true);
  };

  const handleDetectLiveLocation = async () => {
    setLocDetecting(true);
    setSaveError(null);
    try {
      const outcome = await getCurrentLocationDetails();
      if (!outcome.success || !outcome.data) {
        setSaveError(
          outcome.error ||
            'Could not determine GPS location. Please check device location permissions.'
        );
        return;
      }
      const loc = outcome.data;
      if (loc.primaryAddress) setPrimaryAddress(loc.primaryAddress);
      if (loc.city) setCity(loc.city);
      if (loc.pincode) setPincode(loc.pincode);
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch (err: any) {
      setSaveError(err?.message || 'Error detecting real-time location.');
    } finally {
      setLocDetecting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      setSaveError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setSaveError('Last name is required');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSaveError('Please enter a valid email address');
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
        bloodGroup: bloodGroup || undefined,
        primaryAddress: primaryAddress.trim() || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
        latitude,
        longitude,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      });

      // Invalidate queries so that all screens, checkout, and bookings update immediately
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditVisible(false);
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message || 'Could not update profile. Please try again.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const initials = `${profile?.firstName?.[0] || 'P'}${profile?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={meQuery.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Patient Identity Card */}
        {meQuery.isLoading ? (
          <ProfileCardSkeleton />
        ) : meQuery.isError ? (
          <NetworkErrorState
            title="Profile Offline"
            message="Could not load your patient profile details. Check your connection and tap retry."
            onRetry={() => void meQuery.refetch()}
          />
        ) : (
          <Card style={styles.card} mode="outlined">
            <View style={styles.identityCardBody}>
              <View style={styles.profileHeader}>
                <Avatar.Text
                  label={initials}
                  size={64}
                  style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                  color="#ffffff"
                />
                <View style={styles.nameCol}>
                  <Text variant="titleLarge" style={styles.patientName}>
                    {profile?.firstName || 'Patient'} {profile?.lastName || ''}
                  </Text>

                  {/* Clean Verified Badge Row */}
                  <View style={styles.verifiedRow}>
                    {user?.isPhoneVerified ? (
                      <View style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#059669" />
                        <Text style={styles.verifiedBadgeText}>Verified Patient</Text>
                      </View>
                    ) : (
                      <View style={styles.unverifiedBadge}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#d97706" />
                        <Text style={styles.unverifiedBadgeText}>Phone Unverified</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{user?.phone || 'No phone'}</Text>
                  </View>

                  {Boolean(user?.email) && (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="email-outline" size={14} color="#64748b" />
                      <Text style={styles.infoText}>{user?.email}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Button
                mode="contained"
                icon="account-edit-outline"
                onPress={openEditModal}
                style={[styles.editBtn, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: onColor(theme.colors.primary), fontWeight: '700' }}
                contentStyle={{ height: 44 }}
              >
                Edit Customer Profile
              </Button>
            </View>
          </Card>
        )}

        {/* Clinical Summary Counter Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {appointmentsQuery.data?.total ?? appointmentsQuery.data?.data.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {ordersQuery.data?.total ?? ordersQuery.data?.data.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Pharmacy Orders</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {labBookingsQuery.data?.total ?? labBookingsQuery.data?.data.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Lab Tests</Text>
          </View>
        </View>

        {/* Medical & Personal Details */}
        <Card style={styles.card} mode="outlined">
          <Card.Title
            title="Clinical & Vitals Record"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                {...props}
                name="card-account-details-outline"
                size={22}
                color="#0f766e"
              />
            )}
            right={(props) => (
              <Button mode="text" compact onPress={openEditModal} textColor="#0f766e">
                Edit
              </Button>
            )}
          />
          <Divider />
          <Card.Content style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.fieldLabel}>Blood Group</Text>
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodText}>{profile?.bloodGroup || 'Not specified'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={styles.fieldValue}>{profile?.gender || 'Not specified'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.fieldLabel}>Delivery Address</Text>
              <Text style={[styles.fieldValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                {profile?.primaryAddress
                  ? `${profile.primaryAddress}${profile.city ? `, ${profile.city}` : ''}${profile.pincode ? ` - ${profile.pincode}` : ''}`
                  : 'No address recorded'}
              </Text>
            </View>

            {Boolean(profile?.latitude && profile?.longitude) && (
              <View style={styles.detailRow}>
                <Text style={styles.fieldLabel}>GPS Coordinates</Text>
                <View style={styles.gpsBadge}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#0f766e" />
                  <Text style={styles.gpsBadgeText}>
                    {profile?.latitude?.toFixed(5)}, {profile?.longitude?.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Emergency Contact */}
        <Card style={styles.card} mode="outlined">
          <Card.Title
            title="Emergency Contact"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons
                {...props}
                name="alert-decagram-outline"
                size={22}
                color="#dc2626"
              />
            )}
            right={(props) => (
              <Button mode="text" compact onPress={openEditModal} textColor="#dc2626">
                Edit
              </Button>
            )}
          />
          <Divider />
          <Card.Content style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.fieldLabel}>Contact Name</Text>
              <Text style={styles.fieldValue}>
                {profile?.emergencyContactName || 'Not recorded'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.fieldLabel}>Emergency Phone</Text>
              <Text
                style={[
                  styles.fieldValue,
                  profile?.emergencyContactPhone
                    ? { color: '#dc2626', fontWeight: '700' }
                    : { color: '#94a3b8' },
                ]}
              >
                {profile?.emergencyContactPhone || 'Not recorded'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <MaterialCommunityIcons name="lock-check-outline" size={18} color="#059669" />
          <Text style={styles.privacyText}>
            Your health records and consultation history are strictly confidential to you and your care team.
          </Text>
        </View>

        {/* Sign Out Button */}
        <Button
          mode="outlined"
          onPress={signOut}
          style={styles.signOutBtn}
          textColor="#dc2626"
          icon="logout"
        >
          Sign Out from PRANOVA
        </Button>
      </ScrollView>

      {/* Edit Profile Interactive Modal */}
      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons
                  name="account-edit"
                  size={26}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.modalTitle}>
                  Edit Customer Profile
                </Text>
              </View>
              <Text style={styles.modalSub}>
                Update your contact details and default delivery address for pharmacy orders and lab bookings.
              </Text>

              <Divider style={{ marginVertical: 12 }} />

              {/* Names */}
              <View style={styles.row}>
                <TextInput
                  label="First Name *"
                  value={firstName}
                  onChangeText={(v) => {
                    setFirstName(v);
                    if (saveError) setSaveError(null);
                  }}
                  mode="outlined"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
                <TextInput
                  label="Last Name *"
                  value={lastName}
                  onChangeText={(v) => {
                    setLastName(v);
                    if (saveError) setSaveError(null);
                  }}
                  mode="outlined"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
              </View>

              {/* Email */}
              <TextInput
                label="Email (Order receipts)"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (saveError) setSaveError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
                disabled={saveLoading}
              />

              {/* Gender */}
              <Text style={styles.fieldSectionLabel}>Gender</Text>
              <SegmentedButtons
                value={gender}
                onValueChange={setGender}
                buttons={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                style={{ marginBottom: 12 }}
              />

              {/* Blood Group */}
              <Text style={styles.fieldSectionLabel}>Blood Group</Text>
              <View style={styles.bloodChipsRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <Chip
                    key={bg}
                    selected={bloodGroup === bg}
                    onPress={() => setBloodGroup(bg)}
                    style={[
                      styles.bloodChip,
                      bloodGroup === bg && { backgroundColor: theme.colors.primary },
                    ]}
                    textStyle={[
                      styles.bloodChipText,
                      bloodGroup === bg && { color: onColor(theme.colors.primary) },
                    ]}
                  >
                    {bg}
                  </Chip>
                ))}
              </View>

              <Divider style={{ marginVertical: 12 }} />

              {/* Delivery Address */}
              <View style={styles.addressSectionHeader}>
                <Text style={styles.fieldSectionLabel}>Default Delivery Address</Text>
                <Button
                  mode="text"
                  compact
                  icon="crosshairs-gps"
                  loading={locDetecting}
                  disabled={locDetecting || saveLoading}
                  onPress={handleDetectLiveLocation}
                  textColor="#0f766e"
                  labelStyle={{ fontWeight: '700', fontSize: 13 }}
                >
                  {locDetecting ? 'Detecting...' : 'Use Current Location'}
                </Button>
              </View>

              {Boolean(latitude && longitude) && (
                <View style={styles.gpsDetectedPill}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#059669" />
                  <Text style={styles.gpsDetectedText}>
                    GPS Pin: {latitude?.toFixed(5)}, {longitude?.toFixed(5)} (will be saved)
                  </Text>
                </View>
              )}

              <TextInput
                label="Primary Address (Street / Flat)"
                value={primaryAddress}
                onChangeText={setPrimaryAddress}
                mode="outlined"
                placeholder="Flat / House No, Street, Landmark"
                left={<TextInput.Icon icon="map-marker-outline" />}
                style={styles.input}
                disabled={saveLoading}
              />

              <View style={styles.row}>
                <TextInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  mode="outlined"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
                <TextInput
                  label="Pincode"
                  value={pincode}
                  onChangeText={(v) => setPincode(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  mode="outlined"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
              </View>

              <Divider style={{ marginVertical: 12 }} />

              {/* Emergency Contact */}
              <Text style={styles.fieldSectionLabel}>Emergency Contact</Text>
              <View style={styles.row}>
                <TextInput
                  label="Contact Name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  mode="outlined"
                  placeholder="e.g. Spouse / Parent"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
                <TextInput
                  label="Contact Phone"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  keyboardType="phone-pad"
                  mode="outlined"
                  placeholder="+91 98765 43210"
                  style={[styles.input, styles.halfCol]}
                  disabled={saveLoading}
                />
              </View>

              {saveError && (
                <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
                  {saveError}
                </HelperText>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setEditVisible(false)}
                  disabled={saveLoading}
                  style={styles.actionBtn}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  loading={saveLoading}
                  disabled={saveLoading}
                  style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                  labelStyle={{ color: onColor(theme.colors.primary), fontWeight: '700' }}
                >
                  Save Profile
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </>
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
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  identityCardBody: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    backgroundColor: palette.info,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontWeight: '800',
    color: '#0f172a',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignSelf: 'flex-start',
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    color: '#64748b',
    fontSize: 12,
  },
  editBtn: {
    borderRadius: 10,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.info,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 15,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  bloodBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bloodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  privacyText: {
    fontSize: 11,
    color: '#0f766e',
    flex: 1,
    lineHeight: 16,
  },
  signOutBtn: {
    borderRadius: 10,
    borderColor: '#fecaca',
    backgroundColor: '#ffffff',
    marginTop: 4,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  halfCol: {
    flex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  bloodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  bloodChip: {
    backgroundColor: '#f1f5f9',
    height: 32,
  },
  bloodChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    borderRadius: 10,
    minWidth: 100,
  },
  addressSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gpsDetectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  gpsDetectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gpsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
  },
});
