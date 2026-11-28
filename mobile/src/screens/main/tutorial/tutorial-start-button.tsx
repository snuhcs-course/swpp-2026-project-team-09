/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, Glass, Icon, radius, size, space, tutorialTone } from '@/design-system';
import { TUTORIAL_START } from '../layout';

const ROUND = 32;

// "새내기 튜토리얼 시작하기" at the bottom left, above the row of buttons or in its place (MainTutorialStart): a glass pill
// over the map with the flag on its light blue round (P06 ticket 55). It opens the tutorial's list. Whether it shows is
// the main screen's (`showsStartButton`, and no card, chat or guide open).
export function TutorialStartButton({ bottom, onPress }: { bottom: number; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새내기 튜토리얼 시작하기"
      accessibilityRole="button"
      hitSlop={Math.max(0, (size.touchMin - TUTORIAL_START.height) / 2)}
      onPress={onPress}
      style={({ pressed }) => [styles.place, { bottom }, pressed && styles.pressed]}
    >
      <Glass level="panel" style={styles.button}>
        <View style={styles.round}>
          <Icon color={tutorialTone.ink} name="flag" size={16} />
        </View>
        <Text style={styles.words}>새내기 튜토리얼 시작하기</Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  place: { position: 'absolute', left: TUTORIAL_START.left },
  pressed: { opacity: 0.85 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: TUTORIAL_START.height,
    paddingRight: space[4],
    paddingLeft: 6,
    borderRadius: radius.full,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.round,
  },
  words: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: tutorialTone.words },
});
