import { useEffect, useMemo } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { holdNativeSplash, releaseNativeSplash } from '../src/nativeSplash';
import { buildTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { AppConfigProvider, useBrand } from '../src/providers/AppConfigProvider';
import { EmergencyProvider } from '../src/socket/EmergencyProvider';
import { EmergencyAlertModal } from '../src/components/EmergencyAlertModal';
import { configureNotifications } from '../src/notifications';
import { queryClient } from '../src/queryClient';

// Held before the first render so the launcher hands straight over to the
// branded splash instead of flashing a blank screen.
holdNativeSplash();

function AuthGate() {
  const ready = useAuthStore((s) => s.ready);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restore = useAuthStore((s) => s.restore);
  const segments = useSegments();
  const router = useRouter();

  // Safety net: the branded splash releases the native one as soon as it
  // paints, but a deep link can bypass that route entirely.
  useEffect(() => {
    const failsafe = setTimeout(() => void releaseNativeSplash(), 3000);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    restore();
    configureNotifications();
  }, [restore]);

  useEffect(() => {
    if (!ready) return;
    // The splash screen at `/` decides where the first navigation goes, so the
    // gate stays out of its way; it only guards the groups from here on.
    const onSplash = (segments as readonly string[]).length === 0;
    if (onSplash) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) router.replace('/(auth)/login');
    else if (isAuthenticated && inAuthGroup) router.replace('/(tabs)');
  }, [ready, isAuthenticated, segments, router]);

  return <Slot />;
}

/**
 * Paper's theme is rebuilt whenever the administrator's primary colour
 * changes, so the whole app re-skins without a new build.
 */
import { OfflineBanner } from '../src/components/OfflineBanner';

function ThemedApp() {
  const brand = useBrand();
  const theme = useMemo(() => buildTheme(brand.primaryColor), [brand.primaryColor]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      <OfflineBanner />
      {/* The socket lives inside the signed-in session only; the provider
          connects when a token exists and tears down on sign-out. */}
      <EmergencyProvider>
        <AuthGate />
        <EmergencyAlertModal />
      </EmergencyProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppConfigProvider>
          <ThemedApp />
        </AppConfigProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
