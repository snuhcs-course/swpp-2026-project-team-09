/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
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
  // The scene of its Places and the User, null while none is shown.
  scene: MapScene | null;
  openCard: (questId: string) => void;
  closeCard: () => void;
}

// Where the User was when a made Quest's card opened, or first known after it, as after a cold start: a later move of
// the phone moves no camera.
function usePositionAtOpen(questId: string | null, position: LatLng | null): LatLng | null {
  const [opened, setOpened] = useState<{ questId: string | null; at: LatLng | null }>({ questId, at: position });
  const stale = opened.questId !== questId || (opened.at === null && position !== null);
  if (stale) {
    setOpened({ questId, at: position });
  }
  return stale ? position : opened.at;
}

// The scene of the made Quest's Places and the User, a new one only when what it draws changes: a read of the Quests or
// a signal changes the card's chips, and moves no camera. Kept in state by what it draws, for it is made anew each
// render.
function useScene(shown: MadeQuestView | null, at: LatLng | null): MapScene | null {
  const scene = shown === null ? null : madeQuestScene(shown, { userId: myUserId(), at });
  const key = JSON.stringify(scene);
  const [kept, setKept] = useState<{ key: string; scene: MapScene | null }>({ key: 'null', scene: null });
  if (kept.key === key) {
    return kept.scene;
  }
  setKept({ key, scene });
  return scene;
}

// The card after inviting of a Quest made from a Plan, opened again by its flag or its line: it is shown while its
// flag is selected and the answer frame is not, and the map draws the Quest's Places and where the User was.
export function useMadeQuestCard(
  selection: Selection,
  made: readonly MadeQuestView[],
  { position }: Pick<Me, 'position'>,
  framed: boolean,
): MadeQuestCard {
  const { selected, select, close: closeCard } = selection;
  const selectedId = selected?.kind === 'made-quest' && !framed ? selected.id : null;
  const shown = made.find(({ quest }) => cardId.madeQuest(quest.id) === selectedId) ?? null;
  const at = usePositionAtOpen(shown?.quest.id ?? null, position);
  const scene = useScene(shown, at);
  return {
    first: made[0] ?? null,
    shown,
    scene,
    openCard: (questId) => {
      select(cardId.madeQuest(questId));
    },
    closeCard,
  };
}
