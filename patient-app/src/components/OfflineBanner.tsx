import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '../store/networkStore';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isOffline, errorMessage, clearOffline } = useNetworkStore();

  if (!isOffline) return null;

  const handleRetry = () => {
    clearOffline();
    void queryClient.invalidateQueries();
  };

  return (
    <View style={[styles.banner, { paddingTop: insets.top > 0 ? insets.top + 6 : 10 }]}>
      <MaterialCommunityIcons name="wifi-off" size={18} color="#ffffff" />
      <Text style={styles.text} numberOfLines={1}>
        {errorMessage || 'Server Unreachable · Check connection'}
      </Text>
      <TouchableOpacity onPress={handleRetry} style={styles.retryPill} activeOpacity={0.8}>
        <MaterialCommunityIcons name="reload" size={14} color="#dc2626" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 8,
  },
  retryPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
  },
});
