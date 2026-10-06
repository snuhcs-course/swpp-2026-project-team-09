import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
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
  PICNIC,
  PICNIC_PARTY,
  SEO_YEON_HOLDER,
  toast,
} from './support/room';
import { askMainServer, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// Entering, leaving and ending a Quest's 활성화, and the User's switch for it, against the fake main server.

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

function sharing(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('switch', { name: '내 위치 공유' });
}

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
  it('counts the members the User sees and the User; the Leader ends it for everyone in one request', async () => {
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

    expect(activationBox().getByText('3명이 서로 위치를 공유하고 있어요')).toBeVisible();
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
  it("turns the User's switch for the Party at once, and back after a failure", async () => {
    const mine = answerMyParty(server, myPicnicParty());
    server.on('PUT /parties/mine/sharing', ({ body }) => {
      mine.set({ ...myPicnicParty(), sharing: JSON.stringify(body) === '{"on":true}' });
      return { status: 204 };
    });
    await openRoom();
    expect(sharing()).toBeChecked();

    await fireEvent(sharing(), 'valueChange', false);
    await pass(0);
    expect(sharing()).not.toBeChecked();
    await pass(500);
    expect(server.received('PUT /parties/mine/sharing').map(({ body }) => body)).toEqual([{ on: false }]);

    server.on('PUT /parties/mine/sharing', refusal(500));
    await fireEvent(sharing(), 'valueChange', true);
    await pass(500);
    expect(sharing()).not.toBeChecked();
    expect(toast()).toHaveTextContent(NOT_DONE);
  });
});

describe('활성화 running without the User', () => {
  beforeEach(() => {
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
  });

  it('names the Leader who opened it, and enters it with one press', async () => {
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom(HIS_PICNIC);
    expect(activationBox().getByText('김민준님이 파티를 활성화했어요')).toBeVisible();
    expect(screen.getByText('활성화에 참여해야 멤버 위치를 볼 수 있어요')).toBeVisible();

    await answer(user, '참여');

    expect(server.received(`POST /parties/${PICNIC_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('활성화에 참여했어요 · 위치 공유 시작');
  });

  it('asks before leaving the Party the User is in for it', async () => {
    answerMyParty(server, DINNER_PARTY_MINE);
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '참여' }));
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

describe('거절 of a running 활성화', () => {
  beforeEach(() => {
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
  });

  it('keeps 거절 on the phone: the room opened again shows the declined state, which still enters', async () => {
    const user = await openRoom(HIS_PICNIC);

    await answer(user, '거절');
    expect(activationBox().getByText('활성화 중인 파티예요')).toBeVisible();
    expect(activationBox().getByText('나는 참여하지 않는 중 · 위치를 공유하지 않아요')).toBeVisible();
    expect(server.received().filter(({ method, path }) => method !== 'GET' && path.startsWith('/parties'))).toEqual([]);

    await act(() => {
      router.back();
    });
    await pass(500);
    await act(() => {
      router.push(`/room/${PICNIC.id}`);
    });
    await pass(500);
    expect(activationBox().getByText('활성화 중인 파티예요')).toBeVisible();
    expect(screen.getByRole('button', { name: '참여' })).toBeVisible();
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

    await answer(user, '참여');

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
