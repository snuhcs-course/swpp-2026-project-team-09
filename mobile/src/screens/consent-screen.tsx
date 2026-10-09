/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '@/auth/sign-in';
import { Button, color, size, space, text } from '@/design-system';
import { useSession } from '@/session/session';
import { keep } from '@/storage/kept';
import { LEGAL_DOCUMENTS, type LegalDocument } from './legal-documents';

const DOCUMENTS: readonly LegalDocument[] = ['terms', 'privacy', 'location'];
const WIDEST = 390;

function DocumentRow({ document }: { document: LegalDocument }): ReactElement {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        // The same document asked for twice is opened once.
        router.navigate({ pathname: '/legal/[document]', params: { document } });
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowWords}>{LEGAL_DOCUMENTS[document]}</Text>
    </Pressable>
  );
}

// What the buttons do. One at a time: while one is at work, neither takes a press.
function useConsent(): { working: boolean; agreed: () => void; out: () => void } {
  const { agree, leave } = useSession();
  const [working, setWorking] = useState(false);
  const agreed = (): void => {
    setWorking(true);
    // A phone that could not keep the answer asks again at the next start; the User goes on now.
    void keep({ consented: true })
      .catch(() => null)
      .then(agree);
  };
  const out = (): void => {
    setWorking(true);
    void signOut()
      .catch(() => null)
      .then(leave);
  };
  return { working, agreed, out };
}

// Asks the User, once on this phone, to agree to the three legal documents: after the first sign-in and before
// Onboarding. A User who does not agree signs out. No wireframe draws this screen; its look is the design system's.
export function ConsentScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { working, agreed, out } = useConsent();
  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <ScrollView bounces={false} contentContainerStyle={[styles.upper, { paddingTop: insets.top + space[10] }]}>
          <Text accessibilityRole="header" style={styles.title}>
            약관에 동의해 주세요
          </Text>
          <Text style={styles.sentence}>SNU Now를 쓰려면 아래 약관에 동의해야 해요.</Text>
          <View style={styles.list}>
            {DOCUMENTS.map((document) => (
              <DocumentRow document={document} key={document} />
            ))}
          </View>
        </ScrollView>
        <View style={[styles.foot, { paddingBottom: insets.bottom + space[4] }]}>
          <Button disabled={working} full onPress={agreed} size="lg">
            동의하고 시작
          </Button>
          <Button centred disabled={working} onPress={out} variant="ghost">
            로그아웃
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // A phone's width, in the middle of a wider screen.
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: WIDEST },
  upper: { paddingHorizontal: space[6], paddingBottom: space[6] },
  title: { ...text.titleLg, color: color.ink },
  sentence: { ...text.body, marginTop: space[2], color: color.inkMuted },
  list: { marginTop: space[8], borderTopWidth: 1, borderTopColor: color.border },
  row: {
    minHeight: size.appBar,
    justifyContent: 'center',
    paddingHorizontal: space[1],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowPressed: { backgroundColor: color.blue50 },
  rowWords: { ...text.bodyLg, color: color.blue600 },
  foot: { gap: space[3], paddingTop: space[3], paddingHorizontal: space[6] },
});
