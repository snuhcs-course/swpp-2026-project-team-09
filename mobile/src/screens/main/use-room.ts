/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastAbove } from '@/design-system';
import { type FirstRun, useFirstRun } from '@/features/first-run/use-first-run';
import { useActiveParty } from '@/features/parties/use-active-party';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';
import { AI_INPUT, type Room, takenUnderToast, takenUnderToastOverAnswer, takenUnderToastOverCard } from './layout';
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

// The room the parts over the map have, and the toast's place. A card at the bottom counts; one that appears counts
// from the last one's height until it is laid out. The answer frame's card counts on its own while `framed`, from its
// first layout on. The row of buttons counts while the User is in a Party, as `BottomControls` draws it. `heights`
// are the bottom's parts' callbacks: the first run's card's, the answer frame's card's and the AI input's.
export function useRoom(
  { bottomCard }: Taken,
  tutorialStart: boolean,
  framed: boolean,
  interestsHint = false,
  madeLine = false,
): {
  room: Room;
  setStage: (stage: Room['stage']) => void;
  setCardHeight: (height: number) => void;
  heights: {
    onNoticeHeight: (height: number) => void;
    onAnswerHeight: (height: number) => void;
    onInputHeight: (height: number) => void;
  };
} {
  const atBottom = bottomCard;
  const party = useActiveParty();
  const [cardHeight, setCardHeight] = useState(0);
  const [answerHeight, setAnswerHeight] = useState<number | null>(null);
  const [inputHeight, setInputHeight] = useState<number>(AI_INPUT.height);
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
    buttonRow: party !== null && !atBottom,
    inputHeight,
  };
  useToastOverMap(room, framed);
  return {
    room,
    setStage,
    setCardHeight,
    heights: { onNoticeHeight: setCardHeight, onAnswerHeight: setAnswerHeight, onInputHeight: setInputHeight },
  };
}

// What takes the bottom of the map, and the room the rest has. The first run's card shows while nothing is selected,
// the User's own card and a pressed building's neither, and the answer frame is not shown. `framed`:
// the answer frame, a received invitation's card, or a made Quest's. `madeLine`: a Quest made from a Plan has its line
// over the input.
export function useBottomRoom(
  selection: Selection,
  { tutorialStart, framed, madeLine }: { tutorialStart: boolean; framed: boolean; madeLine: boolean },
): ReturnType<typeof useRoom> & { taken: Taken; firstRun: FirstRun } {
  const asked = useFirstRun();
  const free = !selection.open && !framed;
  const firstRun = { ...asked, card: free ? asked.card : null };
  const otherCard = firstRun.card !== null || selection.mine || selection.place !== null || selection.friend !== null;
  const taken = takenBy(selection.selected, otherCard);
  return { taken, firstRun, ...useRoom(taken, tutorialStart, framed, asked.asksForInterests, madeLine) };
}

// The cards nobody asked for, a received invitation's and a made Quest's card after inviting; whether the answer
// frame or one of them is shown, which the tab bar gives way to, as it does to a 새내기 튜토리얼 quest's guide
// (`guided`); and what takes the bottom of the map then.
export function useFramedRoom(
  selection: Selection,
  { cards, made, chat }: Pick<MainLayers, 'cards' | 'made' | 'chat'>,
  me: Me,
  { tutorialStart, guided }: { tutorialStart: boolean; guided: boolean },
): ReturnType<typeof useBottomRoom> & { unasked: UnaskedCards; framed: boolean } {
  const invitation = useReceivedInvitation(selection, cards, me, chat.framed);
  const madeCard = useMadeQuestCard(selection, made, me, chat.framed);
  const framed = chat.framed || invitation.shown || madeCard.shown !== null;
  useHideTabBarOnMain(framed || guided);
  const madeLine = madeCard.first !== null;
  const bottom = useBottomRoom(selection, { tutorialStart, framed, madeLine });
  return { unasked: { invitation, made: madeCard }, framed, ...bottom };
}
