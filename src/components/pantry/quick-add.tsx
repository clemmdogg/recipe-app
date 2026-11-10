import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuickAddProps = {
  names: readonly string[];
  onAdd: (name: string) => void;
};

/** One-tap buttons for common basics that aren't in the pantry yet. */
export function QuickAdd({ names, onAdd }: QuickAddProps) {
  const theme = useTheme();
  if (names.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Quick add
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {names.map((name) => (
          <Pressable
            key={name}
            onPress={() => onAdd(name)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} tintColor={theme.text} />
            <ThemedText type="smallBold">{name}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.6,
  },
});
