import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getVideoToken, getAppointment } from '../../src/api/appointments';
import { palette } from '../../src/theme';

export default function VideoConsultationRoom() {
  const theme = useTheme();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [confirmExitVisible, setConfirmExitVisible] = useState(false);

  // Queries
  const appointmentQuery = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => getAppointment(appointmentId!),
    enabled: !!appointmentId,
  });

  const tokenQuery = useQuery({
    queryKey: ['video-token', appointmentId],
    queryFn: () => getVideoToken(appointmentId!),
    enabled: !!appointmentId,
  });

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const doctor = appointmentQuery.data?.doctor;
  const doctorName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Specialist';
  const doctorSpecialty = doctor?.specialty?.name || 'Consultant Physician';

  const handleEndCall = () => {
    router.replace('/(tabs)/consult');
  };

  if (tokenQuery.isLoading || appointmentQuery.isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Opening your consultation room…</Text>
      </SafeAreaView>
    );
  }

  if (tokenQuery.isError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not enter consultation room
        </Text>
        <Text style={styles.errorSub}>
          {tokenQuery.error?.message || 'The appointment might be cancelled or invalid.'}
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backBtn}>
          Back to Appointments
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Top Telehealth Header */}
      <View style={styles.topBar}>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorTitle}>{doctorName}</Text>
          <Text style={styles.doctorSubtitle}>{doctorSpecialty}</Text>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.liveDot} />
          <Text style={styles.timerText}>{formatTimer(callDuration)}</Text>
        </View>
      </View>

      {/* Main Remote Video Canvas (Doctor View) */}
      <View style={styles.mainCanvas}>
        <View style={styles.doctorAvatarBox}>
          <Avatar.Text
            label={doctorName[4]?.toUpperCase() || 'D'}
            size={96}
            style={styles.doctorAvatar}
            color="#ffffff"
          />
          <Text style={styles.doctorInCallName}>{doctorName}</Text>
          <View style={styles.speakingIndicator}>
            <MaterialCommunityIcons name="waveform" size={20} color="#38bdf8" />
            <Text style={styles.speakingText}>Live Audio Connected</Text>
          </View>
        </View>

        {/* Self View (Picture-in-Picture) */}
        <View style={styles.pipContainer}>
          {videoOff ? (
            <View style={styles.pipMuted}>
              <MaterialCommunityIcons name="camera-off" size={20} color="#94a3b8" />
              <Text style={styles.pipText}>Camera Off</Text>
            </View>
          ) : (
            <View style={styles.pipActive}>
              <MaterialCommunityIcons name="account" size={32} color={theme.colors.primary} />
              <Text style={styles.pipActiveText}>You</Text>
            </View>
          )}
        </View>

        {/* Session state. No compliance claim is made here: the video
            provider is not connected yet, so this room is a placeholder. */}
        <View style={styles.securityBadge}>
          <MaterialCommunityIcons name="video-outline" size={13} color="#facc15" />
          <Text style={styles.securityText}>
            Preview room — live video is not connected yet
          </Text>
        </View>
      </View>

      {/* In-Call Controls Bottom Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.controlBtn, micMuted && styles.controlBtnActive]}
          onPress={() => setMicMuted((prev) => !prev)}
        >
          <MaterialCommunityIcons
            name={micMuted ? 'microphone-off' : 'microphone'}
            size={24}
            color={micMuted ? '#ffffff' : '#334155'}
          />
          <Text style={[styles.controlLabel, micMuted && styles.controlLabelActive]}>
            {micMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, videoOff && styles.controlBtnActive]}
          onPress={() => setVideoOff((prev) => !prev)}
        >
          <MaterialCommunityIcons
            name={videoOff ? 'camera-off' : 'camera'}
            size={24}
            color={videoOff ? '#ffffff' : '#334155'}
          />
          <Text style={[styles.controlLabel, videoOff && styles.controlLabelActive]}>
            {videoOff ? 'Start Video' : 'Stop Video'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.endCallBtn]}
          onPress={() => setConfirmExitVisible(true)}
        >
          <MaterialCommunityIcons name="phone-hangup" size={26} color="#ffffff" />
          <Text style={[styles.controlLabel, { color: '#ffffff', fontWeight: '700' }]}>
            End Call
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={confirmExitVisible}
          onDismiss={() => setConfirmExitVisible(false)}
          style={{ backgroundColor: '#ffffff', borderRadius: 16 }}
        >
          <Dialog.Title style={{ fontWeight: '700', color: '#0f172a' }}>
            Leave Consultation?
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#475569' }}>
              Are you sure you want to end your consultation with {doctorName}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmExitVisible(false)}>Stay</Button>
            <Button textColor="#dc2626" onPress={handleEndCall}>
              End Call
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  loadingText: {
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  errorSub: {
    color: '#64748b',
    textAlign: 'center',
  },
  backBtn: {
    borderRadius: 8,
    marginTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
  },
  doctorInfo: {
    gap: 2,
  },
  doctorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  doctorSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  mainCanvas: {
    flex: 1,
    backgroundColor: '#0b1120',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  doctorAvatarBox: {
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatar: {
    backgroundColor: palette.info,
  },
  doctorInCallName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  speakingText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  pipContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
  },
  pipMuted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#334155',
  },
  pipText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pipActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    gap: 2,
  },
  pipActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.info,
  },
  securityBadge: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  securityText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 4,
    minWidth: 80,
  },
  controlBtnActive: {
    backgroundColor: '#475569',
  },
  controlLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  controlLabelActive: {
    color: '#ffffff',
  },
  endCallBtn: {
    backgroundColor: '#dc2626',
  },
});
