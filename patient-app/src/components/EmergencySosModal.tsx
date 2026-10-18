import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Linking,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import {
  Modal,
  Portal,
  Text,
  Button,
  Divider,
  HelperText,
  Surface,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentLocationDetails, ResolvedLocation } from '../utils/location';
import { triggerEmergencySos, EmergencySosResult } from '../api/emergency';
import { useBrand } from '../providers/AppConfigProvider';
import { palette, onColor } from '../theme';

interface EmergencySosModalProps {
  visible: boolean;
  onDismiss: () => void;
  patientProfile?: {
    primaryAddress?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  } | null;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  visible,
  onDismiss,
  patientProfile,
}) => {
  const theme = useTheme();
  const brand = useBrand();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosResult, setSosResult] = useState<EmergencySosResult | null>(null);
  const [liveLocation, setLiveLocation] = useState<ResolvedLocation | null>(null);
  const [detectingLoc, setDetectingLoc] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setDetectingLoc(true);
      getCurrentLocationDetails()
        .then((res) => {
          if (res.success && res.data) {
            setLiveLocation(res.data);
          }
        })
        .finally(() => {
          setDetectingLoc(false);
        });
    } else {
      setLiveLocation(null);
      setError(null);
    }
  }, [visible]);

  const emergencyNumber = brand.emergencyNumber || '108';

  const handleCallAmbulance = () => {
    Linking.openURL(`tel:${emergencyNumber}`);
  };

  const handleCallEmergencyContact = () => {
    if (patientProfile?.emergencyContactPhone) {
      Linking.openURL(`tel:${patientProfile.emergencyContactPhone}`);
    }
  };

  const handleTriggerSos = async () => {
    setLoading(true);
    setError(null);
    try {
      let locData = liveLocation;
      if (!locData) {
        const fresh = await getCurrentLocationDetails();
        if (fresh.success && fresh.data) {
          locData = fresh.data;
          setLiveLocation(fresh.data);
        }
      }

      const coords = locData?.coords;

      // Only an address resolved from THIS device's position may describe the
      // incident. The registered address is deliberately not used: responders
      // were being sent to the city the patient signed up in. The server drops
      // an address that does not come with a live fix, so sending one here
      // would only disagree with what the case actually records.
      const incidentAddress = coords
        ? locData?.formattedAddress || locData?.primaryAddress || undefined
        : undefined;

      const res = await triggerEmergencySos({
        incidentLatitude: coords?.latitude,
        incidentLongitude: coords?.longitude,
        incidentAddress,
        description: 'Patient activated emergency SOS distress signal from mobile application.',
      });
      setSosResult(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Could not broadcast SOS signal. Please call 108 directly.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSosResult(null);
    setError(null);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.shieldIconBox}>
              <MaterialCommunityIcons name="shield-alert" size={32} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.title}>
                Emergency Response (P1)
              </Text>
              <Text style={styles.subtitle}>
                Immediate medical distress assistance & ambulance triage
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 14 }} />

          {/* Active SOS Confirmed Banner */}
          {sosResult ? (
            <Surface style={styles.sosActiveCard} elevation={2}>
              <MaterialCommunityIcons name="broadcast" size={28} color="#dc2626" />
              <Text style={styles.sosActiveTitle}>
                🚨 Emergency SOS Signal Active!
              </Text>
              <Text style={styles.sosActiveText}>
                Case Reference: <Text style={{ fontWeight: '800' }}>{sosResult.caseNumber}</Text>
              </Text>
              <Text style={styles.sosActiveDesc}>
                Alert broadcasted to PRANOVA Medical Command Center. Priority P1 triage dispatch initiated.
              </Text>

              {/* Whatever the case actually recorded, straight from the
                  server — so the patient is never told help is going somewhere
                  the case does not say. */}
              <View style={styles.incidentAddressBox}>
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#dc2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentAddressLabel}>Dispatched Location:</Text>
                  <Text style={styles.incidentAddressText}>
                    {sosResult.incidentAddress ||
                      'Your live location was shared with the response team.'}
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={handleCallAmbulance}
                style={styles.call108Btn}
                icon="phone"
                labelStyle={{ fontWeight: '800' }}
              >
                Call {emergencyNumber} Ambulance Now
              </Button>
            </Surface>
          ) : (
            <View style={styles.optionsContainer}>
              {/* Real-time GPS Detection status banner */}
              <View style={[styles.liveGpsBadge, liveLocation && styles.liveGpsBadgeActive]}>
                <MaterialCommunityIcons
                  name={liveLocation ? 'map-marker-check' : detectingLoc ? 'crosshairs-gps' : 'map-marker-outline'}
                  size={16}
                  color={liveLocation ? '#0f766e' : '#b45309'}
                />
                <Text style={[styles.liveGpsText, { color: liveLocation ? '#0f766e' : '#b45309' }]} numberOfLines={2}>
                  {detectingLoc
                    ? 'Acquiring real-time GPS location...'
                    : liveLocation
                    ? `Live GPS: ${liveLocation.formattedAddress}`
                    : patientProfile?.primaryAddress
                    ? `Profile Address: ${patientProfile.primaryAddress}`
                    : 'Real-time GPS will be acquired on SOS'}
                </Text>
              </View>

              {/* Option 1: Call 108 Ambulance Hotline */}
              <TouchableOpacity
                style={styles.ambulanceCard}
                onPress={handleCallAmbulance}
                activeOpacity={0.85}
              >
                <View style={styles.ambulanceIconBox}>
                  <MaterialCommunityIcons name="ambulance" size={28} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ambulanceTitle}>Call {emergencyNumber} Ambulance</Text>
                  <Text style={styles.ambulanceSubtitle}>
                    National Emergency Medical Helpline (Toll-Free)
                  </Text>
                </View>
                <MaterialCommunityIcons name="phone-outgoing" size={22} color="#dc2626" />
              </TouchableOpacity>

              {/* Option 2: Trigger P1 SOS Alert to Command Center */}
              <TouchableOpacity
                style={styles.sosCard}
                onPress={handleTriggerSos}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.sosIconBox}>
                  <MaterialCommunityIcons name="alert-decagram" size={28} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosTitle}>Broadcast SOS to Care Team</Text>
                  <Text style={styles.sosSubtitle}>
                    Send real-time GPS & medical distress alert to hospital command desk
                  </Text>
                </View>
                {loading ? (
                  <Button loading disabled mode="text">
                    {''}
                  </Button>
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#0f766e" />
                )}
              </TouchableOpacity>

              {/* Option 3: Call Saved Emergency Contact */}
              {Boolean(patientProfile?.emergencyContactPhone) && (
                <TouchableOpacity
                  style={styles.contactCard}
                  onPress={handleCallEmergencyContact}
                  activeOpacity={0.85}
                >
                  <View style={styles.contactIconBox}>
                    <MaterialCommunityIcons name="account-alert" size={24} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactTitle}>
                      Call {patientProfile?.emergencyContactName || 'Emergency Contact'}
                    </Text>
                    <Text style={styles.contactSubtitle}>
                      {patientProfile?.emergencyContactPhone}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="phone" size={20} color="#0284c7" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {error && (
            <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
              {error}
            </HelperText>
          )}

          <Divider style={{ marginVertical: 14 }} />

          <Button mode="text" onPress={handleClose} textColor={palette.muted}>
            Dismiss
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  optionsContainer: {
    gap: 12,
  },
  ambulanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  ambulanceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambulanceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  ambulanceSubtitle: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 1,
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f0fdfa',
    borderWidth: 1.5,
    borderColor: '#99f6e4',
  },
  sosIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#115e59',
  },
  sosSubtitle: {
    fontSize: 11,
    color: '#0f766e',
    marginTop: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 1,
  },
  sosActiveCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  sosActiveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    textAlign: 'center',
  },
  sosActiveText: {
    fontSize: 14,
    color: '#991b1b',
  },
  sosActiveDesc: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
    lineHeight: 18,
  },
  call108Btn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    marginTop: 8,
    width: '100%',
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  liveGpsBadgeActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  liveGpsText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  incidentAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 10,
    width: '100%',
    marginVertical: 4,
  },
  incidentAddressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
  },
  incidentAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
  },
});
