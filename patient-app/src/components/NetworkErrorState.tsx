import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '../theme';

interface NetworkErrorStateProps {
  title?: string;
  description?: string;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  title = 'Cannot Reach Healthcare Server',
  description,
  message,
  actionLabel = 'Retry Connection',
  onRetry,
  compact = false,
  style,
}) => {
  const resolvedDesc =
    message ||
    description ||
    'Unable to establish a connection with PRANOVA services. Please check your internet connection and tap retry.';
  const theme = useTheme();

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactIconBox}>
          <MaterialCommunityIcons name="wifi-off" size={20} color="#dc2626" />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text variant="titleSmall" style={styles.compactTitle}>
            {title}
          </Text>
          <Text variant="bodySmall" style={styles.compactDesc} numberOfLines={2}>
            {resolvedDesc}
          </Text>
        </View>
        {onRetry && (
          <Button
            mode="contained-tonal"
            compact
            onPress={onRetry}
            icon="reload"
            textColor={theme.colors.primary}
            style={styles.compactBtn}
          >
            Retry
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="wifi-off" size={38} color="#dc2626" />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        {resolvedDesc}
      </Text>
      {onRetry && (
        <Button
          mode="contained"
          icon="reload"
          onPress={onRetry}
          style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          textColor="#ffffff"
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fffaf0',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  description: {
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontSize: 13,
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 8,
  },
  compactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    fontWeight: '700',
    color: '#991b1b',
    fontSize: 13,
  },
  compactDesc: {
    color: '#b91c1c',
    fontSize: 11,
    marginTop: 2,
  },
  compactBtn: {
    borderRadius: 8,
  },
});
