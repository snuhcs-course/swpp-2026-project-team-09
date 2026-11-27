/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import {
  activationBox,
  answer,
  answerMyParty,
  answerRoom,
  DINNER_PARTY_MINE,
  HIS_PICNIC,
  ME_HOLDER,
  MIN_JUN_HOLDER,
  myPicnicParty,
  openRoom,
  PICNIC,
  PICNIC_PARTY,
  SEO_YEON_HOLDER,
  toast,
} from './support/room';
import { askMainServer, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';
import { keep } from '@/storage/kept';

// The app bar of a Quest's room, its 활성화 (the domain Party opened for the Quest) and the card of a running one,
// against the fake main server.

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

describe("the room's app bar and title", () => {
  it('shows 수정 to the Leader of an Open Quest, with no 모집글 보기 and no badges', async () => {
    await openRoom();

    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
    expect(screen.getByRole('button', { name: '뒤로' })).toBeVisible();
    expect(screen.getByRole('button', { name: '수정' })).toBeVisible();
    // On the title's line, not at the top of the bar's row.
    expect(screen.getByRole('button', { name: '수정' })).toHaveStyle({ alignSelf: 'center' });
    expect(screen.queryByRole('button', { name: '모집글 보기' })).toBeNull();
    for (const badge of ['파티 · 3/4명', '내가 만든 파티', '비공개', '퀘스트']) {
      expect(screen.queryByText(badge)).toBeNull();
    }
    expect(screen.getByRole('header', { name: '자하연 피크닉' })).toBeVisible();
  });
});

const HELP = [
  '참여한 멤버끼리만 지도에서 서로의 위치를 봐요',
  '참여하려면 전체 위치 공유가 켜져 있어야 해요',
  '한 번에 한 파티만 참여할 수 있어요',
  '남은 일정이 있어야 켤 수 있어요',
];

// The lines the user took out of the help on 2026-11-27.
const LEFT_OUT = [
  '켜면 다른 멤버의 알림 목록에 떠요',
  '일정 시작 30분 전부터 그 장소에 도착하면, 위치를 보는 멤버에게 도착 알림이 가요',
  '다 모이면 꺼 주세요. 꺼도 파티는 그대로 남아요',
];

describe('활성화 while none runs', () => {
  it('shows 파티 활성화 with a ?, which opens the help, closed by a press elsewhere or the back button', async () => {
    const back = holdBackButton();
    const user = await openRoom(HIS_PICNIC);
    expect(activationBox().queryByText('아직 활성화하지 않았어요')).toBeNull();

    await user.press(activationBox().getByRole('button', { name: '파티 활성화 도움말' }));

    for (const line of HELP) {
      expect(screen.getByText(line)).toBeVisible();
    }
    for (const line of LEFT_OUT) {
      expect(screen.queryByText(line)).toBeNull();
    }
    await user.press(screen.getByLabelText('파티 활성화 도움말 닫기'));
    expect(screen.queryByText(HELP[0] ?? '')).toBeNull();

    await user.press(activationBox().getByRole('button', { name: '파티 활성화 도움말' }));
    expect(await back()).toBe(true);
    expect(screen.queryByText(HELP[0] ?? '')).toBeNull();
    expect(shownAddress()).toBe(`/room/${PICNIC.id}`);
  });

  it('opens the Party for the Quest, closed and for 8, after the sheet, and shows that the User is in it', async () => {
    const mine = answerMyParty(server, null);
    server.on('POST /parties', () => {
      mine.set(myPicnicParty(ME_ID, [{ id: ME_ID, name: '홍길동', department: '컴퓨터공학부' }]));
      return { status: 201, body: myPicnicParty(ME_ID, [{ id: ME_ID, name: '홍길동', department: '컴퓨터공학부' }]) };
    });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));

    expect(screen.getByRole('header', { name: '파티를 활성화할까요?' })).toBeVisible();
    expect(screen.getByText('다른 멤버의 알림 목록에 떠요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.')).toBeVisible();
    await answer(user, '활성화');

    expect(server.received('POST /parties').map(({ body }) => body)).toEqual([
      { title: '자하연 피크닉', capacity: 8, joinPolicy: 'closed', questId: PICNIC.id },
    ]);
    expect(toast()).toHaveTextContent(/^파티를 활성화했어요$/u);
    expect(activationBox().getByText('활성화 중')).toBeVisible();
    expect(activationBox().getByLabelText('나 참여 중')).toBeVisible();
    expect(screen.getByTestId('activation-card')).toHaveStyle({ borderWidth: 2 });
  });
});

describe('활성화 running', () => {
  it('shows a white card with the red light and the names of those in, and 나도 참여 without 거절', async () => {
    answerMyParty(server, null);
    server.on('GET /parties', { status: 200, body: [{ ...PICNIC_PARTY, members: [MIN_JUN_HOLDER, SEO_YEON_HOLDER] }] });
    await openRoom(HIS_PICNIC);

    const card = within(screen.getByTestId('activation-card'));
    expect(card.getByText('활성화 중')).toBeVisible();
    expect(card.getByLabelText('김민준, 이서연 참여 중')).toBeVisible();
    expect(card.getByRole('button', { name: '나도 참여' })).toBeVisible();
    expect(card.queryByRole('button', { name: '거절' })).toBeNull();
    expect(screen.getByTestId('activation-card')).not.toHaveStyle({ borderWidth: 2 });
  });

  it('shows the same card to a User who declined it on 내 파티', async () => {
    await keep({ declinedParties: [PICNIC_PARTY.id] });
    answerMyParty(server, null);
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
    await openRoom(HIS_PICNIC);

    const card = within(screen.getByTestId('activation-card'));
    expect(card.getByLabelText('김민준 참여 중')).toBeVisible();
    expect(card.getByRole('button', { name: '나도 참여' })).toBeVisible();
  });

  it('outlines the card while the User is in, with the names in the order they entered and no switch', async () => {
    answerMyParty(server, myPicnicParty(MIN_JUN.id, [MIN_JUN_HOLDER, ME_HOLDER, SEO_YEON_HOLDER]));
    await openRoom(HIS_PICNIC);

    const card = within(screen.getByTestId('activation-card'));
    expect(card.getByLabelText('김민준, 나, 이서연 참여 중')).toBeVisible();
    expect(card.getByRole('button', { name: '활성화에서 나가기' })).toBeVisible();
    expect(screen.getByTestId('activation-card')).toHaveStyle({ borderWidth: 2 });
    expect(screen.queryByRole('switch', { name: '내 위치 공유' })).toBeNull();
  });
});

describe('opening 활성화 beside another Party', () => {
  it('leaves the Party the User is in first, after saying so', async () => {
    answerMyParty(server, DINNER_PARTY_MINE);
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on('POST /parties', { status: 201, body: myPicnicParty() });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));

    expect(
      screen.getByText(
        '다른 멤버의 알림 목록에 떠요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘저녁 먹으러 가요’ 활성화에서는 나가게 돼요.',
      ),
    ).toBeVisible();
    await answer(user, '활성화');
    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked.indexOf('POST /parties/mine/leave')).toBeLessThan(asked.indexOf('POST /parties'));
  });

  it('enters the Party another Holder opened at the same moment', async () => {
    server.on('POST /parties', refusal(409, 'PARTY_EXISTS_FOR_QUEST', { partyId: PICNIC_PARTY.id }));
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty(MIN_JUN.id) });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    await answer(user, '활성화');

    expect(server.received(`POST /parties/${PICNIC_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('이미 활성화된 파티에 참여했어요');
  });
});

describe('a refused opening of 활성화', () => {
  it.each([
    [refusal(409, 'QUEST_ENDED'), '일정이 모두 끝난 파티는 활성화할 수 없어요'],
    [refusal(409, 'ALREADY_IN_PARTY'), '이미 다른 활성화에 참여 중이에요'],
    [refusal(500), NOT_DONE],
    ['no-answer' as const, NOT_DONE],
  ])('says why it was not opened, and fetches the Party again: %j', async (reply, words) => {
    server.on('POST /parties', reply);
    const user = await openRoom();
    const before = server.received('GET /parties/mine').length;

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    await answer(user, '활성화');

    expect(toast()).toHaveTextContent(words);
    expect(server.received('GET /parties/mine').length).toBeGreaterThan(before);
  });
});

describe('활성 파티 for a Party tied to no Quest', () => {
  it('asks to leave it, since it has no room', async () => {
    answerMyParty(server, { ...myPicnicParty(MIN_JUN.id), quest: null });
    server.on('POST /parties/mine/leave', { status: 204 });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: '활성 파티 자하연 피크닉 열기' }));
    expect(screen.getByRole('header', { name: '활성화에서 나갈까요?' })).toBeVisible();
    await answer(user, '나가기');

    expect(shownAddress()).toBe('/main');
    expect(server.received('POST /parties/mine/leave')).toHaveLength(1);
  });
});

describe('the room of a Quest the User no longer holds', () => {
  it('closes the room when the User no longer holds the Quest', async () => {
    await openRoom();
    await socketServer((socket) => {
      socket.accept();
    });

    server.on(`GET /quests/${PICNIC.id}`, refusal(404, 'QUEST_NOT_FOUND'));
    await socketServer((socket) => {
      socket.send('quests-changed');
    });
    await pass(500);

    // The toast is the signed-in layout's, which `party-gone` covers.
    expect(shownAddress()).toBe('/main');
  });
});
