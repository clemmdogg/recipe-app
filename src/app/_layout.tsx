import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { DatabaseName, initializeDatabase } from '@/db/initialize';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Runs migrations before rendering; screens get the database via useSQLiteContext(). */}
      <SQLiteProvider databaseName={DatabaseName} onInit={initializeDatabase}>
        <AppTabs />
      </SQLiteProvider>
    </ThemeProvider>
  );
}
