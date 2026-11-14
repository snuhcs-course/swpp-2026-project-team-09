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

// While the map is in front, a toast sits over the row of buttons, above an open card, or above the answer frame's
// card.
function useToastOverMap(cardHeight: number | null, answerHeight: number | null): void {
  const { bottom } = useSafeAreaInsets();
  let taken = cardHeight === null ? takenUnderToast(bottom) : takenUnderToastOverCard(bottom, cardHeight);
  if (answerHeight !== null) {
    taken = takenUnderToastOverAnswer(bottom, answerHeight);
  }
  useToastAbove(taken, useIsFocused());
}

// The room the parts over the map have, and the toast's place. What is at the bottom card's place counts: a card at
// the bottom, or the shuttle's notice; one that appears counts from the last one's height until it is laid out. While
// `framed`, the answer frame's card takes that place.
export function useRoom(
  atBottom: boolean,
  tutorialStart: boolean,
  framed: boolean,
): {
  room: Room;
  setStage: (stage: Room['stage']) => void;
  setCardHeight: (height: number) => void;
} {
  const [cardHeight, setCardHeight] = useState(0);
  const [stage, setStage] = useState<Room['stage']>(null);
  const room: Room = { stage, cardHeight: atBottom ? cardHeight : null, tutorialStart: tutorialStart && !atBottom };
  useToastOverMap(room.cardHeight, framed ? cardHeight : null);
  return { room, setStage, setCardHeight };
}
