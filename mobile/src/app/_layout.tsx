import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import type { ReactNode } from 'react';

import { SplashScreenController } from '@/components/splash-screen-controller';
import { NavigationThemes } from '@/constants/theme';
import { DatabaseName, initializeDatabase } from '@/db/initialize';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/view-models/session';
import { SettingsProvider } from '@/view-models/settings';

export default function RootLayout() {
  return (
    // Runs migrations before rendering; view models get the database via useDatabase().
    <SQLiteProvider databaseName={DatabaseName} onInit={initializeDatabase}>
      {/* The theme setting is stored in the database, so settings load before the theme is chosen. */}
      <SettingsProvider>
        <NavigationTheme>
          <SessionProvider>
            <SplashScreenController />
            <RootNavigator />
          </SessionProvider>
        </NavigationTheme>
      </SettingsProvider>
    </SQLiteProvider>
  );
}

/** Headers and screen backgrounds in the chosen light or dark theme. */
function NavigationTheme({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  return <ThemeProvider value={NavigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>{children}</ThemeProvider>;
}

/** Login is required: the tabs only exist while signed in, the sign-in screens only while not. */
function RootNavigator() {
  const { session, isLoading } = useSession();
  if (isLoading) {
    return null;
  }
  const isSignedIn = session !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: '', headerTransparent: true }} />
      </Stack.Protected>
      {/* Invite links open this whether or not someone is signed in. */}
      <Stack.Screen name="join/[code]" options={{ headerShown: true, title: 'Invite' }} />
    </Stack>
  );
}
