/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
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
  myPicnicParty,
  openRoom,
  PICNIC,
  PICNIC_PARTY,
  toast,
} from './support/room';
import { askMainServer, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The head of a Quest's room and opening its 활성화, the domain Party opened for the Quest, against the fake main
// server.

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

describe("the room's head", () => {
  it("shows the fill, the Leader's Badge and the title of an Open Quest the User leads", async () => {
    await openRoom();

    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
    expect(screen.getByRole('button', { name: '뒤로' })).toBeVisible();
    expect(screen.getByText('파티 · 3/4명')).toBeVisible();
    expect(screen.getByText('내가 만든 파티')).toBeVisible();
    expect(screen.queryByText('비공개')).toBeNull();
    expect(screen.getByRole('header', { name: '자하연 피크닉' })).toBeVisible();
  });

  it("counts a Closed Quest's Holders without a capacity, marks it 비공개 and names its Global Event", async () => {
    const closed = {
      ...HIS_PICNIC,
      joinPolicy: 'closed' as const,
      globalEvent: { id: 'e1', title: 'AI 커리어 설명회' },
    };
    answerRoom(server, closed);

    await openRoom(closed);

    expect(screen.getByText('파티 · 3명')).toBeVisible();
    expect(screen.getByText('비공개')).toBeVisible();
    expect(screen.getAllByText('AI 커리어 설명회')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '행사 · AI 커리어 설명회' })).toBeVisible();
    expect(screen.queryByText('내가 만든 파티')).toBeNull();
  });
});

describe('활성화 while none runs', () => {
  it('opens the Party for the Quest, closed and for 8, after the sheet, and shows that the User is in it', async () => {
    const mine = answerMyParty(server, null);
    server.on('POST /parties', () => {
      mine.set(myPicnicParty(ME_ID, [{ id: ME_ID, name: '홍길동', department: '컴퓨터공학부' }]));
      return { status: 201, body: myPicnicParty(ME_ID, [{ id: ME_ID, name: '홍길동', department: '컴퓨터공학부' }]) };
    });
    const user = await openRoom(HIS_PICNIC);
    expect(activationBox().getByText('아직 활성화하지 않았어요')).toBeVisible();
    expect(activationBox().getByText('켜면 멤버에게 알림이 가고, 수락한 멤버끼리 위치를 공유해요')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));

    expect(screen.getByRole('header', { name: '파티를 활성화할까요?' })).toBeVisible();
    expect(
      screen.getByText(
        '멤버 2명에게 알림이 가요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n내 정보에서 위치 공유를 켜야 멤버에게 내 위치가 보여요',
      ),
    ).toBeVisible();
    await answer(user, '활성화');

    expect(server.received('POST /parties').map(({ body }) => body)).toEqual([
      { title: '자하연 피크닉', capacity: 8, joinPolicy: 'closed', questId: PICNIC.id },
    ]);
    expect(toast()).toHaveTextContent('파티를 활성화했어요 · 멤버 2명에게 알림');
    expect(activationBox().getByText('활성화 중')).toBeVisible();
    expect(activationBox().getByText('멤버의 응답을 기다리는 중이에요')).toBeVisible();
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
        '멤버 2명에게 알림이 가요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 지금 참여 중인 ‘저녁 먹으러 가요’ 활성화에서는 나가게 돼요.\n내 정보에서 위치 공유를 켜야 멤버에게 내 위치가 보여요',
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

    expect(toast()).toHaveTextContent('파티에서 빠졌어요');
    expect(shownAddress()).toBe('/main');
  });
});
