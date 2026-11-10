import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatWeekRange, startOfWeek, toDateKey } from '@/utils/dates';

type WeekHeaderProps = {
  weekStart: Date;
  today: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function WeekHeader({ weekStart, today, onPrevious, onNext, onToday }: WeekHeaderProps) {
  const theme = useTheme();
  const range = formatWeekRange(weekStart, today);
  const name = weekName(weekStart, today);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ArrowButton icon={{ sf: 'chevron.left', md: 'chevron_left' }} label="Previous week" onPress={onPrevious} />
        <View style={styles.titles} accessible accessibilityRole="header" accessibilityLabel={name ? `${name}, ${range}` : range}>
          <ThemedText type="heading">{name ?? range}</ThemedText>
          {name && (
            <ThemedText type="small" themeColor="textSecondary">
              {range}
            </ThemedText>
          )}
        </View>
        <ArrowButton icon={{ sf: 'chevron.right', md: 'chevron_right' }} label="Next week" onPress={onNext} />
      </View>
      {name !== 'This week' && (
        <Pressable
          onPress={onToday}
          accessibilityRole="button"
          accessibilityLabel="Go to this week"
          style={({ pressed }) => [styles.todayButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <ThemedText type="smallBold">Back to this week</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function weekName(weekStart: Date, today: Date): string | null {
  const thisWeek = startOfWeek(today);
  switch (toDateKey(weekStart)) {
    case toDateKey(thisWeek):
      return 'This week';
    case toDateKey(addDays(thisWeek, 7)):
      return 'Next week';
    case toDateKey(addDays(thisWeek, -7)):
      return 'Last week';
    default:
      return null;
  }
}

type ArrowButtonProps = {
  icon: { sf: SFSymbol; md: AndroidSymbol };
  label: string;
  onPress: () => void;
};

function ArrowButton({ icon, label, onPress }: ArrowButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.arrow, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <SymbolView name={{ ios: icon.sf, android: icon.md, web: icon.md }} size={22} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  titles: {
    flex: 1,
    alignItems: 'center',
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.6,
  },
});
