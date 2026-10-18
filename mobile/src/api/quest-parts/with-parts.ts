/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { QuestChange } from '@/api/party-types';
import type { QuestEntries, QuestParts, ShownClient, ShownQuest } from '@/api/quest-parts-types';
import type { Quest } from '@/api/types';
import type { QuestSummary } from '@/api/waiting-types';
import { keepQuestEntries, readQuestEntries } from '@/storage/quest-entries';
import type { Build } from './build';
import { chatOf, sendChat } from './chat';
import { facesOfQuest, facesOfSummary } from './faces';
import { noteOf } from './notes';
import { photoOf } from './photos';
import { myTagsOf, tagsOf } from './tags';

// Adds the mocked parts of a Quest to a client's answers: its photo, its tags, its members' faces, a request's note and
// the room's 파티 채팅, each from its own adapter. When the main server gives one of them, its adapter is dropped here and the server client reads it.

type Entered = Partial<Record<string, QuestEntries>>;

function questWithParts(quest: Quest, entered: Entered): ShownQuest {
  const entries = entered[quest.id];
  return { ...quest, photo: photoOf(quest, entries), tags: tagsOf(quest, entries), faces: facesOfQuest(quest) };
}

function summaryWithParts<Summary extends QuestSummary>(
  summary: Summary,
  entered: Entered,
  build: Build,
): Summary & QuestParts {
  const entries = entered[summary.id];
  return {
    ...summary,
    photo: photoOf(summary, entries),
    tags: tagsOf(summary, entries),
    faces: facesOfSummary(summary, build),
  };
}

async function shown(quest: Quest): Promise<ShownQuest> {
  return questWithParts(quest, await readQuestEntries());
}

// What the User entered, without what was left out.
function enteredOf({ photo, tags }: Partial<QuestEntries>): Partial<QuestEntries> {
  return { ...(photo === undefined ? {} : { photo }), ...(tags === undefined ? {} : { tags }) };
}

// A Quest the User has just made, on its own or for an event: its photo and tags are the ones the User gave, kept on the
// phone even when none is given, so that it gets no mocked ones.
async function ownQuest(quest: Quest, { photo, tags }: Partial<QuestEntries>): Promise<ShownQuest> {
  await keepQuestEntries(quest.id, { photo: photo ?? null, tags: tags ?? [] });
  return shown(quest);
}

// What a room adds: a request's note and the 파티 채팅.
function roomParts(
  client: ApiClient,
  build: Build,
): Pick<ShownClient, 'listJoinRequests' | 'listPartyChat' | 'sendPartyChat'> {
  return {
    listJoinRequests: async (questId) =>
      (await client.listJoinRequests(questId)).map(({ id, user, sentAt }) => ({
        id,
        user,
        sentAt,
        note: noteOf(id, build),
      })),
    listPartyChat: (questId) => chatOf(questId, build),
    sendPartyChat: (questId, words) => sendChat(questId, words),
  };
}

export function withQuestParts(client: ApiClient, build: Build): ShownClient {
  return {
    ...client,
    listQuests: async () => {
      const quests = await client.listQuests();
      const entered = await readQuestEntries();
      return quests.map((quest) => questWithParts(quest, entered));
    },
    getQuest: async (questId) => shown(await client.getQuest(questId)),
    joinQuest: async (questId) => shown(await client.joinQuest(questId)),
    makeQuest: async ({ photo, tags, ...making }, idempotencyKey) =>
      ownQuest(await client.makeQuest(making, idempotencyKey), { photo, tags }),
    attendGlobalEvent: async (globalEventId, title, entries = {}) =>
      ownQuest(await client.attendGlobalEvent(globalEventId, title), entries),
    // A change of the photo or the tags alone is not sent: the main server has nothing to change.
    changeQuest: async (questId, { photo, tags, ...change }) => {
      const sent: QuestChange = change;
      const quest =
        Object.keys(sent).length === 0 ? await client.getQuest(questId) : await client.changeQuest(questId, sent);
      const entries = enteredOf({ photo, tags });
      if (Object.keys(entries).length > 0) {
        await keepQuestEntries(questId, entries);
      }
      return shown(quest);
    },
    acceptInvitation: async (invitationId) => shown(await client.acceptInvitation(invitationId)),
    listRecruitingQuests: async (filter) => {
      const summaries = await client.listRecruitingQuests(filter);
      const entered = await readQuestEntries();
      return summaries.map((summary) => summaryWithParts(summary, entered, build));
    },
    listQuestInvitations: async () => {
      const invitations = await client.listQuestInvitations();
      const entered = await readQuestEntries();
      return invitations.map(({ id, quest, sentAt }) => ({
        id,
        quest: summaryWithParts(quest, entered, build),
        sentAt,
      }));
    },
    listMyTags: async () => myTagsOf(await client.getProfile(), build),
    ...roomParts(client, build),
  };
}
