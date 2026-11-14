/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastAbove } from '@/design-system';
import { type Room, takenUnderToast, takenUnderToastOverAnswer, takenUnderToastOverCard } from './layout';
import type { Taken } from './map-bottom';

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
// callbacks: the shuttle's notice's and the answer frame's card's.
export function useRoom(
  { bottomCard, notice }: Taken,
  tutorialStart: boolean,
  framed: boolean,
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
  };
  useToastOverMap(room, framed);
  return {
    room,
    setStage,
    setCardHeight,
    heights: { onNoticeHeight: setCardHeight, onAnswerHeight: setAnswerHeight },
  };
}
