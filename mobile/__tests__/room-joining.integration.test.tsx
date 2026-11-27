/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  activationBox,
  answer,
  answerMyParty,
  answerRoom,
  DINNER_PARTY_MINE,
  HIS_PICNIC,
  myPicnicParty,
  openRoom,
  PICNIC_PARTY,
  SEO_YEON_HOLDER,
  toast,
} from './support/room';
import { askMainServer, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// Entering, leaving and ending a Quest's 활성화, and the User's switch for it, against the fake main server. The
// Master Switch is on: `room-activation-master` has it off.

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

const NOT_DONE = '요청하지 못했어요. 다시 시도해 주세요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('활성화 while the User is in it', () => {
  it('names those in, the User as 나; the Leader ends it for everyone in one request', async () => {
    answerMyParty(
      server,
      myPicnicParty(ME_ID, [
        { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' },
        { ...SEO_YEON_HOLDER },
        { id: MIN_JUN.id, name: '김민준', department: '컴퓨터공학부' },
      ]),
    );
    server.on('POST /parties/mine/end', { status: 204 });
    const user = await openRoom();

    expect(activationBox().getByLabelText('나, 이서연, 김민준 참여 중')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '활성화 끄기' }));
    expect(screen.getByText('모든 멤버의 위치 공유가 멈춰요.\n파티는 그대로 남아요.')).toBeVisible();
    await answer(user, '끄기');

    expect(server.received('POST /parties/mine/end')).toHaveLength(1);
    expect(server.received('DELETE /parties/mine/members/' + MIN_JUN.id)).toHaveLength(0);
    expect(toast()).toHaveTextContent('활성화를 껐어요');
  });

  it('lets a member leave it', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id));
    server.on('POST /parties/mine/leave', { status: 204 });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '활성화에서 나가기' }));
    expect(screen.getByText('내 위치 공유가 멈추고 멤버 위치도 볼 수 없어요.\n파티에는 그대로 남아요.')).toBeVisible();
    await answer(user, '나가기');

    expect(server.received('POST /parties/mine/leave')).toHaveLength(1);
    expect(toast()).toHaveTextContent('활성화에서 나왔어요 · 위치 공유 멈춤');
  });
});

describe('a refused end of 활성화', () => {
  it.each([
    [
      '활성화 끄기',
      '끄기',
      'POST /parties/mine/end',
      refusal(403, 'NOT_PARTY_LEADER'),
      '활성화를 켠 사람만 끌 수 있어요',
    ],
    ['활성화 끄기', '끄기', 'POST /parties/mine/end', refusal(404, 'NOT_IN_PARTY'), '활성화가 끝났어요'],
  ])('says why "%s" was refused: %j', async (control, confirm, route, reply, words) => {
    answerMyParty(server, myPicnicParty());
    server.on(route, reply);
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: control }));
    await answer(user, confirm);

    expect(toast()).toHaveTextContent(words);
  });
});

describe("the User's switch for the Party", () => {
  it('turns it back on with 위치 공유 켜고 참여, and shows the User not in again after a failure', async () => {
    answerMyParty(server, { ...myPicnicParty(), sharing: false });
    server.on('PUT /parties/mine/sharing', refusal(500));
    const user = await openRoom();

    await user.press(activationBox().getByRole('button', { name: '위치 공유 켜고 참여' }));
    await pass(500);

    expect(server.received('PUT /parties/mine/sharing').map(({ body }) => body)).toEqual([{ on: true }]);
    expect(toast()).toHaveTextContent(NOT_DONE);
    expect(activationBox().getByRole('button', { name: '위치 공유 켜고 참여' })).toBeVisible();
  });
});

describe('활성화 running without the User', () => {
  beforeEach(() => {
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
  });

  it('names the Leader who opened it, and enters it with one press of 나도 참여', async () => {
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom(HIS_PICNIC);
    expect(activationBox().getByLabelText('김민준 참여 중')).toBeVisible();
    expect(screen.queryByText('활성화에 참여해야 멤버 위치를 볼 수 있어요')).toBeNull();

    await answer(user, '나도 참여');

    expect(server.received(`POST /parties/${PICNIC_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('활성화에 참여했어요 · 위치 공유 시작');
  });

  it('asks before leaving the Party the User is in for it', async () => {
    answerMyParty(server, DINNER_PARTY_MINE);
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '나도 참여' }));
    expect(screen.getByRole('header', { name: '‘자하연 피크닉’ 활성화에 참여할까요?' })).toBeVisible();
    expect(
      screen.getByText(
        '참여한 멤버끼리 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘저녁 먹으러 가요’ 활성화에서는 나가게 돼요.',
      ),
    ).toBeVisible();
    await answer(user, '나가고 참여');

    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked.indexOf('POST /parties/mine/leave')).toBeLessThan(
      asked.indexOf(`POST /parties/${PICNIC_PARTY.id}/join`),
    );
  });
});

describe('a refused entry to 활성화', () => {
  beforeEach(() => {
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
  });

  it.each([
    [refusal(409, 'PARTY_FULL'), '활성화 자리가 다 찼어요'],
    [refusal(404, 'PARTY_NOT_FOUND'), '활성화가 끝났어요'],
  ])('says why it was not entered, and fetches the Parties again: %j', async (reply, words) => {
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, reply);
    const user = await openRoom(HIS_PICNIC);
    const before = server.received('GET /parties').length;

    await answer(user, '나도 참여');

    expect(toast()).toHaveTextContent(words);
    expect(server.received('GET /parties').length).toBeGreaterThan(before);
  });

  it('says why leaving was refused', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id));
    server.on('POST /parties/mine/leave', refusal(404, 'NOT_IN_PARTY'));
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '활성화에서 나가기' }));
    await answer(user, '나가기');

    expect(toast()).toHaveTextContent('활성화가 끝났어요');
  });
});
