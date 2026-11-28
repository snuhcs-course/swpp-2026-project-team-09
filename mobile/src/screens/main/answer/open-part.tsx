/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { stepPartsOf } from '@/features/assistant/step-choice';
import type { ShownSteps } from '@/features/assistant/steps-scene';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import type { ChatSheetControl } from '../chat-sheet';
import { speaksForItself } from '../library/chat-library-cards';
import { ReplyPicks } from './reply-picks';
import { ReplySteps } from './reply-steps';
import { Words } from './reply-words';
import { drawsWords, holdsSlot, SlotHeld } from './sentence-slot';
import { SetQuestLine } from './set-quest-line';
import type { BandFocus } from './use-corrections';

// One bubble of the answer card's open content (moved from `answer-frame.tsx`, which keeps the card's frame).

interface OpenPartProps {
  control: ChatSheetControl;
  cardActions: CardActions;
  focus: BandFocus;
  onClose: () => void;
  // How high the Plan's card may stand before the card scrolls, null until it is known.
  room: number | null;
  bubble: ChatBubble;
  // The turn's replies, the last of which holds the sentence slot.
  after: readonly ChatBubble[];
  // The bubble whose booking speaks in its own card, or null.
  docked: number | null;
}

// A reply's words in the card. A reply under a later bubble of its turn, whose words are its card, keeps the card, and
// its sentence and explaining line give way to the slot's holder (P01 ticket 20; P10 ticket 29).
function slotWords(
  { control, cardActions, focus, onClose, room }: Omit<OpenPartProps, 'bubble' | 'after' | 'docked'>,
  bubble: ChatBubble,
  holds: boolean,
): ReactElement {
  return (
    <SlotHeld value={!holds}>
      <Words
        group={{ act: control.libraryAct.tell, library: cardActions.library }}
        addRecalculated={control.chat.addRecalculated}
        bubble={bubble}
        focus={focus}
        invitation={control.invitation}
        lookup={control.lookup}
        onAsk={control.chat.send}
        onClose={onClose}
        room={room}
        shown={control.answer}
      />
    </SlotHeld>
  );
}

// A reply's steps over its bubble: those on the map as they stand now (P10 ticket 29), so that a step not done since
// says why.
function BubbleSteps({ bubble, onMap }: { bubble: ChatBubble; onMap: ShownSteps | null }): ReactElement | null {
  if (bubble.steps === undefined) {
    return null;
  }
  const live = onMap?.bubbleId === bubble.id ? onMap : null;
  return <ReplySteps onMap={live !== null} steps={live?.steps ?? bubble.steps} />;
}

// One bubble of the open card under its steps: what the card shows of it, which for a reply of several requests is the
// chosen step's own answer (P03 ticket 23). While a Place is picked on the map the card is mostly low: the picking line
// and its chip that stops it come first, where the low card shows them, as the dock had them (PR 545's review).
export function OpenPart(props: OpenPartProps): ReactElement {
  const { control, cardActions, bubble, after, docked } = props;
  const { bubbles, waiting, retry } = control.chat;
  const last = bubbles.at(-1);
  const picking = control.pick.place !== null;
  const part = stepPartsOf(bubble, control.steps, control.activeStep);
  const words =
    bubble.id === docked || speaksForItself(bubble) || !drawsWords(bubble, after, part)
      ? null
      : slotWords(props, part, holdsSlot(bubble, after));
  return (
    <View style={styles.part}>
      {bubble === after[0] ? <SetQuestLine control={control} /> : null}
      {bubble === last && picking ? <ReplyPicks control={control} /> : null}
      <BubbleSteps bubble={bubble} onMap={control.steps} />
      <BubbleParts
        bubble={part}
        cardActions={cardActions}
        onRetry={bubble.failure === 'unavailable' && bubble === last && !waiting && control.latest ? retry : null}
        onShowLayer={control.leaving.showLayer}
        words={words}
      />
      {bubble === last && !picking ? <ReplyPicks control={control} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: space[2] },
});
