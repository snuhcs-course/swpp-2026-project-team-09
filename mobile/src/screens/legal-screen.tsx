/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, Icon, size, space, text } from '@/design-system';
import { LEGAL_DOCUMENTS, LEGAL_TEXTS, type LegalDocument, type LegalSection } from './legal-documents';

// Back to the screen the document was opened from. Opened by its address alone, there is none: the app starts.
function close(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

function Sections({ sections, bottom }: { sections: readonly LegalSection[]; bottom: number }): ReactElement {
  return (
    <ScrollView contentContainerStyle={[styles.text, { paddingBottom: space[6] + bottom }]}>
      {sections.map(({ heading, paragraphs }) => (
        <View key={heading} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>
            {heading}
          </Text>
          {paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// One legal document on a screen of its own, read before signing in. What is not written yet is a placeholder.
export function LegalScreen({ document }: { document: LegalDocument }): ReactElement {
  const insets = useSafeAreaInsets();
  const title = LEGAL_DOCUMENTS[document];
  const sections = LEGAL_TEXTS[document];
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
      {sections === undefined ? (
        <View style={styles.body}>
          <Text style={styles.placeholder}>{`(${title} 내용이 들어갈 것)`}</Text>
        </View>
      ) : (
        <Sections bottom={insets.bottom} sections={sections} />
      )}
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
  text: { gap: space[6], padding: space[5] },
  section: { gap: space[2] },
  heading: { ...text.title, color: color.ink },
  paragraph: { ...text.body, color: color.inkMuted },
});
