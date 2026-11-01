/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { font, Icon, radius, shadow, size, tutorialTone } from '@/design-system';
import { TUTORIAL_START } from '../layout';

// "새내기 튜토리얼 시작하기" at the bottom left, above "오늘의 발자국" (MainTutorialStart). It opens the pager. Whether
// it shows is the main screen's (`showsStartButton`, and no card or chat open).
export function TutorialStartButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새내기 튜토리얼 시작하기"
      accessibilityRole="button"
      hitSlop={(size.touchMin - TUTORIAL_START.height) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon color={tutorialTone.ink} name="flag" size={14} />
      <Text style={styles.words}>새내기 튜토리얼 시작하기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: TUTORIAL_START.left,
    bottom: TUTORIAL_START.bottom,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: TUTORIAL_START.height,
    paddingRight: 12,
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: tutorialTone.border,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.ground,
    boxShadow: shadow.float,
  },
  pressed: { backgroundColor: tutorialTone.box },
  words: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: tutorialTone.words },
});
