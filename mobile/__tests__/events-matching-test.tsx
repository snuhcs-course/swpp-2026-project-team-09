// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { within } from '@testing-library/react-native';
import type { MatchingRequest } from '@/api/matching-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, type Reply, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, card, CAREER, MAJOR, MY_CAREER, openEvents, waiting } from './support/events';
import { openLive, socketServer } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// AI 매칭 on an event's card: asking with a group size, the refusals, the AI 매칭 신청 list with withdrawing, and a
// match arriving over the connection, against the fake main server.

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

const EXPLANATION =
  '같은 행사에 가려는 사람 중 관심사가 비슷한 사람과 인원에 맞춰 파티를 만들어 드려요. 같은 인원으로 모집 중인 공개 파티에 자리가 있으면 그 파티에 먼저 들어가요. 매칭되면 내 파티에 생기고, 멤버에게 내 이름과 학과가 보여요.';

let server: FakeServer;
// The User's waiting requests as the fake main server holds them.
let requests: MatchingRequest[];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  requests = [];
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function answerMatching(asked: Reply): void {
  answerEvents(server);
  server.on('GET /matching-requests', () => ({ status: 200, body: requests }));
  server.on('POST /matching-requests', ({ body }) => {
    if (typeof asked === 'object' && asked.status === 201 && typeof body === 'object' && body !== null) {
      requests = [...requests, waiting(CAREER.id, Number(Reflect.get(body, 'size')))];
    }
    return asked;
  });
}

type User = Awaited<ReturnType<typeof openEvents>>;

async function ask(user: User, size: string): Promise<void> {
  await user.press(card(CAREER).getByRole('button', { name: 'AI 매칭' }));
  await user.press(screen.getByRole('button', { name: size }));
  await user.press(screen.getByRole('button', { name: '매칭 신청' }));
  await pass(500);
}

describe('asking for Matching', () => {
  it.each([2, 3, 4])('sends the size %i, and the card shows 매칭 중', async (size) => {
    answerMatching({ status: 201, body: waiting(CAREER.id, size) });
    const user = await openEvents();

    await user.press(card(CAREER).getByRole('button', { name: 'AI 매칭' }));
    expect(screen.getByRole('header', { name: 'AI 매칭' })).toBeVisible();
    expect(screen.getByText(EXPLANATION)).toBeVisible();
    expect(screen.getByRole('button', { name: '매칭 신청' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: `${size}명` }));
    await user.press(screen.getByRole('button', { name: '매칭 신청' }));
    await pass(500);

    expect(server.received('POST /matching-requests').map(({ body }) => body)).toEqual([
      { globalEventId: CAREER.id, size },
    ]);
    expect(toast()).toHaveTextContent('매칭을 신청했어요 · 결과는 알림으로 와요');
    expect(card(CAREER).getByRole('button', { name: '매칭 중' })).toBeVisible();
    expect(card(MAJOR).getByRole('button', { name: 'AI 매칭' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'AI 매칭 신청 내역 1건' })).toBeVisible();
  });

  it.each([
    [refusal(409, 'GLOBAL_EVENT_STARTED'), '이미 시작한 행사예요'],
    [refusal(409, 'SHARED_QUEST_HELD'), '이 행사에 함께 가는 파티가 이미 있어요'],
    [refusal(409, 'MATCHING_REQUEST_WAITING'), '이미 매칭 중이에요'],
    [refusal(404, 'GLOBAL_EVENT_NOT_FOUND'), '행사를 찾을 수 없어요'],
    [refusal(502), '매칭 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요'],
  ])('says why it was refused: %j', async (reply, words) => {
    answerMatching(reply);
    const user = await openEvents();
    const fetched = server.received('GET /global-events').length;

    await ask(user, '3명');

    expect(toast()).toHaveTextContent(words);
    expect(card(CAREER).getByRole('button', { name: 'AI 매칭' })).toBeVisible();
    const again = server.received('GET /global-events').length > fetched;
    expect(again).toBe(words === '행사를 찾을 수 없어요');
  });
});

// The list, opened from the card's 매칭 중, with a request for each of two events.
async function openList(): Promise<User> {
  answerMatching(refusal(409, 'MATCHING_REQUEST_WAITING'));
  requests = [waiting(CAREER.id, 3), waiting(MAJOR.id, 2, '2026-10-06T03:55:00.000Z')];
  const user = await openEvents();
  await user.press(card(CAREER).getByRole('button', { name: '매칭 중' }));
  await pass(500);
  return user;
}

function request(eventId: string): ReturnType<typeof within> {
  return within(screen.getByTestId(`matching-${eventId}`));
}

describe('the AI 매칭 신청 list', () => {
  it("lists the User's waiting requests, opened from 매칭 중", async () => {
    await openList();

    expect(shownAddress()).toBe('/matching');
    expect(screen.getByRole('header', { name: 'AI 매칭 신청 2' })).toBeVisible();
    const career = request(CAREER.id);
    expect(career.getByText('매칭 중')).toBeVisible();
    expect(career.getByText('방금 신청')).toBeVisible();
    expect(career.getByText('오늘 18:00–20:00 · 301동 대강당')).toBeVisible();
    expect(career.getByText('3명')).toBeVisible();
    const major = request(MAJOR.id);
    expect(major.getByText('5분 전')).toBeVisible();
    expect(major.getByText('2명')).toBeVisible();
  });

  it('withdraws a request once the User confirms, and keeps it after 아니요', async () => {
    server.on(`POST /matching-requests/${CAREER.id}/withdraw`, () => {
      requests = requests.filter(({ globalEventId }) => globalEventId !== CAREER.id);
      return { status: 204 };
    });
    const user = await openList();

    await user.press(request(CAREER.id).getByRole('button', { name: '신청 취소' }));
    expect(screen.getByRole('header', { name: '매칭 신청을 취소할까요?' })).toBeVisible();
    await answer(user, '아니요');
    expect(server.received(`POST /matching-requests/${CAREER.id}/withdraw`)).toHaveLength(0);

    await user.press(request(CAREER.id).getByRole('button', { name: '신청 취소' }));
    await answer(user, '신청 취소');

    expect(server.received(`POST /matching-requests/${CAREER.id}/withdraw`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('매칭 신청을 취소했어요');
    expect(screen.queryByRole('header', { name: CAREER.title })).toBeNull();
    expect(screen.getByRole('header', { name: 'AI 매칭 신청 1' })).toBeVisible();
  });
});

describe('withdrawing a request that no longer waits', () => {
  it.each([
    [409, 'MATCHING_REQUEST_NOT_WAITING'],
    [404, 'MATCHING_REQUEST_NOT_FOUND'],
  ])('says that the match is over when withdrawing is refused with %i %s', async (status, code) => {
    server.on(`POST /matching-requests/${CAREER.id}/withdraw`, refusal(status, code));
    const user = await openList();
    const fetched = server.received('GET /matching-requests').length;

    await user.press(request(CAREER.id).getByRole('button', { name: '신청 취소' }));
    await answer(user, '신청 취소');

    expect(toast()).toHaveTextContent('이미 매칭이 끝났어요');
    expect(server.received('GET /matching-requests').length).toBeGreaterThan(fetched);
  });

  it('says so when no request waits', async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: 'AI 매칭 신청 내역' }));
    await pass(500);

    expect(screen.getByText('신청한 매칭이 없어요')).toBeVisible();
  });
});

describe('a match', () => {
  it('arrives over the connection: a toast, and its Quest in the Quest list', async () => {
    answerEvents(server, { matching: [waiting(CAREER.id)] });
    const socket = await openLive();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('1');
    server.on('GET /matching-requests', { status: 200, body: [] });
    server.on(`GET /matching-requests/${CAREER.id}`, {
      status: 200,
      body: { ...waiting(CAREER.id), state: 'matched', questId: MY_CAREER.id },
    });
    server.on('GET /quests', { status: 200, body: [DINNER, MY_CAREER] });

    await socketServer(() => {
      socket.send('matching-changed');
    });
    await pass(500);

    expect(toast()).toHaveTextContent('AI 커리어 설명회 파티가 만들어졌어요');
    expect(screen.getByTestId('quest-count')).toHaveTextContent('2');
    expect(within(screen.getByTestId('quest-rows')).getByText(CAREER.title)).toBeVisible();
  });
});
