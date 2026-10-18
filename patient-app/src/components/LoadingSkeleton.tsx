import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, ViewStyle } from 'react-native';

interface LoadingSkeletonProps {
  height?: number;
  width?: string | number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Animated Shimmer Base Component
 * Uses a smooth looped opacity pulse to give a native shimmering loading experience.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 20,
  width = '100%',
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.95,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { height, width: width as any, borderRadius, opacity: shimmerAnim },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.row}>
        <LoadingSkeleton height={50} width={50} borderRadius={25} />
        <View style={{ flex: 1, gap: 8 }}>
          <LoadingSkeleton height={16} width="65%" />
          <LoadingSkeleton height={12} width="40%" />
        </View>
      </View>
      <LoadingSkeleton height={12} width="90%" style={{ marginTop: 12 }} />
      <LoadingSkeleton height={12} width="75%" style={{ marginTop: 6 }} />
    </View>
  );
};

export const DoctorCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.row}>
        <LoadingSkeleton height={56} width={56} borderRadius={28} />
        <View style={{ flex: 1, gap: 6 }}>
          <LoadingSkeleton height={16} width="70%" />
          <LoadingSkeleton height={13} width="45%" borderRadius={6} />
          <LoadingSkeleton height={11} width="35%" />
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14 }]}>
        <LoadingSkeleton height={16} width="30%" />
        <LoadingSkeleton height={36} width={110} borderRadius={18} />
      </View>
    </View>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.row}>
        <LoadingSkeleton height={60} width={60} borderRadius={10} />
        <View style={{ flex: 1, gap: 6 }}>
          <LoadingSkeleton height={12} width="35%" borderRadius={4} />
          <LoadingSkeleton height={16} width="75%" />
          <LoadingSkeleton height={12} width="50%" />
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
        <LoadingSkeleton height={18} width="25%" />
        <LoadingSkeleton height={34} width={100} borderRadius={8} />
      </View>
    </View>
  );
};

export const LabTestCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={{ gap: 6 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <LoadingSkeleton height={16} width="60%" />
          <LoadingSkeleton height={18} width={70} borderRadius={10} />
        </View>
        <LoadingSkeleton height={12} width="85%" />
        <LoadingSkeleton height={12} width="40%" />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
        <LoadingSkeleton height={18} width="30%" />
        <LoadingSkeleton height={34} width={95} borderRadius={8} />
      </View>
    </View>
  );
};

export const AppointmentCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <LoadingSkeleton height={14} width="45%" />
        <LoadingSkeleton height={20} width={80} borderRadius={10} />
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <LoadingSkeleton height={44} width={44} borderRadius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <LoadingSkeleton height={15} width="65%" />
          <LoadingSkeleton height={12} width="40%" />
        </View>
      </View>
      <LoadingSkeleton height={32} width="100%" borderRadius={8} style={{ marginTop: 12 }} />
    </View>
  );
};

export const SpecialtyChipsSkeleton: React.FC = () => {
  return (
    <View style={styles.chipsRow}>
      <LoadingSkeleton height={32} width={100} borderRadius={16} />
      <LoadingSkeleton height={32} width={110} borderRadius={16} />
      <LoadingSkeleton height={32} width={90} borderRadius={16} />
      <LoadingSkeleton height={32} width={120} borderRadius={16} />
    </View>
  );
};

export const ProfileCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.row}>
        <LoadingSkeleton height={68} width={68} borderRadius={34} />
        <View style={{ flex: 1, gap: 8 }}>
          <LoadingSkeleton height={18} width="65%" />
          <LoadingSkeleton height={14} width="45%" />
          <LoadingSkeleton height={12} width="70%" />
        </View>
      </View>
      <LoadingSkeleton height={40} width="100%" borderRadius={10} style={{ marginTop: 14 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#cbd5e1',
  },
  cardContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
});
