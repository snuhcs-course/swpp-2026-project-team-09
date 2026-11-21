/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button, color, space, text } from '@/design-system';
import { movingWords } from '@/features/assistant/band-move';
import { easedFromNow } from '@/features/assistant/relaxed-plan';
import { bandIsFixed } from '@/features/assistant/row-four-inputs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { ChatMarkdown } from '../chat-markdown';
import { useOpenFriendProfile } from '../friend-profile';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { ConditionChips } from './condition-chips';
import { FriendChoices } from './friend-choices';
import { MainButtons } from './main-buttons';
import { PlanStepper } from './plan-stepper';
import { RelaxButtons } from './relax-buttons';
import { RowFourButtons } from './row-four-buttons';
import { type BandFocus, type Corrections, useCorrections } from './use-corrections';
import { addNameOf, whoOf } from './who-words';

const UNDO_WIDTH = 96;
// The card's lines while the list of Friends is open: who comes (`whoOf`). The map takes a press on a face only while
// a Plan is drawn, so without one the second line says how the list is sorted.
const HOW: AnswerLine = [{ text: '지도의 얼굴을 누르거나 아래에서 골라요', strong: false }];
const HOW_WITHOUT_PLAN: AnswerLine = [{ text: '가까운 친구부터 보여요', strong: false }];

interface StepsProps {
  shown: ShownAnswer;
  busy: boolean;
  // The screens the answer offers for an input that was missing.
  offers: readonly AnswerOffer[];
  // "처음으로" back to 지금, null for none.
  back: (() => void) | null;
}

// "되돌리기" at a fixed width while a drag is kept, then "처음으로" and the answer's offers. The main button stands beside
// the input (`planActionOf`), and other candidates are numbered flags on the map.
function Steps({ shown, busy, offers, back }: StepsProps): ReactElement | null {
  const { ghost, undo } = shown;
  if (ghost === null && offers.length === 0 && back === null) {
    return null;
  }
  return (
    <View style={styles.steps} testID="plan-steps">
      {ghost === null ? null : (
        <View style={styles.undo}>
          <Button disabled={busy} full onPress={undo} variant="secondary">
            되돌리기
          </Button>
        </View>
      )}
      <MainButtons back={back} busy={busy} here={null} invitation={null} offers={offers} />
    </View>
  );
}

interface CardProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  invitation: PlanInvitation;
  // How high the card may stand before it scrolls, null until it is known.
  room: number | null;
  // A refusal's lines, which keep the Plan on screen (board n8b).
  over?: readonly AnswerLine[];
}

interface BelowProps extends CardProps {
  fix: Corrections;
  busy: boolean;
  onProfile: ((userId: string) => void) | null;
}

// Under the line: the list of Friends while it is open, else the answer's note and the steps. The Plan's band is the
// time bar's, under the pill.
function Below({ shown, answer, invitation, room, fix, busy, onProfile }: BelowProps): ReactElement {
  const { plan } = shown;
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
  return (
    <>
      <CardNote note={answer.note} />
      {plan === null ? <RelaxButtons busy={busy} onRelax={fix.relax} relax={answer.noPlan?.relax ?? []} /> : null}
      <Steps
        back={plan !== null && easedFromNow(answer.input) ? fix.back : null}
        busy={busy}
        offers={answer.offers ?? []}
        shown={shown}
      />
      <PlanStepper busy={busy} shown={shown} />
      <RowFourButtons busy={busy} invitation={invitation} shown={shown} />
    </>
  );
}

// The lines a Plan's card says, which the map cannot: who comes while the list of Friends is open, a refusal's lines
// over the Plan it keeps, who cannot come while the band is moved over their busy stretch, and why there is no Plan.
// None otherwise: where, when, who, and the way are on the map and the time bar.
export function linesOf(
  { plan, moving }: ShownAnswer,
  answer: AnswerReply,
  adding: boolean,
  over: readonly AnswerLine[] = [],
): readonly AnswerLine[] {
  if (adding) {
    return [whoOf(answer.input.kind), plan === null ? HOW_WITHOUT_PLAN : HOW];
  }
  if (over.length > 0) {
    return over;
  }
  const words = plan === null || moving === null ? null : movingWords(plan.band.lanes, moving);
  return words?.lines ?? (plan === null ? (answer.noPlan?.lines ?? []) : []);
}

// The line, which a press opens to the reply's whole words under it and closes again; without words to open, it
// takes no press.
function Said({ lines, said }: { lines: readonly AnswerLine[]; said: string }): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (lines.length === 0) {
    return null;
  }
  if (said === '') {
    return <AnswerLines lines={lines} />;
  }
  return (
    <Pressable
      accessibilityLabel={open ? '접기' : '전체 보기'}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => {
        setOpen(!open);
      }}
      style={styles.said}
    >
      <AnswerLines lines={lines} />
      {open ? <ChatMarkdown style={styles.words} text={said} /> : null}
    </Pressable>
  );
}

// Whether the Plan's card has nothing to read: no line, step, relax button, or the buttons of events and parties. Then
// the frame docks it: one row with the input and the main button, and the chips "＋ 같이", "지난 답 N개", and the note
// when they show.
export function planCardRests(shown: ShownAnswer, answer: AnswerReply, over: readonly AnswerLine[]): boolean {
  const { plan, ghost, adding } = shown;
  const { kind } = answer.input;
  return (
    plan !== null &&
    !adding &&
    ghost === null &&
    linesOf(shown, answer, false, over).length === 0 &&
    !easedFromNow(answer.input) &&
    (answer.offers ?? []).length === 0 &&
    (kind === 'meal' || kind === 'meet')
  );
}

interface PlanCardProps extends CardProps {
  onClose: () => void;
  focus: BandFocus;
  // The model's words of the reply, which the line opens.
  said?: string;
  // Docked: the card is its chips' row alone, these chips after "＋ 같이"; the note is one of them.
  dock?: ReactNode;
}

// The answer on screen in the answer frame's card, with no text of its own by default: "＋ 같이" while the Plan can
// take a Friend whose face is not on the map, the line when the map cannot say it (`linesOf`), the note, and the steps. While the list of
// Friends to add is open, the line asks who comes, "그대로" closes the list, and the list stands in place of the steps.
// A Friend chosen and a drop of the band ask for a recalculation, and none takes a press while a recalculation or
// "이대로 초대" is on its way. The Plan's people, its start, its place, and its time are changed on the map and the
// time bar.
export function PlanCard(props: PlanCardProps): ReactElement {
  const { shown, answer, invitation, room, over = [], onClose, focus, said = '', dock } = props;
  const busy = shown.recalculating || invitation.sending;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const openProfile = useOpenFriendProfile();
  const corner = fix.adding ? { words: '그대로', icon: null, onPress: fix.toggleAdding } : null;
  // A Friend with a position is added by the + on their face, so the chip is for those the map cannot show.
  const unseen = fix.choices.some(({ position }) => position === null);
  const addName = fix.adding || unseen ? addNameOf(answer.input.kind) : null;
  const docked = dock !== undefined;
  return (
    <View style={styles.plan}>
      {addName === null && corner === null && !docked ? null : (
        <ConditionChips
          adding={fix.adding}
          addName={addName}
          chips={[]}
          corner={corner}
          disabled={busy}
          extra={dock}
          fixed={bandIsFixed(answer.input.kind)}
          friendIds={fix.friendIds}
          onAdd={fix.toggleAdding}
          onOrigin={fix.chooseOrigin}
          onProfile={openProfile}
          onRemove={fix.remove}
          onUntil={fix.focusUntil}
        />
      )}
      {docked ? null : <Said lines={linesOf(shown, answer, fix.adding, over)} said={said} />}
      {docked ? null : (
        <Below
          answer={answer}
          busy={busy}
          fix={fix}
          invitation={invitation}
          onProfile={openProfile}
          room={room}
          shown={shown}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plan: { gap: space[3] },
  said: { gap: space[2] },
  words: { ...text.body, color: color.ink },
  steps: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  undo: { width: UNDO_WIDTH },
});
