import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Avatar, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Doctor } from '../api/doctors';
import { palette } from '../theme';

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
  onPressDetails?: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onBook,
  onPressDetails,
}) => {
  const theme = useTheme();
  const initials = `${doctor.firstName?.[0] || 'D'}${doctor.lastName?.[0] || ''}`.toUpperCase();

  return (
    <Card style={styles.card} mode="outlined" onPress={() => onPressDetails?.(doctor)}>
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          <Avatar.Text
            label={initials}
            size={52}
            style={{ backgroundColor: theme.colors.primary }}
            color="#ffffff"
          />
          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" style={styles.doctorName}>
                Dr. {doctor.firstName} {doctor.lastName}
              </Text>
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={14} color="#eab308" />
                <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
              </View>
            </View>

            <Text variant="bodySmall" style={styles.specialtyText}>
              {doctor.specialty?.name || 'General Specialist'} · {doctor.experienceYears} yrs exp
            </Text>

            {doctor.qualifications && (
              <Text variant="bodySmall" style={styles.qualifications} numberOfLines={1}>
                {doctor.qualifications}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.tagsRow}>
          {doctor.isVideoEnabled && (
            <Chip compact icon="video-outline" style={styles.chip}>
              Video ₹{doctor.consultationFeeVideo}
            </Chip>
          )}
          {doctor.isAudioEnabled !== false && (
            <Chip compact icon="phone-outline" style={styles.chip}>
              Audio ₹{doctor.consultationFeeAudio || doctor.consultationFeeVideo}
            </Chip>
          )}
          <Chip compact icon="hospital-building" style={styles.chip}>
            Clinic ₹{doctor.consultationFeeClinic}
          </Chip>
          {doctor.city && (
            <Chip compact icon="map-marker-outline" style={styles.chipMuted}>
              {doctor.city}
            </Chip>
          )}
        </View>

        <View style={styles.actionRow}>
          <Button
            mode="contained"
            onPress={() => onBook(doctor)}
            style={[styles.bookBtn, { backgroundColor: theme.colors.primary }]}
            contentStyle={{ height: 40 }}
            icon="calendar-check-outline"
          >
            Book Consult
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doctorName: {
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
  },
  specialtyText: {
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 2,
  },
  qualifications: {
    color: '#64748b',
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#f0fdfa',
  },
  chipMuted: {
    backgroundColor: '#f8fafc',
  },
  actionRow: {
    marginTop: 2,
  },
  bookBtn: {
    borderRadius: 10,
    backgroundColor: palette.info,
  },
});
