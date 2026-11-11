import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { AsyncResource } from '@/hooks/use-async-resource';
import { useTheme } from '@/hooks/use-theme';
import type { Household, HouseholdMember } from '@/types/household';

type MembersSectionProps = {
  household: AsyncResource<Household>;
  /** Shown while the household loads or can't be loaded, e.g. offline. */
  fallbackName: string;
  userId: string | undefined;
  isCreator: boolean;
  onRename: () => void;
  onRemove: (member: HouseholdMember) => void;
};

/** The household's name and its members. The creator can remove the others. */
export function MembersSection({ household, fallbackName, userId, isCreator, onRename, onRemove }: MembersSectionProps) {
  const theme = useTheme();

  let members = <LoadingState />;
  if (household.data) {
    members = (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {household.data.members.map((member) => (
          <View key={member.id} style={styles.member}>
            <View style={styles.memberText}>
              <ThemedText style={styles.memberName}>
                {member.name}
                {member.id === userId ? ' (you)' : ''}
              </ThemedText>
              {member.isCreator && (
                <ThemedText type="small" themeColor="textSecondary">
                  Created the household
                </ThemedText>
              )}
            </View>
            {isCreator && member.id !== userId && (
              <Pressable
                onPress={() => onRemove(member)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${member.name} from the household`}
                hitSlop={8}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'person.badge.minus', android: 'person_remove', web: 'person_remove' }}
                  size={24}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>
        ))}
      </View>
    );
  } else if (household.status === 'error') {
    members = (
      <ErrorState message="Couldn't load the members. Check your internet connection." onRetry={household.reload} />
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.name}>
          {household.data?.name ?? fallbackName}
        </ThemedText>
        <Pressable
          onPress={onRename}
          accessibilityRole="button"
          accessibilityLabel="Rename the household"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={24} tintColor={theme.text} />
        </Pressable>
      </View>
      {members}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  memberText: {
    flex: 1,
  },
  memberName: {
    fontWeight: 600,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
