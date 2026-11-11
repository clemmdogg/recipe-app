import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { SyncStatus as Status } from '@/view-models/sync';

type SyncStatusProps = {
  status: Status;
  lastSyncedAt: Date | null;
  onSync: () => void;
};

/** One line about syncing, e.g. "Synced at 14:32", with a "Sync now" link. */
export function SyncStatus({ status, lastSyncedAt, onSync }: SyncStatusProps) {
  return (
    <View style={styles.row}>
      <ThemedText
        type="small"
        themeColor={status.state === 'error' ? 'error' : 'textSecondary'}
        style={styles.text}
        accessibilityLiveRegion="polite">
        {describeSyncStatus(status, lastSyncedAt)}
      </ThemedText>
      {status.state !== 'syncing' && (
        <Pressable
          onPress={onSync}
          accessibilityRole="button"
          accessibilityLabel="Sync now"
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedText type="smallBold">Sync now</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export function describeSyncStatus(status: Status, lastSyncedAt: Date | null): string {
  switch (status.state) {
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return "Offline. Your changes are saved and sync when you're back online.";
    case 'error':
      return `Sync failed: ${status.message}`;
    case 'idle':
      return lastSyncedAt
        ? `Synced at ${lastSyncedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
        : 'Not synced yet';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
