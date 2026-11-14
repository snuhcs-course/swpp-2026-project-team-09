/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo, useState } from 'react';
import type { LatLng } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import { madeQuestScene } from '@/features/assistant/made-quests';
import type { MadeQuestView } from '@/features/assistant/use-made-quests';
import { cardId } from '@/features/map/adapter';
import type { Me } from './use-me';
import type { Selection } from './use-selection';

export interface MadeQuestCard {
  // The first of the Quests made from a Plan, whose line stands above the input; null without one.
  first: MadeQuestView | null;
  // The made Quest whose card after inviting is shown, while no answer frame is.
  shown: MadeQuestView | null;
  // Its Places and the User, null while none is shown.
  drawing: AnswerDrawing | null;
  open: (questId: string) => void;
  close: () => void;
}

// Where the User was when a made Quest's card opened: a later move of the phone moves no camera.
function usePositionAtOpen(questId: string | null, position: LatLng | null): LatLng | null {
  const [opened, setOpened] = useState<{ questId: string | null; at: LatLng | null }>({ questId, at: position });
  if (opened.questId !== questId) {
    setOpened({ questId, at: position });
  }
  return opened.questId === questId ? opened.at : position;
}

// The card after inviting of a Quest made from a Plan, opened again by its flag or its line: it is shown while its
// card is selected and the answer frame is not, and the map draws the Quest's Places and where the User was.
export function useMadeQuestCard(
  selection: Selection,
  made: readonly MadeQuestView[],
  { position }: Pick<Me, 'position'>,
  framed: boolean,
): MadeQuestCard {
  const { selected, select, close } = selection;
  const selectedId = selected?.kind === 'made-quest' && !framed ? selected.id : null;
  const shown = made.find(({ quest }) => cardId.quest(quest.id) === selectedId) ?? null;
  const at = usePositionAtOpen(shown?.quest.id ?? null, position);
  const drawing = useMemo(
    () => (shown === null ? null : drawingOfScene(madeQuestScene(shown, shown.words, { userId: myUserId(), at }))),
    [shown, at],
  );
  return {
    first: made[0] ?? null,
    shown,
    drawing,
    open: (questId) => {
      select(cardId.quest(questId));
    },
    close,
  };
}
