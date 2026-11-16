/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { useToast } from '@/design-system';
import { heldAlone } from './adapter';
import { leftOnPurpose } from './leaving';

// A Quest also leaves the list once all its Sub Quests ended, and the main server still lets the User read it. Any
// other answer, the room's `QUEST_NOT_FOUND` or no answer at all, is told: the list has moved past the Quest, so a
// toast lost here would never come.
async function tellIfGone(questId: string, title: string, showToast: (words: string) => void): Promise<void> {
  if (leftOnPurpose(questId)) {
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
// come and go with the timetable, and a Quest taken alone ends only by the User's own doing and is no 파티: neither is
// watched. Draws nothing; the room of a Quest that is gone closes itself.
export function GoneQuestsWatch(): null {
  const { data } = useQuery(questsQuery);
  const showToast = useToast();
  const known = useRef<ReadonlyMap<string, Quest> | null>(null);
  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const watched = data.filter((quest) => !quest.classQuest && !heldAlone(quest));
    const held = new Map(watched.map((quest) => [quest.id, quest]));
    // Joining a 파티 for a Global Event deletes the User's own one-person Quest for it: the event is still held.
    const events = new Set([...held.values()].map(({ globalEvent }) => globalEvent?.id));
    const before = known.current;
    known.current = held;
    for (const [questId, { title, globalEvent }] of before ?? []) {
      if (!held.has(questId) && (globalEvent === null || !events.has(globalEvent.id))) {
        void tellIfGone(questId, title, showToast);
      }
    }
  }, [data, showToast]);
  return null;
}
