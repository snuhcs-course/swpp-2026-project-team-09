/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import { Button, color, Icon, space, text } from '@/design-system';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { AnswerLines } from './answer-lines';
import { ConditionChips } from './condition-chips';
import { FriendChoices } from './friend-choices';
import { TimeBand } from './time-band';
import { type Corrections, useCorrections } from './use-corrections';

const ARROW = 44;
// A swipe begins only on a sideways move, so that the card still scrolls up and down, and counts from this far.
const SWIPE_STARTS = 10;
const SWIPE_COUNTS = 48;

// The answer's lines, which a swipe to the left turns to the next Plan and one to the right to the previous, as the
// arrows do.
function SwipedLines({ shown, count, lines }: { shown: ShownAnswer; count: number; lines: readonly AnswerLine[] }): ReactElement {
  const { browse, recalculating } = shown;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('plan-swipe')
        .runOnJS(true)
        .enabled(!recalculating && count > 1)
        .activeOffsetX([-SWIPE_STARTS, SWIPE_STARTS])
        .failOffsetY([-SWIPE_STARTS, SWIPE_STARTS])
        .onEnd(({ translationX }) => {
          if (Math.abs(translationX) >= SWIPE_COUNTS) {
            browse(translationX < 0 ? 1 : -1);
          }
        }),
    [browse, recalculating, count],
  );
  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false}>
        <AnswerLines lines={lines} />
      </View>
    </GestureDetector>
  );
}

// "‹" or "›" at an end of the steps' row: a round button that is easy to press.
function Arrow({ next, disabled, onPress }: { next: boolean; disabled: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={next ? '다음 후보' : '이전 후보'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <Icon color={disabled ? color.inkMuted : color.ink} name={next ? 'chevronRight' : 'chevronLeft'} size={22} />
    </Pressable>
  );
}

// The arrows at the row's two ends when the answer has more than one Plan, and between them "되돌리기" while a drag
// is kept and the count.
function Steps({ shown, count }: { shown: ShownAnswer; count: number }): ReactElement | null {
  const { index, browse, recalculating, ghost, undo } = shown;
  const arrows = count > 1;
  if (ghost === null && !arrows) {
    return null;
  }
  return (
    <View style={styles.steps} testID="plan-steps">
      {arrows ? (
        <Arrow
          disabled={recalculating}
          next={false}
          onPress={() => {
            browse(-1);
          }}
        />
      ) : null}
      <View style={[styles.middle, arrows && styles.centred]}>
        {ghost === null ? null : (
          <Button disabled={recalculating} onPress={undo} variant="secondary">
            되돌리기
          </Button>
        )}
        {arrows ? <Text style={styles.count}>{`${index + 1}/${count}`}</Text> : null}
      </View>
      {arrows ? (
        <Arrow
          disabled={recalculating}
          next
          onPress={() => {
            browse(1);
          }}
        />
      ) : null}
    </View>
  );
}

// Under the lines: the list of Friends while it is open, else the Plan's time band and the steps.
function Below({ shown, answer, fix }: { shown: ShownAnswer; answer: AnswerReply; fix: Corrections }): ReactElement {
  const { plan, recalculating, ghost } = shown;
  if (fix.adding) {
    return (
      <FriendChoices disabled={recalculating} friends={fix.choices} onChoose={fix.choose} onClose={fix.toggleAdding} />
    );
  }
  return (
    <>
      {plan === null ? null : (
        <TimeBand
          band={plan.band}
          disabled={recalculating}
          focus={fix.focus}
          ghost={ghost}
          onDrop={fix.drop}
          fixed={answer.input.window}
        />
      )}
      <Steps count={answer.plans.length} shown={shown} />
    </>
  );
}

// The answer on screen in the answer frame's card: its condition chips with "근거" at the row's right, the Plan's two
// lines or those that say why there is none, the basis while open, and the time band with the steps, or the list of
// Friends to add in their place. Each chip, a Friend chosen, and a drop of the band ask for a recalculation.
export function PlanCard({ shown, answer }: { shown: ShownAnswer; answer: AnswerReply }): ReactElement {
  const { plan, basisOpen, toggleBasis, recalculating } = shown;
  const fix = useCorrections(shown, answer.input);
  return (
    <View style={styles.plan}>
      <ConditionChips
        adding={fix.adding}
        basisOpen={plan !== null && basisOpen}
        chips={answer.chips}
        disabled={recalculating}
        onAdd={fix.toggleAdding}
        onBasis={plan === null ? null : toggleBasis}
        onOrigin={fix.chooseOrigin}
        onRemove={fix.remove}
        onUntil={fix.focusUntil}
      />
      <SwipedLines count={answer.plans.length} lines={plan?.lines ?? answer.noPlan?.lines ?? []} shown={shown} />
      {plan !== null && basisOpen ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <Below answer={answer} fix={fix} shown={shown} />
    </View>
  );
}

const styles = StyleSheet.create({
  plan: { gap: space[3] },
  basis: { gap: space[1] },
  basisLine: { ...text.body, color: color.inkMuted },
  steps: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.85 },
  middle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  centred: { justifyContent: 'center' },
  count: { ...text.label, color: color.ink },
});
