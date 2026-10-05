import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, size, space, text } from '@/design-system';
import type { LegalDocument } from './legal-documents';
import { Drawing, SignInButton } from './sign-in-button';
import { type SignInPhase, useSignIn } from './use-sign-in';

// The frame is 390 by 844 and counts the phone's own bars in it: 44 at the top and 34 at the bottom. The upper
// block keeps the frame's distances from the top and the footer its distance from the bottom, each moved by what a
// phone's bars take beyond the frame's.
const FRAME_WIDTH = 390;
const FRAME_BARS = { top: 44, bottom: 34 };
const COPY_TOP = 560;
const COPY_HEIGHT = 60;
const FOOTER_BOTTOM = 36;
const FOOTER_LINE = 18;

const COPY: Record<SignInPhase, { headline: string; line: string }> = {
  default: { headline: '서울대 계정으로 로그인', line: '@snu.ac.kr' },
  checking: { headline: '학교 계정 확인 중…', line: '@snu.ac.kr' },
  'not-snu-account': { headline: '로그인하지 못했어요', line: '@snu.ac.kr 계정만 가능해요' },
  failed: { headline: '로그인하지 못했어요', line: '잠시 후 다시 시도해 주세요' },
};

function Copy({ phase }: { phase: SignInPhase }): ReactElement {
  const { headline, line } = COPY[phase];
  const refused = phase === 'not-snu-account' || phase === 'failed';
  return (
    <View style={styles.copy}>
      <Text accessibilityRole="header" style={styles.headline}>
        {headline}
      </Text>
      {refused ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.line, styles.refusal]}>
          {line}
        </Text>
      ) : (
        <Text style={styles.line}>{line}</Text>
      )}
    </View>
  );
}

function LegalLink({ document, children }: { document: LegalDocument; children: string }): ReactElement {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        router.push({ pathname: '/legal/[document]', params: { document } });
      }}
      style={styles.link}
    >
      <Text style={styles.linkWords}>{children}</Text>
    </Pressable>
  );
}

// The sentence is laid out in pieces, not as one text, so that each link is a control of its own with a touch area
// of the design system's least height.
function Footer({ bottom }: { bottom: number }): ReactElement {
  return (
    <View style={[styles.footer, { bottom }]}>
      <View style={styles.footerLine}>
        <Text style={styles.footerWords}>계속하면 </Text>
        <LegalLink document="terms">이용약관</LegalLink>
        <Text style={styles.footerWords}>과 </Text>
        <LegalLink document="privacy">개인정보 처리방침</LegalLink>
        <Text style={styles.footerWords}>,</Text>
      </View>
      <View style={styles.footerLine}>
        <LegalLink document="location">위치정보 이용</LegalLink>
        <Text style={styles.footerWords}>에 동의하게 돼요.</Text>
      </View>
    </View>
  );
}

// Where a User signs in with the SNU Google account: one button, what is happening, and the documents agreed to.
export function SignInScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { phase, start } = useSignIn();
  const top = Math.max(0, insets.top - FRAME_BARS.top);
  const bottom = FOOTER_BOTTOM + Math.max(0, insets.bottom - FRAME_BARS.bottom);
  // On a screen shorter than this the column scrolls, so that the footer never lies over the words above it.
  const minHeight = top + COPY_TOP + COPY_HEIGHT + space[6] + 2 * FOOTER_LINE + bottom;
  return (
    <ScrollView bounces={false} contentContainerStyle={styles.content} style={styles.screen}>
      <View style={[styles.column, { minHeight }]}>
        <View style={[styles.upper, { top }]}>
          <View style={styles.wordmark}>
            <Text style={styles.name}>SNU Now</Text>
            <Text style={styles.tagline}>관악캠퍼스의 지금</Text>
          </View>
          <SignInButton checking={phase === 'checking'} onPress={start} />
          <Drawing refused={phase === 'not-snu-account' || phase === 'failed'} />
          <Copy phase={phase} />
        </View>
        <Footer bottom={bottom} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { flexGrow: 1 },
  // The frame's width, in the middle of a wider screen. What the frame draws past its edge is cut off, as there.
  column: { flexGrow: 1, alignSelf: 'center', width: '100%', maxWidth: FRAME_WIDTH, overflow: 'hidden' },
  upper: { position: 'absolute', right: 0, left: 0, height: COPY_TOP + COPY_HEIGHT },
  wordmark: { position: 'absolute', top: 84, right: 0, left: 0, alignItems: 'center', gap: 6 },
  // Larger than any text style: the wordmark's own size.
  name: { fontFamily: font.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1.4, color: color.snuBlue },
  tagline: { ...text.label, fontFamily: font.medium, color: color.inkMuted },
  copy: {
    position: 'absolute',
    top: COPY_TOP,
    right: space[6],
    left: space[6],
    alignItems: 'center',
    gap: space[2],
  },
  headline: { ...text.titleLg, color: color.ink, textAlign: 'center' },
  line: { ...text.body, color: color.inkMuted, textAlign: 'center' },
  refusal: { color: color.danger },
  footer: { position: 'absolute', right: space[6], left: space[6], alignItems: 'center' },
  footerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: FOOTER_LINE },
  footerWords: { ...text.caption, fontFamily: font.regular, lineHeight: FOOTER_LINE, color: color.inkMuted },
  // As tall as the least touch area, without moving the line: what the padding adds, the margin takes back.
  link: { paddingVertical: (size.touchMin - FOOTER_LINE) / 2, marginVertical: -(size.touchMin - FOOTER_LINE) / 2 },
  linkWords: { ...text.caption, fontFamily: font.semiBold, lineHeight: FOOTER_LINE, color: color.blue600 },
});
