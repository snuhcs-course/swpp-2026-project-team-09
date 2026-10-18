/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { ApiError, isRefusal } from '@/api/errors';
import {
  JOIN_REQUESTS_KEY,
  MY_PARTY_KEY,
  PARTIES_KEY,
  POSITIONS_KEY,
  QUESTS_KEY,
  SENT_INVITATIONS_KEY,
} from '@/api/queries';
import type { SubQuestContent } from '@/api/room-types';
import type { MyParty, Quest, SubQuest } from '@/api/types';
import type { JoinRequest } from '@/api/waiting-types';
import { useToast } from '@/design-system';
import { useDeclineParty } from '@/features/parties/declined';
import { refusalWords } from '@/features/quests/refusals';
import type { MemberView } from '@/features/quests/room-adapter';

// What the room's controls ask of the main server, each with its toast. A refusal says why in Korean, and what the
// room shows is fetched again, so that it shows what the main server holds now.

const ROOM_KEYS: readonly QueryKey[] = [
  QUESTS_KEY,
  MY_PARTY_KEY,
  PARTIES_KEY,
  POSITIONS_KEY,
  JOIN_REQUESTS_KEY,
  SENT_INVITATIONS_KEY,
];

// How the User gets out of another Party first: not at all, leaving it (true), or ending it ('end'), the one the User
// leads.
export type LeaveFirst = boolean | 'end';

export interface RoomActions {
  // `others` are the other Holders, told of it; `leaveFirst` gets the User out of the other Party first.
  openParty: (quest: Quest, others: number, leaveFirst: LeaveFirst) => Promise<void>;
  joinParty: (partyId: string, leaveFirst: LeaveFirst) => Promise<void>;
  declineParty: (partyId: string) => void;
  leaveParty: () => Promise<void>;
  endParty: () => Promise<void>;
  setSharing: (on: boolean) => Promise<void>;
  // True once the main server took it.
  addSubQuest: (questId: string, content: SubQuestContent, key: string) => Promise<boolean>;
  editSubQuest: (questId: string, subQuestId: string, content: SubQuestContent) => Promise<boolean>;
  cancelSubQuest: (questId: string, subQuest: SubQuest) => Promise<void>;
  // Marks the Sub Quest done for the User, or unmarks one done.
  toggleDone: (questId: string, subQuest: SubQuest) => Promise<void>;
  accept: (questId: string, request: JoinRequest) => Promise<void>;
  decline: (questId: string, request: JoinRequest) => Promise<void>;
  cancelInvitation: (questId: string, invitation: JoinRequest) => Promise<void>;
  removeHolder: (questId: string, member: MemberView, fromParty: boolean) => Promise<void>;
  handOver: (questId: string, member: MemberView) => Promise<void>;
  // `party` is how the User is in the Quest's Party. True once the Quest is left.
  leaveQuest: (questId: string, party: 'leads' | 'member' | 'none') => Promise<boolean>;
  endQuest: (questId: string, party: 'leads' | 'member' | 'none') => Promise<boolean>;
}

// The Party another Holder opened for the Quest at the same moment, which the refusal names.
function runningPartyOf(error: unknown): string | null {
  if (!isRefusal(error, 409, 'PARTY_EXISTS_FOR_QUEST') || !(error instanceof ApiError)) {
    return null;
  }
  const body = error.body;
  const partyId: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'partyId') : undefined;
  return typeof partyId === 'string' ? partyId : null;
}

// Leaves the Party the User is in, or ends it, before entering another. Gives the title of a Party it ended, which
// the room then no longer shows as the User's, or null.
async function leaveIf(queryClient: QueryClient, first: LeaveFirst): Promise<string | null> {
  if (first === 'end') {
    const title = queryClient.getQueryData<MyParty | null>(MY_PARTY_KEY)?.title ?? '';
    await apiClient.endParty();
    queryClient.setQueryData<MyParty | null>(MY_PARTY_KEY, null);
    return title;
  }
  if (first) {
    await apiClient.leaveParty();
  }
  return null;
}

// Why entering the other Party failed: after ending the User's own, that it is off although the User is in no Party.
function enteringWords(ended: string | null, error: unknown): string {
  return ended === null ? refusalWords(error) : `‘${ended}’ 활성화는 꺼졌지만 새 파티에 들어가지 못했어요`;
}

// How the User leaves the Quest's Party before the Quest: the Leader of the Party ends it, a member leaves it.
async function outOfParty(party: 'leads' | 'member' | 'none', ends: boolean): Promise<void> {
  if (party === 'leads' && ends) {
    await apiClient.endParty();
  } else if (party !== 'none') {
    await apiClient.leaveParty();
  }
}

// What every action uses: the cache, the toast, and `run`, which runs requests, says `done` once they were taken or
// why not, and fetches what the room shows again either way.
interface Tools {
  queryClient: QueryClient;
  showToast: (words: string) => void;
  refetch: () => void;
  run: (requests: () => Promise<unknown>, done: string | null) => Promise<boolean>;
}

function toolsOf(queryClient: QueryClient, showToast: (words: string) => void): Tools {
  const refetch = (): void => {
    for (const queryKey of ROOM_KEYS) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
  const run = async (requests: () => Promise<unknown>, done: string | null): Promise<boolean> => {
    try {
      await requests();
      if (done !== null) {
        showToast(done);
      }
      return true;
    } catch (error) {
      showToast(refusalWords(error));
      return false;
    } finally {
      refetch();
    }
  };
  return { queryClient, showToast, refetch, run };
}

function enter(queryClient: QueryClient, party: MyParty): void {
  queryClient.setQueryData<MyParty | null>(MY_PARTY_KEY, party);
}

function showSharing(queryClient: QueryClient, on: boolean): void {
  queryClient.setQueryData<MyParty | null>(MY_PARTY_KEY, (party) => party && { ...party, sharing: on });
}

// Opens the Quest's Party, or enters the one another Holder opened at the same moment.
function openPartyWith({ queryClient, showToast, refetch, run }: Tools): RoomActions['openParty'] {
  return async (quest, others, leaveFirst) => {
    let ended: string | null = null;
    try {
      ended = await leaveIf(queryClient, leaveFirst);
      enter(
        queryClient,
        await apiClient.openParty({ title: quest.title, capacity: 8, joinPolicy: 'closed', questId: quest.id }),
      );
      showToast(others > 0 ? `파티를 활성화했어요 · 멤버 ${others}명에게 알림` : '파티를 활성화했어요');
    } catch (error) {
      const running = runningPartyOf(error);
      if (running === null) {
        showToast(enteringWords(ended, error));
      } else {
        await run(async () => {
          enter(queryClient, await apiClient.joinParty(running));
        }, '이미 활성화된 파티에 참여했어요');
      }
    } finally {
      refetch();
    }
  };
}

type PartyActions = Pick<RoomActions, 'joinParty' | 'leaveParty' | 'endParty' | 'setSharing'>;

function partyActions(tools: Tools): PartyActions {
  const { queryClient, showToast, refetch, run } = tools;
  return {
    joinParty: async (partyId, leaveFirst) => {
      let ended: string | null = null;
      try {
        ended = await leaveIf(queryClient, leaveFirst);
        enter(queryClient, await apiClient.joinParty(partyId));
        showToast('활성화에 참여했어요 · 위치 공유 시작');
      } catch (error) {
        showToast(enteringWords(ended, error));
      } finally {
        refetch();
      }
    },
    leaveParty: async () => {
      await run(() => apiClient.leaveParty(), '활성화에서 나왔어요 · 위치 공유 멈춤');
    },
    endParty: async () => {
      await run(() => apiClient.endParty(), '활성화를 껐어요');
    },
    setSharing: async (on) => {
      showSharing(queryClient, on);
      if (!(await run(() => apiClient.setPartySharing(on), null))) {
        showSharing(queryClient, !on);
      }
    },
  };
}

type PlanActions = Pick<RoomActions, 'addSubQuest' | 'editSubQuest' | 'cancelSubQuest' | 'toggleDone'>;

function planActions({ run }: Tools): PlanActions {
  return {
    addSubQuest: (questId, content, key) => run(() => apiClient.addSubQuest(questId, content, key), null),
    editSubQuest: (questId, subQuestId, content) =>
      run(() => apiClient.editSubQuest(questId, subQuestId, content), null),
    cancelSubQuest: async (questId, { id }) => {
      await run(() => apiClient.cancelSubQuest(questId, id), null);
    },
    toggleDone: async (questId, { id, done }) => {
      await run(
        () => (done ? apiClient.unmarkSubQuestDone(questId, id) : apiClient.markSubQuestDone(questId, id)),
        null,
      );
    },
  };
}

type PeopleActions = Pick<
  RoomActions,
  'accept' | 'decline' | 'cancelInvitation' | 'removeHolder' | 'handOver' | 'leaveQuest' | 'endQuest'
>;

function peopleActions({ run }: Tools): PeopleActions {
  return {
    accept: async (questId, { id, user }) => {
      await run(() => apiClient.acceptJoinRequest(questId, id), `${user.name}님을 멤버로 추가했어요`);
    },
    decline: async (questId, { id }) => {
      await run(() => apiClient.declineJoinRequest(questId, id), null);
    },
    cancelInvitation: async (questId, { id, user }) => {
      await run(() => apiClient.cancelInvitation(questId, id), `${user.name}님 초대를 취소했어요`);
    },
    removeHolder: async (questId, { id, name }, fromParty) => {
      await run(async () => {
        await apiClient.removeHolder(questId, id);
        if (fromParty) {
          await apiClient.removePartyMember(id);
        }
      }, `${name}님을 내보냈어요`);
    },
    handOver: async (questId, { id, name }) => {
      await run(() => apiClient.handOverQuest(questId, id), `${name}님이 파티장이 됐어요`);
    },
    leaveQuest: (questId, party) =>
      run(async () => {
        await outOfParty(party, false);
        await apiClient.dropQuest(questId);
      }, '파티에서 나왔어요'),
    endQuest: (questId, party) =>
      run(async () => {
        await outOfParty(party, true);
        await apiClient.endQuest(questId);
      }, '파티를 없앴어요'),
  };
}

export function useRoomActions(): RoomActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const declineParty = useDeclineParty();
  return useMemo(() => {
    const tools = toolsOf(queryClient, showToast);
    return {
      openParty: openPartyWith(tools),
      declineParty: (partyId) => {
        declineParty(partyId);
        showToast('활성화 알림을 거절했어요');
      },
      ...partyActions(tools),
      ...planActions(tools),
      ...peopleActions(tools),
    };
  }, [queryClient, showToast, declineParty]);
}
