/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnswerLine, AnswerReply, ConditionChip } from '@/api/assistant-types';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button, color, space, text } from '@/design-system';
import { movingWords } from '@/features/assistant/band-move';
import { modelWordsOf } from '@/features/assistant/model-words';
import { easedFromNow } from '@/features/assistant/relaxed-plan';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { ChatMarkdown } from '../chat-markdown';
import { useOpenFriendProfile } from '../friend-profile';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { PlanChips } from './plan-chips';
import { LINE_LEAST } from './dock-chips';
import { FriendChoices } from './friend-choices';
import { MainButtons } from './main-buttons';
import { MealList, mealCard } from './meal-list';
import { MealMenu } from './meal-menu';
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
  steps?: boolean;
}

// Under the line: the list of Friends while it is open, else the answer's note and the steps. The Plan's band is the
// time bar's, under the pill.
function Below({ shown, answer, invitation, room, fix, busy, onProfile, steps }: BelowProps): ReactElement {
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
      <PlanStepper busy={busy} shown={shown} steps={steps} />
      <RowFourButtons busy={busy} invitation={invitation} shown={shown} />
    </>
  );
}

// The lines a Plan's card says, which the map cannot: who comes while the list of Friends is open, a refusal's lines
// over the Plan it keeps, who cannot come while the band is moved over their busy stretch, and why there is no Plan.
// None otherwise: where, when, who, and the way are on the map and the time bar.
export function linesOf(
  { plan, moving }: Pick<ShownAnswer, 'plan' | 'moving'>,
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
// the frame docks it: one row with the input and the main button, and the chips "＋ 같이", "지난 답 N개", and the note
// when they show.
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
    linesOf(shown, answer, false, over).length === 0 &&
    !easedFromNow(answer.input) &&
    (answer.offers ?? []).length === 0 &&
    (kind === 'meal' || kind === 'meet')
  );
}

// The person chips over the card: a meal answer's raised card has every person of the Plan over its list, with ✕ where
// one can be taken out; any other card those whom the map draws no face for.
function chipsOf(answer: AnswerReply, shown: Pick<ShownAnswer, 'plan'>, meal: boolean): ConditionChip[] {
  return meal
    ? answer.chips.filter(({ kind, userId }) => kind === 'person' && userId !== null)
    : facelessChips(answer, shown);
}

// The chips of the Plan's people whom the scene draws no face for, those whose position is unknown ("민수 · 자리
// 모름"): their chip keeps their profile and their ✕, since the map has no face to press.
export function facelessChips(answer: AnswerReply, { plan }: Pick<ShownAnswer, 'plan'>): ConditionChip[] {
  const drawn = new Set((plan?.scene.people ?? []).map(({ userId }) => userId));
  return answer.chips.filter(({ kind, userId }) => kind === 'person' && userId !== null && !drawn.has(userId));
}

interface PlanCardProps extends CardProps {
  onClose: () => void;
  focus: BandFocus;
  // The model's words of the reply, which the line opens.
  said?: string;
  // Docked: the card is its chips' row alone, these chips after "＋ 같이"; the note is one of them.
  dock?: ReactNode;
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

// The Assistant's whole words over a meal answer's list, which the dock cuts at two lines (P04 ticket 45); none over a
// restaurant's menu, nor under a refusal's lines over the Plan, which already say them. They come first and keep the
// dock's line's box, so that lowered to the dock's height the card shows what the dock shows (P04 ticket 54).
function MealWords({ said, shown }: { said: string; shown: ShownAnswer }): ReactElement | null {
  const words = modelWordsOf(said);
  return words === '' || shown.menuFor !== null ? null : (
    <View style={styles.mealWords} testID="meal-words">
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
      <MealWords said={over.length > 0 ? '' : said} shown={shown} />
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
  const { shown, answer, invitation, room, over = [], onClose, focus, said = '', dock } = props;
  const busy = shown.recalculating || invitation.sending || invitation.changing;
  const fix = useCorrections(shown, answer.input, onClose, focus);
  const openProfile = useOpenFriendProfile();
  const corner = fix.adding ? { words: '그대로', icon: null, onPress: fix.toggleAdding } : null;
  // While the Plan can take more people: the map does not draw every Friend's face (one near the answer's own marks
  // gives way), so the + on a face is not enough. It stands in the time bar (P04 ticket 14), and here only where no
  // bar is: an answer without a Plan, or while the keyboard hides the bar.
  const barShown = useKeyboardHeight() === 0 && shown.plan !== null;
  const addName = !barShown && (fix.adding || fix.choices.length > 0) ? addNameOf(answer.input.kind) : null;
  const docked = dock !== undefined;
  const meal = !docked && !fix.adding && shown.plan !== null && mealCard(answer);
  const faceless = chipsOf(answer, shown, meal);
  const chips =
    addName === null && corner === null && faceless.length === 0 && !docked ? null : (
      <PlanChips
        addName={addName}
        answer={answer}
        busy={busy}
        chips={faceless}
        corner={corner}
        dock={dock}
        fix={fix}
        onProfile={openProfile}
      />
    );
  return (
    <View style={styles.plan}>
      {meal ? null : chips}
      {docked ? null : <Said lines={linesOf(shown, answer, fix.adding, over)} said={meal ? '' : said} />}
      {meal ? <MealBody {...props} busy={busy} chips={chips} /> : null}
      {docked ? null : (
        <Below
          answer={answer}
          busy={busy}
          fix={fix}
          invitation={invitation}
          onProfile={openProfile}
          room={room}
          shown={shown}
          steps={props.steps}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plan: { gap: space[3] },
  said: { gap: space[2] },
  words: { ...text.body, color: color.ink },
  mealWords: { justifyContent: 'center', minHeight: LINE_LEAST },
  steps: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  undo: { width: UNDO_WIDTH },
});
