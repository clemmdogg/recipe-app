import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientSuggestions } from '@/components/pantry/ingredient-suggestions';
import { WeekHeader } from '@/components/plan/week-header';
import { SearchField } from '@/components/search-field';
import { ShoppingListContent } from '@/components/shopping/shopping-list-content';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { useTheme } from '@/hooks/use-theme';

/** From this width "In cart" and "Already at home" move to a column beside "To buy". */
const TwoColumnMinWidth = 900;

export default function ShoppingListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const shopping = useShoppingList();
  // Measure the screen itself: on iPad the sidebar makes it narrower than the window.
  const [width, setWidth] = useState(window.width);

  const run = (action: Promise<void>) => {
    action.catch(() => Alert.alert('Could not update your shopping list', 'Please try again.'));
  };
  const onAdd = (name: string) => run(shopping.add(name));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
      <View style={styles.header}>
        <WeekHeader
          weekStart={shopping.week.weekStart}
          today={shopping.week.today}
          onPrevious={shopping.week.showPreviousWeek}
          onNext={shopping.week.showNextWeek}
          onToday={shopping.week.showCurrentWeek}
        />
        <SearchField
          value={shopping.query}
          onChangeText={shopping.setQuery}
          placeholder="Add an item, e.g. milk"
          accessibilityLabel="Add an item to the shopping list"
        />
        {shopping.query.trim() !== '' && (
          <IngredientSuggestions
            query={shopping.query}
            catalog={shopping.catalog}
            suggestions={shopping.suggestions}
            isAdded={shopping.isOnList}
            addedLabel="On list"
            targetName="shopping list"
            onAdd={onAdd}
          />
        )}
      </View>
      <ShoppingListContent
        list={shopping.list}
        twoColumns={width >= TwoColumnMinWidth}
        onToggle={(line, isChecked) => run(shopping.toggle(line, isChecked))}
        onRemove={(line) => run(shopping.remove(line))}
        onNeedMore={(line) => onAdd(line.name)}
        onBought={() => run(shopping.markBought())}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
