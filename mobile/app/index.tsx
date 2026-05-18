import { useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { SplashAnimation } from '../components/ui/SplashAnimation';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashAnimation onFinish={() => setSplashDone(true)} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/onboarding" />;
}
