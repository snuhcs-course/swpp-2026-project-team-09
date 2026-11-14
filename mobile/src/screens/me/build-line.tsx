/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, text, useToast } from '@/design-system';
import { setAnswerSwitch, useAnswerSwitch } from '@/features/assistant/answer-switch';
import { thisVersionLine } from './version-line';

// The build and update the phone runs, at the bottom of 내 정보. A long press turns the answer on the map on or off and
// says which, for the team to try it before it is the default; nothing else shows the switch.
export function BuildLine(): ReactElement {
  const answerOnMap = useAnswerSwitch();
  const showToast = useToast();
  return (
    <Text
      onLongPress={() => {
        const on = !answerOnMap;
        // A phone that cannot keep it still has the switch changed until the app starts again.
        void setAnswerSwitch(on).catch(() => null);
        showToast(on ? '지도 위의 답을 켰어요' : '지도 위의 답을 껐어요');
      }}
      style={styles.version}
    >
      {thisVersionLine()}
    </Text>
  );
}

const styles = StyleSheet.create({
  version: { ...text.caption, textAlign: 'center', color: color.inkMuted },
});
