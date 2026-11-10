import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PlanDayCard } from '@/components/plan/plan-day-card';
import { WeekHeader } from '@/components/plan/week-header';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeekPlan } from '@/hooks/use-week-plan';

/** From this width the seven days are shown side by side instead of stacked. */
const WeekColumnsMinWidth = 1000;

export default function PlanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const plan = useWeekPlan();
  // Measure the screen itself: on iPad the sidebar makes it narrower than the window.
  const [width, setWidth] = useState(window.width);
  const showColumns = width >= WeekColumnsMinWidth;

  const onRemove = (entryId: string) => {
    plan.removeEntry(entryId).catch(() => {
      Alert.alert('Could not remove the dinner', 'Please try again.');
    });
  };

  let days = (
    <View style={showColumns ? styles.columns : styles.stack}>
      {plan.days.map((day) => (
        <View key={day.key} style={showColumns && styles.column}>
          <PlanDayCard
            day={day}
            onAdd={() => router.push({ pathname: '/plan/add-dinner', params: { date: day.key } })}
            onRemove={onRemove}
          />
        </View>
      ))}
    </View>
  );
  if (!plan.hasData && plan.status === 'error') {
    days = <ErrorState message="Could not load your plan." onRetry={plan.reload} />;
  } else if (!plan.hasData) {
    days = <LoadingState message="Loading your plan…" />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingLeft: Spacing.three + insets.left,
          paddingRight: Spacing.three + insets.right,
          paddingBottom: Spacing.four + insets.bottom,
        },
      ]}>
      <View style={[styles.header, !showColumns && styles.narrow]}>
        <WeekHeader
          weekStart={plan.week.weekStart}
          today={plan.week.today}
          onPrevious={plan.week.showPreviousWeek}
          onNext={plan.week.showNextWeek}
          onToday={plan.week.showCurrentWeek}
        />
      </View>
      <View style={!showColumns && styles.narrow}>{days}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  narrow: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  stack: {
    gap: Spacing.three,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
});
