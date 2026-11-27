/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { chooseUsage } from '@/consent/choices';
import { NO_CONSENT, useKeptConsent, usageChosen } from '@/consent/kept-consent';
import { color, radius, space, SwitchRow, text, useToast } from '@/design-system';
import { allowUsage } from '@/telemetry';
import { USAGE_HEADING, USAGE_PART } from '../legal-documents';

// What usage data holds, under the switch, and the words of a failed change. A draft that a person reviews before the
// Release (P08 ticket 11).
export const USAGE_CAPTION =
  '켜 두면 앱에서 연 화면과 쓴 기능의 기록을 PostHog(미국)에 보내요. 이름·위치·입력한 내용은 보내지 않아요.';
export const USAGE_NOT_CHANGED = '바꾸지 못했어요. 잠시 후 다시 해 주세요.';

// "사용 기록 보내기" (P08 ticket 11): the account's choice on usage data, as the phone's copy holds it. A change is sent
// to the account; the switch shows the new position while it is on its way, and goes back with a toast when it was
// not taken. The version of the consent is not touched, so nothing is asked again. Usage data follows the press at
// once, without waiting for the account (P08 ticket 12), and goes back only with the switch. The link opens the
// privacy policy at its part on usage data. One of the two rows of the card that `sending-card.tsx` draws.
export function UsageRow(): ReactElement {
  const kept = useKeptConsent();
  const showToast = useToast();
  // The position the User turned it to, while its request is on its way.
  const [turning, setTurning] = useState<boolean | null>(null);
  const on = turning ?? kept?.usage === true;
  return (
    <View style={styles.row}>
      <SwitchRow
        description={USAGE_CAPTION}
        label="사용 기록 보내기"
        onValueChange={(next) => {
          const before = kept ?? NO_CONSENT;
          setTurning(next);
          allowUsage(usageChosen({ ...before, usage: next }));
          chooseUsage(next).then(
            () => {
              setTurning(null);
            },
            () => {
              setTurning(null);
              allowUsage(usageChosen(before));
              showToast(USAGE_NOT_CHANGED);
            },
          );
        }}
        value={on}
      />
      <Pressable
        accessibilityRole="link"
        hitSlop={space[2]}
        onPress={() => {
          router.navigate({ pathname: '/legal/[document]', params: { document: 'privacy', part: USAGE_PART } });
        }}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.link, pressed && styles.linkPressed]}
      >
        <Text style={styles.linkWords}>{`'${USAGE_HEADING}' 보기`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: space[1], paddingBottom: space[3], gap: space[1] },
  link: { alignSelf: 'flex-start', borderRadius: radius.sm },
  linkPressed: { backgroundColor: color.surfaceSunken },
  linkWords: { ...text.label, color: color.snuBlue, textDecorationLine: 'underline' },
});
