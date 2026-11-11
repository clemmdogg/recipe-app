import AppTabs from '@/components/app-tabs';

/** Everything behind login: the five tabs. The root layout only shows this group when signed in. */
export default function SignedInLayout() {
  return <AppTabs />;
}
