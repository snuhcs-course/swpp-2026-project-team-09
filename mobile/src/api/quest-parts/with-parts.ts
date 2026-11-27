/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ChatCard } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import type { QuestParts, ShownChatCard, ShownClient, ShownQuest } from '@/api/quest-parts-types';
import type { Quest } from '@/api/types';
import type { QuestSummary } from '@/api/waiting-types';
import { now } from '@/clock';
import type { Build } from './build';
import { facesOfQuest, facesOfSummary } from './faces';
import { pastQuestsOf } from './past-quests';
import { hidePost, listHiddenPosts } from './hidden-posts';
import { joinOfficialRecruiting, listOfficialRecruiting } from './official';
import { noteOf } from './notes';
import { askCompanionSeeker, listCompanionSeekers } from './seekers';

// Adds the mocked parts of a Quest to a client's answers: its members' faces, from its own adapter, in every answer
// that carries a Quest, the Assistant's cards among them; the mocked parts of 찾기, official recruiting, hiding a post
// and the people looking for company; and the room's, a request's note. When the main server gives one of them, its
// adapter is dropped here and the server client reads it.

function questWithParts(quest: Quest): ShownQuest {
  return { ...quest, faces: facesOfQuest(quest) };
}

function summaryWithParts<Summary extends QuestSummary>(summary: Summary, build: Build): Summary & QuestParts {
  return { ...summary, faces: facesOfSummary(summary, build) };
}

// The requests to join a Quest, each with its note.
function withNotes(client: ApiClient, build: Build): Pick<ShownClient, 'listJoinRequests'> {
  return {
    listJoinRequests: async (questId) =>
      (await client.listJoinRequests(questId)).map(({ id, user, sentAt, removedBefore }) => ({
        id,
        user,
        sentAt,
        removedBefore,
        note: noteOf(id, build),
      })),
  };
}

function cardWithParts(card: ChatCard, build: Build): ShownChatCard {
  return card.kind === 'quest' ? { ...card, quest: summaryWithParts(card.quest, build) } : card;
}

// The Assistant's reply, its Quest cards with the parts the Boards' post card draws, as the Boards' list has them.
function withShownCards(client: ApiClient, build: Build): Pick<ShownClient, 'askAssistant'> {
  return {
    askAssistant: async (messages, context) => {
      const { cards, ...reply } = await client.askAssistant(messages, context);
      return { ...reply, cards: cards.map((card) => cardWithParts(card, build)) };
    },
  };
}

export function withQuestParts(client: ApiClient, build: Build): ShownClient {
  return {
    ...client,
    listQuests: async () => (await client.listQuests()).map((quest) => questWithParts(quest)),
    getQuest: async (questId) => questWithParts(await client.getQuest(questId)),
    joinQuest: async (questId) => questWithParts(await client.joinQuest(questId)),
    makeQuest: async (making, idempotencyKey) => questWithParts(await client.makeQuest(making, idempotencyKey)),
    attendGlobalEvent: async (globalEventId, title) =>
      questWithParts(await client.attendGlobalEvent(globalEventId, title)),
    changeQuest: async (questId, change) => questWithParts(await client.changeQuest(questId, change)),
    acceptInvitation: async (invitationId) => questWithParts(await client.acceptInvitation(invitationId)),
    listRecruitingQuests: async (filter) =>
      (await client.listRecruitingQuests(filter)).map((summary) => summaryWithParts(summary, build)),
    listQuestInvitations: async () => {
      const invitations = await client.listQuestInvitations();
      return invitations.map(({ id, quest, sentAt, nextSubQuest }) => ({
        id,
        quest: summaryWithParts(quest, build),
        sentAt,
        nextSubQuest,
      }));
    },
    ...mockedOnly(build),
    ...withNotes(client, build),
    ...withShownCards(client, build),
  };
}

// The operations the main server has no counterpart for at all: each is its adapter alone.
function mockedOnly(build: Build): Pick<ShownClient, MockedOnly> {
  return {
    listPastQuests: (me) => Promise.resolve(pastQuestsOf(me, now(), build).map((quest) => questWithParts(quest))),
    listOfficialRecruiting: () => listOfficialRecruiting(build),
    joinOfficialRecruiting,
    listHiddenPosts,
    hidePost,
    listCompanionSeekers: () => listCompanionSeekers(build),
    askCompanionSeeker,
  };
}

type MockedOnly =
  | 'listPastQuests'
  | 'listOfficialRecruiting'
  | 'joinOfficialRecruiting'
  | 'listHiddenPosts'
  | 'hidePost'
  | 'listCompanionSeekers'
  | 'askCompanionSeeker';
