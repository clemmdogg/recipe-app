import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { IngredientRow } from '@/components/pantry/ingredient-row';
import { IngredientSuggestions } from '@/components/pantry/ingredient-suggestions';
import { QuickAdd } from '@/components/pantry/quick-add';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePantry } from '@/hooks/use-pantry';
import { useTheme } from '@/hooks/use-theme';

/** Item columns by list width: one on phones, more on tablets and in landscape. */
function columnCount(width: number): number {
  return width >= 900 ? 3 : width >= 600 ? 2 : 1;
}

export default function PantryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const pantry = usePantry();
  const [width, setWidth] = useState(window.width);
  const columns = columnCount(width);

  const onAdd = (name: string) => {
    pantry.add(name).catch(() => Alert.alert('Could not add to your pantry', 'Please try again.'));
  };
  const onRemove = (id: string) => {
    pantry.remove(id).catch(() => Alert.alert('Could not remove from your pantry', 'Please try again.'));
  };

  const items = pantry.items.data ?? [];
  const header = (
    <View style={styles.header}>
      <SearchField
        value={pantry.query}
        onChangeText={pantry.setQuery}
        placeholder="Add an ingredient, e.g. garlic"
        accessibilityLabel="Add an ingredient"
      />
      {pantry.query.trim() !== '' ? (
        <IngredientSuggestions
          query={pantry.query}
          catalog={pantry.catalog}
          suggestions={pantry.suggestions}
          isInPantry={pantry.isInPantry}
          onAdd={onAdd}
        />
      ) : (
        <QuickAdd names={pantry.missingStaples} onAdd={onAdd} />
      )}
      <ThemedText type="heading" accessibilityRole="header">
        In your pantry{items.length > 0 ? ` (${items.length})` : ''}
      </ThemedText>
    </View>
  );

  let empty = (
    <EmptyState
      icon={{ sf: 'refrigerator', md: 'kitchen' }}
      title="Your pantry is empty"
      message="Add what you have at home, and it will be skipped on your shopping list."
    />
  );
  if (pantry.items.status === 'error') {
    empty = <ErrorState message="Could not load your pantry." onRetry={pantry.items.reload} />;
  } else if (pantry.items.data === undefined) {
    empty = <LoadingState />;
  }

  return (
    <FlatList
      key={columns}
      data={items}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: theme.background }}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      contentContainerStyle={[
        styles.content,
        {
          paddingLeft: Spacing.three + insets.left,
          paddingRight: Spacing.three + insets.right,
          paddingBottom: Spacing.four + insets.bottom,
        },
      ]}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <View style={[styles.item, { backgroundColor: theme.backgroundElement }]}>
          <IngredientRow
            name={item.name}
            trailing={
              <Pressable
                onPress={() => onRemove(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name} from pantry`}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                  size={24}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            }
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  columns: {
    gap: Spacing.two,
  },
  item: {
    flex: 1,
    paddingLeft: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
