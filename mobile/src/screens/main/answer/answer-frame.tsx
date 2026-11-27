/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import { lastReply } from '@/features/assistant/use-shown-answer';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import { shownParts, speaksForItself } from '../library/chat-library-cards';
import type { CardActions } from '../chat-cards';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import type { Room } from '../layout';
import { AnswerCaption } from './answer-caption';
import { useCardTop } from './card-top';
import { CaptionQuestions, type QuestionsOpen, Typing } from './card-questions';
import { useAnswerRaising } from './card-state';
import { KeptCards } from './kept-scene';
import { WaitingReply } from './failed-and-waiting';
import { CONTENT_TOP, contentMaxOf, FrameCard } from './frame-card';
import { MarkCard } from './mark-card';
import { ReplyPicks } from './reply-picks';
import { SetQuestLine } from './set-quest-line';
import { LeaveRow } from './leave-button';
import { MarkRows } from './mark-rows';
import { MadeMarkCard } from './made-mark-card';
import type { Raising } from './raise-handle';
import { ReplySteps } from './reply-steps';
import { barOf, onScreenOf, TopBar, Words } from './reply-words';
import { SheetLinkContext, useSheetLink } from './sheet-link';
import { type BandFocus, useBandFocus } from './use-corrections';

interface AnswerCardProps {
  control: ChatSheetControl;
  cardActions: CardActions;
  // From the stage's bottom to a little above the bar's top: the room the card keeps for the bar.
  barRoom: number;
  // The stage's height, null until it is laid out.
  stageHeight: number | null;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
  onClose: () => void;
  raising: Raising;
  focus: BandFocus;
  // The bar of several requests' height with the Plan's bar under it, while it stands at the top; else 0.
  stepsTop: number;
  // The conversation's questions, opened in the card by its caption.
  list: QuestionsOpen;
}

// The card at the bottom: what was asked as a small caption on top (rule 5 of the 2026-11-22 redesign), then the turn's
// bubbles without a bubble around them, each under its steps when it answered several requests, or the dots with 그만
// in their place, then the room of the bar. A press on the caption opens the conversation's questions in the card. While
// the keyboard is up, the questions and the turn's follow-ups stand above the input in place of its content, unless the
// card is raised (board 6).
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onClose, raising, stepsTop, list } = props;
  const skippedLine = (control.answer.plan?.band.skipped?.length ?? 0) > 0;
  const card = { barRoom, onHeight, raising, stageHeight, stepsTop, skippedLine };
  const typing = keyboardUp && raising.level === 'low';
  const top = useCardTop(control, raising, list, { onClose });
  const { waiting } = control.chat;
  const contentMax = contentMaxOf(stageHeight, barRoom);
  return (
    <FrameCard
      {...card}
      {...top}
      chip={typing ? null : <AnswerCaption control={control} listOpen={list.open} onList={list.toggle} />}
      // While typing, low shows the content whole up to the middle step.
      fit={typing}
      atTop={control.pick.place !== null}
      layer={control.answer.menuFor}
      layerOf={control.answer.answer}
      hold={waiting}
      testID="answer-card"
    >
      {typing || list.open ? null : <KeptCards cardActions={props.cardActions} control={control} />}
      {typing ? (
        <Typing control={control} />
      ) : list.open ? (
        <CaptionQuestions control={control} list={list} onClose={onClose} />
      ) : (
        <OpenAnswer {...props} room={contentMax === null ? null : contentMax - CONTENT_TOP} />
      )}
    </FrameCard>
  );
}

// A booking on the map alone says its own sentence in its card in place of the reply's words, lowered, raised, and
// booked (P01 ticket 03); a seat card that is one of several requests keeps the reply's Plan (PR 490's review).
function dockedBubble(control: AnswerCardProps['control']): number | null {
  return control.booking !== null && control.steps === null ? control.booking.bubbleId : null;
}

// The open card's content: the turn's bubbles, each under its steps, and the dots with 그만 while a reply is on its way.
function OpenAnswer(props: AnswerCardProps & { room: number | null }): ReactElement {
  const { control, cardActions, focus, onClose, room } = props;
  const { bubbles, waiting, retry } = control.chat;
  const docked = dockedBubble(control);
  const turn = turnOf(bubbles);
  const parts = shownParts(turn?.after ?? []);
  const last = bubbles.at(-1);
  // While a Place is picked on the map the card is mostly low: the picking line and its chip that stops it come first,
  // where the low card shows them, as the dock had them (PR 545's review).
  const picking = control.pick.place !== null;
  return (
    <>
      {parts.map((bubble) => (
        <View key={bubble.id} style={styles.part}>
          {bubble === turn?.after[0] ? <SetQuestLine control={control} /> : null}
          {bubble === last && picking ? <ReplyPicks control={control} /> : null}
          {bubble.steps === undefined ? null : (
            <ReplySteps onMap={control.steps?.bubbleId === bubble.id} steps={bubble.steps} />
          )}
          <BubbleParts
            bubble={bubble}
            cardActions={cardActions}
            onRetry={bubble.failure === 'unavailable' && bubble === last && !waiting && control.latest ? retry : null}
            onShowLayer={control.leaving.showLayer}
            words={
              bubble.id === docked || speaksForItself(bubble) ? null : (
                <Words
                  act={control.libraryAct.tell}
                  library={cardActions.library}
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
              )
            }
          />
          {bubble === last && !picking ? <ReplyPicks control={control} /> : null}
        </View>
      ))}
      {waiting ? <WaitingReply onStop={control.chat.stop} /> : <LeaveRow control={control} />}
    </>
  );
}

interface FramedProps {
  control: ChatSheetControl;
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
  // The time bar's height, 0 while there is none.
  onBarHeight: (height: number) => void;
  stage: Room['stage'];
}

interface OpenMarkProps {
  control: ChatSheetControl;
  stage: Room['stage'];
  focus: BandFocus;
  onClose: () => void;
}

// The card of the mark pressed on the map, while one is open and the keyboard is down: a mark of the Plan on screen, or
// the flag of a Proposal or a booking on screen (`MadeMarkCard`).
function OpenMark({ control, stage, focus, onClose }: OpenMarkProps): ReactElement | null {
  const { mark, closeMark, answer: shown } = control;
  if (
    mark !== null &&
    stage !== null &&
    (control.proposal !== null || control.booking !== null || control.cards !== null)
  ) {
    return <MadeMarkCard control={control} mark={mark} stage={stage} />;
  }
  if (mark === null || stage === null || shown.answer === null || shown.plan === null) {
    return null;
  }
  return (
    <MarkCard beside={mark.id.startsWith('answer:person:')} mark={mark} onClose={closeMark} stage={stage}>
      <MarkRows
        answer={shown.answer}
        focus={focus}
        id={mark.id}
        onClose={onClose}
        onDone={closeMark}
        plan={shown.plan}
        shown={shown}
      />
    </MarkCard>
  );
}

// The bar's height while it is shown, told to the screen for the camera's fit; 0 while there is none. The card's high
// hangs on it only under the bar of several requests (`card-caps.ts`).
function useBarHeight(
  shown: boolean,
  onBarHeight: (height: number) => void,
): { height: number; onHeight: (height: number) => void } {
  const [height, setHeight] = useState(0);
  const told = shown ? height : 0;
  useEffect(() => {
    onBarHeight(told);
  }, [told, onBarHeight]);
  return { height: told, onHeight: setHeight };
}

// The frame itself: the time bar at the top when the answer has a time, "←" as a round button over the map at the top
// left, under the bar when there is one, and one card at the bottom with what was asked as its caption and the reply over the input (the
// 2026-11-22 redesign). "←", Android's back button, and dragging the card down, docked or lowered, hide the frame and keep
// the conversation, a reply on its way included. A Friend's profile opened from the card stands
// over it until a new reply; while it is shown, the back button hides it alone. This handler is the only one, and
// listens only while the main screen is in front, so a screen pushed from the profile goes back to it. Back takes away
// one layer per press (`backOf`); a drag only changes the card's height or closes the answer (P04 ticket 63).
function Framed(props: FramedProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onBarHeight, stage } = props;
  const { chat, leaving, hide } = control;
  const close = useCallback((): void => {
    Keyboard.dismiss();
    hide();
  }, [hide]);
  const profile = useProfileOver(lastReply(chat.bubbles)?.id ?? null);
  const profileShown = profile.friend !== null && !keyboardUp;
  const [past, setPast] = useState(false);
  const { raising, list, back } = useAnswerRaising(control, close, setPast);
  useBackToClose(useIsFocused(), profileShown ? profile.hide : back, { edge: false });
  const { actions, sheets } = useCardActions(chat, leaving);
  const focus = useBandFocus();
  // A booked seat has no bar: "←" stands at the top (P01 ticket 04).
  const drawnBar = (control.booking !== null && !control.booking.booked) || control.steps !== null;
  const barShown = !keyboardUp && (drawnBar || barOf(chat.bubbles, onScreenOf(control)) !== null);
  const bar = useBarHeight(barShown, onBarHeight);
  const link = useSheetLink(raising);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <SheetLinkContext value={link}>
        <View style={[styles.top, past && styles.faded]}>
          {barShown ? <TopBar control={control} focus={focus} onClose={close} onHeight={bar.onHeight} /> : null}
        </View>
        <AnswerCard
          barRoom={barRoom}
          cardActions={actions}
          control={control}
          focus={focus}
          keyboardUp={keyboardUp}
          list={list}
          onClose={close}
          onHeight={onHeight}
          raising={raising}
          stageHeight={stageHeight}
          stepsTop={control.steps === null ? 0 : bar.height}
        />
      </SheetLinkContext>
      {keyboardUp ? null : <OpenMark control={control} focus={focus} onClose={close} stage={stage} />}
      {sheets}
    </FriendProfileOver>
  );
}

interface AnswerFrameProps {
  control: ChatSheetControl;
  // The AI input's top, from the stage's bottom.
  inputTop: number;
  keyboardUp: boolean;
  onHeight: (height: number) => void;
  onBarHeight: (height: number) => void;
  room: Room;
}

// The answer frame over the map while the conversation holds something and the frame was not left.
export function AnswerFrame(props: AnswerFrameProps): ReactElement | null {
  const { control, inputTop, keyboardUp, onHeight, onBarHeight, room } = props;
  return control.framed ? (
    <Framed
      barRoom={inputTop + space[3]}
      control={control}
      keyboardUp={keyboardUp}
      onBarHeight={onBarHeight}
      onHeight={onHeight}
      stage={room.stage}
      stageHeight={room.stage?.height ?? null}
    />
  ) : null;
}

const styles = StyleSheet.create({
  part: { gap: space[2] },
  // "←" and the bar, which fade while the card is dragged down to close (P04 ticket 12).
  top: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  faded: { opacity: 0.35 },
});
