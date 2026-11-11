import AppTabs from '@/components/app-tabs';
import { SyncProvider } from '@/view-models/sync';

/**
 * Everything behind login: the five tabs. The root layout only shows this group when signed in,
 * so syncing runs exactly while someone is signed in.
 */
export default function SignedInLayout() {
  return (
    <SyncProvider>
      <AppTabs />
    </SyncProvider>
  );
}
