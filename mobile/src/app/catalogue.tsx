// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #50
import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatars, Badges, Buttons, Chips, Icons, MapPins } from '@/catalogue/basics';
import { BottomNavs, ChatInputs, Dialogs, EventCards, TextFields, Toasts } from '@/catalogue/composites';
import { AppBars, Filters, FullScreenPanels, ListRows, Panels, States } from '@/catalogue/screens';
import { color, space, text } from '@/design-system';

// Every shared component in every variant, to compare with the design system's own previews. For developers: a
// released app has no way here.
export default function CatalogueScreen(): ReactElement {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>SNU Now 디자인 시스템</Text>
        <Icons />
        <Buttons />
        <Chips />
        <Badges />
        <Avatars />
        <MapPins />
        <EventCards />
        <TextFields />
        <ChatInputs />
        <BottomNavs />
        <Dialogs />
        <Toasts />
        <AppBars />
        <FullScreenPanels />
        <Panels />
        <Filters />
        <ListRows />
        <States />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { gap: space[8], padding: space[4], paddingBottom: space[10] },
  heading: { ...text.titleLg, color: color.snuBlue },
});
