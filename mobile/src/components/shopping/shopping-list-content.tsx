import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { AtHomeSection } from '@/components/shopping/at-home-section';
import { LineSection } from '@/components/shopping/line-section';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { AsyncResource } from '@/hooks/use-async-resource';
import type { ShoppingLine, ShoppingList } from '@/types/shopping-list';

type ShoppingListContentProps = {
  list: AsyncResource<ShoppingList>;
  /** Puts "In cart" and "Already at home" in a column beside "To buy". */
  twoColumns: boolean;
  onToggle: (line: ShoppingLine, isChecked: boolean) => void;
  onRemove: (line: ShoppingLine) => void;
  onNeedMore: (line: ShoppingLine) => void;
  /** Moves the cart into the pantry. */
  onBought: () => void;
};

/** The list's sections, or its loading, error and empty states. */
export function ShoppingListContent({
  list,
  twoColumns,
  onToggle,
  onRemove,
  onNeedMore,
  onBought,
}: ShoppingListContentProps) {
  const data = list.data;
  if (!data) {
    return list.status === 'error' ? (
      <ErrorState message="Could not load your shopping list." onRetry={list.reload} />
    ) : (
      <LoadingState message="Making your list…" />
    );
  }

  if (data.toBuy.length + data.inCart.length + data.atHome.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState
          icon={{ sf: 'checklist', md: 'checklist' }}
          title="Nothing to buy yet"
          message="Plan dinners for this week and their ingredients show up here. You can also add items above."
        />
        <PrimaryButton label="Plan dinners" onPress={() => router.navigate('/plan')} />
      </View>
    );
  }

  const toBuy = (
    <LineSection
      title="To buy"
      lines={data.toBuy}
      isChecked={false}
      emptyMessage="You have everything for this week."
      onToggle={(line) => onToggle(line, false)}
      onRemove={onRemove}
      isAligned={twoColumns}
    />
  );
  const done = (
    <>
      {data.inCart.length > 0 && (
        <View style={styles.cart}>
          <LineSection
            title="In cart"
            lines={data.inCart}
            isChecked
            onToggle={(line) => onToggle(line, true)}
            onRemove={onRemove}
            isAligned={twoColumns}
          />
          <PrimaryButton label="Bought · Move to pantry" onPress={onBought} />
        </View>
      )}
      <AtHomeSection lines={data.atHome} onNeedMore={onNeedMore} isAligned={twoColumns} />
    </>
  );

  return twoColumns ? (
    <View style={styles.columns}>
      <View style={styles.mainColumn}>{toBuy}</View>
      <View style={styles.sideColumn}>{done}</View>
    </View>
  ) : (
    <View style={styles.stack}>
      {toBuy}
      {done}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.five,
  },
  // Equally wide, so the rows of the two columns line up.
  mainColumn: {
    flex: 1,
  },
  sideColumn: {
    flex: 1,
    gap: Spacing.five,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  cart: {
    gap: Spacing.three,
  },
});
