import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Invite } from '@/types/household';

type InviteCardProps = {
  invite: Invite;
  onShare: () => void;
};

/**
 * The invite code, big enough to read out loud. The share sheet doesn't show the message on
 * every phone (Android lists only apps), so the code is always visible here too.
 */
export function InviteCard({ invite, onShare }: InviteCardProps) {
  const theme = useTheme();
  const validUntil = new Date(invite.expiresAt).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Invite code
      </ThemedText>
      <ThemedText
        selectable
        style={styles.code}
        accessibilityLabel={`Invite code ${invite.code.split('').join(' ')}`}>
        {invite.code}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        In the app, they open Household → Join with code. Works until {validUntil}.
      </ThemedText>
      <SecondaryButton label="Share invite" onPress={onShare} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  code: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: 700,
    letterSpacing: 2,
    textAlign: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
