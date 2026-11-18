import { NativeTabs } from 'expo-router/native-tabs';

import { TabRoutes } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundElement}
      // iPad (iOS 18+): let the tab bar turn into a sidebar.
      sidebarAdaptable
      // Always show labels on Android so icons don't shift up when a tab is selected.
      labelVisibilityMode="labeled"
      labelStyle={{ selected: { color: theme.accent } }}>
      {TabRoutes.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
