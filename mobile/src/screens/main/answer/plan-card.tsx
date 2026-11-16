/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button, color, Icon, size, space, text } from '@/design-system';
import { chipsWhileMoved, movingWords } from '@/features/assistant/band-move';
import { peopleOf, windowOf } from '@/features/assistant/plan-input';
import { easedFromNow } from '@/features/assistant/relaxed-plan';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import { isMealAlone } from '@/features/assistant/taken-lines';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { useOpenFriendProfile } from '../friend-profile';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { ConditionChips, type CornerAction } from './condition-chips';
import { FriendChoices } from './friend-choices';
import { MainButtons } from './main-buttons';
import { RelaxButtons } from './relax-buttons';
import { RowFourButtons } from './row-four-buttons';
import { TimeBand } from './time-band';
import { type Corrections, useCorrections } from './use-corrections';
import { addNameOf, whoOf } from './who-words';

// The arrows are as high as the buttons beside them, and their touch area reaches the design system's minimum.
const ARROW = 40;
const ARROW_SLOP = (size.touchMin - ARROW) / 2;
const UNDO_WIDTH = 96;
// The count stands in a box of its own, so that it never moves. Wide enough for "11/11": the main server answers a
// meal with up to eleven Plans.
const COUNT_WIDTH = 44;
// A swipe begins only on a sideways move, so that the card still scrolls up and down, and counts from this far.
const SWIPE_STARTS = 10;
const SWIPE_COUNTS = 48;
// The card's lines while the list of Friends is open, in place of the Plan's: who comes (`whoOf`). The map takes a
// press on a face only while a Plan is drawn, so without one the second line says how the list is sorted.
const HOW: AnswerLine = [{ text: '지도의 얼굴을 누르거나 아래에서 골라요', strong: false }];
const HOW_WITHOUT_PLAN: AnswerLine = [{ text: '가까운 친구부터 보여요', strong: false }];

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
  const { browse, adding } = shown;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('plan-swipe')
        .runOnJS(true)
        .enabled(!busy && !adding && count > 1)
        .activeOffsetX([-SWIPE_STARTS, SWIPE_STARTS])
        .failOffsetY([-SWIPE_STARTS, SWIPE_STARTS])
        .onEnd(({ translationX }) => {
          if (Math.abs(translationX) >= SWIPE_COUNTS) {
            browse(translationX < 0 ? 1 : -1);
          }
        }),
    [browse, busy, adding, count],
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
      hitSlop={ARROW_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <Icon color={disabled ? color.inkMuted : color.ink} name={next ? 'chevronRight' : 'chevronLeft'} size={20} />
    </Pressable>
  );
}

interface StepsProps {
  shown: ShownAnswer;
  count: number;
  busy: boolean;
  // Null for a Plan of the User alone, which has no "이대로 초대".
  invitation: PlanInvitation | null;
  // The screens the answer offers for an input that was missing.
  offers: readonly AnswerOffer[];
  // "처음으로" back to 지금, null for none.
  back: (() => void) | null;
  // "여기로" for a meal's Plan of the User alone, null for none.
  here: (() => void) | null;
}

// The arrows at the row's two ends when the answer has more than one Plan, the count right before "›", and the
// middle from the start: "되돌리기" at a fixed width while a drag is kept, then "이대로 초대" for a Plan with a Friend or
// "여기로" for a meal's Plan alone, then the answer's offers.
function Steps({ shown, count, busy, invitation, offers, back, here }: StepsProps): ReactElement | null {
  const { index, browse, ghost, undo } = shown;
  const arrows = count > 1;
  if (ghost === null && !arrows && invitation === null && offers.length === 0 && back === null && here === null) {
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
      <View style={styles.middle}>
        {ghost === null ? null : (
          <View style={styles.undo}>
            <Button disabled={busy} full onPress={undo} variant="secondary">
              되돌리기
            </Button>
          </View>
        )}
        <MainButtons back={back} busy={busy} here={here} invitation={invitation} offers={offers} />
      </View>
      {arrows ? (
        <Text numberOfLines={1} style={styles.count} testID="plan-count">
          {`${index + 1}/${count}`}
        </Text>
      ) : null}
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

interface CardProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  invitation: PlanInvitation;
  // How high the card may stand before it scrolls, null until it is known.
  room: number | null;
  // A refusal's lines, which stand in place of the Plan's first (board n8b).
  over?: readonly AnswerLine[];
}

interface BelowProps extends CardProps {
  fix: Corrections;
  busy: boolean;
  onProfile: ((userId: string) => void) | null;
}

// Under the lines: the list of Friends while it is open, else the Plan's time band, the answer's note, and the steps.
function Below({ shown, answer, invitation, room, fix, busy, onProfile }: BelowProps): ReactElement {
  const { plan, ghost } = shown;
  if (fix.adding) {
    return (
      <FriendChoices
        disabled={busy}
        friends={fix.choices}
        onChoose={fix.choose}
        onProfile={onProfile}
        pending={shown.pendingAdd}
        pick={plan?.place ?? null}
        room={room}
      />
    );
  }
  // A new party is posted with "이대로 모집", its friends invited or not.
  const invitable = plan !== null && answer.input.kind !== 'new-quest' && peopleOf(answer.input).length > 1;
  const fixed = bandIsFixed(answer.input.kind);
  return (
    <>
      {plan === null ? null : (
        <TimeBand
          band={plan.band}
          disabled={busy}
          focus={fix.focus}
          ghost={ghost}
          onDrop={fix.drop}
          fixed={windowOf(answer.input)}
          handles={!fixed}
          moving={shown.moving}
          onMove={fixed ? undefined : fix.move}
        />
      )}
      <CardNote note={answer.note} />
      {plan === null ? <RelaxButtons busy={busy} onRelax={fix.relax} relax={answer.noPlan?.relax ?? []} /> : null}
      <Steps
        back={plan !== null && easedFromNow(answer.input) ? fix.back : null}
        busy={busy}
        count={answer.plans.length}
        here={plan !== null && isMealAlone(answer) ? invitation.invite : null}
        invitation={invitable ? invitation : null}
        offers={answer.offers ?? []}
        shown={shown}
      />
      <RowFourButtons busy={busy} invitation={invitation} shown={shown} />
    </>
  );
}

// What stands at the right of the chips' first line: "그대로" while the list of Friends is open, else "근거" for a
// Plan, which has a basis to open.
function cornerOf({ plan, basisOpen, toggleBasis }: ShownAnswer, fix: Corrections): CornerAction | null {
  if (fix.adding) {
    return { words: '그대로', icon: null, onPress: fix.toggleAdding };
  }
  if (plan === null) {
    return null;
  }
  return basisOpen
    ? { words: '근거 접기', icon: 'chevronUp', onPress: toggleBasis }
    : { words: '근거', icon: 'chevronRight', onPress: toggleBasis };
}

interface PlanCardProps extends CardProps {
  onClose: () => void;
}

// While the band is moved over someone's busy stretch, the lines say who cannot come and why.
function linesOf({ plan, moving }: ShownAnswer, answer: AnswerReply, adding: boolean): readonly AnswerLine[] {
  if (adding) {
    return [whoOf(answer.input.kind), plan === null ? HOW_WITHOUT_PLAN : HOW];
  }
  const words = plan === null || moving === null ? null : movingWords(plan.band.lanes, moving);
  return words?.lines ?? plan?.lines ?? answer.noPlan?.lines ?? [];
}

// The answer on screen in the answer frame's card: its condition chips with "근거" at the right of their first line,
// the Plan's two lines or those that say why there is none, the basis while open, and the time band with the steps.
// While the list of Friends to add is open, the lines ask who comes, "그대로" closes the list, and the list stands in
// place of the band and the steps. Each chip, a Friend chosen, and a drop of the band ask for a recalculation, and
// none takes a press while a recalculation or "이대로 초대" is on its way; the ✕ of a meet's only Friend closes the
// answer (`onClose`, as the frame's ✕) and goes back to that Friend's card. A Friend's chip and the mark of a Friend's
// cell open the Friend's profile over the card.
export function PlanCard({ shown, answer, invitation, room, over = [], onClose }: PlanCardProps): ReactElement {
  const { plan, basisOpen, recalculating } = shown;
  const busy = recalculating || invitation.sending;
  const fix = useCorrections(shown, answer.input, onClose);
  const openProfile = useOpenFriendProfile();
  const own = linesOf(shown, answer, fix.adding);
  const lines = fix.adding ? own : [...over, ...own.slice(over.length)];
  return (
    <View style={styles.plan}>
      <ConditionChips
        adding={fix.adding}
        {...chipsWhileMoved(answer.chips, shown.moving)}
        corner={cornerOf(shown, fix)}
        disabled={busy}
        friendIds={fix.friendIds}
        addName={addNameOf(answer.input.kind)}
        fixed={bandIsFixed(answer.input.kind)}
        onAdd={fix.toggleAdding}
        onOrigin={fix.chooseOrigin}
        onProfile={openProfile}
        onRemove={fix.remove}
        onUntil={fix.focusUntil}
      />
      <SwipedLines busy={busy} count={answer.plans.length} lines={lines} shown={shown} />
      {plan !== null && basisOpen && !fix.adding ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <Below
        answer={answer}
        busy={busy}
        fix={fix}
        invitation={invitation}
        onProfile={openProfile}
        room={room}
        shown={shown}
      />
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
  undo: { width: UNDO_WIDTH },
  count: {
    ...text.label,
    width: COUNT_WIDTH,
    color: color.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
