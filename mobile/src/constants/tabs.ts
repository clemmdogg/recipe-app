import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export type AppTab = {
  /** Route name of the tab's folder in `src/app/(app)/`; native tab triggers match on this. */
  name: string;
  /** URL the tab opens; used by the web tab bar. */
  href: '/' | '/plan' | '/list' | '/pantry' | '/household';
  label: string;
  /** SF Symbol (iOS). */
  sf: { default: SFSymbol; selected: SFSymbol };
  /** Material Symbol (Android and web). */
  md: AndroidSymbol;
};

// Single source of truth for the tab bar, shared by app-tabs.tsx and app-tabs.web.tsx.
export const TabRoutes: readonly AppTab[] = [
  {
    name: '(recipes)',
    href: '/',
    label: 'Recipes',
    sf: { default: 'book', selected: 'book.fill' },
    md: 'menu_book',
  },
  {
    name: 'plan',
    href: '/plan',
    label: 'Plan',
    sf: { default: 'calendar', selected: 'calendar' },
    md: 'calendar_month',
  },
  {
    name: 'list',
    href: '/list',
    label: 'List',
    sf: { default: 'checklist', selected: 'checklist' },
    md: 'checklist',
  },
  {
    name: 'pantry',
    href: '/pantry',
    label: 'Pantry',
    sf: { default: 'refrigerator', selected: 'refrigerator.fill' },
    md: 'kitchen',
  },
  // Android allows at most 5 tabs, so this is the last one. Account and settings go in here.
  {
    name: 'household',
    href: '/household',
    label: 'Household',
    sf: { default: 'person.3', selected: 'person.3.fill' },
    md: 'group',
  },
];
