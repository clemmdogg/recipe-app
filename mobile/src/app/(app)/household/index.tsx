import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/view-models/session';
import { useSync, type SyncStatus } from '@/view-models/sync';

// Placeholder until step 4 of connecting the app builds the real Household tab
// (see "Decided: connecting the app" in mobile/CLAUDE.md). For now it shows the sync status,
// can sync on demand and can sign out.
export default function HouseholdScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();
  const { status, lastSyncedAt, sync } = useSync();

  const onSignOut = () => {
    signOut().catch(() => Alert.alert('Could not sign out', 'Please try again.'));
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <EmptyState
        icon={{ sf: 'person.3', md: 'group' }}
        title={session?.household.name ?? 'Your household'}
        message="Coming soon: invite your family so everyone shares recipes, the meal plan, the shopping list and the pantry."
      />
      <View style={styles.section}>
        <ThemedText themeColor={status.state === 'error' ? 'error' : 'textSecondary'}>
          {describeSyncStatus(status, lastSyncedAt)}
        </ThemedText>
        <PrimaryButton label="Sync now" onPress={sync} isBusy={status.state === 'syncing'} />
      </View>
      <View style={styles.section}>
        <ThemedText themeColor="textSecondary">
          Signed in as {session?.user.name} ({session?.user.email})
        </ThemedText>
        <PrimaryButton label="Sign out" onPress={onSignOut} />
      </View>
    </ScrollView>
  );
}

function describeSyncStatus(status: SyncStatus, lastSyncedAt: Date | null): string {
  switch (status.state) {
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return 'Offline. Your changes are saved and will sync when you are back online.';
    case 'error':
      return `Sync failed: ${status.message}`;
    case 'idle':
      return lastSyncedAt
        ? `Synced at ${lastSyncedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        : 'Not synced yet';
  }
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
    alignItems: 'center',
  },
});
