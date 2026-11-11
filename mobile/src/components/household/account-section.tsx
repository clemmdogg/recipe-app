import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Session } from '@/types/session';

type AccountSectionProps = {
  user: Session['user'] | undefined;
  onSignOut: () => void;
  isSigningOut: boolean;
  onDeleteAccount: () => void;
};

/** Who is signed in, with sign out and delete account. */
export function AccountSection({ user, onSignOut, isSigningOut, onDeleteAccount }: AccountSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header">
        Account
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Signed in as {user?.name} ({user?.email})
      </ThemedText>
      <SecondaryButton label="Sign out" onPress={onSignOut} isBusy={isSigningOut} />
      <SecondaryButton label="Delete account" tone="destructive" onPress={onDeleteAccount} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
});
