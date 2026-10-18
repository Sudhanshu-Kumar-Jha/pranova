import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PRIORITY_COLORS, palette } from '../theme';

interface PriorityBadgeProps {
  priority: string;
  /** P1 pulses to carry urgency; set false in dense lists if it distracts. */
  pulse?: boolean;
}

/**
 * Priority marker. P1 is the emergency red and keeps a slow pulse so an
 * emergency dispatch is impossible to scroll past.
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, pulse = true }) => {
  const color = PRIORITY_COLORS[priority] || palette.muted;
  const isP1 = priority === 'P1';
  const beat = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isP1 || !pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [beat, isP1, pulse]);

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {isP1 && pulse ? (
        <Animated.View style={[styles.dot, { opacity: beat }]} />
      ) : (
        <View style={styles.dot} />
      )}
      <Text style={styles.text}>{priority}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
