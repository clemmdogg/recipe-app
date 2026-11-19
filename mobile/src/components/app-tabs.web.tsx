import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { ComponentRef, Ref } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/app-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, WebSidebarBreakpoint } from '@/constants/theme';
import { TabRoutes } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';
import { isHovered } from '@/utils/pressable';

/**
 * The browser's tab bar: a sidebar on the left in wide windows, and a bar at the bottom in narrow
 * ones, like on a phone. Phones never use this file (they use native tabs in app-tabs.tsx).
 */
export default function AppTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSidebar = width >= WebSidebarBreakpoint;

  // TabList passes its props to this child through a Slot, which only accepts one style object,
  // not an array. Its own default style lays tabs out in a row, so `tabListStyle` always sets
  // the direction itself.
  const tabListStyle = StyleSheet.flatten(
    isSidebar ? styles.sidebar : [styles.bottomBar, { paddingBottom: Spacing.two + insets.bottom }]
  );

  // The tab list always comes first, so the screens aren't recreated when the window is resized
  // past the breakpoint; `column-reverse` moves it to the bottom in narrow windows.
  return (
    <Tabs style={StyleSheet.flatten([styles.root, isSidebar ? styles.rootSidebar : styles.rootBottom])}>
      <TabList asChild>
        <ThemedView type="backgroundElement" style={tabListStyle}>
          {isSidebar && (
            <View style={styles.appName}>
              <AppLogo size={32} layout="inline" />
            </View>
          )}
          {TabRoutes.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.md} label={tab.label} layout={isSidebar ? 'row' : 'stacked'} />
            </TabTrigger>
          ))}
        </ThemedView>
      </TabList>
      <TabSlot style={styles.content} />
    </Tabs>
  );
}

type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & {
  ref?: Ref<ComponentRef<typeof Pressable>>;
  icon: AndroidSymbol;
  label: string;
  /** "row": icon beside the label, in the sidebar. "stacked": icon above it, in the bottom bar. */
  layout: 'row' | 'stacked';
};

function TabButton({ icon, label, layout, isFocused, ref, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;

  return (
    <Pressable
      {...props}
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={(state) => [
        layout === 'row' ? styles.sidebarButton : styles.bottomButton,
        layout === 'row' && isFocused && { backgroundColor: theme.backgroundSelected },
        isHovered(state) && !isFocused && { backgroundColor: theme.backgroundSelected },
        state.pressed && styles.pressed,
      ]}>
      <SymbolView name={{ ios: 'circle', android: icon, web: icon }} size={24} tintColor={color} />
      <ThemedText
        type={layout === 'row' ? 'default' : 'small'}
        // Accent text on the sand backgrounds is below 4.5:1, so only the icon gets the accent.
        themeColor={isFocused ? 'text' : 'textSecondary'}
        style={isFocused && styles.selectedLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootSidebar: {
    flexDirection: 'row',
  },
  rootBottom: {
    flexDirection: 'column-reverse',
  },
  content: {
    flex: 1,
  },
  sidebar: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: 240,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  appName: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  selectedLabel: {
    fontWeight: 600,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.two,
  },
  bottomButton: {
    alignItems: 'center',
    gap: Spacing.half,
    minWidth: 64,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
