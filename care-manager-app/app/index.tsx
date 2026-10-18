import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useAppConfig } from '../src/providers/AppConfigProvider';
import { BrandLogo } from '../src/components/BrandLogo';
import { releaseNativeSplash } from '../src/nativeSplash';
import { palette } from '../src/theme';

/**
 * Splash screen. Holds the administrator-configured logo while the session is
 * restored from secure storage and the branding call settles, then sends the
 * care manager to their cases (or to sign-in if there is no session).
 *
 * The native splash in `app.json` can only show a bundled image, so the
 * configured logo is shown here instead — this is the first screen that can
 * render it. Tapping skips the remaining wait once we know where to go.
 */
const MIN_VISIBLE_MS = 900;

export default function Index() {
  const theme = useTheme();
  const router = useRouter();
  const { config, isLoading: configLoading } = useAppConfig();

  const ready = useAuthStore((s) => s.ready);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [minElapsed, setMinElapsed] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [fade, rise]);

  // `ready` means the session has been read back from secure storage, so we
  // know which way to send them. Branding is allowed to still be in flight —
  // it falls back to defaults rather than holding the app up.
  const canLeave = ready && (minElapsed || !configLoading);

  const go = useCallback(() => {
    if (!ready) return;
    router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login');
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (canLeave) go();
  }, [canLeave, go]);

  // The native splash stays up until this screen has laid out, so there is no
  // blank frame between the launcher icon and the branded splash.
  const handOff = useCallback(() => {
    void releaseNativeSplash();
  }, []);

  return (
    <Pressable
      style={styles.root}
      onLayout={handOff}
      onPress={go}
      accessibilityRole="button"
      accessibilityLabel={`${config.appName}. Continue`}
    >
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <BrandLogo size={84} />

        <Text variant="headlineSmall" style={styles.name}>
          {config.appName}
        </Text>
        <Text style={styles.surface}>Care Manager · Field Operations</Text>
        {Boolean(config.tagline) && <Text style={styles.tagline}>{config.tagline}</Text>}
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    padding: 24,
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -0.4,
  },
  surface: {
    fontSize: 12.5,
    fontWeight: '700',
    color: palette.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  tagline: {
    fontSize: 13.5,
    color: palette.muted,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 56,
  },
});
