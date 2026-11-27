/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  answer,
  answerMyParty,
  answerRoom,
  DINNER_PARTY_MINE,
  ME_HOLDER,
  myPicnicParty,
  openRoom,
  PICNIC,
  PICNIC_PARTY,
  toast,
  toastIcon,
} from './support/room';
import { askMainServer, JOIN_REQUESTS, ME_ID, PHONE_NOW } from './support/server';
import { apiClient } from '@/api/client';
import { TAG_SET } from '@/api/mock/data/quest-parts';
import { pickFor } from '@/api/quest-parts/stable-pick';

// The room as `PartyDetail` and `PartyLeave` draw it, against the fake main server, with P06 ticket 19's head: the
// 모집글 under the title of a public and a private Quest, the event in its box, a request's row, the Leader's ending
// sheet, the sheet that switches from another Party, 파티 채팅, and what the room keeps that the frame does not draw.

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

const PRIVATE = { ...PICNIC, joinPolicy: 'closed' as const, board: null, description: '우리끼리 자하연에서 만나요' };
const PUBLIC = { ...PICNIC, description: '자하연에서 피크닉 해요' };
const FOR_EVENT = { ...PUBLIC, globalEvent: { id: 'e9', title: 'AI 커리어 설명회' } };

// The dinner's Party, which the User leads.
const MINE_TO_END = {
  ...DINNER_PARTY_MINE,
  members: DINNER_PARTY_MINE.members.map(({ id, name, department, visible }) => ({
    id,
    name,
    department,
    visible,
    leader: id === ME_ID,
  })),
};

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
  it('draws the 모집글 under the title: the Leader without 모집자, the text, the tags and the time and place', async () => {
    answerRoom(server, PUBLIC);

    await openRoom(PUBLIC);

    expect(screen.queryByRole('button', { name: '모집글 보기' })).toBeNull();
    expect(screen.queryByText('파티 · 3/4명')).toBeNull();
    expect(screen.queryByText('내가 만든 파티')).toBeNull();
    // The Leader's row and the User's in 멤버.
    expect(screen.getAllByText(ME_HOLDER.name)).toHaveLength(2);
    expect(screen.queryByText(`${ME_HOLDER.name} · 모집자`)).toBeNull();
    expect(screen.getByText('컴퓨터공학부 · 18시간 전')).toBeVisible();
    expect(screen.getByText('자하연에서 피크닉 해요')).toBeVisible();
    for (const tag of pickFor(PUBLIC.id, TAG_SET)) {
      expect(within(screen.getByLabelText('태그')).getByText(`#${tag}`)).toBeVisible();
    }
    expect(screen.getByText('오늘 17:40')).toBeVisible();
    // The box's place and the step's.
    expect(screen.getAllByText('301동 앞')).toHaveLength(2);
  });

  it('shows a private Quest its text the same way, without 비공개', async () => {
    answerRoom(server, PRIVATE);

    await openRoom(PRIVATE);

    expect(screen.getByText('우리끼리 자하연에서 만나요')).toBeVisible();
    expect(screen.queryByText('비공개')).toBeNull();
    expect(screen.queryByText('파티 · 3명')).toBeNull();
  });

  it('puts the event as the box’s last line, before the activation, with no card of its own', async () => {
    answerRoom(server, FOR_EVENT);

    await openRoom(FOR_EVENT);

    // The queries give what they find in the order the screen draws it.
    const order = screen
      .getAllByLabelText(/^(?:태그|파티 활성화|행사 · AI 커리어 설명회|일정)$/u)
      .map((node) => String(node.props.accessibilityLabel));
    expect(order).toEqual(['태그', '행사 · AI 커리어 설명회', '파티 활성화', '일정']);
    expect(screen.getByTestId('event-line')).toHaveTextContent('AI 커리어 설명회');
    expect(screen.queryByText('공식 행사')).toBeNull();
  });
});

describe('a request to join', () => {
  const APPROVAL = { ...PICNIC, joinPolicy: 'approval' as const };

  beforeEach(() => {
    answerRoom(server, APPROVAL);
    server.on(`GET /quests/${PICNIC.id}/join-requests`, { status: 200, body: JOIN_REQUESTS });
  });

  it('has no line under its name: neither a note the client gives nor when it came', async () => {
    jest.spyOn(apiClient, 'listJoinRequests').mockResolvedValue(
      JOIN_REQUESTS.map(({ id, user, sentAt }, index) => ({
        id,
        user,
        sentAt,
        note: index === 0 ? '처음인데 같이 가도 될까요?' : null,
      })),
    );

    await openRoom(APPROVAL);

    const requests = within(screen.getByLabelText('참여 신청'));
    expect(requests.getAllByRole('button', { name: '수락' })).toHaveLength(2);
    expect(requests.queryByText('처음인데 같이 가도 될까요?')).toBeNull();
    expect(requests.queryByText('10분 전')).toBeNull();
    expect(requests.queryByText('20분 전')).toBeNull();
  });
});

describe("the Leader's ending sheet", () => {
  it.each([
    ['a private Quest', PRIVATE, null, '파티가 사라져요.'],
    ['a public Quest', PUBLIC, null, '파티가 사라지고 모집글도 내려가요.'],
    [
      'a private Quest switched on',
      PRIVATE,
      myPicnicParty(ME_ID),
      '파티가 사라져요. 활성화 중이라 위치 공유도 바로 멈춰요.',
    ],
    [
      'a public Quest switched on',
      PUBLIC,
      myPicnicParty(ME_ID),
      '파티가 사라지고 모집글도 내려가요. 활성화 중이라 위치 공유도 바로 멈춰요.',
    ],
  ])('says what ending %s does', async (_what, quest, mine, words) => {
    answerRoom(server, quest);
    answerMyParty(server, mine);
    const user = await openRoom(quest);

    await user.press(screen.getByRole('button', { name: '파티 없애기' }));

    expect(screen.getByRole('header', { name: '파티를 없앨까요?' })).toBeVisible();
    expect(screen.getByText(words)).toBeVisible();
  });

  it('adds that sharing stops while the Party runs without the Leader in it', async () => {
    answerRoom(server, PRIVATE);
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
    const user = await openRoom(PRIVATE);

    await user.press(screen.getByRole('button', { name: '파티 없애기' }));

    expect(screen.getByText('파티가 사라져요. 활성화 중이라 위치 공유도 바로 멈춰요.')).toBeVisible();
  });
});

describe('switching from another Party', () => {
  it("says that the Party the User switched on ends, as the frame's sheet does, and ends it first", async () => {
    answerMyParty(server, MINE_TO_END);
    server.on('POST /parties/mine/end', { status: 204 });
    server.on('POST /parties', { status: 201, body: myPicnicParty() });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));

    expect(
      screen.getByText(
        '다른 멤버의 알림 목록에 떠요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 내가 켠 ‘저녁 먹으러 가요’ 활성화는 꺼져요.',
      ),
    ).toBeVisible();
    await answer(user, '활성화');

    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked).not.toContain('POST /parties/mine/leave');
    expect(asked.indexOf('POST /parties/mine/end')).toBeGreaterThan(-1);
    expect(asked.indexOf('POST /parties/mine/end')).toBeLessThan(asked.indexOf('POST /parties'));
  });

  it("joins another Holder's Party with the same words", async () => {
    answerMyParty(server, MINE_TO_END);
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
    server.on('POST /parties/mine/end', { status: 204 });
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, { status: 201, body: myPicnicParty() });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '나도 참여' }));

    expect(
      screen.getByText(
        '참여한 멤버끼리 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 내가 켠 ‘저녁 먹으러 가요’ 활성화는 꺼져요.',
      ),
    ).toBeVisible();
    await answer(user, '나가고 참여');

    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked.indexOf('POST /parties/mine/end')).toBeLessThan(
      asked.indexOf(`POST /parties/${PICNIC_PARTY.id}/join`),
    );
  });
});

describe('switching from another Party that ended, into one that refuses', () => {
  it('says that the ended Party is off, and shows the User in no Party at once', async () => {
    answerMyParty(server, MINE_TO_END);
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });
    server.on('POST /parties/mine/end', () => {
      answerMyParty(server, null);
      return { status: 204 };
    });
    server.on(`POST /parties/${PICNIC_PARTY.id}/join`, refusal(409, 'PARTY_FULL'));
    const user = await openRoom();
    const asked = (): number[] =>
      ['GET /parties/mine', 'GET /parties', 'GET /quests'].map((route) => server.received(route).length);
    const [mine = 0, parties = 0, quests = 0] = asked();

    await user.press(screen.getByRole('button', { name: '나도 참여' }));
    await answer(user, '나가고 참여');

    expect(toast()).toHaveTextContent('‘저녁 먹으러 가요’ 활성화는 꺼졌지만 새 파티에 들어가지 못했어요');
    expect(toastIcon()).toBe('alert');
    expect(asked()).toEqual([mine + 1, parties + 1, quests + 1]);
    // The room no longer names the ended Party as the one the User is in.
    await user.press(screen.getByRole('button', { name: '나도 참여' }));
    expect(screen.queryByText(/한 번에 한 파티에만/u)).toBeNull();
  });

  it('says so too when opening the Quest’s own Party is refused after the end', async () => {
    answerMyParty(server, MINE_TO_END);
    server.on('POST /parties/mine/end', { status: 204 });
    server.on('POST /parties', refusal(409, 'QUEST_ENDED'));
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '파티 활성화' }));
    await answer(user, '활성화');

    expect(toast()).toHaveTextContent('‘저녁 먹으러 가요’ 활성화는 꺼졌지만 새 파티에 들어가지 못했어요');
    expect(toastIcon()).toBe('alert');
  });
});

describe('파티 채팅', () => {
  it('is not in the room: the members meet at a step’s place, with no words between them', async () => {
    await openRoom();

    expect(screen.queryByLabelText('파티 채팅')).toBeNull();
    expect(screen.queryByPlaceholderText('파티에 메시지 보내기')).toBeNull();
  });
});

describe('what the frame does not draw, which the room keeps', () => {
  it('keeps 수정, handing over the role and a member who opens the map', async () => {
    answerMyParty(server, myPicnicParty(ME_ID));

    await openRoom();

    expect(screen.getByRole('button', { name: '수정' })).toBeVisible();
    expect(screen.getByRole('button', { name: '김민준님에게 파티장 넘기기' })).toBeVisible();
    // The row itself, read as the name and its line, not its buttons ("김민준님 …").
    expect(within(screen.getByLabelText('멤버')).getByRole('button', { name: /^김민준(?: · |$)/u })).toBeVisible();
    expect(within(screen.getByLabelText('멤버')).getByText(ME_HOLDER.name)).toBeVisible();
  });
});
