/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Quest } from '@/api/types';
import type { JoinRequest } from '@/api/waiting-types';
import { keep, readKeptAfterChanges } from '@/storage/kept';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  answerMyParty,
  DINNER_PARTY_MINE,
  ME_HOLDER,
  MIN_JUN_HOLDER,
  myPicnicParty,
  PICNIC,
  toast,
} from './support/room';
import { answerParty, MY_HIKE, openAt, YU_NA } from './support/party';
import { askMainServer, DINNER, DINNER_PARTY, ME_ID, PHONE_NOW } from './support/server';

// The status of a card of 내 파티 and its activation strip, against the fake main server, on Tuesday 6 October 2026 at
// 13:00 in Korea.

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
let setAnswers: ReturnType<typeof answerParty>;

// 김민준's Open Quest, which the User holds with 이서연.
const THEIRS: Quest = { ...PICNIC, id: 'quest-theirs', title: '남의 피크닉', leader: MIN_JUN_HOLDER };

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByRole('button', { name: title }));
}

const GROUPS = new Set(['활성화 중', '활성화 알림', '다른 활성 파티']);

function firstGroup(): string | undefined {
  return screen
    .getAllByRole('header')
    .map(({ props }) => String(props.children))
    .find((name) => GROUPS.has(name));
}

function invited(count: number): JoinRequest[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `qi-${String(index)}`,
    user: { ...YU_NA, id: `${YU_NA.id}-${String(index)}` },
    sentAt: '2026-10-06T03:00:00.000Z',
  }));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { quests: [DINNER, MY_HIKE] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the status of a card of 내 파티', () => {
  it('reads 멤버 {n}명 on another’s Quest, and on the User’s how full it is and the invitations waiting', async () => {
    setAnswers({ quests: [DINNER, MY_HIKE, THEIRS] });
    server.on(`GET /quests/${MY_HIKE.id}/invitations`, { status: 200, body: invited(2) });
    server.on(`GET /quests/${DINNER.id}/invitations`, { status: 200, body: invited(1) });
    await openAt('/party?tab=mine');
    await pass(500);

    expect(card(THEIRS.title).getByText('멤버 3명')).toBeVisible();
    expect(card(MY_HIKE.title).getByText('모집 중 · 1/6명 · 초대 2명 대기')).toBeVisible();
    expect(card(DINNER.title).getByText('2명 · 초대 1명 대기')).toBeVisible();
  });

  it('reads 응답 대기 while the User alone shares in the Party', async () => {
    setAnswers({ quests: [DINNER, PICNIC] });
    answerMyParty(server, myPicnicParty(ME_ID, [ME_HOLDER]));
    await openAt('/party?tab=mine');

    expect(card(PICNIC.title).getByText('활성화 중 · 응답 대기')).toBeVisible();
  });
});

describe('declining an activation from a card of 내 파티', () => {
  beforeEach(() => {
    server.on('GET /parties', { status: 200, body: [DINNER_PARTY] });
  });

  it('moves the card to 다른 활성 파티, kept on the phone, and comes back with 참여', async () => {
    const mine = answerMyParty(server, null);
    server.on(`POST /parties/${DINNER_PARTY.id}/join`, { status: 201, body: DINNER_PARTY_MINE });
    const user = await openAt('/party?tab=mine');
    expect(firstGroup()).toBe('활성화 알림');

    await user.press(screen.getByRole('button', { name: `${DINNER.title} 활성화 거절` }));
    await pass(500);

    expect(toast()).toHaveTextContent('활성화 알림을 거절했어요');
    expect(firstGroup()).toBe('다른 활성 파티');
    expect(screen.queryByText('활성화 알림')).toBeNull();
    expect(card(DINNER.title).getByText('활성화 중 · 참여하지 않는 중')).toBeVisible();
    expect(screen.queryByRole('button', { name: `${DINNER.title} 활성화 거절` })).toBeNull();
    expect((await readKeptAfterChanges()).declinedParties).toEqual([DINNER_PARTY.id]);

    mine.set(DINNER_PARTY_MINE);
    await user.press(screen.getByRole('button', { name: `${DINNER.title} 활성화 참여` }));
    await pass(500);

    expect(server.received(`POST /parties/${DINNER_PARTY.id}/join`)).toHaveLength(1);
    expect(firstGroup()).toBe('활성화 중');
    expect(card(DINNER.title).getByText('활성화 중 · 2명 위치 공유')).toBeVisible();
  });

  it('reads the decline kept on the phone', async () => {
    await keep({ declinedParties: [DINNER_PARTY.id] });
    await openAt('/party?tab=mine');

    expect(firstGroup()).toBe('다른 활성 파티');
    expect(card(DINNER.title).getByText('활성화 중 · 참여하지 않는 중')).toBeVisible();
    expect(card(DINNER.title).getByRole('button', { name: `${DINNER.title} 활성화 참여` })).toBeVisible();
  });
});
