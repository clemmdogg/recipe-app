import * as SplashScreen from 'expo-splash-screen';

import { useSession } from '@/view-models/session';

// Keep the splash screen up until we know whether to show sign-in or the tabs, so neither flashes.
SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) {
    SplashScreen.hide();
  }
  return null;
}
