/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '@/api/types';
import { now } from '@/clock';
import { Button, color, font, Icon, radius, size, space, text, tutorialTone } from '@/design-system';
import { eligibleByDefault, rowOf, type TutorialRowView } from '@/features/tutorial/rules';
import { useTutorial, useTutorialActions } from '@/features/tutorial/use-tutorial';

const ROUND = 36;
const HIDE = 28;

// The ✕, while the tutorial is off: the row is not shown again.
function HideButton({ disabled, onPress }: { disabled: boolean; onPress: () => Promise<unknown> }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새내기 튜토리얼 안 보기"
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={(size.touchMin - HIDE) / 2}
      onPress={() => {
        void onPress();
      }}
      style={styles.hide}
    >
      <Icon color={color.inkFaint} name="x" size={16} />
    </Pressable>
  );
}

// 진행하기, 끄기 or 그만하기, and the ✕.
function RowButtons({ row }: { row: TutorialRowView }): ReactElement {
  const actions = useTutorialActions();
  return (
    <>
      {row.enable ? (
        <Button
          disabled={actions.working}
          onPress={() => {
            void actions.enable();
          }}
        >
          진행하기
        </Button>
      ) : null}
      {row.stopLabel === null ? null : (
        <Button
          disabled={actions.working}
          onPress={() => {
            void actions.stop();
          }}
          variant="secondary"
        >
          {row.stopLabel}
        </Button>
      )}
      {row.hide ? <HideButton disabled={actions.working} onPress={actions.hideRow} /> : null}
    </>
  );
}

// The 새내기 튜토리얼 row of 내 정보 (ProfileTutorial): its line by the tutorial's state, with 진행하기, 끄기 or
// 그만하기, and the ✕ that hides the row while the tutorial is off. 진행하기 keeps the progress.
export function TutorialRow({ profile }: { profile: Profile }): ReactElement | null {
  const tutorial = useTutorial();
  if (tutorial === undefined) {
    return null;
  }
  const row = rowOf(tutorial, eligibleByDefault(profile, now()));
  if (row === null) {
    return null;
  }
  return (
    <View accessibilityLabel="새내기 튜토리얼" style={styles.row}>
      <View style={styles.round}>
        <Icon color={tutorialTone.ink} name="flag" size={18} />
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>새내기 튜토리얼</Text>
        <Text style={styles.line}>{row.line}</Text>
      </View>
      <RowButtons row={row} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: tutorialTone.border,
    borderRadius: radius.lg,
    backgroundColor: tutorialTone.ground,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: tutorialTone.round,
  },
  words: { flex: 1, gap: 2 },
  title: { fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  line: { ...text.caption, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  hide: {
    alignItems: 'center',
    justifyContent: 'center',
    width: HIDE,
    height: HIDE,
    marginRight: -6,
    borderRadius: radius.full,
  },
});
