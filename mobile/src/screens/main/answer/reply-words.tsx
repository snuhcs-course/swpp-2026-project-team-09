/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { color, text } from '@/design-system';
import { modelWordsOf } from '@/features/assistant/model-words';
import { sceneBubblesOf } from '@/features/assistant/scene-bubbles';
import { turnsOf } from '@/features/assistant/turn';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import { keepsShown, type ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ShownLookup } from '@/features/assistant/use-shown-lookup';
import { ChatMarkdown } from '../chat-markdown';
import type { ChatSheetControl } from '../chat-sheet';
import { AnswerLines } from './answer-lines';
import { FailedLines } from './failed-and-waiting';
import { LookupCard } from './lookup-card';
import { MadeCard } from './made-card';
import { OfferedWords } from './offered-words';
import { PlanCard } from './plan-card';
import { type RefusalAsk, RefusalReply } from './refusal-reply';
import { StepsTop } from './steps-bar';
import { BookingBar, LookupBar, PlanBar } from './time-bar';
import type { BandFocus } from './use-corrections';
import { offeredAnswer } from '@/features/assistant/meal-offered';

// Which card a reply's words are: the Plan's, or the made Quest's once its Plan was made into one, for the reply the
// answer on screen came from, the Lookup on screen for its reply, or the reply's own.
type WordsKind = 'plan' | 'made' | 'lookup' | 'own';

interface OnScreen {
  shown: ShownAnswer;
  lookup: ShownLookup;
  invitation: PlanInvitation;
}

// What deciding a reply's card reads of what is on screen.
interface Seen {
  shown: Pick<ShownAnswer, 'source' | 'answer' | 'plan'>;
  lookup: Pick<ShownLookup, 'lookup'>;
  invitation: Pick<PlanInvitation, 'made'>;
}

function lookupOf(bubble: ChatBubble, { lookup }: Seen): ShownLookup['lookup'] {
  return keepsShown(bubble) ? lookup.lookup : (bubble.lookup ?? null);
}

export function wordsKindOf(bubble: ChatBubble, onScreen: Seen): WordsKind {
  const { shown, invitation } = onScreen;
  const { answer } = bubble;
  const fromReply = answer !== undefined && answer !== null && offeredAnswer(answer) === shown.source;
  // A plan chosen in words is the plan's card, opened at its Restaurant (P05 ticket 56).
  const chosen = bubble.select !== undefined && shown.answer?.plans.some(({ id }) => id === bubble.select) === true;
  if ((fromReply || keepsShown(bubble) || chosen) && shown.answer !== null) {
    return invitation.made === null || shown.plan === null ? 'plan' : 'made';
  }
  const lookup = lookupOf(bubble, onScreen);
  return lookup !== null && lookup === onScreen.lookup.lookup ? 'lookup' : 'own';
}

// The time bar the latest turn with a reply has: the band of its Plan's card, or of its Lookup's, which have one.
type BarOf = { kind: 'plan' } | { kind: 'lookup'; lookup: NonNullable<ShownLookup['lookup']> } | null;

export function onScreenOf({ answer, lookup, invitation }: ChatSheetControl): OnScreen {
  return { shown: answer, lookup, invitation };
}

export function barOf(bubbles: readonly ChatBubble[], onScreen: Seen): BarOf {
  // While a follow-up's reply is on its way its turn holds nothing yet, and the answer before it stays on the map:
  // its bar stays too, as the card keeps its height, so that the camera does not move twice. So does it under a
  // follow-up answered with words alone (P04 ticket 46, `sceneBubblesOf`).
  const turn = turnsOf(sceneBubblesOf(bubbles)).findLast(({ after }) => after.length > 0);
  for (const bubble of turn?.after ?? []) {
    const kind = wordsKindOf(bubble, onScreen);
    if (kind === 'plan' && onScreen.shown.plan !== null) {
      return { kind };
    }
    const lookup = onScreen.lookup.lookup;
    if (kind === 'lookup' && lookup !== null && lookup.band !== null) {
      return { kind, lookup };
    }
  }
  return null;
}

// Whether the latest turn with a reply shows the Plan's card of the answer on screen.
export function planShown(bubbles: readonly ChatBubble[], onScreen: Seen): boolean {
  const turn = turnsOf(sceneBubblesOf(bubbles)).findLast(({ after }) => after.length > 0);
  return turn?.after.some((bubble) => wordsKindOf(bubble, onScreen) === 'plan') ?? false;
}

// The reply of the latest turn with a reply whose words are the Lookup on screen.
export function lookupReplyOf(bubbles: readonly ChatBubble[], onScreen: Seen): ChatBubble | undefined {
  const turn = turnsOf(sceneBubblesOf(bubbles)).findLast(({ after }) => after.length > 0);
  return turn?.after.find((bubble) => wordsKindOf(bubble, onScreen) === 'lookup');
}

interface WordsProps extends OnScreen {
  bubble: ChatBubble;
  focus: BandFocus;
  // How high the Plan's card may stand before the card scrolls, null until it is known.
  room: number | null;
  onClose: () => void;
  onAsk: RefusalAsk;
  // A turn a Lookup's button asked of the recalculation.
  addRecalculated: Chat['addRecalculated'];
}

// The card of the answer on screen a reply's words are, by `wordsKindOf`, with a refusal's lines over the Plan's when
// the refusal keeps what is on screen; null when they are not one.
function onScreenCard(props: WordsProps, kind: WordsKind): ReactElement | null {
  const { bubble, shown, invitation, room, onClose, focus } = props;
  const over = keepsShown(bubble) ? bubble.refusal?.lines : undefined;
  const { answer, plan } = shown;
  if (kind === 'plan' && answer !== null) {
    const card = { answer, invitation, onClose, over, room, shown };
    const steps = (bubble.steps?.length ?? 0) > 1;
    // A choice's words are not the card's: the history list keeps them (P05 ticket 56).
    const said = bubble.select === undefined ? bubble.text : '';
    return <PlanCard {...card} focus={focus} said={said} steps={steps} />;
  }
  if (kind === 'made' && answer !== null && plan !== null && invitation.made !== null) {
    return <MadeCard {...{ answer, invitation, onClose, over, plan }} made={invitation.made} />;
  }
  return null;
}

// A reply's words: the card of the answer on screen, the Lookup on screen under the model's words, or with a refusal's
// lines over the Lookup's when the refusal stands beside it, else a refusal's lines and offers, a failure's lines, or
// the lines of its answer's first Plan or those that say why it has none in place of the model's sentence; otherwise
// the sentence as Markdown, or a Lookup's lines when the model said nothing (P04 ticket 18: words are never dropped).
export function Words(props: WordsProps): ReactElement {
  const { bubble, onAsk, addRecalculated } = props;
  const { answer, refusal = null } = bubble;
  const kind = wordsKindOf(bubble, props);
  const own = onScreenCard(props, kind);
  if (own !== null) {
    return own;
  }
  const lookup = lookupOf(bubble, props);
  if (kind === 'lookup' && lookup !== null) {
    const card = (
      <LookupCard
        addRecalculated={addRecalculated}
        lookup={lookup}
        onAsk={onAsk}
        refusal={refusal}
        shown={props.lookup}
      />
    );
    // The model's words stand over the Lookup: they say why it is shown (P04 ticket 18).
    return refusal === null && modelWordsOf(bubble.text) !== '' ? (
      <>
        <ChatMarkdown style={styles.words} text={bubble.text} />
        {card}
      </>
    ) : (
      card
    );
  }
  if (refusal !== null) {
    return <RefusalReply onAsk={onAsk} refusal={refusal} />;
  }
  if (bubble.failure === 'unavailable') {
    return <FailedLines text={bubble.text} />;
  }
  if (bubble.offers !== undefined && bubble.offers.length > 0) {
    return <OfferedWords offers={bubble.offers} onAsk={onAsk} text={bubble.text} />;
  }
  const lines =
    answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? (modelWordsOf(bubble.text) === '' ? lookup?.lines : undefined);
  return lines === undefined ? <ChatMarkdown style={styles.words} text={bubble.text} /> : <AnswerLines lines={lines} />;
}

interface TopBarProps {
  control: ChatSheetControl;
  focus: BandFocus;
  onClose: () => void;
  onHeight: (height: number) => void;
}

// The time bar of the turn on screen, while it has a time, a booking's on the map first (P04 ticket 07): none once 그대로 두기 left a Quest already set as it is, for
// the Plan is gone (P04 ticket 20).
export function TopBar({ control, focus, onClose, onHeight }: TopBarProps): ReactElement | null {
  const { answer: shown, invitation, booking, steps } = control;
  if (steps !== null) {
    return <StepsTop control={control} focus={focus} onClose={onClose} onHeight={onHeight} />;
  }
  if (booking !== null) {
    return <BookingBar booking={booking} chat={control.chat} onHeight={onHeight} />;
  }
  const bar = barOf(control.chat.bubbles, onScreenOf(control));
  if (bar === null) {
    return null;
  }
  if (bar.kind === 'lookup') {
    return <LookupBar lookup={bar.lookup} onHeight={onHeight} />;
  }
  const leftAlone = invitation.left !== null && invitation.made === null && invitation.changed === null;
  return shown.answer === null || shown.plan === null || leftAlone ? null : (
    <PlanBar
      answer={shown.answer}
      focus={focus}
      invitation={invitation}
      onClose={onClose}
      onHeight={onHeight}
      plan={shown.plan}
      shown={shown}
    />
  );
}

const styles = StyleSheet.create({
  words: { ...text.bodyLg, color: color.ink },
});
