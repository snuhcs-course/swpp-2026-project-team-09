/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { questsQuery } from '@/api/queries';
import { useToast } from '@/design-system';

// The Quests the User is leaving or ending on this phone. Their disappearance from the list is the User's own doing,
// and is not told.
const leaving = new Set<string>();

// Runs the User's own leave or end of a Quest. While it runs and once it is taken, the Quest leaving the list is not
// told; when it is refused, the mark is dropped, so that a removal by the Leader later is still told.
export async function leavingOnPurpose(questId: string, leave: () => Promise<boolean>): Promise<boolean> {
  leaving.add(questId);
  const left = await leave();
  if (!left) {
    leaving.delete(questId);
  }
  return left;
}

// A Quest also leaves the list once all its Sub Quests ended, and the main server still lets the User read it. Any
// other answer, the room's `QUEST_NOT_FOUND` or no answer at all, is told: the list has moved past the Quest, so a
// toast lost here would never come.
async function tellIfGone(questId: string, title: string, showToast: (words: string) => void): Promise<void> {
  if (leaving.has(questId)) {
    leaving.delete(questId);
    return;
  }
  try {
    await apiClient.getQuest(questId);
  } catch {
    showToast(`${title} 파티에서 빠졌어요`);
  }
}

// Watches the User's Quests wherever the User is in the signed-in app. A Quest that was in the list and is not when
// the list comes again, on `quests-changed` or otherwise, is told once with a toast, unless the User left or ended it
// here. Removal and ending are not told apart, and what happened before the app started is not told. Class Quests
// come and go with the timetable and are not watched. Draws nothing; the room of a Quest that is gone closes itself.
export function GoneQuestsWatch(): null {
  const { data } = useQuery(questsQuery);
  const showToast = useToast();
  const known = useRef<ReadonlyMap<string, string> | null>(null);
  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const held = new Map(data.filter(({ classQuest }) => !classQuest).map(({ id, title }) => [id, title]));
    const before = known.current;
    known.current = held;
    for (const [questId, title] of before ?? []) {
      if (!held.has(questId)) {
        void tellIfGone(questId, title, showToast);
      }
    }
  }, [data, showToast]);
  return null;
}
