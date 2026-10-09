/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, card, CAREER, MY_CAREER, openEvents, SEO_YEON_GOING, TAE_O_GOING } from './support/events';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, lookOf, press, zoomIn } from './support/markers';
import { requestFor } from './support/party';
import { startFresh } from './support/mocks';
import { answer, MIN_JUN_HOLDER, toast } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// 파티 찾기/모집 on an event's card and 같이 갈 사람 찾기 on the map: the Quests gathering for a Global Event, joining
// one, and recruiting one's own, against the fake main server.

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openEvents>>;

async function openSheet(user: User): Promise<void> {
  await user.press(card(CAREER).getByRole('button', { name: '파티 찾기/모집' }));
  await pass(500);
}

// The sheet, then the recruiting post of the Quest whose row is named so.
async function openPostOf(name: RegExp): Promise<User> {
  server.on('GET /quest-join-requests', { status: 200, body: [] });
  const user = await openEvents();
  await openSheet(user);
  await user.press(screen.getByRole('button', { name }));
  await pass(500);
  return user;
}

describe('the sheet of the Quests gathering for an event', () => {
  it("lists the User's own Quest first, then the others with their Leaders", async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    const user = await openEvents();

    await openSheet(user);

    expect(server.received('GET /quests/recruiting').at(-1)?.query).toEqual({ globalEventId: CAREER.id });
    expect(screen.getByRole('header', { name: '모집 중인 파티 3' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^(내 파티|참여 중|이서연|윤태오) /u })).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: /^내 파티 1\/1명 AI 커리어 설명회 18:00 · 301동 대강당/u }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^이서연 2\/4명 AI 커리어 설명회 17:40 · 301동 앞/u })).toBeVisible();
    expect(screen.getByRole('button', { name: /^윤태오 2\/4명/u })).toBeVisible();
  });

  it('names the Leader of a Quest the User holds and does not lead, as 참여 중', async () => {
    const theirs = {
      ...MY_CAREER,
      leader: MIN_JUN_HOLDER,
      capacity: 4,
      holders: [...MY_CAREER.holders, MIN_JUN_HOLDER],
    };
    answerEvents(server, { quests: [DINNER, theirs], recruiting: [] });
    const user = await openEvents();

    await openSheet(user);

    expect(
      screen.getByRole('button', { name: /^참여 중 2\/4명 AI 커리어 설명회 김민준 · 18:00 · 301동 대강당/u }),
    ).toBeVisible();
  });
});

describe('the sheet of an event that nothing gathers for, and its rows', () => {
  it('says so when nothing gathers for the event', async () => {
    answerEvents(server, { recruiting: [] });
    const user = await openEvents();

    await openSheet(user);

    expect(screen.getByText('아직 모집 중인 파티가 없어요')).toBeVisible();
    expect(screen.getByRole('header', { name: '모집 중인 파티 0' })).toBeVisible();
  });

  it("opens the room of the User's own Quest", async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    server.on(`GET /quests/${MY_CAREER.id}/invitations`, { status: 200, body: [] });
    const user = await openEvents();
    await openSheet(user);

    await user.press(screen.getByRole('button', { name: /^내 파티/u }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
  });
});

describe('joining from the sheet', () => {
  it("opens the recruiting post of another's Quest, without asking first", async () => {
    answerEvents(server);

    await openPostOf(/^이서연/u);

    expect(shownAddress()).toBe(`/post/${SEO_YEON_GOING.id}`);
    expect(screen.queryByRole('header', { name: '모집 중인 파티 2' })).toBeNull();
    expect(screen.getByText('이서연 · 모집자')).toBeVisible();
    expect(screen.getByRole('header', { name: SEO_YEON_GOING.title })).toBeVisible();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
  });

  it("joins an Open Quest with the post's 참여하기", async () => {
    answerEvents(server);
    server.on(`POST /quests/${SEO_YEON_GOING.id}/join`, { status: 201, body: { ...MY_CAREER, id: SEO_YEON_GOING.id } });
    const user = await openPostOf(/^이서연/u);

    await user.press(screen.getByRole('button', { name: '참여하기' }));
    await answer(user, '참여하기');

    expect(server.received(`POST /quests/${SEO_YEON_GOING.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('AI 커리어 설명회 참여 완료');
  });

  it("asks the Leader of an Approval Quest with the post's 참여 신청", async () => {
    answerEvents(server);
    server.on('POST /quest-join-requests', { status: 201, body: requestFor(TAE_O_GOING, 'qjr1') });
    const user = await openPostOf(/^윤태오/u);

    await user.press(screen.getByRole('button', { name: '참여 신청' }));
    await answer(user, '참여 신청');

    expect(server.received('POST /quest-join-requests').map(({ body }) => body)).toEqual([{ questId: TAE_O_GOING.id }]);
    expect(toast()).toHaveTextContent('참여를 신청했어요');
  });
});

describe('a refusal on the post', () => {
  it.each([
    ['QUEST_FULL', '자리가 다 찼어요'],
    ['QUEST_ENDED', '이미 끝난 파티예요'],
    ['SHARED_QUEST_HELD', '이 행사에 함께 가는 파티가 이미 있어요'],
  ])('says why when joining is refused with %s', async (code, words) => {
    answerEvents(server);
    server.on(`POST /quests/${SEO_YEON_GOING.id}/join`, refusal(409, code));
    const user = await openPostOf(/^이서연/u);
    const asked = server.received('GET /quests/recruiting').length;

    await user.press(screen.getByRole('button', { name: '참여하기' }));
    await answer(user, '참여하기');

    expect(toast()).toHaveTextContent(words);
    expect(server.received('GET /quests/recruiting').length).toBeGreaterThan(asked);
  });
});

describe('+ 파티 모집', () => {
  it('opens 파티 만들기 with the event chosen', async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    const user = await openEvents();
    await openSheet(user);

    await user.press(screen.getByRole('button', { name: '파티 모집' }));
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?eventId=${CAREER.id}`);
    expect(screen.getByTestId('chosen-event')).toHaveTextContent(CAREER.title, { exact: false });
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(CAREER.title);
  });

  it('opens the room of the Quest the User already shares for the event', async () => {
    const shared = { ...MY_CAREER, holders: [...MY_CAREER.holders, MIN_JUN_HOLDER], capacity: 4 };
    answerEvents(server, { quests: [DINNER, shared] });
    server.on(`GET /quests/${shared.id}`, { status: 200, body: shared });
    server.on(`GET /quests/${shared.id}/invitations`, { status: 200, body: [] });
    const user = await openEvents();
    await openSheet(user);

    await user.press(screen.getByRole('button', { name: '파티 모집' }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${shared.id}`);
    expect(toast()).toHaveTextContent('이 행사에 함께 가는 파티가 이미 있어요');
  });
});

describe("the map's event card", () => {
  it('counts the Quests gathering for the event, and opens 파티 만들기 with it', async () => {
    answerEvents(server);
    const user = await openMain();
    await zoomIn(user, 2);
    expect(lookOf(EVENT)).toBe('official:pin:2');

    await press(user, EVENT);
    expect(screen.getByText('같이 갈 파티 2개 모집 중')).toBeVisible();
    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?eventId=${CAREER.id}`);
  });
});
