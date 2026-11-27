/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { useToast } from '@/design-system';
import { heldAlone } from './adapter';
import { leftOnPurpose } from './leaving';

type GoneWay = 'removed' | 'ended' | 'unknown';

// What the main server says of a Quest that left the list: removed, when the Leader's removal of the User is listed;
// ended, when the Quest is not found otherwise; null when the User still holds it.
async function goneWay(questId: string): Promise<GoneWay | null> {
  let notFound = false;
  try {
    await apiClient.getQuest(questId);
    return null;
  } catch (error) {
    notFound = isRefusal(error, 404, 'QUEST_NOT_FOUND');
  }
  const removals = await apiClient.listQuestRemovals().catch(() => null);
  if (removals?.some((removal) => removal.questId === questId) === true) {
    return 'removed';
  }
  return notFound ? 'ended' : 'unknown';
}

// The toast's words of a 파티 gone, as its Notification says.
function goneWords(title: string, way: GoneWay): string {
  if (way === 'removed') {
    return `${title} 파티에서 내보내졌어요`;
  }
  return way === 'ended' ? `${title} 파티가 없어졌어요` : `${title} 파티에서 빠졌어요`;
}

// A Quest also leaves the list once all its Sub Quests ended, and the main server still lets the User read it. Any
// other answer, the room's `QUEST_NOT_FOUND` or no answer at all, is told: the list has moved past the Quest, so a
// toast lost here would never come. A removal is told apart from an end by the User's removals; when the main server
// cannot say which, the words say only that the User is out.
async function tellIfGone(questId: string, title: string, showToast: (words: string) => void): Promise<void> {
  if (leftOnPurpose(questId)) {
    return;
  }
  const way = await goneWay(questId);
  if (way !== null) {
    showToast(goneWords(title, way));
  }
}

// Watches the User's Quests wherever the User is in the signed-in app. A Quest that was in the list and is not when
// the list comes again, on `quests-changed` or otherwise, is told once with a toast, unless the User left or ended it
// here. What happened before the app started is told by its Notification in 알림, not here. Class Quests
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
