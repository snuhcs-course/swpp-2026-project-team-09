/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, Icon, size, space, text } from '@/design-system';
import { LEGAL_DOCUMENTS, type LegalDocument } from './legal-documents';

// Back to the screen the document was opened from. Opened by its address alone, there is none: the app starts.
function close(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

// One legal document on a screen of its own, read before signing in. Its text is a placeholder until it is written.
export function LegalScreen({ document }: { document: LegalDocument }): ReactElement {
  const insets = useSafeAreaInsets();
  const title = LEGAL_DOCUMENTS[document];
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { height: size.appBar + insets.top, paddingTop: insets.top }]}>
        <Pressable accessibilityLabel="닫기" accessibilityRole="button" onPress={close} style={styles.close}>
          <Icon name="x" size={22} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>{`(${title} 내용이 들어갈 것)`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingRight: space[2],
    paddingLeft: space[1],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  close: { width: size.touchMin, height: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  // The frame's own size for this header, between the `title` and `titleLg` text styles.
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 28, color: color.ink },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  placeholder: { ...text.label, fontFamily: font.medium, color: color.inkSubtle, textAlign: 'center' },
});
