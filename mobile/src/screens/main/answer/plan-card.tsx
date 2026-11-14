/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import { Button, color, Icon, space, text } from '@/design-system';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
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
function SwipedLines({
  shown,
  count,
  lines,
  busy,
}: {
  shown: ShownAnswer;
  count: number;
  lines: readonly AnswerLine[];
  busy: boolean;
}): ReactElement {
  const { browse } = shown;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('plan-swipe')
        .runOnJS(true)
        .enabled(!busy && count > 1)
        .activeOffsetX([-SWIPE_STARTS, SWIPE_STARTS])
        .failOffsetY([-SWIPE_STARTS, SWIPE_STARTS])
        .onEnd(({ translationX }) => {
          if (Math.abs(translationX) >= SWIPE_COUNTS) {
            browse(translationX < 0 ? 1 : -1);
          }
        }),
    [browse, busy, count],
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

interface StepsProps {
  shown: ShownAnswer;
  count: number;
  busy: boolean;
  // Null for a Plan of the User alone, which has no "이대로 초대".
  invitation: PlanInvitation | null;
}

// The arrows at the row's two ends when the answer has more than one Plan, and between them "되돌리기" while a drag
// is kept, "이대로 초대" for a Plan with a Friend, and the count.
function Steps({ shown, count, busy, invitation }: StepsProps): ReactElement | null {
  const { index, browse, ghost, undo } = shown;
  const arrows = count > 1;
  if (ghost === null && !arrows && invitation === null) {
    return null;
  }
  return (
    <View style={styles.steps} testID="plan-steps">
      {arrows ? (
        <Arrow
          disabled={busy}
          next={false}
          onPress={() => {
            browse(-1);
          }}
        />
      ) : null}
      <View style={[styles.middle, arrows && invitation === null && styles.centred]}>
        {ghost === null ? null : (
          <Button disabled={busy} onPress={undo} variant="secondary">
            되돌리기
          </Button>
        )}
        {invitation === null ? null : (
          <View style={styles.main}>
            <Button disabled={busy} full onPress={invitation.invite}>
              {invitation.sending ? '보내는 중이에요' : '이대로 초대'}
            </Button>
          </View>
        )}
        {arrows ? <Text style={styles.count}>{`${index + 1}/${count}`}</Text> : null}
      </View>
      {arrows ? (
        <Arrow
          disabled={busy}
          next
          onPress={() => {
            browse(1);
          }}
        />
      ) : null}
    </View>
  );
}

interface BelowProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  fix: Corrections;
  busy: boolean;
  invitation: PlanInvitation;
}

// Under the lines: the list of Friends while it is open, else the Plan's time band and the steps.
function Below({ shown, answer, fix, busy, invitation }: BelowProps): ReactElement {
  const { plan, ghost } = shown;
  if (fix.adding) {
    return <FriendChoices disabled={busy} friends={fix.choices} onChoose={fix.choose} onClose={fix.toggleAdding} />;
  }
  const invitable = plan !== null && answer.input.people.length > 1;
  return (
    <>
      {plan === null ? null : (
        <TimeBand
          band={plan.band}
          disabled={busy}
          focus={fix.focus}
          ghost={ghost}
          onDrop={fix.drop}
          fixed={answer.input.window}
        />
      )}
      <Steps busy={busy} count={answer.plans.length} invitation={invitable ? invitation : null} shown={shown} />
    </>
  );
}

// The answer on screen in the answer frame's card: its condition chips with "근거" at the row's right, the Plan's two
// lines or those that say why there is none, the basis while open, and the time band with the steps, or the list of
// Friends to add in their place. Each chip, a Friend chosen, and a drop of the band ask for a recalculation, and
// none takes a press while a recalculation or "이대로 초대" is on its way.
export function PlanCard({
  shown,
  answer,
  invitation,
}: {
  shown: ShownAnswer;
  answer: AnswerReply;
  invitation: PlanInvitation;
}): ReactElement {
  const { plan, basisOpen, toggleBasis, recalculating } = shown;
  const busy = recalculating || invitation.sending;
  const fix = useCorrections(shown, answer.input);
  return (
    <View style={styles.plan}>
      <ConditionChips
        adding={fix.adding}
        basisOpen={plan !== null && basisOpen}
        chips={answer.chips}
        disabled={busy}
        onAdd={fix.toggleAdding}
        onBasis={plan === null ? null : toggleBasis}
        onOrigin={fix.chooseOrigin}
        onRemove={fix.remove}
        onUntil={fix.focusUntil}
      />
      <SwipedLines
        busy={busy}
        count={answer.plans.length}
        lines={plan?.lines ?? answer.noPlan?.lines ?? []}
        shown={shown}
      />
      {plan !== null && basisOpen ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <Below answer={answer} busy={busy} fix={fix} invitation={invitation} shown={shown} />
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
  main: { flex: 1 },
  count: { ...text.label, color: color.ink },
});
