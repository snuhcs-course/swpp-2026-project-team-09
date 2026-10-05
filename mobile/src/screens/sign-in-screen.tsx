import { type ReactElement, useEffect } from 'react';
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, space, text } from '@/design-system';
import { Drawing, SignInButton } from './sign-in-button';
import { type SignInPhase, useSignIn } from './use-sign-in';

// The frame is 390 by 844 and counts the phone's own bars in it: 44 at the top and 34 at the bottom. The screen
// keeps the frame's distances from the top, moved by what a phone's top bar takes beyond the frame's.
const FRAME_WIDTH = 390;
const FRAME_BARS = { top: 44, bottom: 34 };
const FRAME_FOOT = 36;
const COPY_TOP = 560;
const COPY_HEIGHT = 60;

const COPY: Record<SignInPhase, { headline: string; line: string }> = {
  default: { headline: '서울대 계정으로 로그인', line: '@snu.ac.kr' },
  checking: { headline: '학교 계정 확인 중…', line: '@snu.ac.kr' },
  'not-snu-account': { headline: '로그인하지 못했어요', line: '@snu.ac.kr 계정만 가능해요' },
  failed: { headline: '로그인하지 못했어요', line: '잠시 후 다시 시도해 주세요' },
};

function Copy({ phase }: { phase: SignInPhase }): ReactElement {
  const { headline, line } = COPY[phase];
  const refused = phase === 'not-snu-account' || phase === 'failed';
  // iOS has no live regions: the refusal is announced by hand. Android and the web read the region below.
  useEffect(() => {
    if (refused && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(`${headline}. ${line}`);
    }
  }, [refused, headline, line]);
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

// Where a User signs in with the SNU Google account: one button and what is happening.
export function SignInScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { phase, start } = useSignIn();
  const top = Math.max(0, insets.top - FRAME_BARS.top);
  const bottom = FRAME_FOOT + Math.max(0, insets.bottom - FRAME_BARS.bottom);
  // On a screen shorter than this the column scrolls, so that the words stay clear of the phone's lower bar.
  const minHeight = top + COPY_TOP + COPY_HEIGHT + bottom;
  return (
    <ScrollView bounces={false} contentContainerStyle={styles.content} style={styles.screen}>
      <View style={[styles.column, { minHeight }]}>
        <View style={[styles.upper, { top }]}>
          <View style={styles.wordmark}>
            <Text style={styles.name}>SNU Now</Text>
            <Text style={styles.tagline}>관악캠퍼스의 지금</Text>
          </View>
          <View style={styles.stage}>
            <SignInButton checking={phase === 'checking'} onPress={start} />
            <Drawing refused={phase === 'not-snu-account' || phase === 'failed'} />
          </View>
          <Copy phase={phase} />
        </View>
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
  // The button and the drawing keep the frame's places around the middle of the screen, also on a narrower phone,
  // where the drawing's far edge is cut off a little more.
  stage: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: FRAME_WIDTH, marginLeft: -FRAME_WIDTH / 2 },
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
});
