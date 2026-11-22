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
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { space } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import { lastReply } from '@/features/assistant/use-shown-answer';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import { useCardActions } from '../chat-card-actions';
import type { ChatSheetControl } from '../chat-sheet';
import { FriendProfileOver, useProfileOver } from '../friend-profile';
import { AI_INPUT, type Room } from '../layout';
import { AnswerCaption } from './answer-caption';
import { CardQuestions, QUESTIONS_MAX, type QuestionsOpen, Typing } from './card-questions';
import { BackButton } from './back-button';
import { WaitingReply } from './failed-and-waiting';
import { CONTENT_TOP, contentMaxOf, FrameCard } from './frame-card';
import { MarkCard } from './mark-card';
import { DockedAnswer, restOf } from './docked-answer';
import { LeaveRow } from './leave-button';
import { MarkRows } from './mark-rows';
import { MadeMarkCard } from './made-mark-card';
import type { Raising } from './raise-handle';
import { ReplySteps } from './reply-steps';
import { barOf, onScreenOf, TopBar, Words } from './reply-words';
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
  // The time bar's height under the pill, 0 for none: the raised card stops under it.
  timeBarHeight: number;
  inputBottom: number;
  // The conversation's questions, opened in the card by its caption.
  list: QuestionsOpen;
}

// The card at the bottom: what was asked as a small caption on top (rule 5 of the 2026-11-22 redesign), then the turn's
// bubbles without a bubble around them, each under its steps when it answered several requests, or the dots with 그만
// in their place, then the room of the bar. A press on the caption opens the conversation's questions in the card. While
// the keyboard is up, the questions and the turn's follow-ups stand above the input in place of its content, unless the
// card is raised (board 6).
function AnswerCard(props: AnswerCardProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onClose, raising, focus, timeBarHeight, list } = props;
  const card = { barRoom, onHeight, raising, stageHeight, timeBarHeight, inputBottom: props.inputBottom };
  const { bubbles, waiting } = control.chat;
  const after = turnOf(bubbles)?.after ?? [];
  const contentMax = contentMaxOf(stageHeight, barRoom);
  const typing = keyboardUp && !raising.raised;
  const rest = keyboardUp || raising.raised || waiting || list.open ? null : restOf(control, after);
  const [reply] = after;
  const raise = (): void => {
    raising.setRaised(true);
  };
  return (
    <FrameCard {...card} docked={rest !== null} hold={waiting} testID="answer-card">
      {typing || control.answer.menuFor !== null ? null : (
        <AnswerCaption control={control} listOpen={list.open} onList={list.toggle} />
      )}
      {typing ? (
        <Typing control={control} />
      ) : list.open ? (
        <CardQuestions control={control} maxHeight={QUESTIONS_MAX} onDone={list.close} />
      ) : rest !== null && reply !== undefined ? (
        <DockedAnswer bubble={reply} control={control} focus={focus} onClose={onClose} onRaise={raise} rest={rest} />
      ) : (
        <OpenAnswer {...props} room={contentMax === null ? null : contentMax - CONTENT_TOP} />
      )}
    </FrameCard>
  );
}

// The open card's content: the turn's bubbles, each under its steps, and the dots with 그만 while a reply is on its way.
function OpenAnswer(props: AnswerCardProps & { room: number | null }): ReactElement {
  const { control, cardActions, focus, onClose, room } = props;
  const { bubbles, waiting, retry } = control.chat;
  // A booking on the map alone says its own sentence in its card in place of the reply's words, lowered, raised, and
  // booked (P01 ticket 03); a seat card that is one of several requests keeps the reply's Plan (PR 490's review).
  const docked = control.booking !== null && control.steps === null ? control.booking.bubbleId : null;
  const turn = turnOf(bubbles);
  const last = bubbles.at(-1);
  return (
    <>
      {(turn?.after ?? []).map((bubble) => (
        <View key={bubble.id} style={styles.part}>
          {bubble.steps === undefined ? null : (
            <ReplySteps onMap={control.steps?.bubbleId === bubble.id} steps={bubble.steps} />
          )}
          <BubbleParts
            bubble={bubble}
            cardActions={cardActions}
            onRetry={bubble.failure === 'unavailable' && bubble === last && !waiting && control.latest ? retry : null}
            onShowLayer={control.leaving.showLayer}
            words={
              bubble.id === docked ? null : (
                <Words
                  addRecalculated={control.chat.addRecalculated}
                  bubble={bubble}
                  focus={focus}
                  howAbout={control.howAbout}
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
        </View>
      ))}
      {waiting ? <WaitingReply onStop={control.chat.stop} /> : <LeaveRow control={control} />}
    </>
  );
}

interface CardState {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  lower: () => void;
  list: QuestionsOpen;
}

// Whether the card is raised, which the control holds so that a press on the map raises it too, and whether the list
// of questions is open in the card.
// The list closes when the turn on screen changes (`turn`, its last bubble's id): a message sent, a reply come, or a
// question pressed while typing, so that the card shows that turn (PR 479's review).
function useCardState({ raised, setRaised }: ChatSheetControl['card'], turn: number | null): CardState {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(turn);
  if (seen !== turn) {
    setSeen(turn);
    setOpen(false);
  }
  const lower = useCallback((): void => {
    setRaised(false);
  }, [setRaised]);
  const toggle = useCallback((): void => {
    setOpen((last) => !last);
  }, []);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  return { raised, setRaised, lower, list: { open, toggle, close } };
}

interface BackLayers {
  list: QuestionsOpen;
  control: ChatSheetControl;
  raised: boolean;
  lower: () => void;
  leave: () => void;
}

// What Android's back takes away, one layer a press: the list of questions, a mark's card, a restaurant's menu (back to
// the list of candidates), the raised card, then the answer.
function backOf({ list, control, raised, lower, leave }: BackLayers): () => void {
  if (list.open) {
    return list.close;
  }
  if (control.mark !== null) {
    return control.closeMark;
  }
  if (control.answer.menuFor !== null) {
    return control.answer.closeMenu;
  }
  return raised ? lower : leave;
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
  // The AI input's bottom, from the stage's bottom: the docked card's edge stands just under it.
  inputBottom: number;
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

// The bar's height while it is shown, told to the screen for the camera's fit; 0 while there is none.
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

// The frame itself: the time bar at the top when the answer has a time, with "←" in its head, else "←" as a round button
// over the map, and one card at the bottom with what was asked as its caption and the reply over the input (the
// 2026-11-22 redesign). "←", Android's back button, and dragging the docked card down hide the frame and keep the
// conversation, a reply on its way included. While a building is asked about over the answer ("여기면 어때?"), "←" and
// back return to the answer instead, and the caption names the building. A Friend's profile opened from the card stands
// over it until a new reply; while it is shown, the back button hides it alone. This handler is the only one, and
// listens only while the main screen is in front, so a screen pushed from the profile goes back to it. Back takes away
// one layer per press (`backOf`). While a restaurant's menu is open the caption gives way to the menu's own head.
function Framed(props: FramedProps): ReactElement {
  const { control, barRoom, stageHeight, keyboardUp, onHeight, onBarHeight, stage, inputBottom } = props;
  const { chat, leaving, hide } = control;
  const close = useCallback((): void => {
    Keyboard.dismiss();
    hide();
  }, [hide]);
  const profile = useProfileOver(lastReply(chat.bubbles)?.id ?? null);
  const profileShown = profile.friend !== null && !keyboardUp;
  const { keep } = control.howAbout;
  const title = control.howAbout.title;
  const leave = title === null ? close : keep;
  const { raised, setRaised, lower, list } = useCardState(control.card, chat.bubbles.at(-1)?.id ?? null);
  const back = backOf({ list, control, raised, lower, leave });
  useBackToClose(useIsFocused(), profileShown ? profile.hide : back, { edge: false });
  const { actions, sheets } = useCardActions(chat, leaving);
  const focus = useBandFocus();
  // A booked seat has no bar: "←" is the round button over the map (P01 ticket 04).
  const drawnBar = (control.booking !== null && !control.booking.booked) || control.steps !== null;
  const barShown = !keyboardUp && (drawnBar || barOf(chat.bubbles, onScreenOf(control)) !== null);
  const bar = useBarHeight(barShown, onBarHeight);
  const [past, setPast] = useState(false);
  return (
    <FriendProfileOver keyboardUp={keyboardUp} profile={profile}>
      <View style={[styles.top, past && styles.faded]}>
        {barShown ? <TopBar control={control} focus={focus} onClose={close} onHeight={bar.onHeight} /> : null}
        <BackButton onBar={barShown && bar.height > 0} onPress={leave} />
      </View>
      <AnswerCard
        timeBarHeight={bar.height}
        barRoom={barRoom}
        cardActions={actions}
        inputBottom={inputBottom}
        control={control}
        focus={focus}
        keyboardUp={keyboardUp}
        list={list}
        onClose={close}
        onHeight={onHeight}
        raising={{ raised, setRaised, close: leave, onPast: setPast }}
        stageHeight={stageHeight}
      />
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
      inputBottom={inputTop - (room.inputHeight ?? AI_INPUT.height)}
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
