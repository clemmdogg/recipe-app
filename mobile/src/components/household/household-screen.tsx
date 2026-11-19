import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmAction, showMessage } from '@/components/dialogs';
import { AccountSection } from '@/components/household/account-section';
import { AppName } from '@/components/app-logo';
import { InviteCard } from '@/components/household/invite-card';
import { MembersSection } from '@/components/household/members-section';
import { SettingsSection } from '@/components/household/settings-section';
import { SyncStatus } from '@/components/household/sync-status';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HouseholdMember, Invite } from '@/types/household';
import { describeHouseholdError } from '@/view-models/household-errors';
import { useSettings } from '@/view-models/settings';
import { useHousehold } from '@/view-models/use-household';

type BusyAction = 'invite' | 'leave' | 'signOut';

/** The Household tab: the family's members, invites, joining and leaving, and the account. */
export function HouseholdScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vm = useHousehold();
  const { settings, update: updateSettings } = useSettings();
  const [busy, setBusy] = useState<BusyAction | null>(null);
  // Remembers which household the invite is for, so it disappears after joining or leaving.
  const [created, setCreated] = useState<{ invite: Invite; householdId: string } | null>(null);
  const householdId = vm.session?.household.id;
  const invite = created && created.householdId === householdId ? created.invite : null;

  async function run(action: BusyAction, work: () => Promise<void>, failureTitle: string) {
    setBusy(action);
    try {
      await work();
    } catch (error) {
      showMessage(failureTitle, describeHouseholdError(error));
    } finally {
      setBusy(null);
    }
  }

  const shareInvite = (toShare: Invite) => {
    const name = vm.household.data?.name ?? vm.session?.household.name ?? 'our household';
    // Some browsers have no share sheet; the code is on screen in the invite card anyway.
    Share.share({
      message: `Join "${name}" in ${AppName}, so we share recipes, the meal plan, the shopping list and the pantry. Open Household → Join with code and enter ${toShare.code}, or open ${toShare.url}. The invite works for 7 days.`,
    }).catch(() => undefined);
  };

  const onInvite = () =>
    run(
      'invite',
      async () => {
        const newInvite = await vm.invite();
        if (householdId) {
          setCreated({ invite: newInvite, householdId });
        }
        shareInvite(newInvite);
      },
      'Could not create an invite'
    );

  const onLeave = async () => {
    const confirmed = await confirmAction({
      title: 'Leave the household?',
      message: 'You get a new, empty household. The recipes, plan, lists and pantry stay with the others.',
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (confirmed) {
      await run('leave', vm.leave, 'Could not leave');
    }
  };

  const onRemove = async (member: HouseholdMember) => {
    const confirmed = await confirmAction({
      title: `Remove ${member.name}?`,
      message: `${member.name} gets a new, empty household of their own.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (confirmed) {
      vm.remove(member.id).catch((error) => showMessage('Could not remove', describeHouseholdError(error)));
    }
  };

  const onSignOut = () =>
    run(
      'signOut',
      async () => {
        const canLoseChanges = await vm.hasUnsyncedChanges();
        const confirmed =
          !canLoseChanges ||
          (await confirmAction({
            title: 'Sign out without uploading?',
            message:
              "Some changes on this device haven't been uploaded yet, so they will be lost. Connect to the internet first to keep them.",
            confirmLabel: 'Sign out',
            destructive: true,
          }));
        if (confirmed) {
          await vm.signOut();
        }
      },
      'Could not sign out'
    );

  const memberCount = vm.household.data?.members.length ?? 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        {
          paddingLeft: Spacing.four + insets.left,
          paddingRight: Spacing.four + insets.right,
          paddingBottom: Spacing.five + insets.bottom,
        },
      ]}>
      <View style={styles.column}>
        <MembersSection
          household={vm.household}
          fallbackName={vm.session?.household.name ?? 'Your household'}
          userId={vm.userId}
          isCreator={vm.isCreator}
          onRename={() => router.push('/household/rename')}
          onRemove={onRemove}
        />

        <View style={styles.buttons}>
          {invite ? (
            <InviteCard invite={invite} onShare={() => shareInvite(invite)} />
          ) : (
            <PrimaryButton label="Invite family" onPress={onInvite} isBusy={busy === 'invite'} />
          )}
          <SecondaryButton label="Join with code" onPress={() => router.push('/household/join')} />
          {memberCount > 1 && <SecondaryButton label="Leave household" onPress={onLeave} isBusy={busy === 'leave'} />}
        </View>

        <SyncStatus status={vm.syncStatus} lastSyncedAt={vm.lastSyncedAt} onSync={vm.sync} />

        <SettingsSection
          settings={settings}
          onChange={(changes) => {
            updateSettings(changes).catch(() => showMessage('Could not save the setting', 'Please try again.'));
          }}
          showShakeSetting={Platform.OS !== 'web'}
        />

        <AccountSection
          user={vm.session?.user}
          onSignOut={onSignOut}
          isSigningOut={busy === 'signOut'}
          onDeleteAccount={() => router.push('/household/delete-account')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
  },
  buttons: {
    gap: Spacing.three,
  },
});
