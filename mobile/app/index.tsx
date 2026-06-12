import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { syncManager } from '../services/sync';
import { SplashAnimation } from '../components/ui/SplashAnimation';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const [splashDone, setSplashDone] = useState(false);

  // Ensure hydration fires from the index route as well — _layout's effect
  // already kicks it off, but starting it here lets us gate the redirect on
  // isHydrated rather than on the fixed splash timer. This is what was
  // dropping authenticated users onto the onboarding screen when
  // loadFromStorage took longer than 2.2s.
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Trigger the offline sync only once the user is past the splash, so
  // returning authenticated users land on home immediately.
  useEffect(() => {
    if (isHydrated) {
      syncManager.syncOfflineData().catch((e) => {
        console.warn('[Index] Offline sync failed:', e);
      });
    }
  }, [isHydrated]);

  if (!isHydrated || !splashDone) {
    return <SplashAnimation onFinish={() => setSplashDone(true)} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/onboarding" />;
}

