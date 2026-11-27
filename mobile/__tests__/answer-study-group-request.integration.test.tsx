/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { forgetPartyRequests } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { drag } from './support/answer-correct';
import { layTrack } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inDock, inFrame, sendFromBar, startLibraryChat } from './support/library-chat';
import { ASKED_AT, FRIENDS, QUEST_ID, REQUEST_ID, requestOf, sendTogether, type User } from './support/study-group';

// Sending the consent requests of the study answer together and waiting for them (P10 ticket 12; design
// group-study-design 나, group-study-resume 2 and 3 가): today's room request run behind the group answer's card, against
// the fake main server and the fake library.

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

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat(ASKED_AT));
  server.on('POST /library/room-requests', { status: 201, body: requestOf(['asked', 'asked', 'asked']) });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf(['asked', 'asked', 'asked']) });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sent(): Promise<User> {
  return sendTogether({ server, library });
}

// Partitions: the press, right after it, one consent in, and a Friend out. Expected values: the design and today's
// room request run.
describe('The consent requests of studying together', () => {
  it('are made once with the room, the Friends, the use and the study input', async () => {
    await sent();

    const made = server.received('POST /library/room-requests');
    expect(made).toHaveLength(1);
    expect(made[0]?.body).toMatchObject({
      key: 'book:4F-group-6:2026-11-05:1500:120',
      friendIds: FRIENDS.map(({ userId }) => userId),
      useDesc: '과제',
      input: { kind: 'study', together: true },
    });
    expect(made[0]?.idempotencyKey).toEqual(expect.any(String));
  });

  it('lock the ticket and say they are out, with 예약 waiting for every consent', async () => {
    await sent();

    expect(screen.queryByTestId('room-ticket-kind-chevron')).toBeNull();
    expect(screen.queryByTestId('room-ticket-room-chevron')).toBeNull();
    expect(inFrame().getByText('동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.')).toBeVisible();
    expect(inDock().getByRole('button', { name: '모두 동의하면 예약' })).toBeDisabled();
  });

  it('name who is awaited once one has consented', async () => {
    await sent();
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['asked', 'asked', 'consented']),
    });
    await pass(3500);

    expect(inFrame().getByText('동의 1/3 · 박민수, 이서연 님을 기다려요')).toBeVisible();
  });
});

// Partitions: a Friend out, the time card once sent, and the request taken back. Expected values: the design.
describe('A sent request of studying together', () => {
  it('says who is out and asks one more Friend, the ticket dimmed', async () => {
    const user = await sent();
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['declined', 'asked', 'consented'], 1),
    });
    await pass(3500);

    expect(inFrame().getByText('박민수 님이 빠져서 세 명이에요. 한 명만 더 부르면 돼요.')).toBeVisible();
    expect(screen.getByTestId('room-ticket')).toHaveStyle({ opacity: 0.45 });
    await user.press(inDock().getByRole('button', { name: '+ 같이 한 명 더' }));
    expect(inFrame().getByText('한 명씩 부를 수 있어요')).toBeVisible();
  });

  it('keeps the time card’s Friends as they are', async () => {
    const user = await sent();

    await user.press(screen.getByRole('button', { name: '같이 공부할 친구 추가' }));

    expect(screen.queryByTestId('time-card-rows')).toBeNull();
  });

  it('is taken back by "요청 취소 ›", which ends its party, and the card is to send again', async () => {
    const user = await sent();
    server.on(`POST /quests/${QUEST_ID}/end`, { status: 204 });

    await user.press(within(screen.getByTestId('study-group-line')).getByRole('button', { name: '요청 취소 ›' }));
    await pass(500);

    expect(server.received(`POST /quests/${QUEST_ID}/end`)).toHaveLength(1);
    expect(screen.getByTestId('room-ticket-kind-chevron')).toBeOnTheScreen();
    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeEnabled();
  });
});

const cancelLink = (): ReturnType<typeof screen.getByRole> =>
  within(screen.getByTestId('study-group-line')).getByRole('button', { name: '요청 취소 ›' });

// Partitions, from #656's review: the next answer after a held one, and sending again after 요청 취소 or once the
// request ended. Expected values: the answer's rules and today's room card.
describe('A held request of studying together, after it', () => {
  it('leaves the next answer free to change', async () => {
    const user = await sent();
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_MENUS_REPLY });

    await sendFromBar(user, '배고파');
    await user.press(screen.getByRole('button', { name: '같이 먹을 친구 추가' }));

    expect(screen.getByTestId('time-card-rows')).toBeOnTheScreen();
  });

  it('is sent again after 요청 취소 with a new idempotency key', async () => {
    const user = await sent();
    server.on(`POST /quests/${QUEST_ID}/end`, { status: 204 });
    await user.press(cancelLink());
    await pass(500);

    await user.press(inDock().getByRole('button', { name: '동의 요청 보내기' }));
    await pass(500);

    const keys = server.received('POST /library/room-requests').map(({ idempotencyKey }) => idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
    expect(inFrame().getByText('동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.')).toBeVisible();
  });

  it('can be sent again once the request ended on the server', async () => {
    await sent();
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: { ...requestOf(['declined', 'declined', 'declined'], 3), status: 'dissolved' },
    });
    await pass(3500);

    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeEnabled();
  });
});

// Partitions, from #656's review: a send that failed, 요청 취소 pressed twice, and every Friend still in consented while
// one more is needed. Expected values: today's room card's words.
describe('Sending and taking back the consent requests', () => {
  it('says when they could not be sent', async () => {
    server.on('POST /library/room-requests', { status: 500, body: {} });

    await sent();

    expect(inFrame().getByText('동의 요청을 보내지 못했어요. 다시 해 주세요.')).toBeVisible();
  });

  it('ends the booking party once when 요청 취소 is pressed twice', async () => {
    const user = await sent();
    server.on(`POST /quests/${QUEST_ID}/end`, { status: 204, afterMs: 2000 });

    await user.press(cancelLink());
    await user.press(cancelLink());
    await pass(3000);

    expect(server.received(`POST /quests/${QUEST_ID}/end`)).toHaveLength(1);
  });

  it('asks for one more Friend when everyone still in has consented', async () => {
    await sent();
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['declined', 'consented', 'consented'], 1),
    });
    await pass(3500);

    expect(inFrame().getByText('동의 2/2 · 친구를 더 불러 주세요')).toBeVisible();
  });
});

// The time card's title of the answer to send.
const TIME_CARD = '내일(목) 15:00–17:00 · 2시간';

// Partitions, from #656's review: a handle dragged on a sent answer. Expected values: the answer's rule.
describe("A sent answer's time card", () => {
  it('keeps its handles where they are, asking nothing', async () => {
    await sent();
    await layTrack(300);
    expect(screen.getByText(TIME_CARD)).toBeVisible();

    await drag('until', 60);

    expect(screen.getByText(TIME_CARD)).toBeVisible();
    expect(server.received('POST /assistant/answers')).toEqual([]);
  });
});
