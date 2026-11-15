/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastAbove } from '@/design-system';
import { type FirstRun, useFirstRun } from '@/features/first-run/use-first-run';
import type { ShuttleLayer } from '@/features/shuttle/use-shuttle';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';
import type { ChatSheetControl } from './chat-sheet';
import { type Room, takenUnderToast, takenUnderToastOverAnswer, takenUnderToastOverCard } from './layout';
import { type Taken, takenBy } from './map-bottom';
import type { MainLayers } from './use-main-layers';
import { useMadeQuestCard } from './use-made-quest-card';
import type { UnaskedCards } from './use-map-view';
import type { Me } from './use-me';
import { useReceivedInvitation } from './use-received-invitation';
import type { Selection } from './use-selection';

// While the map is in front, a toast sits over the row of buttons or above an open card; while the answer frame is
// shown, above its card once that is laid out, and where it sits without a card until then.
function useToastOverMap({ cardHeight, answerHeight }: Room, framed: boolean): void {
  const { bottom } = useSafeAreaInsets();
  let taken = cardHeight === null ? takenUnderToast(bottom) : takenUnderToastOverCard(bottom, cardHeight);
  if (framed) {
    taken = answerHeight === null ? takenUnderToast(bottom) : takenUnderToastOverAnswer(bottom, answerHeight);
  }
  useToastAbove(taken, useIsFocused());
}

// The room the parts over the map have, and the toast's place. What is at the bottom card's place counts: a card at
// the bottom, or the shuttle's notice; one that appears counts from the last one's height until it is laid out. The
// answer frame's card counts on its own while `framed`, from its first layout on. `heights` are the bottom's parts'
// callbacks: the shuttle's notice's, which the first run's card shares, and the answer frame's card's.
export function useRoom(
  { bottomCard, notice }: Taken,
  tutorialStart: boolean,
  framed: boolean,
  interestsHint = false,
  madeLine = false,
): {
  room: Room;
  setStage: (stage: Room['stage']) => void;
  setCardHeight: (height: number) => void;
  heights: { onNoticeHeight: (height: number) => void; onAnswerHeight: (height: number) => void };
} {
  const atBottom = bottomCard || notice !== null;
  const [cardHeight, setCardHeight] = useState(0);
  const [answerHeight, setAnswerHeight] = useState<number | null>(null);
  const [stage, setStage] = useState<Room['stage']>(null);
  if (!framed && answerHeight !== null) {
    setAnswerHeight(null);
  }
  const room: Room = {
    stage,
    cardHeight: atBottom ? cardHeight : null,
    answerHeight: framed ? answerHeight : null,
    tutorialStart: tutorialStart && !atBottom,
    interestsHint: interestsHint && !atBottom,
    madeLine: madeLine && !atBottom,
  };
  useToastOverMap(room, framed);
  return {
    room,
    setStage,
    setCardHeight,
    heights: { onNoticeHeight: setCardHeight, onAnswerHeight: setAnswerHeight },
  };
}

// What takes the bottom of the map, and the room the rest has. The first run's card shows while nothing is selected,
// the User's own card and a pressed building's neither, and neither the chat nor the answer frame is shown. `framed`:
// the answer frame, a received invitation's card, or a made Quest's. `madeLine`: a Quest made from a Plan has its line
// over the input.
export function useBottomRoom(
  selection: Selection,
  chat: ChatSheetControl,
  shuttle: ShuttleLayer,
  { tutorialStart, framed, madeLine }: { tutorialStart: boolean; framed: boolean; madeLine: boolean },
): ReturnType<typeof useRoom> & { taken: Taken; firstRun: FirstRun } {
  const asked = useFirstRun();
  const free = !selection.open && !chat.shown && !framed;
  const firstRun = { ...asked, card: free ? asked.card : null };
  const otherCard = firstRun.card !== null || selection.mine || selection.place !== null;
  const taken = takenBy(selection.selected, shuttle.serviceHours, otherCard);
  return { taken, firstRun, ...useRoom(taken, tutorialStart, framed, asked.asksForInterests, madeLine) };
}

// The cards nobody asked for, a received invitation's and a made Quest's card after inviting; whether the answer
// frame or one of them is shown, which the tab bar gives way to; and what takes the bottom of the map then.
export function useFramedRoom(
  selection: Selection,
  { cards, made, chat, shuttle }: Pick<MainLayers, 'cards' | 'made' | 'chat' | 'shuttle'>,
  me: Me,
  tutorialStart: boolean,
): ReturnType<typeof useBottomRoom> & { unasked: UnaskedCards; framed: boolean } {
  const invitation = useReceivedInvitation(selection, cards, me, chat.framed);
  const madeCard = useMadeQuestCard(selection, made, me, chat.framed);
  const framed = chat.framed || invitation.shown || madeCard.shown !== null;
  useHideTabBarOnMain(framed);
  const madeLine = madeCard.first !== null;
  const bottom = useBottomRoom(selection, chat, shuttle, { tutorialStart, framed, madeLine });
  return { unasked: { invitation, made: madeCard }, framed, ...bottom };
}
