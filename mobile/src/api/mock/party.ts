import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { QuestMaking, RecruitingQuest } from '@/api/party-types';
import type { Quest } from '@/api/types';
import type { QuestSummary } from '@/api/waiting-types';
import { answer } from './answer';
import { RECRUITING_QUESTS } from './data/boards';
import { frameTime, ME } from './data/frame';
import { QUESTS } from './data/quests';
import { QUEST_INVITATIONS } from './data/waiting';

// The 파티 tab's operations as the main server answers them. As the room's, the mock keeps no change.

// The Quest the User holds once in it: its Leader and the User, and the Sub Quest the entry names.
function questOf(summary: QuestSummary, next: RecruitingQuest['nextSubQuest'] | null): Quest {
  const { id, title, globalEvent, leader, capacity, joinPolicy, board, description, createdAt } = summary;
  return {
    id,
    title,
    globalEvent,
    leader,
    capacity,
    joinPolicy,
    holders: [leader, ME],
    subQuests:
      next === null
        ? []
        : [{ ...next, attending: false, completion: 'by_hand', cancelled: false, done: false, ended: false }],
    classQuest: false,
    board,
    description,
    createdAt,
  };
}

function madeOf({ title, description, capacity, joinPolicy, board, subQuest }: QuestMaking): Quest {
  return {
    id: `made-${title}`,
    title,
    globalEvent: null,
    leader: ME,
    capacity,
    joinPolicy,
    holders: [ME],
    subQuests: [
      {
        id: `made-${title}-1`,
        attending: false,
        title: subQuest.title,
        startsAt: subQuest.startsAt ?? null,
        endsAt: null,
        place: null,
        completion: 'by_hand',
        cancelled: false,
        done: false,
        ended: false,
      },
    ],
    classQuest: false,
    board: board ?? null,
    description,
    createdAt: frameTime('13:37'),
  };
}

function recruiting(questId: string): RecruitingQuest {
  const entry = RECRUITING_QUESTS.find(({ id }) => id === questId);
  if (entry === undefined) {
    throw new ApiError(404, 'QUEST_NOT_FOUND');
  }
  return entry;
}

function held(questId: string): Quest {
  const quest = QUESTS.find(({ id }) => id === questId);
  if (quest === undefined) {
    throw new ApiError(404, 'QUEST_NOT_FOUND');
  }
  return quest;
}

async function nothing(operation: keyof ApiClient): Promise<void> {
  await answer(operation, () => null);
}

type MockParty = Pick<
  ApiClient,
  | 'listRecruitingQuests'
  | 'joinQuest'
  | 'askToJoinQuest'
  | 'listMyJoinRequests'
  | 'withdrawJoinRequest'
  | 'makeQuest'
  | 'changeQuest'
  | 'inviteToQuest'
  | 'acceptInvitation'
  | 'declineInvitation'
>;

export const mockParty: MockParty = {
  listRecruitingQuests: ({ board, globalEventId } = {}) =>
    answer(
      'listRecruitingQuests',
      () =>
        RECRUITING_QUESTS.filter(
          (entry) =>
            (board === undefined || entry.board === board) &&
            (globalEventId === undefined || entry.globalEvent?.id === globalEventId),
        ),
      [],
    ),
  joinQuest: (questId) =>
    answer('joinQuest', () => {
      const entry = recruiting(questId);
      return questOf(entry, entry.nextSubQuest);
    }),
  askToJoinQuest: async (questId) => {
    await answer('askToJoinQuest', () => recruiting(questId));
  },
  listMyJoinRequests: () => answer('listMyJoinRequests', () => [], []),
  withdrawJoinRequest: () => nothing('withdrawJoinRequest'),
  makeQuest: (making) => answer('makeQuest', () => madeOf(making)),
  changeQuest: (questId, change) => answer('changeQuest', () => ({ ...held(questId), ...change })),
  inviteToQuest: () => nothing('inviteToQuest'),
  acceptInvitation: (invitationId) =>
    answer('acceptInvitation', () => {
      const invitation = QUEST_INVITATIONS.find(({ id }) => id === invitationId);
      if (invitation === undefined) {
        throw new ApiError(404, 'QUEST_INVITATION_NOT_FOUND');
      }
      return questOf(invitation.quest, null);
    }),
  declineInvitation: () => nothing('declineInvitation'),
};
