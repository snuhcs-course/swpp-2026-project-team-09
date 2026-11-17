/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, Plan } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import type { PlanQuest } from '@/api/plan-quest-types';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { field } from '@/api/server/answers';
import type { SubQuest } from '@/api/types';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { AI_INPUT, SEND } from './lists';
import { openMain } from './main';

// Events and recruiting parties answered on the map (P02 ticket 30), against the fake main server.
// The stored copies are the main server's real answers: row 4's job fair (Friday 2026-11-20, asked at 13:50) and
// row 5's badminton (Thursday 2026-11-19, asked at 16:45), both asked by 유상.

export const ASKER = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
export const JOB_FAIR = '42b86020-4f3a-42e0-9efb-8a60e66a7d0b';
export const SEO_JUN = '813ef697-74f3-4848-b231-50dea4aef958';
export const GYM = '884c088c-205c-55d7-9860-63c8e28fb3bf';

function replyWith(text: string, answer: AnswerReply): AssistantReply {
  return { text, mapButtons: [], cards: [], proposal: null, answer };
}

export const EVENTS_REPLY = replyWith('채용박람회에 13:54에 도착해서 78분 볼 수 있어요.', EVENTS_ANSWER);
export const QUESTS_REPLY = replyWith('18:00 체육관 파티에 17:43에 나서면 돼요.', QUESTS_ANSWER);
export const NEW_QUEST_REPLY = replyWith('17:10 체육관에서 서준과 모여요.', NEW_QUEST_ANSWER);

export function firstPlan(answer: AnswerReply): Plan {
  const [plan] = answer.plans;
  if (plan === undefined) {
    throw new Error('The copy has no Plan');
  }
  return plan;
}

// The main server answers each recalculation with the stored copy of its kind, holding the input it was asked, and
// with the events' copy for any other kind.
export function answerRecalculations(server: FakeServer, copies: Partial<Record<string, AnswerReply>> = {}): void {
  const stored: Partial<Record<string, AnswerReply>> = {
    events: EVENTS_ANSWER,
    quests: QUESTS_ANSWER,
    'new-quest': NEW_QUEST_ANSWER,
    ...copies,
  };
  server.on('POST /assistant/answers', ({ body }) => {
    const input = field(body, 'input');
    const kind = field(input, 'kind');
    const copy = (typeof kind === 'string' ? stored[kind] : undefined) ?? EVENTS_ANSWER;
    return { status: 200, body: { ...copy, input } };
  });
}

// A step of the new party at the gymnasium, 17:10 to 17:40 on Thursday 2026-11-19.
function atGym(id: string, title: string): SubQuest {
  return {
    id,
    attending: false,
    title,
    startsAt: '2026-11-19T08:10:00.000Z',
    endsAt: '2026-11-19T08:40:00.000Z',
    place: { placeId: GYM, label: '체육관', latitude: 37.4676, longitude: 126.95238 },
    completion: 'by_time',
    cancelled: false,
    done: false,
    ended: false,
  };
}

// The new party "배드민턴" with 서준 posted, as POST /plans answers it: an Open Quest on the Hobby Board led by the
// asker, with the Plan's two steps at 17:10 and an invitation to 서준. Built by hand on the stored reply of a meal's
// Quest, since no reply of the main server to a new party is stored.
export const POSTED: PlanQuest = {
  quest: {
    ...PLAN_QUEST.quest,
    id: 'c0ffee00-0000-4000-8000-000000000030',
    title: '배드민턴',
    joinPolicy: 'open',
    board: 'hobby',
    subQuests: [atGym('s1', '유상, 서준: 체육관 앞에서 만나기'), atGym('s2', '배드민턴')],
    members: [
      { user: { id: ASKER, name: '유상', department: '컴퓨터공학부' }, state: 'accepted', lateMinutes: null },
      { user: { id: SEO_JUN, name: '서준', department: '경영학과' }, state: 'invited', lateMinutes: null },
    ],
  },
  invitations: [{ id: 'i-seo-jun', userId: SEO_JUN }],
  askLevels: [],
};

// The same party posted with nobody invited.
export const POSTED_ALONE: PlanQuest = {
  ...POSTED,
  quest: { ...POSTED.quest, members: POSTED.quest.members?.slice(0, 1) },
  invitations: [],
};

type User = Awaited<ReturnType<typeof openMain>>;

// Starts the app and sends `words` from the map's bar; the main server answers with `reply`.
export async function sayOnMap(server: FakeServer, words: string, reply: AssistantReply): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  const user = await openMain();
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: SEND }));
  await pass(500);
  return user;
}

// The bodies of the chat requests, in order.
export function chats(server: FakeServer): unknown[] {
  return server.received('POST /assistant/messages').map(({ body }) => body);
}
