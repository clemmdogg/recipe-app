import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/view-models/session';

/**
 * Where invite links lead: https://<web address>/join/K7MQ-2XPA. It works without signing in,
 * shows the code and how to use it, and takes signed-in users to "Join with code", filled in.
 */
export default function InviteLinkScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const displayCode = code.toUpperCase();

  const join = () => {
    router.replace({ pathname: '/household/join', params: { code: displayCode } });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.five + insets.bottom }]}>
      <View style={styles.column}>
        <ThemedText type="subtitle" accessibilityRole="header">
          You&apos;re invited
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Someone in your family invited you to share recipes, the meal plan, the shopping list and the pantry.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Invite code
          </ThemedText>
          <ThemedText
            selectable
            style={styles.code}
            accessibilityLabel={`Invite code ${displayCode.split('').join(' ')}`}>
            {displayCode}
          </ThemedText>
        </View>

        {session ? (
          <PrimaryButton label="Join the household" onPress={join} />
        ) : (
          <>
            <ThemedText>
              Sign in or create an account first. Then open Household → Join with code and enter the code above.
            </ThemedText>
            <PrimaryButton label="Sign in" onPress={() => router.replace('/sign-in')} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  card: {
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
});
