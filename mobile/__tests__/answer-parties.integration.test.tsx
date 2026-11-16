/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import { card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, ASKER, chats, firstPlan, JOB_FAIR, QUESTS_REPLY, sayOnMap } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A recruiting parties' answer in the answer frame (P02 ticket 30, boards Join 1 to 3 and Together 5 to 7), over the
// fake main server, which answers "배드민턴 칠 사람" with the stored real answer of row 5: the 18:00 party at the
// gymnasium, and the 17:00 party dropped, reached only at 17:02. Expected values: the ticket's inputs and words, and
// the stored answer's.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const ASKED = '배드민턴 칠 사람';
const party = firstPlan(QUESTS_ANSWER);
const quest = party.quest ?? QUESTS_ANSWER.plans[0]?.quest;

// The stored answer with a party of 민수's before it, as the main server puts a party a Friend holds first (board
// Together 5): the same party under another id, with the lines the server writes for it.
const MIN_SU_PARTY = {
  ...party,
  id: 'party-min-su',
  lines: [
    [
      { text: '14:20 문화관', strong: true },
      { text: ' 파티에', strong: false },
    ],
    [{ text: '민수가 있어요', strong: false }],
  ],
  friendNames: ['민수'],
  quest: quest === undefined ? undefined : { ...quest, id: 'party-min-su' },
};
const WITH_MIN_SU: AnswerReply = { ...QUESTS_ANSWER, plans: [MIN_SU_PARTY, ...QUESTS_ANSWER.plans] };

// The stored party as an Approval Quest.
const APPROVAL: AnswerReply = {
  ...QUESTS_ANSWER,
  plans: [{ ...party, quest: quest === undefined ? undefined : { ...quest, joinPolicy: 'approval' } }],
};

// The parties of the job fair, as "같이 갈 파티" of row 4's first Plan asks for them.
const FAIR_PARTIES: AnswerReply = {
  ...QUESTS_ANSWER,
  input: { kind: 'quests', globalEventId: JOB_FAIR, questIds: null },
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the stored answer; one with a Friend's party first.
describe("a recruiting parties' answer (board Join 1)", () => {
  it('draws the party the User can reach, its two buttons, the dropped party with its reason, and no "＋ 같이"', async () => {
    await sayOnMap(server, ASKED, QUESTS_REPLY);

    expect(card().getByText('18:00 체육관 · 17:43에 나서요')).toBeVisible();
    expect(card().getByRole('button', { name: '참여하기' })).toBeEnabled();
    expect(card().getByRole('button', { name: '새로 모집' })).toBeEnabled();
    expect(card().queryByRole('button', { name: /친구 추가/u })).toBeNull();
    expect(card().getByText('17:00 파티는 17:02에야 도착해요')).toBeVisible();
    expect(mapThings()).toEqual(expect.arrayContaining(['나 · 17분', '배드민턴 한 게임 · 18:00 배드민턴 한 게임']));
  });

  it("draws a Friend's party first, as the main server orders it", async () => {
    await sayOnMap(server, ASKED, { ...QUESTS_REPLY, answer: WITH_MIN_SU });

    expect(card().getByText('14:20 문화관 파티에')).toBeVisible();
    expect(card().getByText('민수가 있어요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('1/2');
  });
});

// Partitions: an Open Quest and an Approval one.
describe("joining from a party's Plan (boards Join 3 and Together 6)", () => {
  it('"참여하기" opens the party\'s post and joins nothing', async () => {
    const user = await sayOnMap(server, ASKED, QUESTS_REPLY);

    await user.press(card().getByRole('button', { name: '참여하기' }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${party.id}`);
    expect(server.received().filter(({ method, path }) => method === 'POST' && path.includes('/join'))).toEqual([]);
  });

  it('says "참여 신청" for an Approval Quest, and opens its post too', async () => {
    const user = await sayOnMap(server, ASKED, { ...QUESTS_REPLY, answer: APPROVAL });
    expect(card().queryByRole('button', { name: '참여하기' })).toBeNull();

    await user.press(card().getByRole('button', { name: '참여 신청' }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${party.id}`);
  });
});

// Partitions: the parties of a search, and those of a Global Event.
describe('"새로 모집" on a party\'s Plan', () => {
  it('asks the Assistant in words for the parties of a search, whose activity it knows', async () => {
    const user = await sayOnMap(server, ASKED, QUESTS_REPLY);

    await user.press(card().getByRole('button', { name: '새로 모집' }));
    await pass(500);

    expect(recalculations(server)).toEqual([]);
    expect(chats(server).at(-1)).toMatchObject({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: QUESTS_REPLY.text },
        { role: 'user', text: '새로 모집' },
      ],
      context: { conditions: QUESTS_ANSWER.input, planId: party.id },
    });
  });

  it("recalculates a new party for the same event, on the party's day, for the parties of an event", async () => {
    const user = await sayOnMap(server, ASKED, { ...QUESTS_REPLY, answer: FAIR_PARTIES });

    await user.press(card().getByRole('button', { name: '새로 모집' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: {
          kind: 'new-quest',
          date: '2026-11-19',
          globalEventId: JOB_FAIR,
          title: null,
          placeId: null,
          time: null,
          people: [{ userId: ASKER, constraints: [] }],
        },
        location: ON_CAMPUS,
      },
    ]);
    expect(card().getByRole('button', { name: '이대로 모집' })).toBeEnabled();
  });
});
