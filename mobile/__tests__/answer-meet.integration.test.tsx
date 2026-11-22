/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card, mapLines, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, friendCard, MEET, meetFromCard, meetWith, MIN_SU, pill, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// "만나고 싶다" on a Friend's card of the everyday map (P02 ticket 24), over the fake main server, which answers the meet
// with the stored real answer of board a5 (`meet-answer.json`): the button down to the request, the answer drawn as a
// Plan. Expected values: the ticket's input, and the stored answer, whose words differ from the board's (P01 ticket 18,
// "Differences from the boards"). The Plan's place, people, start, and basis are read from its marks on the map, its
// band from the time bar, and its main button beside the input (P04 tickets 01–04).

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

const PICK = '302동 앞 · 12:15 만남';

type User = Awaited<ReturnType<typeof openMain>>;

// "만나고 싶다" on 김민준's face, with the stage laid out so that a mark's card opens at a press.
async function meetMinJun(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await press(user, MIN_JUN.name);
  await meetFromCard(user);
  return user;
}

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

function meetAsked(friendId: string): object {
  return {
    input: meetWith(friendId),
    location: ON_CAMPUS,
    clientCapabilities: SENT_CAPABILITIES,
  };
}

// Partitions: the card of a face and the card of a Friend whom the map does not show; the answer that comes, and a
// request that fails.
describe('"만나고 싶다" on a Friend\'s card', () => {
  it('stands first among the buttons of a face\'s card, right under its lines and before "파티 만들기"', async () => {
    const user = await openMain();

    await press(user, MIN_JUN.name);

    const buttons = friendCard().getAllByRole('button');
    const meet = buttons.indexOf(friendCard().getByRole('button', { name: MEET }));
    expect(meet).toBe(buttons.indexOf(friendCard().getByRole('button', { name: '어디까지 보이나' })) + 1);
    expect(meet).toBeLessThan(buttons.indexOf(friendCard().getByRole('button', { name: '파티 만들기' })));
  });

  it("asks the meet of the User and the face's Friend today, from where the User is, and opens it in the frame", async () => {
    const user = await openMain();
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(recalculations(server)).toEqual([meetAsked(MIN_JUN.id)]);
    expect(server.received('POST /assistant/messages')).toEqual([]);
    expect(pill().getByText('김민준 · 만나고 싶다')).toBeVisible();
    expect(pill().getByTestId('answer-pill-user', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('asks the same from the card of a Friend whom the map does not show', async () => {
    const user = await openMain();
    await press(user, row(MIN_SU));

    await meetFromCard(user);

    expect(recalculations(server)).toEqual([meetAsked(MIN_SU.id)]);
    expect(pill().getByText('김민수 · 만나고 싶다')).toBeVisible();
  });

  it('says that it failed and keeps the card when the recalculation fails', async () => {
    server.on('POST /assistant/answers', { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await openMain();
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(screen.getByText(NOT_ANSWERED)).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_JUN.name })).toBeVisible();
  });
});

// Partitions: the first Plan in the card, and on the map.
describe('the answer of a meet (board a5)', () => {
  it('draws the first Plan of five, its start and 민수, the next Class, and the band of 나 and 민수', async () => {
    const user = await meetMinJun();

    expect(mapThings()).toEqual(expect.arrayContaining([PICK, '13:00 수업 · 24동']));
    expect(mapThings().filter((name) => name.startsWith('후보 '))).toHaveLength(4);
    expect(timeBar().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
    await press(user, '사람별 시간 펼치기');
    expect(timeBar().getByText('나')).toBeVisible();
    expect(timeBar().getByText('18:30')).toBeVisible();
    await pressMarker(user, '나 · 3분');
    expect(markCard().getByText('출발 · 301동에서')).toBeVisible();
    await press(user, '카드 닫기');
    await pressMarker(user, '민수');
    expect(markCard().getByRole('button', { name: '민수 빼기' })).toBeVisible();
  });

  it('draws the meeting place picked with its time, the next candidate numbered 2, the next Class, and two lines', async () => {
    const user = await openMain();
    await press(user, MIN_JUN.name);

    await meetFromCard(user);

    expect(mapThings()).toEqual(
      expect.arrayContaining(['302동 앞 · 12:15 만남', '후보 2 · 301동 앞 · 12:18', '13:00 수업 · 24동', '나 · 3분']),
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

// Partitions: the basis, the next Plan by its flag, and "만들고 초대 보내기" down to the request and its reply.
describe("the controls of a meet's answer", () => {
  it("opens the basis the main server wrote in the pick's card", async () => {
    const user = await meetMinJun();

    await pressMarker(user, PICK);

    expect(markCard().getByText('민수 12:15 302동 수업 끝 · 15:30에 나서요')).toBeVisible();
    expect(markCard().getByText('301동 → 302동 앞 걸어서 3분')).toBeVisible();
    expect(markCard().getByText('302동 앞 → 24동 걸어서 17분, 그래서 12:43에 나서요')).toBeVisible();
  });

  it("shows 301동 앞 for 27 minutes at a press on candidate 2's flag", async () => {
    const user = await meetMinJun();

    await pressMarker(user, '후보 2 · 301동 앞 · 12:18');

    expect(mapThings()).toContain('301동 앞 · 12:18 만남');
    expect(timeBar().getByText('12:18–12:45 · 함께 27분')).toBeVisible();
  });

  it('sends the meet and its first Plan with "만들고 초대 보내기", and the card then says the Quest was made', async () => {
    server.on('POST /plans', { status: 201, body: MET_QUEST });
    const user = await meetMinJun();

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(500);

    expect(server.received('POST /plans').map(({ body }) => body)).toEqual([
      {
        input: MEET_ANSWER.input,
        planId: '302동 앞',
        startAt: '2026-11-17T12:15:00+09:00',
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(card().getByText('민수에게 약속 초대를 보냈어요')).toBeVisible();
    expect(card().getByText('12:15 제2공학관 · 수락하면 알려 드려요')).toBeVisible();
    expect(within(card().getByTestId('quest-steps')).getByText('302동 앞에서 만나기')).toBeVisible();
    expect(card().getByText('민수 · 아직 안 봄')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeEnabled();
  });
});
