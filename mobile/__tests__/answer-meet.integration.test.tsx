/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card, mapLines, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, friendCard, MEET, meetFromCard, meetWith, MIN_SU, pill, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// "만나고 싶다" on a Friend's card of the everyday map (P02 ticket 24), over the fake main server, which answers the
// meet with the stored real answer of board a5 (`meet-answer.json`): the button down to the request, the answer drawn
// as a Plan, and nothing with the switch off. Expected values: the ticket's input, and the stored answer, whose words
// differ from the board's (P01 ticket 18, "Differences from the boards").

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

const NOT_ANSWERED = '답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the card of a face and the card of a Friend whom the map does not show; the answer that comes, and a
// request that fails.
describe('"만나고 싶다" on a Friend\'s card', () => {
  it('stands first among the buttons of a face\'s card, right under its lines and before "파티 만들기"', async () => {
    const user = await openMain({ answerOnMap: true });

    await press(user, MIN_JUN.name);

    const buttons = friendCard().getAllByRole('button');
    const meet = buttons.indexOf(friendCard().getByRole('button', { name: MEET }));
    expect(meet).toBe(buttons.indexOf(friendCard().getByRole('button', { name: '어디까지 보이나' })) + 1);
    expect(meet).toBeLessThan(buttons.indexOf(friendCard().getByRole('button', { name: '파티 만들기' })));
  });

  it("asks the meet of the User and the face's Friend today, from where the User is, and opens it in the frame", async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(recalculations(server)).toEqual([{ input: meetWith(MIN_JUN.id), location: ON_CAMPUS }]);
    expect(server.received('POST /assistant/messages')).toEqual([]);
    expect(pill().getByText('김민준 · 만나고 싶다')).toBeVisible();
    expect(pill().getByTestId('answer-pill-user', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('asks the same from the card of a Friend whom the map does not show', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, row(MIN_SU));

    await meetFromCard(user);

    expect(recalculations(server)).toEqual([{ input: meetWith(MIN_SU.id), location: ON_CAMPUS }]);
    expect(pill().getByText('김민수 · 만나고 싶다')).toBeVisible();
  });

  it('says that it failed and keeps the card when the recalculation fails', async () => {
    server.on('POST /assistant/answers', { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(screen.getByText(NOT_ANSWERED)).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_JUN.name })).toBeVisible();
  });
});

// Partitions: the first Plan in the card, and on the map.
describe('the answer of a meet (board a5)', () => {
  it("draws the first Plan's lines, the count of five, the chips, and the band of 나 and 민수", async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(card().getByText('12:15 302동 앞')).toBeVisible();
    expect(card().getByText('12:43까지 함께 28분이에요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('1/5');
    expect(card().getByRole('button', { name: '301동에서' })).toBeVisible();
    expect(card().getByRole('button', { name: '13:00 수업까지' })).toBeVisible();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(card().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
    expect(card().getByText('나')).toBeVisible();
    expect(card().getByText('18:30')).toBeVisible();
  });

  it('draws the meeting place picked with its time, the next candidate numbered 2, the next Class, and two lines', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(mapThings()).toEqual(
      expect.arrayContaining(['302동 앞 · 12:15 만남', '후보 2 · 301동 앞', '13:00 수업 · 24동', '나 · 3분']),
    );
    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
  });
});

// The main server's reply to POST /plans for a5's first Plan. The stored reply for the meal's first Plan has the same
// asker, 민수 invited, and a step at 302동's Place from 12:15 to 12:43, as a5's; changed: the Quest's title and its
// step's, which main-server `plans-meet.integration.test.ts` shows a meet's Plan writes as "302동 앞에서 만나기".
const MET_QUEST: PlanQuest = {
  ...PLAN_QUEST,
  quest: {
    ...PLAN_QUEST.quest,
    title: '302동 앞에서 만나기',
    // oxlint-disable-next-line no-map-spread -- a copy: the stored reply is shared with the mock and other tests
    subQuests: PLAN_QUEST.quest.subQuests.map((step) => ({ ...step, title: '302동 앞에서 만나기' })),
  },
};

// Partitions: the basis, the next Plan by the arrow, and "이대로 초대" down to the request and its reply.
describe("the controls of a meet's answer", () => {
  it('opens the basis the main server wrote', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);
    await meetFromCard(user);

    await user.press(card().getByRole('button', { name: '근거' }));

    expect(card().getByText('민수 12:15 302동 수업 끝 · 15:30에 나서요')).toBeVisible();
    expect(card().getByText('301동 → 302동 앞 걸어서 3분')).toBeVisible();
    expect(card().getByText('302동 앞 → 24동 걸어서 17분, 그래서 12:43에 나서요')).toBeVisible();
  });

  it('shows 301동 앞 for 27 minutes with "›"', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);
    await meetFromCard(user);

    await user.press(card().getByRole('button', { name: '다음 후보' }));

    expect(card().getByText('12:18 301동 앞')).toBeVisible();
    expect(card().getByText('12:45까지 함께 27분이에요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('2/5');
  });

  it('sends the meet and its first Plan with "이대로 초대", and the card then says the Quest was made', async () => {
    server.on('POST /plans', { status: 201, body: MET_QUEST });
    const user = await openMain({ answerOnMap: true });
    await press(user, MIN_JUN.name);
    await meetFromCard(user);

    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);

    expect(server.received('POST /plans').map(({ body }) => body)).toEqual([
      { input: MEET_ANSWER.input, planId: '302동 앞', startAt: '2026-11-17T12:15:00+09:00', location: ON_CAMPUS },
    ]);
    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(card().getByText('답이 없어도 12:15에 가면 돼요')).toBeVisible();
    expect(within(card().getByTestId('quest-steps')).getByText('302동 앞에서 만나기')).toBeVisible();
    expect(card().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeEnabled();
  });
});

// Partitions: the card of a face, and a request of the chat, with the switch off.
describe('with the switch off', () => {
  it('draws no "만나고 싶다" on a Friend\'s card', async () => {
    const user = await openMain();

    await press(user, MIN_JUN.name);

    expect(friendCard().getByRole('header', { name: MIN_JUN.name })).toBeVisible();
    expect(friendCard().queryByRole('button', { name: MEET })).toBeNull();
  });

  it('sends the chat request without the capability of a meet', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '네', mapButtons: [], cards: [], proposal: null },
    });
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));

    await user.type(screen.getByLabelText(AI_INPUT), '민수랑 만나고 싶어');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(server.received('POST /assistant/messages').map(({ body }) => body)).toEqual([
      { messages: [{ role: 'user', text: '민수랑 만나고 싶어' }], clientCapabilities: ['library'] },
    ]);
  });
});
