/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
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
} from './support/room';
import { askMainServer, JOIN_REQUESTS, ME_ID, PHONE_NOW } from './support/server';
import { apiClient } from '@/api/client';
import { TAG_SET } from '@/api/mock/data/quest-parts';
import { pickFor } from '@/api/quest-parts/stable-pick';

// The room as `PartyDetail` and `PartyLeave` draw it, against the fake main server: the head of a public and a
// private Quest, the order of its parts, a request's note, the Leader's ending sheet, the sheet that switches from
// another Party, 파티 채팅, and what the room keeps that the frame does not draw.

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
  it('shows a private Quest its text only, without 모집글 보기', async () => {
    answerRoom(server, PRIVATE);

    await openRoom(PRIVATE);

    expect(screen.getByText('우리끼리 자하연에서 만나요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '모집글 보기' })).toBeNull();
  });

  it('gives a public Quest 모집글 보기, and leaves its text to the post', async () => {
    answerRoom(server, PUBLIC);

    await openRoom(PUBLIC);

    expect(screen.getByRole('button', { name: '모집글 보기' })).toBeVisible();
    expect(screen.queryByText('자하연에서 피크닉 해요')).toBeNull();
  });

  it('shows the tags under the text, and the event card below the activation box', async () => {
    const withText = { ...FOR_EVENT, joinPolicy: 'closed' as const, board: null };
    answerRoom(server, withText);

    await openRoom(withText);

    const tags = pickFor(withText.id, TAG_SET);
    for (const tag of tags) {
      expect(within(screen.getByLabelText('태그')).getByText(`#${tag}`)).toBeVisible();
    }
    // The queries give what they find in the order the screen draws it.
    const order = screen
      .getAllByLabelText(/^(?:태그|파티 활성화|행사 · AI 커리어 설명회|일정)$/u)
      .map((node) => String(node.props.accessibilityLabel));
    expect(order).toEqual(['태그', '파티 활성화', '행사 · AI 커리어 설명회', '일정']);
  });
});

describe("a request's note", () => {
  const APPROVAL = { ...PICNIC, joinPolicy: 'approval' as const };

  beforeEach(() => {
    answerRoom(server, APPROVAL);
    server.on(`GET /quests/${PICNIC.id}/join-requests`, { status: 200, body: JOIN_REQUESTS });
  });

  it('is shown under the request where the client gives one', async () => {
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
    expect(requests.getByText('처음인데 같이 가도 될까요?')).toBeVisible();
    // The other has none, and says when it came.
    expect(requests.getByText('10분 전')).toBeVisible();
  });

  it('is not shown in the build connected to the server, which keeps none', async () => {
    await openRoom(APPROVAL);

    const requests = within(screen.getByLabelText('참여 신청'));
    expect(requests.getByText('20분 전')).toBeVisible();
    expect(requests.getByText('10분 전')).toBeVisible();
    expect(requests.queryByText('처음인데 같이 가도 될까요?')).toBeNull();
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
        '멤버 2명에게 알림이 가요. 수락한 멤버끼리만 서로 위치를 볼 수 있어요.\n한 번에 한 파티에만 참여할 수 있어요. 내가 켠 ‘저녁 먹으러 가요’ 활성화는 꺼져요.\n내 정보에서 위치 공유를 켜야 멤버에게 내 위치가 보여요',
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

    await user.press(screen.getByRole('button', { name: '참여' }));

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

    await user.press(screen.getByRole('button', { name: '참여' }));
    await answer(user, '나가고 참여');

    expect(toast()).toHaveTextContent('‘저녁 먹으러 가요’ 활성화는 꺼졌지만 새 파티에 들어가지 못했어요');
    expect(asked()).toEqual([mine + 1, parties + 1, quests + 1]);
    // The room no longer names the ended Party as the one the User is in.
    await user.press(screen.getByRole('button', { name: '참여' }));
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
  });
});

describe('파티 채팅', () => {
  it('starts empty on a Quest of the main server, and sends with 파티에 메시지 보내기', async () => {
    const user = await openRoom();

    const chat = within(screen.getByLabelText('파티 채팅'));
    expect(chat.getByRole('header', { name: '파티 채팅' })).toBeVisible();
    expect(chat.queryByTestId('party-chat-theirs')).toBeNull();
    await user.type(chat.getByPlaceholderText('파티에 메시지 보내기'), '10분 뒤에 도착해요');
    await user.press(chat.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(within(chat.getByTestId('party-chat-mine')).getByText('10분 뒤에 도착해요')).toBeVisible();
    expect(chat.getByText('오후 1:00')).toBeVisible();
  });

  it('keeps what the User sent on the phone, for the next time the room opens', async () => {
    await apiClient.sendPartyChat(PICNIC.id, '먼저 가 있을게요');

    await openRoom();

    expect(within(screen.getByLabelText('파티 채팅')).getByText('먼저 가 있을게요')).toBeVisible();
  });
});

describe('what the frame does not draw, which the room keeps', () => {
  it('keeps 수정, 내 위치 공유, marking a step done, handing over the role and a member who opens the map', async () => {
    answerMyParty(server, myPicnicParty(ME_ID));

    await openRoom();

    expect(screen.getByRole('button', { name: '수정' })).toBeVisible();
    expect(screen.getByRole('switch', { name: '내 위치 공유' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: '완료로 표시' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '파티장 넘기기' }).length).toBeGreaterThan(0);
    expect(within(screen.getByLabelText('멤버')).getByRole('button', { name: /^김민준/u })).toBeVisible();
    expect(within(screen.getByLabelText('멤버')).getByText(ME_HOLDER.name)).toBeVisible();
  });
});
