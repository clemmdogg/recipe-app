import { ModalForm } from '@/components/household/modal-form';
import { SecondaryButton } from '@/components/secondary-button';
import { TextField } from '@/components/text-field';
import { useDeleteAccount } from '@/view-models/use-account-form';

export default function DeleteAccountScreen() {
  const form = useDeleteAccount();

  return (
    <ModalForm
      intro="Your account is deleted for good, and you are signed out. If you're the last member of your household, its recipes, plan, lists and pantry are deleted too. Otherwise they stay with the others."
      error={form.error}>
      <TextField
        label="Password"
        value={form.value}
        onChangeText={form.setValue}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />
      {/* On success the session ends, and the root layout shows the sign-in screen by itself. */}
      <SecondaryButton label="Delete my account" tone="destructive" onPress={form.submit} isBusy={form.isBusy} />
    </ModalForm>
  );
}
