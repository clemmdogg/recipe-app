import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ModalForm } from '@/components/household/modal-form';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJoinHousehold } from '@/view-models/use-join-household';

export default function JoinHouseholdScreen() {
  const theme = useTheme();
  // An invite link (/join/<code>) opens this screen with the code filled in.
  const { code } = useLocalSearchParams<{ code?: string }>();
  const form = useJoinHousehold(code ?? '');
  const preview = form.preview;

  const join = async () => {
    if (await form.join()) {
      router.back();
    }
  };

  return (
    <ModalForm
      intro="Enter the code from the invite someone in your family sent you, e.g. K7MQ-2XPA."
      error={form.error}>
      <TextField
        label="Invite code"
        value={form.code}
        onChangeText={form.changeCode}
        placeholder="XXXX-XXXX"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={20}
        returnKeyType="search"
        onSubmitEditing={form.lookUp}
      />

      {preview === null ? (
        <PrimaryButton label="Find household" onPress={form.lookUp} isBusy={form.isBusy} />
      ) : (
        <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="heading" accessibilityRole="header">
            Join “{preview.householdName}”?
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {preview.memberCount} {preview.memberCount === 1 ? 'member' : 'members'}. You will share their recipes,
            meal plan, shopping list and pantry.
          </ThemedText>
          {preview.joiningDeletesData ? (
            <ThemedText themeColor="error">
              You&apos;re the only member of your current household, so its recipes, plan, lists and pantry will be
              deleted.
            </ThemedText>
          ) : (
            <ThemedText themeColor="textSecondary">You leave your current household.</ThemedText>
          )}
          {preview.joiningDeletesData ? (
            <SecondaryButton label="Delete my data and join" tone="destructive" onPress={join} isBusy={form.isBusy} />
          ) : (
            <PrimaryButton label="Join" onPress={join} isBusy={form.isBusy} />
          )}
        </View>
      )}
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
});
