/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import { space } from '@/design-system';
import { movingWords } from '@/features/assistant/band-move';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { ChatMarkdown } from '../chat-markdown';
import { AnswerHints, saidByHint } from './answer-hints';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { MealList, mealCard } from './meal-list';
import { MealMenu } from './meal-menu';
import { mealWordsOf } from './meal-words';
import { OfferButtons } from './offer-buttons';
import { PlanStepper } from './plan-stepper';
import { KindChips } from './kind-chips';
import { RelaxButtons } from './relax-buttons';
import { RowFourButtons } from './row-four-buttons';
import { StudyGroupBody } from './study-group-body';
import type { TellAct } from '../library/act-stage';
import type { LibraryCardActions } from '../library/use-library-call';
import { type BandFocus, type Corrections, useCorrections } from './use-corrections';
import { SENTENCE } from './line-types';
import { useSlotHeld } from './sentence-slot';

interface CardProps {
  shown: ShownAnswer;
  answer: AnswerReply;
  invitation: PlanInvitation;
  // How high the card may stand before it scrolls, null until it is known.
  room: number | null;
  // A refusal's lines, which keep the Plan on screen (board n8b).
  over?: readonly AnswerLine[];
}

interface BelowProps extends Omit<CardProps, 'room'> {
  fix: Corrections;
  busy: boolean;
  steps?: boolean;
  // A meal's Plan, whose offers are hint lines over its list (`MealBody`).
  meal: boolean;
}

// Under the line: the answer's note, the relax buttons of an answer without a Plan, and the answer's offers as buttons.
// The Plan's band is the time bar's, under the pill, and the main button stands beside the input (`planActionOf`). A
// meal's Plan has no row of buttons: it says its offers as hint lines over its list, and its note once when a hint says
// it; a drag is undone by dragging back (P04 ticket 86).
function Below({ shown, answer, invitation, fix, busy, steps, meal }: BelowProps): ReactElement {
  const { plan } = shown;
  const offers = answer.offers ?? [];
  return (
    <>
      {meal && saidByHint(answer.note, offers) ? null : <CardNote note={answer.note} />}
      {plan === null ? (
        <RelaxButtons busy={busy} onRelax={fix.relax} relax={answer.noPlan?.relax ?? []} undo={shown.undo} />
      ) : null}
      {meal ? null : <OfferButtons offers={offers} />}
      <PlanStepper busy={busy} shown={shown} steps={steps} />
      <RowFourButtons busy={busy} invitation={invitation} shown={shown} />
    </>
  );
}

// The lines a Plan's card says, which the map cannot: a refusal's lines over the Plan it keeps, who cannot come while
// the band is moved over their busy stretch, and why there is no Plan. None otherwise: where, when, who, and the way
// are on the map and the time bar. People are picked in the time card, and the card keeps saying the answer meanwhile
// (P04 ticket 64).
export function linesOf(
  { plan, moving }: Pick<ShownAnswer, 'plan' | 'moving'>,
  answer: AnswerReply,
  over: readonly AnswerLine[] = [],
): readonly AnswerLine[] {
  if (over.length > 0) {
    return over;
  }
  const words = plan === null || moving === null ? null : movingWords(plan.band.lanes, moving);
  return words?.lines ?? (plan === null ? (answer.noPlan?.lines ?? []) : []);
}

// The line, which a press opens to the reply's whole words under it and closes again; without words to open, it
// takes no press.
function Said({
  lines,
  refusal,
  said,
}: {
  lines: readonly AnswerLine[];
  // How many of the lines are a refusal's, which lead them.
  refusal: number;
  said: string;
}): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (lines.length === 0) {
    return null;
  }
  if (said === '') {
    return <AnswerLines lines={lines} refusal={refusal} />;
  }
  return (
    <Pressable
      accessibilityLabel={`${lines.map((line) => line.map(({ text: words }) => words).join('')).join(' ')}, ${open ? '접기' : '전체 보기'}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => {
        setOpen(!open);
      }}
      style={styles.said}
    >
      <AnswerLines lines={lines} refusal={refusal} />
      {open ? <ChatMarkdown style={styles.words} text={said} /> : null}
    </Pressable>
  );
}

// Whether the Plan's card has nothing to read: no line, offer, relax button, or the buttons of events and parties. Then
// the keyboard's view shows it in brief (`restOf`).
export function planCardRests(
  shown: Pick<ShownAnswer, 'plan' | 'adding' | 'moving'>,
  answer: AnswerReply,
  over: readonly AnswerLine[],
): boolean {
  const { plan, adding, moving } = shown;
  const { kind } = answer.input;
  // One form for the whole drag of the band: open, since its lines may come and go under the finger.
  return (
    plan !== null &&
    !adding &&
    moving === null &&
    linesOf(shown, answer, over).length === 0 &&
    (answer.offers ?? []).length === 0 &&
    (kind === 'meal' || kind === 'meet')
  );
}

interface PlanCardProps extends CardProps {
  onClose: () => void;
  focus: BandFocus;
  // The model's words of the reply, which the line opens.
  said?: string;
  // One of several requests, whose candidates have no flag on the map (P04 ticket 09): the stepper switches them.
  steps?: boolean;
  // Where a study answer's group study room tells its main button, and the bubble it tells it for (P10 ticket 11).
  act?: TellAct;
  bubbleId?: number;
  library?: LibraryCardActions;
}

// The answer on screen in the answer frame's card, with no text of its own by default: "＋ 같이" while the Plan can
// take a Friend whose face is not on the map, the line when the map cannot say it (`linesOf`), the note, and the steps. While the list of
// Friends to add is open, the line asks who comes, "그대로" closes the list, and the list stands in place of the steps.
// A Friend chosen and a drop of the band ask for a recalculation, and none takes a press while a recalculation or
// "이대로 초대" is on its way. The Plan's people, its start, its place, and its time are changed on the map and the
// time bar.
// Once the answer is settled (its Plan made, or 바꾸기 or 그대로 두기 done beside a Quest the User holds), nothing is
// chosen again: the answer says so and offers nothing more (review of PR 477).
function settled({ made, changed, left }: PlanInvitation): boolean {
  return made !== null || changed !== null || left !== null;
}

// The words over a meal answer's list (`mealWordsOf`); none over a restaurant's menu, nor under a refusal's lines over
// the Plan, which already say them, nor while a later bubble holds the card's sentence slot (P10 ticket 29). They come
// first, so that the low sheet shows them (P04 ticket 61).
function MealWords({ said, shown }: { said: string; shown: ShownAnswer }): ReactElement | null {
  const words = useSlotHeld() ? '' : mealWordsOf(said, shown);
  return words === '' || shown.menuFor !== null ? null : (
    <View testID="meal-words">
      <ChatMarkdown style={styles.words} text={words} />
    </View>
  );
}

// A meal answer's raised card: the Assistant's whole words, the hint lines of what was missing (P04 ticket 86), then its
// list, or the chosen one's menu, which shows neither (P04 ticket 54). People are picked in its time card (P04 ticket
// 64).
function MealBody(props: PlanCardProps & { busy: boolean }): ReactElement {
  const { shown, answer, invitation, over = [], said = '' } = props;
  return (
    <>
      {over.length > 0 ? null : <MealWords said={said} shown={shown} />}
      {shown.menuFor === null ? <AnswerHints offers={answer.offers ?? []} /> : null}
      <MealSheet
        answer={answer}
        bubbleId={props.bubbleId}
        busy={props.busy || settled(invitation)}
        library={props.library}
        shown={shown}
      />
    </>
  );
}

// A meal answer's raised card holds the list of its candidates (board E3), or the chosen one's menu (board E4).
function MealSheet({
  shown,
  answer,
  busy,
  library,
  bubbleId,
}: {
  shown: ShownAnswer;
  answer: AnswerReply;
  busy: boolean;
  library?: LibraryCardActions;
  bubbleId?: number;
}): ReactElement | null {
  const { plan, menuFor } = shown;
  if (plan !== null && menuFor === plan.id) {
    return <MealMenu answer={answer} bubbleId={bubbleId} library={library} plan={plan} shown={shown} />;
  }
  return <MealList answer={answer} busy={busy} shown={shown} />;
}

export function PlanCard(props: PlanCardProps): ReactElement {
  const { shown, answer, invitation, over = [], onClose, focus, said = '' } = props;
  const busy = shown.recalculating || invitation.sending || invitation.changing;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const meal = shown.plan !== null && mealCard(answer);
  const group = shown.plan?.study?.group;
  return (
    <View style={styles.plan}>
      <Said lines={linesOf(shown, answer, over)} refusal={over.length} said={meal || group !== undefined ? '' : said} />
      {meal ? <MealBody {...props} busy={busy} /> : null}
      {/* A meal with no Plan keeps its conditions, each with its ✕ (P01 ticket 31). */}
      {shown.plan === null && answer.input.kind === 'meal' ? (
        <KindChips answer={answer} change={shown.change} disabled={busy} onChoose={shown.chooseKind} study={null} />
      ) : null}
      {shown.plan !== null && group !== undefined ? (
        <StudyGroupBody
          act={props.act}
          answer={answer}
          bubbleId={props.bubbleId}
          library={props.library}
          busy={busy || settled(invitation)}
          group={group}
          onAdd={fix.toggleAdding}
          plan={shown.plan}
          said={said}
          shown={shown}
        />
      ) : null}
      <Below
        answer={answer}
        busy={busy}
        fix={fix}
        invitation={invitation}
        meal={meal}
        shown={shown}
        steps={props.steps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plan: { gap: space[3] },
  said: { gap: space[2] },
  // The model's words over a meal's list, as every answer's sentence (P01 ticket 19).
  words: SENTENCE,
});
