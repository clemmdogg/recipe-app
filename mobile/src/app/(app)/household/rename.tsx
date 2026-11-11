import { router } from 'expo-router';

import { ModalForm } from '@/components/household/modal-form';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { useRenameHousehold } from '@/view-models/use-account-form';

export default function RenameHouseholdScreen() {
  const form = useRenameHousehold();

  const save = async () => {
    if (await form.submit()) {
      router.back();
    }
  };

  return (
    <ModalForm intro="Everyone in the household sees this name." error={form.error}>
      <TextField
        label="Household name"
        value={form.value}
        onChangeText={form.setValue}
        placeholder="e.g. The Jensens"
        autoCapitalize="words"
        autoFocus
        maxLength={50}
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <PrimaryButton label="Save" onPress={save} isBusy={form.isBusy} />
    </ModalForm>
  );
}
