/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, color, useToastAbove } from '@/design-system';
import { takenUnderToastOverNav } from './layout';

interface TabScreenProps {
  title: string;
  actions?: ReactNode;
  // In place of the app bar, such as a search field over the title.
  bar?: ReactNode;
  children: ReactNode;
}

// A tab other than 지도, as the `Party`, `Events` and `Profile` frames draw it: the tab's app bar on the grey ground,
// and a toast 16 above the navigation while the tab is in front.
export function TabScreen({ title, actions, bar, children }: TabScreenProps): ReactElement {
  const { bottom } = useSafeAreaInsets();
  useToastAbove(takenUnderToastOverNav(bottom), useIsFocused());
  return (
    <View style={styles.screen}>
      {bar ?? <AppBar actions={actions} title={title} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceSubtle },
});
