/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
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
  toast,
} from './support/room';
import { askMainServer, LOBBY, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// P06 ticket 19 against the fake main server: while the Master Switch is off nobody sees the User, so 파티 활성화 and
// 나도 참여 ask to turn it on first and then go on at once, and a member whose switch is off reads as not in.

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

const SWITCH = 'PUT /users/me/master-switch';
const PARTY_SWITCH = 'PUT /parties/mine/sharing';
const ASK_TITLE = '전체 위치 공유를 켤까요?';
const ASK_WORDS =
  '전체 위치 공유가 꺼져 있으면 활성화에 참여해도 서로의 위치가 보이지 않아요. 켜면 바로 활성화에 참여해요.';
const NOT_IN = '전체 위치 공유가 꺼져 있어서 참여하지 않은 상태예요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server, HIS_PICNIC);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: false } });
  server.on(SWITCH, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function asked(): string[] {
  return server.received().map(({ method, path }) => `${method} ${path}`);
}

describe('파티 활성화 while the Master Switch is off', () => {
  it('asks to turn it on, then turns it on and opens the Party with no second question', async () => {
    answerMyParty(server, null);
    server.on('POST /parties', { status: 201, body: myPicnicParty() });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    expect(screen.getByRole('header', { name: ASK_TITLE })).toBeVisible();
    expect(screen.getByText(ASK_WORDS)).toBeVisible();
    await answer(user, '켜고 활성화');

    expect(server.received(SWITCH).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(asked().indexOf(SWITCH)).toBeLessThan(asked().indexOf('POST /parties'));
    expect(server.received('POST /parties')).toHaveLength(1);
    expect(screen.queryByRole('header', { name: '파티를 활성화할까요?' })).toBeNull();
    expect(toast()).toHaveTextContent('파티를 활성화했어요');
  });

  it('explains the location first where the phone has not allowed it', async () => {
    givePhone({ permission: 'unasked', prompt: 'granted', position: ON_CAMPUS });
    answerMyParty(server, null);
    server.on('POST /parties', { status: 201, body: myPicnicParty() });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    await answer(user, '켜고 활성화');
    expect(server.received(SWITCH)).toHaveLength(0);
    await answer(user, '계속');

    expect(server.received(SWITCH).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(server.received('POST /parties')).toHaveLength(1);
  });
});

describe('파티 활성화 while the Master Switch is off, beside another Party', () => {
  it('says in the same sheet that the User leaves the other Party, and leaves it first', async () => {
    answerMyParty(server, DINNER_PARTY_MINE);
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on('POST /parties', { status: 201, body: myPicnicParty() });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    expect(
      screen.getByText(
        `${ASK_WORDS}\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘저녁 먹으러 가요’ 활성화에서는 나가게 돼요.`,
      ),
    ).toBeVisible();
    await answer(user, '켜고 활성화');

    expect(asked().indexOf('POST /parties/mine/leave')).toBeLessThan(asked().indexOf('POST /parties'));
    expect(server.received('POST /parties')).toHaveLength(1);
  });
});

describe('나도 참여 while the Master Switch is off', () => {
  it('asks to turn it on, then turns it on and enters with no second question', async () => {
    answerMyParty(server, null);
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom(HIS_PICNIC);

    await user.press(activationBox().getByRole('button', { name: '나도 참여' }));
    expect(screen.getByRole('header', { name: ASK_TITLE })).toBeVisible();
    await answer(user, '켜고 참여');

    expect(server.received(SWITCH).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(server.received(`POST /parties/${PICNIC_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('활성화에 참여했어요 · 위치 공유 시작');
  });
});

describe('a member of the running Party whom nobody sees', () => {
  it('reads as not in with the Master Switch off, and 위치 공유 켜고 참여 turns it on', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id));
    const user = await openRoom(HIS_PICNIC);

    expect(activationBox().getByText(NOT_IN)).toBeVisible();
    expect(activationBox().getByLabelText('김민준 참여 중')).toBeVisible();
    await user.press(activationBox().getByRole('button', { name: '위치 공유 켜고 참여' }));
    await pass(500);

    expect(server.received(SWITCH).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(server.received(PARTY_SWITCH)).toHaveLength(0);
    expect(activationBox().queryByText(NOT_IN)).toBeNull();
    expect(activationBox().getByLabelText('나, 김민준 참여 중')).toBeVisible();
    expect(activationBox().getByRole('button', { name: '활성화에서 나가기' })).toBeVisible();
  });

  it('reads as not in with its Party switch off, and 위치 공유 켜고 참여 turns that on', async () => {
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
    answerMyParty(server, { ...myPicnicParty(ME_ID), sharing: false });
    server.on(PARTY_SWITCH, { status: 204 });
    const user = await openRoom(HIS_PICNIC);

    expect(activationBox().getByText(NOT_IN)).toBeVisible();
    // The way out of the Party's Leader ends it, as the in card's does.
    expect(activationBox().getByRole('button', { name: '활성화 끄기' })).toBeVisible();
    await user.press(activationBox().getByRole('button', { name: '위치 공유 켜고 참여' }));
    await pass(500);

    expect(server.received(PARTY_SWITCH).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(server.received(SWITCH)).toHaveLength(0);
  });
});

describe('the way out of the not-in card', () => {
  it('lets a member whom nobody sees leave, asking as the in card does', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id));
    server.on('POST /parties/mine/leave', { status: 204 });
    const user = await openRoom(HIS_PICNIC);
    expect(activationBox().getByRole('button', { name: '위치 공유 켜고 참여' })).toBeVisible();

    await user.press(activationBox().getByRole('button', { name: '활성화에서 나가기' }));
    expect(screen.getByRole('header', { name: '활성화에서 나갈까요?' })).toBeVisible();
    await answer(user, '나가기');

    expect(server.received('POST /parties/mine/leave')).toHaveLength(1);
    expect(server.received(SWITCH)).toHaveLength(0);
  });
});
