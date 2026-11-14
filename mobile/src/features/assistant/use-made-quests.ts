/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { onInvitationAnswer } from '@/live/invitation-answers';
import { useAnswerSwitch } from './answer-switch';
import { friendStandings, type HeardAnswer, type Standing } from './invited-friends';
import { madeQuestIdsQuery, useDropMadeQuests } from './made-quest-ids';
import { endedIds, flagWords, type MadeQuest, madeQuests } from './made-quests';

export interface MadeQuestView extends MadeQuest {
  // How each invited Friend stands, by user id.
  standings: ReadonlyMap<string, Standing>;
  // What its flag and its line say: "12:33 점심 · 수락 1/2".
  words: string;
}

// What a read of the User's Quests says of the ids the phone kept: the made Quests, and the ids it no longer needs.
interface MadeRead {
  made: MadeQuest[];
  ended: string[];
}

const NONE: readonly MadeQuestView[] = [];
const NO_IDS: readonly string[] = [];

// The signals of an answer to an invitation heard while the switch is on, each with when it was heard.
function useHeard(on: boolean): readonly HeardAnswer[] {
  const [heard, setHeard] = useState<readonly HeardAnswer[]>([]);
  useEffect(
    () =>
      on
        ? onInvitationAnswer((answer) => {
            setHeard((last) => [...last, { ...answer, heardAt: Date.now() }]);
          })
        : undefined,
    [on],
  );
  return heard;
}

// The kept ids whose Quest a read of the User's Quests no longer holds, or holds ended, are dropped: by a read that came
// after the ids last changed, for one from before may not hold a Quest made since.
function useDropEnded(ended: readonly string[], readAt: number, keptAt: number): void {
  const drop = useDropMadeQuests();
  const dropEnded = useEffectEvent(() => {
    if (ended.length > 0 && readAt > keptAt) {
      drop(ended);
    }
  });
  useEffect(() => {
    dropEnded();
  }, [readAt, keptAt]);
}

// The Quests made from a Plan on this phone that the User waits on, the earliest first, each with how its Friends
// stand by the latest word: a signal heard after the Quests were read, else the members they hold. With the switch off
// there are none, and neither the kept ids, the Quests, nor the signals are read or listened to.
export function useMadeQuests(): readonly MadeQuestView[] {
  const on = useAnswerSwitch();
  const kept = useQuery({ ...madeQuestIdsQuery, enabled: on });
  const ids = kept.data ?? NO_IDS;
  // The clock is read when the Quests are read, or the kept ids change: nothing ticks between.
  const select = useCallback(
    (quests: Quest[]): MadeRead => {
      const at = now();
      return { made: madeQuests(quests, myUserId(), at, ids), ended: endedIds(quests, ids, at) };
    },
    [ids],
  );
  const { data, dataUpdatedAt } = useQuery({ ...questsQuery, subscribed: on, select });
  useDropEnded(on ? (data?.ended ?? NO_IDS) : NO_IDS, dataUpdatedAt, kept.dataUpdatedAt);
  const heard = useHeard(on);
  return useMemo(() => {
    if (!on || data === undefined) {
      return NONE;
    }
    return data.made.map((made): MadeQuestView => {
      const invited = { quest: made.quest, invitations: made.friends.map(({ id }) => ({ userId: id })) };
      const read = { members: made.quest.members ?? [], readAt: dataUpdatedAt };
      const standings = friendStandings(invited, read, heard);
      return { ...made, standings, words: flagWords(made, standings) };
    });
  }, [on, data, dataUpdatedAt, heard]);
}
