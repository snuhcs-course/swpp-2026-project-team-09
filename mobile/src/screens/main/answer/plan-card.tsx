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
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnswerLine, AnswerReply } from '@/api/assistant-types';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button, color, space, text } from '@/design-system';
import { movingWords } from '@/features/assistant/band-move';
import { easedFromNow } from '@/features/assistant/relaxed-plan';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { ChatMarkdown } from '../chat-markdown';
import { useOpenFriendProfile } from '../friend-profile';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { PlanChips } from './plan-chips';
import { MainButtons } from './main-buttons';
import { MealList, mealCard } from './meal-list';
import { MealMenu } from './meal-menu';
import { mealWordsOf } from './meal-words';
import { PlanStepper } from './plan-stepper';
import { RelaxButtons } from './relax-buttons';
import { RowFourButtons } from './row-four-buttons';
import { type BandFocus, type Corrections, useCorrections } from './use-corrections';
import { addNameOf } from './who-words';

const UNDO_WIDTH = 96;

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

interface BelowProps extends Omit<CardProps, 'room'> {
  fix: Corrections;
  busy: boolean;
  steps?: boolean;
}

// Under the line: the answer's note and the steps. The Plan's band is the time bar's, under the pill.
function Below({ shown, answer, invitation, fix, busy, steps }: BelowProps): ReactElement {
  const { plan } = shown;
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
      accessibilityLabel={`${lines.map((line) => line.map(({ text: words }) => words).join('')).join(' ')}, ${open ? '접기' : '전체 보기'}`}
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
// the keyboard's view shows it in brief (`restOf`).
export function planCardRests(
  shown: Pick<ShownAnswer, 'plan' | 'ghost' | 'adding' | 'moving'>,
  answer: AnswerReply,
  over: readonly AnswerLine[],
): boolean {
  const { plan, ghost, adding, moving } = shown;
  const { kind } = answer.input;
  // One form for the whole drag of the band: open, since its lines may come and go under the finger.
  return (
    plan !== null &&
    !adding &&
    ghost === null &&
    moving === null &&
    linesOf(shown, answer, over).length === 0 &&
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
  // One of several requests, whose candidates have no flag on the map (P04 ticket 09): the stepper switches them.
  steps?: boolean;
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
// the Plan, which already say them. They come first, so that the low sheet shows them (P04 ticket 61).
function MealWords({ said, shown }: { said: string; shown: ShownAnswer }): ReactElement | null {
  const words = mealWordsOf(said, shown);
  return words === '' || shown.menuFor !== null ? null : (
    <View testID="meal-words">
      <ChatMarkdown style={styles.words} text={words} />
    </View>
  );
}

// A meal answer's raised card: the Assistant's whole words, the person chips under them (`chips`), then its list, or
// the chosen one's menu (P04 ticket 54).
function MealBody(props: PlanCardProps & { busy: boolean; chips: ReactNode }): ReactElement {
  const { shown, answer, invitation, over = [], said = '' } = props;
  return (
    <>
      {over.length > 0 ? null : <MealWords said={said} shown={shown} />}
      {props.chips}
      <MealSheet answer={answer} busy={props.busy || settled(invitation)} shown={shown} />
    </>
  );
}

// A meal answer's raised card holds the list of its candidates (board E3), or the chosen one's menu (board E4).
function MealSheet({
  shown,
  answer,
  busy,
}: {
  shown: ShownAnswer;
  answer: AnswerReply;
  busy: boolean;
}): ReactElement | null {
  const { plan, menuFor } = shown;
  if (plan !== null && menuFor === plan.id) {
    return <MealMenu answer={answer} plan={plan} shown={shown} />;
  }
  return <MealList answer={answer} busy={busy} shown={shown} />;
}

export function PlanCard(props: PlanCardProps): ReactElement {
  const { shown, answer, invitation, over = [], onClose, focus, said = '' } = props;
  const busy = shown.recalculating || invitation.sending || invitation.changing;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const openProfile = useOpenFriendProfile();
  // While the Plan can take more people: the map does not draw every Friend's face (one near the answer's own marks
  // gives way), so the + on a face is not enough. It stands in the time bar (P04 ticket 14), and here only where no
  // bar is: an answer without a Plan, or while the keyboard hides the bar.
  const barShown = useKeyboardHeight() === 0 && shown.plan !== null;
  const addName = !barShown && (fix.adding || fix.choices.length > 0) ? addNameOf(answer.input.kind) : null;
  const meal = shown.plan !== null && mealCard(answer);
  // The Plan's people are its time card's rows, picked there: the card has no chips of people (P04 ticket 64).
  const chips =
    addName === null ? null : (
      <PlanChips
        addName={addName}
        answer={answer}
        busy={busy}
        chips={[]}
        corner={null}
        fix={fix}
        onProfile={openProfile}
      />
    );
  return (
    <View style={styles.plan}>
      {meal ? null : chips}
      <Said lines={linesOf(shown, answer, over)} said={meal ? '' : said} />
      {meal ? <MealBody {...props} busy={busy} chips={chips} /> : null}
      <Below answer={answer} busy={busy} fix={fix} invitation={invitation} shown={shown} steps={props.steps} />
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
