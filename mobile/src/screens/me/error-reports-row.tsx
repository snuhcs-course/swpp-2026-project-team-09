/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-25  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { cardStyles, color, radius, space, SwitchRow, text } from '@/design-system';
import { setSending, useSending } from '@/telemetry';
import { ERROR_REPORTS_PART } from '../legal-documents';

// What an error report holds, under the switch.
export const ERROR_REPORTS_CAPTION =
  '앱에 오류가 나면 그때까지 본 화면, 앱·휴대폰의 버전, 계정 번호를 보내요. 이름과 위치는 보내지 않아요.';

// "오류 보고 보내기" (P08 ticket 03): whether the phone sends error reports, on at first. The choice is the phone's, so
// it holds across sign-outs; off stops the sending at once. The link opens the privacy policy at its part on error
// reports.
export function ErrorReportsRow(): ReactElement {
  const on = useSending();
  return (
    <View style={[cardStyles.card, styles.card]}>
      <SwitchRow
        description={ERROR_REPORTS_CAPTION}
        label="오류 보고 보내기"
        onValueChange={(next) => {
          void setSending(next);
        }}
        value={on}
      />
      <Pressable
        accessibilityRole="link"
        hitSlop={space[2]}
        onPress={() => {
          router.navigate({ pathname: '/legal/[document]', params: { document: 'privacy', part: ERROR_REPORTS_PART } });
        }}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.link, pressed && styles.linkPressed]}
      >
        <Text style={styles.linkWords}>개인정보 처리방침 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: space[1], paddingBottom: space[3], gap: space[1] },
  link: { alignSelf: 'flex-start', borderRadius: radius.sm },
  linkPressed: { backgroundColor: color.surfaceSunken },
  linkWords: { ...text.label, color: color.snuBlue, textDecorationLine: 'underline' },
});
