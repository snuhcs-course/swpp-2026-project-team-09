/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answer, answerMyParty, DINNER_PARTY_MINE, myPicnicParty, toast } from './support/room';
import { answerMainScreen, askMainServer, DINNER, DINNER_PARTY, LEAVE_BY, MIN_JUN } from './support/server';

// `파티 켜기` on the time to leave in 알림, which turns the Quest's Party on as the room's 파티 활성화 does.

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

const ROW = '12:18 나설 시각 · 학생회관식당까지 걸어서 15분 · 12:18';
// The dinner's Party as the room opens it: closed and for 8.
const OPENING = { title: DINNER.title, capacity: 8, joinPolicy: 'closed', questId: DINNER.id };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date('2026-10-06T12:10:00+09:00') });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /notifications', { status: 200, body: [LEAVE_BY] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openNotifications(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: '알림' }));
  await pass(500);
  return user;
}

describe('파티 켜기 on the time to leave', () => {
  it('shows on the row of a Quest whose Party the User is not in', async () => {
    await openNotifications();

    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.getByRole('button', { name: '파티 켜기' })).toBeVisible();
  });

  it('shows none on the row of a Quest whose Party the User is in', async () => {
    answerMyParty(server, DINNER_PARTY_MINE);

    await openNotifications();

    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.queryByRole('button', { name: '파티 켜기' })).toBeNull();
  });
});

describe('a press on 파티 켜기', () => {
  it("opens the Quest's Party, closed and for 8, with the room's toast, and the User stays in 알림", async () => {
    const mine = answerMyParty(server, null);
    server.on('POST /parties', () => {
      mine.set(DINNER_PARTY_MINE);
      return { status: 201, body: DINNER_PARTY_MINE };
    });
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '파티 켜기' }));
    await pass(500);

    expect(server.received('POST /parties').map(({ body }) => body)).toEqual([OPENING]);
    expect(toast()).toHaveTextContent(/^파티를 활성화했어요$/u);
    expect(screen.getByRole('header', { name: '알림' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '파티 켜기' })).toBeNull();
  });

  it("enters the Party another Holder opened for the Quest, with the room's toast", async () => {
    server.on('POST /parties', refusal(409, 'PARTY_EXISTS_FOR_QUEST', { partyId: DINNER_PARTY.id }));
    server.on(`POST /parties/${DINNER_PARTY.id}/join`, { status: 201, body: DINNER_PARTY_MINE });
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '파티 켜기' }));
    await pass(500);

    expect(server.received(`POST /parties/${DINNER_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('이미 활성화된 파티에 참여했어요');
    expect(screen.getByRole('header', { name: '알림' })).toBeVisible();
  });
});

describe('a press on 파티 켜기 while the User is in another Party', () => {
  it('asks first, as the room asks, and leaves that Party before opening', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id));
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on('POST /parties', { status: 201, body: DINNER_PARTY_MINE });
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '파티 켜기' }));

    expect(screen.getByRole('header', { name: '파티를 활성화할까요?' })).toBeVisible();
    expect(
      screen.getByText(
        '다른 멤버의 알림 목록에 떠요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘자하연 피크닉’ 활성화에서는 나가게 돼요.',
      ),
    ).toBeVisible();
    expect(server.received('POST /parties')).toHaveLength(0);
    await answer(user, '활성화');

    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked.indexOf('POST /parties/mine/leave')).toBeGreaterThan(-1);
    expect(asked.indexOf('POST /parties/mine/leave')).toBeLessThan(asked.indexOf('POST /parties'));
    expect(server.received('POST /parties').map(({ body }) => body)).toEqual([OPENING]);
  });
});

// Partitions: the row of a Quest taken alone (the review of PR 338, C). Expected values: no 파티 켜기, as its Party
// would show it to Friends.
describe('the time to leave of a Quest taken alone', () => {
  it('offers no 파티 켜기', async () => {
    server.on('GET /quests', { status: 200, body: [{ ...DINNER, takenAlone: true, capacity: 1 }] });

    await openNotifications();

    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.queryByRole('button', { name: '파티 켜기' })).toBeNull();
  });
});
