/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import type { QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { CAREER, MY_CAREER } from './support/events';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE, YU_NA } from './support/party';
import { SEO_YEON_HOLDER, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// A Proposal card of a 비공개 파티 with Friends to invite, a Place and a Global Event, and its 만들기, against the fake
// main server.

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

const REPLY = '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.';

// A 비공개 파티 for AI 커리어 설명회 (today 18:00), meeting at 17:00, inviting 이서연 and 최유나, the phone's clock
// standing on 2026-10-06 at 13:00 in Korea.
const CLOSED: QuestProposal = {
  title: '설명회 같이 가요',
  description: '',
  joinPolicy: 'closed',
  board: null,
  capacity: 3,
  startsAt: '2026-10-06T17:00:00+09:00',
  place: null,
  globalEvent: CAREER,
  invitees: [
    { id: SEO_YEON_HOLDER.id, name: SEO_YEON_HOLDER.name },
    { id: YU_NA.id, name: YU_NA.name },
  ],
};

const AT_301: QuestProposal = { ...CLOSED, globalEvent: null, place: { id: 'p301', name: '제1공학관' } };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  server.on('POST /quests', { status: 201, body: MY_CAREER });
  server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
  server.on(`POST /quests/${MY_CAREER.id}/sub-quests`, { status: 201, body: MY_CAREER.subQuests[0] });
  server.on(`POST /quests/${MY_CAREER.id}/invitations`, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the chat, asks for a 파티 and lets the Assistant answer with this Proposal.
async function proposed(proposal: QuestProposal): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal } });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '오늘 설명회 비공개로 서연이랑 유나 초대해서');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('proposal-card'));
}

function make(): ReturnType<typeof screen.getByRole> {
  return card().getByRole('button', { name: '만들기' });
}

// A click on the button as an accessibility service sends it, which calls its onPress without a render between two.
function pressOf(button: ReturnType<typeof make>): () => void {
  const onClick: unknown = button.props.onClick;
  if (typeof onClick !== 'function') {
    throw new TypeError('The button takes no click');
  }
  return () => {
    onClick({ nativeEvent: {}, target: button, currentTarget: button });
  };
}

function bodies(route: string): unknown[] {
  return server.received(route).map(({ body }) => body);
}

describe('the Proposal card of a 비공개 파티', () => {
  it('shows the Friends to invite, the event and its place, and no Board', async () => {
    await proposed(CLOSED);

    for (const row of [
      '공개 범위 비공개',
      '언제 오늘 17:00',
      '어디서 301동 대강당',
      '관련 행사 AI 커리어 설명회',
      '친구 초대 이서연, 최유나',
      '인원 3명',
    ]) {
      expect(card().getByLabelText(row)).toBeVisible();
    }
    expect(card().queryByLabelText(/^게시판/u)).toBeNull();
  });

  it('shows the Place by its name', async () => {
    await proposed(AT_301);

    expect(card().getByLabelText('어디서 제1공학관')).toBeVisible();
    expect(card().getByLabelText('관련 행사 없음')).toBeVisible();
  });
});

describe('만들기 of a 비공개 파티', () => {
  it('attends the event, sets the Quest, meets before it, invites the Friends and shows 내 파티', async () => {
    const user = await proposed(CLOSED);

    await user.press(make());
    await pass(500);

    expect(bodies('POST /quests')).toEqual([{ globalEventId: CAREER.id, title: CLOSED.title }]);
    expect(bodies(`PATCH /quests/${MY_CAREER.id}`)).toEqual([
      { title: CLOSED.title, description: '', capacity: 3, joinPolicy: 'closed' },
    ]);
    expect(bodies(`POST /quests/${MY_CAREER.id}/sub-quests`)).toEqual([
      {
        title: '모이기',
        startsAt: CLOSED.startsAt,
        place: { latitude: CAREER.latitude, longitude: CAREER.longitude, label: '301동 대강당' },
      },
    ]);
    expect(bodies(`POST /quests/${MY_CAREER.id}/invitations`)).toEqual([
      { userId: SEO_YEON_HOLDER.id },
      { userId: YU_NA.id },
    ]);
    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 2명에게 초대 요청');
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });

  it('makes a Quest at the Place without an event, then invites', async () => {
    const user = await proposed(AT_301);

    await user.press(make());
    await pass(500);

    expect(bodies('POST /quests/own')).toEqual([
      expect.objectContaining({
        joinPolicy: 'closed',
        capacity: 3,
        subQuest: { title: CLOSED.title, startsAt: CLOSED.startsAt, place: { placeId: 'p301' } },
      }),
    ]);
    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(2);
    expect(bodies('POST /quests')).toEqual([]);
  });
});

describe('만들기 after attending the event', () => {
  it('opens the room of the attended Quest when setting it is refused', async () => {
    server.on(`PATCH /quests/${MY_CAREER.id}`, refusal(409, 'NOT_QUEST_LEADER'));
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    const user = await proposed(CLOSED);

    await user.press(make());
    await pass(500);

    expect(toast()).toHaveTextContent('파티장만 할 수 있어요');
    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
    expect(bodies(`POST /quests/${MY_CAREER.id}/invitations`)).toEqual([]);
  });
});

describe('만들기 checking the Proposal before it sends', () => {
  it('makes the Quest once when pressed twice before the card turns', async () => {
    await proposed(AT_301);

    // Both presses land before React draws the card again, as two quick taps can.
    const press = pressOf(make());
    await act(() => {
      press();
      press();
    });
    await pass(500);

    expect(server.received('POST /quests/own')).toHaveLength(1);
  });

  it('makes nothing once the start has passed, and says so', async () => {
    const user = await proposed({ ...AT_301, startsAt: '2026-10-06T12:00:00+09:00' });

    await user.press(make());
    await pass(500);

    expect(toast()).toHaveTextContent('시작 시간이 지났어요. 새 시간을 채팅으로 알려 주세요');
    expect(server.received('POST /quests/own')).toEqual([]);
    expect(make()).toBeEnabled();
  });

  it('makes nothing without a Friend to invite, as the form does not', async () => {
    const user = await proposed({ ...AT_301, invitees: [] });

    await user.press(make());
    await pass(500);

    expect(toast()).toHaveTextContent('빠진 내용이 있어요. 채팅으로 알려 주세요');
    expect(server.received('POST /quests/own')).toEqual([]);
  });
});
