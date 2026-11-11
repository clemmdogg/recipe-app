import type { PlannedIngredient } from '@/types/shopping-list';
import { buildShoppingList } from '@/utils/shopping-list';

const pastaMonday: PlannedIngredient[] = [
  { date: '2026-11-09', recipeName: 'Pasta', name: 'Garlic', measure: '3 cloves' },
  { date: '2026-11-09', recipeName: 'Pasta', name: 'Penne Rigate', measure: '1 pound' },
];
const curryThursday: PlannedIngredient[] = [
  { date: '2026-11-12', recipeName: 'Curry', name: 'garlic', measure: '2 cloves' },
  { date: '2026-11-12', recipeName: 'Curry', name: 'Chicken', measure: '500g' },
];

const names = (lines: { name: string }[]) => lines.map((line) => line.name);

describe('buildShoppingList', () => {
  it('lists every planned ingredient alphabetically', () => {
    const list = buildShoppingList([...pastaMonday, ...curryThursday], [], []);

    expect(names(list.toBuy)).toEqual(['Chicken', 'Garlic', 'Penne Rigate']);
    expect(list.inCart).toEqual([]);
    expect(list.atHome).toEqual([]);
  });

  it('merges the same ingredient across recipes, ignoring case, keeping each measure', () => {
    const list = buildShoppingList([...pastaMonday, ...curryThursday], [], []);

    const garlic = list.toBuy.find((line) => line.key === 'garlic');
    expect(garlic?.uses).toEqual([
      { measure: '3 cloves', recipeName: 'Pasta', date: '2026-11-09' },
      { measure: '2 cloves', recipeName: 'Curry', date: '2026-11-12' },
    ]);
  });

  it('lists a recipe planned twice as two separate uses', () => {
    const pastaAgain = pastaMonday.map((ingredient) => ({ ...ingredient, date: '2026-11-13' }));

    const list = buildShoppingList([...pastaMonday, ...pastaAgain], [], []);

    expect(list.toBuy.find((line) => line.key === 'garlic')?.uses).toHaveLength(2);
  });

  it('skips ingredients that are in the pantry, ignoring case', () => {
    const list = buildShoppingList(pastaMonday, [], ['GARLIC']);

    expect(names(list.toBuy)).toEqual(['Penne Rigate']);
    expect(names(list.atHome)).toEqual(['Garlic']);
  });

  it('moves ticked-off ingredients to the cart', () => {
    const list = buildShoppingList(pastaMonday, [{ name: 'garlic', isChecked: true }], ['Garlic']);

    expect(names(list.toBuy)).toEqual(['Penne Rigate']);
    expect(names(list.inCart)).toEqual(['Garlic']);
    expect(list.atHome).toEqual([]);
  });

  it('keeps a ticked-off ingredient in the cart after its dinner is removed from the plan', () => {
    const list = buildShoppingList([], [{ name: 'Garlic', isChecked: true }], ['Garlic']);

    expect(list.inCart).toEqual([
      { key: 'garlic', name: 'Garlic', uses: [], isPlanned: false, isStored: true },
    ]);
  });

  it('drops an unticked ingredient when its dinner is removed from the plan', () => {
    const list = buildShoppingList([], [], []);

    expect(list).toEqual({ toBuy: [], inCart: [], atHome: [] });
  });

  it('includes items added by hand that no dinner needs', () => {
    const list = buildShoppingList(pastaMonday, [{ name: 'Milk', isChecked: false }], []);

    const milk = list.toBuy.find((line) => line.key === 'milk');
    expect(milk).toEqual({ key: 'milk', name: 'Milk', uses: [], isPlanned: false, isStored: true });
  });

  it('puts an ingredient back on the list when "need more" is chosen despite the pantry', () => {
    const list = buildShoppingList(pastaMonday, [{ name: 'Garlic', isChecked: false }], ['Garlic']);

    expect(names(list.toBuy)).toEqual(['Garlic', 'Penne Rigate']);
    expect(list.atHome).toEqual([]);
  });
});
