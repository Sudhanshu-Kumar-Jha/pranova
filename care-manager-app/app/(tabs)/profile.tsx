import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile } from '../../src/api/cases';
import { useAuthStore } from '../../src/store/authStore';
import { useBrand } from '../../src/providers/AppConfigProvider';
import { DutyToggle } from '../../src/components/DutyToggle';
import { EmptyState } from '../../src/components/EmptyState';
import { NetworkErrorState } from '../../src/components/NetworkErrorState';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { formatCoords } from '../../src/location';
import { onColor, palette, timeAgo } from '../../src/theme';

export default function Profile() {
  const theme = useTheme();
  const brand = useBrand();
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);

  const profileQuery = useQuery({ queryKey: ['cm-me'], queryFn: getProfile });
  const profile = profileQuery.data;

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  if (profileQuery.isLoading) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.identityRow}>
            <LoadingSkeleton height={66} width={66} borderRadius={33} />
            <View style={{ flex: 1, gap: 8 }}>
              <LoadingSkeleton height={18} width="65%" />
              <LoadingSkeleton height={13} width="45%" />
              <LoadingSkeleton height={13} width="55%" />
            </View>
          </View>
        </Surface>
        <LoadingSkeleton height={96} borderRadius={14} />
      </ScrollView>
    );
  }

  if (profileQuery.isError) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <NetworkErrorState
          title="Profile unavailable"
          message="Your field profile could not be loaded. Check your connection, then try again."
          onRetry={() => void profileQuery.refetch()}
        />
        <Button mode="contained-tonal" onPress={handleSignOut} icon="logout" style={styles.signOut}>
          Sign out
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.identityRow}>
          <Avatar.Text
            label={initials || '—'}
            size={66}
            style={{ backgroundColor: theme.colors.primary }}
            labelStyle={{ color: onColor(theme.colors.primary), fontWeight: '800' }}
          />
          <View style={styles.identityCopy}>
            {fullName ? (
              <Text variant="titleLarge" style={styles.name}>
                {fullName}
              </Text>
            ) : null}
            {profile?.employeeCode ? (
              <Text style={styles.code}>{profile.employeeCode}</Text>
            ) : null}
            {profile?.specialization ? (
              <Text style={styles.spec}>{profile.specialization}</Text>
            ) : null}
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.facts}>
          <Fact
            icon="map-marker-radius-outline"
            label="Assigned zone"
            value={profile?.assignedZone ?? null}
          />
          <Fact
            icon="phone-outline"
            label="Mobile"
            value={user?.phone ?? null}
          />
          <Fact
            icon="briefcase-clock-outline"
            label="Active cases"
            value={profile ? String(profile.activeCases) : null}
          />
          <Fact
            icon="card-account-details-outline"
            label="Licence"
            value={profile?.licenseNumber ?? null}
          />
          {formatCoords(profile?.currentLatitude, profile?.currentLongitude) ? (
            <ContactRow
              icon="map-marker-radius-outline"
              label="Last shared position"
              value={
                profile?.lastLocationUpdate
                  ? `Shared ${timeAgo(profile.lastLocationUpdate)} · View on map`
                  : 'View on map'
              }
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${profile?.currentLatitude},${profile?.currentLongitude}`
                )
              }
            />
          ) : null}
        </View>
      </Surface>

      <DutyToggle profile={profile} variant="row" />


      {brand.supportPhone || brand.supportEmail || brand.emergencyNumber ? (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Support
          </Text>
          {brand.supportPhone ? (
            <ContactRow
              icon="headset"
              label="Operations desk"
              value={brand.supportPhone}
              onPress={() => void Linking.openURL(`tel:${brand.supportPhone}`)}
            />
          ) : null}
          {brand.emergencyNumber ? (
            <ContactRow
              icon="ambulance"
              label="Emergency services"
              value={brand.emergencyNumber}
              onPress={() => void Linking.openURL(`tel:${brand.emergencyNumber}`)}
            />
          ) : null}
          {brand.supportEmail ? (
            <ContactRow
              icon="email-outline"
              label="Email support"
              value={brand.supportEmail}
              onPress={() => void Linking.openURL(`mailto:${brand.supportEmail}`)}
            />
          ) : null}
        </Surface>
      ) : null}

      <Button mode="contained-tonal" onPress={handleSignOut} icon="logout" style={styles.signOut}>
        Sign out
      </Button>
    </ScrollView>
  );
}

/** A labelled value. Renders nothing when the backend has no value for it. */
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

const ContactRow: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}> = ({ icon, label, value, onPress }) => {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={onPress} style={styles.contactRow} borderless>
      <View style={styles.contactInner}>
        <MaterialCommunityIcons name={icon} size={19} color={theme.colors.primary} />
        <View style={styles.factCopy}>
          <Text style={styles.factLabel}>{label}</Text>
          <Text style={[styles.factValue, { color: theme.colors.primary, fontWeight: '700' }]}>
            {value}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={palette.subtle} />
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityCopy: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -0.3,
  },
  code: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.subtle,
    letterSpacing: 0.5,
  },
  spec: {
    fontSize: 13,
    color: palette.body,
    lineHeight: 18,
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
  },
  contactRow: {
    borderRadius: 10,
  },
  contactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  signOut: {
    borderRadius: 12,
    marginTop: 4,
  },
});
