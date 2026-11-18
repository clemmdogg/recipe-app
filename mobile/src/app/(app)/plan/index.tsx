import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showMessage } from '@/components/dialogs';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PlanDayCard } from '@/components/plan/plan-day-card';
import { PlanDayRow } from '@/components/plan/plan-day-row';
import { WeekHeader } from '@/components/plan/week-header';
import { MaxContentWidth, MaxPageWidth, Spacing } from '@/constants/theme';
import { getPageFrame } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { useWeekPlan } from '@/view-models/use-week-plan';

/** From this content width, each day is a row across the page (an agenda) instead of a card. */
const DayRowsMinWidth = 640;

export default function PlanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const plan = useWeekPlan();
  // Measure the screen itself: the iPad and browser sidebars make it narrower than the window.
  const [width, setWidth] = useState(window.width);
  const showRows = getPageFrame(width, insets).contentWidth >= DayRowsMinWidth;
  // Cards on phones stay at reading width; rows use the page width, with the header lined up.
  const frame = getPageFrame(width, insets, showRows ? MaxPageWidth : MaxContentWidth);

  const onRemove = (entryId: string) => {
    plan.removeEntry(entryId).catch(() => {
      showMessage('Could not remove the dinner', 'Please try again.');
    });
  };

  const Day = showRows ? PlanDayRow : PlanDayCard;
  let days = (
    <View style={showRows ? styles.rows : styles.cards}>
      {plan.days.map((day) => (
        <Day
          key={day.key}
          day={day}
          onAdd={() => router.push({ pathname: '/plan/add-dinner', params: { date: day.key } })}
          onRemove={onRemove}
        />
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
          paddingLeft: frame.paddingLeft,
          paddingRight: frame.paddingRight,
          paddingBottom: Spacing.four + insets.bottom,
        },
      ]}>
      <WeekHeader
        weekStart={plan.week.weekStart}
        today={plan.week.today}
        onPrevious={plan.week.showPreviousWeek}
        onNext={plan.week.showNextWeek}
        onToday={plan.week.showCurrentWeek}
      />
      {days}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  cards: {
    gap: Spacing.three,
  },
  rows: {
    gap: Spacing.two,
  },
});
