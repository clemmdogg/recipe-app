import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/view-models/session';

// Placeholder until step 4 of connecting the app builds the real Household tab
// (see "Decided: connecting the app" in mobile/CLAUDE.md). For now it can sign out.
export default function HouseholdScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();

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
      <View style={styles.account}>
        <ThemedText themeColor="textSecondary">
          Signed in as {session?.user.name} ({session?.user.email})
        </ThemedText>
        <PrimaryButton label="Sign out" onPress={onSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  account: {
    gap: Spacing.three,
    alignItems: 'center',
  },
});
