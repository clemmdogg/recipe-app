import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { SplashScreenController } from '@/components/splash-screen-controller';
import { NavigationThemes } from '@/constants/theme';
import { DatabaseName, initializeDatabase } from '@/db/initialize';
import { SessionProvider, useSession } from '@/view-models/session';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={NavigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
      {/* Runs migrations before rendering; view models get the database via useDatabase(). */}
      <SQLiteProvider databaseName={DatabaseName} onInit={initializeDatabase}>
        <SessionProvider>
          <SplashScreenController />
          <RootNavigator />
        </SessionProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
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
