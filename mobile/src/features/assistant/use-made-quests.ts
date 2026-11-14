/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { questsQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { onInvitationAnswer } from '@/live/invitation-answers';
import { useAnswerSwitch } from './answer-switch';
import { friendStandings, type HeardAnswer, type Standing } from './invited-friends';
import { flagWords, type MadeQuest, madeQuests } from './made-quests';

export interface MadeQuestView extends MadeQuest {
  // How each invited Friend stands, by user id.
  standings: ReadonlyMap<string, Standing>;
  // What its flag and its line say: "12:33 점심 · 수락 1/2".
  words: string;
}

const NONE: readonly MadeQuestView[] = [];

// Defined outside the hook, so that it runs again only when the Quests are read again: the clock is read then.
function selectMade(quests: Quest[]): MadeQuest[] {
  return madeQuests(quests, myUserId(), now());
}

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

// The Quests made from a Plan that the User waits on, the earliest first, each with how its Friends stand by the latest
// word: a signal heard after the Quests were read, else the members they hold. With the switch off there are none, and
// neither the Quests nor the signals are listened to.
export function useMadeQuests(): readonly MadeQuestView[] {
  const on = useAnswerSwitch();
  const { data, dataUpdatedAt } = useQuery({ ...questsQuery, subscribed: on, select: selectMade });
  const heard = useHeard(on);
  return useMemo(() => {
    if (!on || data === undefined) {
      return NONE;
    }
    return data.map((made): MadeQuestView => {
      const invited = { quest: made.quest, invitations: made.friends.map(({ id }) => ({ userId: id })) };
      const read = { members: made.quest.members ?? [], readAt: dataUpdatedAt };
      const standings = friendStandings(invited, read, heard);
      return { ...made, standings, words: flagWords(made, standings) };
    });
  }, [on, data, dataUpdatedAt, heard]);
}
