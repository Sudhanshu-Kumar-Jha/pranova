import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { palette } from '../theme';

interface LoadingSkeletonProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

/** A pulsing placeholder block, used while a screen waits for the API. */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 20,
  width = '100%',
  borderRadius = 8,
  style,
}) => {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.block,
        { height, width: width as ViewStyle['width'], borderRadius, opacity: pulse },
        style,
      ]}
    />
  );
};

/** Mirrors the shape of `CaseCard` so the list does not jump when data lands. */
export const CaseCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.row}>
      <LoadingSkeleton height={11} width="30%" />
      <LoadingSkeleton height={11} width={54} />
    </View>
    <LoadingSkeleton height={17} width="80%" style={{ marginTop: 10 }} />
    <View style={[styles.row, { marginTop: 12, justifyContent: 'flex-start', gap: 8 }]}>
      <LoadingSkeleton height={22} width={52} borderRadius={11} />
      <LoadingSkeleton height={22} width={92} borderRadius={11} />
    </View>
    <LoadingSkeleton height={12} width="65%" style={{ marginTop: 12 }} />
    <LoadingSkeleton height={12} width="45%" style={{ marginTop: 6 }} />
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#cbd5e1',
  },
  card: {
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
