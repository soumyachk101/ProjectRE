import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/auth';
import { colors } from '../constants/theme';
import { AlertOverlay } from '../components/alert/AlertOverlay';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { syncManager } from '../services/sync';

const queryClient = new QueryClient();

export default function RootLayout() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      syncManager.syncOfflineData().catch((e) => {
        console.warn('[RootLayout] Offline sync failed:', e);
      });
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            />
            <AlertOverlay />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

