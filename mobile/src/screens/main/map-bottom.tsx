/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { now } from '@/clock';
import { space } from '@/design-system';
import { restoreOf } from '@/features/assistant/restore';
import { nextMeal } from '@/features/dining/adapter';
import type { FirstRun } from '@/features/first-run/use-first-run';
import type { CardView } from '@/features/map/adapter';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { tabBarHeight } from '../shell/layout';
import { AiInput } from './ai-input';
import { AnswerFrame } from './answer/answer-frame';
import { AnswerActionButton, answerActionOf } from './answer/plan-action';
import { AskedExamples } from './answer/asked-examples';
import { MadeQuestFrame } from './answer/made-quest-frame';
import { InvitationFrame } from './answer/received-invitation-card';
import { RowFourProvider } from './answer/row-four-actions';
import { BottomControls } from './bottom-controls';
import type { ChatSheetControl } from './chat-sheet';
import { LayerControls, type LayerStack } from './layers';
import { FirstRunAsk } from './first-run/first-run-ask';
import { InterestsHint } from './first-run/interests-hint';
import { KeyboardScrim } from './keyboard-scrim';
import {
  aiInputTop,
  interestsHintBottom,
  madeLineBottom,
  PAST_CHATS,
  pastChatsBottom,
  type Room,
  tutorialStartBottom,
} from './layout';
import { MadeQuestLine } from './made-quest-line';
import { mapChipOf, PastChats, placeholderOf } from './past-chats';
import { type GuideActions, TutorialGuideOverlay } from './tutorial/tutorial-guide';
import { TutorialList } from './tutorial/tutorial-list';
import { TutorialSheet } from './tutorial/tutorial-sheet';
import { TutorialStartButton } from './tutorial/tutorial-start-button';
import type { UnaskedCards } from './use-map-view';
import type { TutorialFlow } from './tutorial/use-tutorial-flow';
import type { TutorialPinTarget } from './tutorial/use-tutorial-pin';

// The menu panel at the meal served next, at a restaurant's section or at the top of the list.
export function openMenus(restaurant?: string): void {
  const { date, meal } = nextMeal(now());
  router.push({ pathname: '/menus', params: restaurant === undefined ? { date, meal } : { date, meal, restaurant } });
}

// How much higher the AI input stands while the keyboard is up: the keyboard's reach less what already lies under
// the bar, the navigation with the phone's own bar, which the keyboard covers. 0 while it is down. While the answer
// frame is shown the navigation gives way, and the bar stands above the phone's own bar or the keyboard.
function useKeyboardLift(framed: boolean): { lift: number; keyboardUp: boolean } {
  const { bottom } = useSafeAreaInsets();
  const keyboard = useKeyboardHeight(bottom);
  const lift = framed ? Math.max(bottom, keyboard) : Math.max(0, keyboard - tabBarHeight(bottom));
  return { lift, keyboardUp: keyboard > 0 };
}

// A send puts the keyboard down, so that the frame's card shows the reply.
function sendWithKeyboardDown(send: (text: string) => void): (text: string) => void {
  return (text) => {
    Keyboard.dismiss();
    send(text);
  };
}

// What the open card and the first run's card take. A 식당's card sits at the top: the lists give way to it, and what
// is at the bottom stays. The first run's card is shown only while nothing is selected, and takes the bottom as a card
// does, as the User's own card does. `otherCard`: the first run's card or the User's own is shown.
export interface Taken {
  topCard: boolean;
  bottomCard: boolean;
}

export function takenBy(selected: CardView | null, otherCard = false): Taken {
  const topCard = selected?.kind === 'dining';
  return { topCard, bottomCard: (selected !== null && !topCard) || otherCard };
}

interface MapBottomProps {
  taken: Taken;
  onNoticeHeight: (height: number) => void;
  // The answer frame's card was laid out with this height.
  onAnswerHeight: (height: number) => void;
  // The answer's time bar was laid out with this height, 0 when it went.
  onTimeBarHeight: (height: number) => void;
  // The AI input was laid out with this height.
  onInputHeight: (height: number) => void;
  // "활성 파티": the room of the User's Party's Quest.
  onParty: () => void;
  room: Room;
  stack: LayerStack;
  // The 새내기 튜토리얼: its start button while `room.tutorialStart`, its list, its quests' guides and sheets.
  tutorial: TutorialFlow;
  // A quest's 지도에서 보기.
  onShowOnMap: (target: TutorialPinTarget) => void;
  // A guide's 길찾기: the walking route to its place.
  onRoute: GuideActions['onRoute'];
  // The conversation, which the main screen holds, so that a card's button can ask the Assistant.
  chat: ChatSheetControl;
  // A received invitation, whose card stands at the bottom in place of everything else there while it is shown, and
  // the Quests made from a Plan: the first one's line over the input, and the card after inviting opened again, which
  // stands at the bottom as an invitation's does.
  unasked: UnaskedCards;
  // The first run's card to show, null while another thing takes the bottom, and the line that asks for interests.
  firstRun: Pick<FirstRun, 'card' | 'answer' | 'openInterests'>;
}

type EverydayProps = Pick<
  MapBottomProps,
  'taken' | 'onParty' | 'onNoticeHeight' | 'room' | 'stack' | 'tutorial' | 'firstRun' | 'unasked'
> & { keyboardUp: boolean };

// The line of the first Quest made from a Plan, while the room has it and the keyboard is down.
function MadeLine({
  room,
  unasked,
  keyboardUp,
}: Pick<EverydayProps, 'room' | 'unasked' | 'keyboardUp'>): ReactElement | null {
  const { first, openCard } = unasked.made;
  if (first === null || room.madeLine !== true || keyboardUp) {
    return null;
  }
  return (
    <MadeQuestLine
      bottom={madeLineBottom(room)}
      onPress={() => {
        openCard(first.quest.id);
      }}
      words={first.words}
    />
  );
}

// What the everyday map has at its bottom while no answer and no card nobody asked for is shown: the row of buttons,
// the 편의기능 button, the tutorial's start, the first run's card and its line that asks for interests, and the line of a
// made Quest. While the AI input has the keyboard, the tutorial's start, the first run's card and line, and the made
// Quest's line give way to the examples above it.
function EverydayBottom(props: EverydayProps): ReactElement {
  const { taken, onParty, onNoticeHeight, room, stack, tutorial, firstRun, keyboardUp } = props;
  const { bottomCard } = taken;
  return (
    <>
      <BottomControls cardOpen={bottomCard} onActiveParty={onParty} />
      {bottomCard ? null : <LayerControls stack={stack} />}
      {room.tutorialStart && !keyboardUp ? (
        <TutorialStartButton bottom={tutorialStartBottom(room)} onPress={tutorial.openList} />
      ) : null}
      {firstRun.card === null || keyboardUp ? null : (
        <FirstRunAsk card={firstRun.card} onAnswer={firstRun.answer} onHeight={onNoticeHeight} />
      )}
      {room.interestsHint && !keyboardUp ? (
        <InterestsHint bottom={interestsHintBottom(room)} onPress={firstRun.openInterests} />
      ) : null}
      <MadeLine {...props} />
    </>
  );
}

// The 새내기 튜토리얼's list, its quests' sheets, and the guide of a quest, which takes the whole map while it is open.
function TutorialParts({
  tutorial,
  chat,
  onShowOnMap,
  onRoute,
}: Pick<MapBottomProps, 'tutorial' | 'chat' | 'onShowOnMap' | 'onRoute'>): ReactElement {
  return (
    <>
      <TutorialGuideOverlay flow={tutorial} onAsk={chat.chat.send} onRoute={onRoute} />
      <TutorialList flow={tutorial} />
      <TutorialSheet
        flow={tutorial}
        onAskAssistant={(words) => {
          tutorial.closeSheet();
          chat.chat.send(words);
        }}
        onShowOnMap={(target) => {
          tutorial.closeSheet();
          onShowOnMap(target);
        }}
      />
    </>
  );
}

// What is at the bottom of the map: the everyday map's own (`EverydayBottom`), the answer frame, and the AI input. A
// card at the bottom hides the row and the button. While the keyboard is up and the input is empty, the examples stand
// above it. A message sent from the main map starts a new conversation and shows the answer frame, which hides the
// rest, and the input is its
// card's: it stays in the same place in the tree, so that it keeps the focus. While the keyboard is up, the input
// stands right above it, and a scrim under the frame, the examples and the input puts the keyboard down for a press
// anywhere else (`KeyboardScrim`). The conversation is kept while the app runs: while the frame is hidden, the chip
// "이어서 · …" over the input shows it again. A card nobody asked for, a received invitation's or a made Quest's, takes the bottom
// without the input. A 새내기 튜토리얼 quest's guide takes the whole map while it is open, with no scrim: it has no field,
// and the input is hidden under it.
export function MapBottom(props: MapBottomProps): ReactElement {
  const { onInputHeight, room, tutorial, chat, unasked } = props;
  const { invitation, made } = unasked;
  const { lift, keyboardUp } = useKeyboardLift(chat.framed);
  // While a quest's guide is open it takes the whole map. The AI input stays mounted, hidden, so that a draft is kept.
  const guided = tutorial.guide !== null;
  const cardShown = invitation.shown || made.shown !== null;
  // The open list of Friends to add takes the input's place in the answer's card. The time band moved whole hides the
  // input but keeps its room, so that the card and its lanes stay under the finger.
  const inputGone = chat.framed && chat.answer.adding;
  const inputShown = !inputGone && !(chat.framed && chat.answer.moving !== null);
  const inputTop = inputGone ? lift : aiInputTop(room) + lift;
  // On the main map a message always starts a new conversation; in the answer it goes on with the one on screen.
  const send = sendWithKeyboardDown(chat.framed ? chat.chat.send : chat.chat.sendNew);
  const action = answerActionOf(chat);
  const [empty, setEmpty] = useState(true);
  return (
    <>
      {guided ? null : (
        <FramedParts
          {...props}
          cardShown={cardShown}
          empty={empty}
          inputTop={inputTop}
          keyboardUp={keyboardUp}
          send={send}
        />
      )}
      <View style={[styles.inputLayer, guided && styles.gone]}>
        {inputShown && !cardShown ? (
          <AiInput
            lift={lift}
            onHeight={onInputHeight}
            focusKey={chat.started}
            placeholder={placeholderOf(chat)}
            restore={restoreOf(chat.said)}
            onSend={send}
            onEmpty={setEmpty}
            beside={besideOf(chat, action, keyboardUp)}
            inCard={chat.framed}
          />
        ) : null}
      </View>
      <TutorialParts {...props} />
    </>
  );
}

type FramedProps = MapBottomProps & {
  cardShown: boolean;
  // The AI input holds nothing: only then do the examples stand over the keyboard.
  empty: boolean;
  inputTop: number;
  keyboardUp: boolean;
  send: (text: string) => void;
};

// The everyday map's bottom, the answer frame, the examples over the keyboard, and the cards nobody asked for: none of
// them while a quest's guide is open.
function FramedParts(props: FramedProps): ReactElement {
  const { chat, room, unasked, onAnswerHeight, onTimeBarHeight, cardShown, inputTop, keyboardUp, empty, send } = props;
  const { invitation, made } = unasked;
  return (
    <>
      {!chat.framed && !cardShown ? <EverydayBottom {...props} keyboardUp={keyboardUp} /> : null}
      {keyboardUp ? <KeyboardScrim /> : null}
      <RowFourProvider control={chat}>
        <AnswerFrame
          control={chat}
          inputTop={inputTop}
          keyboardUp={keyboardUp}
          onBarHeight={onTimeBarHeight}
          onHeight={onAnswerHeight}
          room={room}
        />
      </RowFourProvider>
      <MapQuestions {...props} />
      {!chat.framed && keyboardUp && empty ? <AskedExamples bottom={examplesBottom(props)} onSend={send} /> : null}
      {invitation.shown ? <InvitationFrame invitation={invitation} onHeight={onAnswerHeight} room={room} /> : null}
      {made.shown === null ? null : (
        <MadeQuestFrame made={made.shown} onClose={made.closeCard} onHeight={onAnswerHeight} room={room} />
      )}
    </>
  );
}

// "지난 대화 N ▾" while it shows: over the input while the keyboard is up, under the examples; else at the left with
// the made Quest's line.
function pastChatsAt({ chat, room, cardShown, inputTop, keyboardUp }: FramedProps): number | null {
  if (mapChipOf(chat) === null || cardShown || room.pastChats !== true) {
    return null;
  }
  return keyboardUp ? inputTop + space[2] : pastChatsBottom(room);
}

function examplesBottom(props: FramedProps): number {
  const chip = props.keyboardUp ? pastChatsAt(props) : null;
  return chip === null ? props.inputTop + space[2] : chip + PAST_CHATS.height + space[2];
}

function MapQuestions(props: FramedProps): ReactElement | null {
  const bottom = pastChatsAt(props);
  const chip = mapChipOf(props.chat);
  return bottom === null || chip === null ? null : (
    <PastChats bottom={bottom} chip={chip} control={props.chat} stageHeight={props.room.stage?.height ?? null} />
  );
}

// At the input's right: the answer's main button while the keyboard is down. The main map has nothing there: a message
// from it starts a new conversation by itself (P04 ticket 33).
function besideOf(chat: ChatSheetControl, action: ReturnType<typeof answerActionOf>, keyboardUp: boolean): ReactNode {
  return action === null || keyboardUp ? null : <AnswerActionButton action={action} control={chat} />;
}

const styles = StyleSheet.create({
  inputLayer: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
  gone: { display: 'none' },
});
