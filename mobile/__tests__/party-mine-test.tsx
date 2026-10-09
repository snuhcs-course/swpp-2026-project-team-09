// AI-generated with Claude Opus 5.5, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import { within } from '@testing-library/react-native';
import type { Quest } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { socketServer } from './support/live';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMyParty, DINNER_PARTY_MINE, myPicnicParty, PICNIC, toast } from './support/room';
import { answerParty, MY_HIKE, openAt } from './support/party';
import { askMainServer, DINNER, DINNER_PARTY, INVITATION, PHONE_NOW } from './support/server';

// 내 파티 and 초대, against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea.

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

// The User's Open Quest whose one Sub Quest starts at `startsAt`.
function plannedAt(title: string, startsAt: string | null): Quest {
  const [first] = MY_HIKE.subQuests;
  return { ...MY_HIKE, id: `quest-${title}`, title, subQuests: first === undefined ? [] : [{ ...first, startsAt }] };
}

const TIMED = [
  plannedAt('내일 점심', '2026-10-07T03:00:00.000Z'),
  plannedAt('목요일 스터디', '2026-10-08T10:00:00.000Z'),
  plannedAt('다음 주 축제', '2026-10-13T10:00:00.000Z'),
  plannedAt('월말 여행', '2026-10-25T00:00:00.000Z'),
  plannedAt('언젠가 등산', null),
];

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByRole('button', { name: title }));
}

function groups(): string[] {
  const names = new Set(['활성화 중', '활성화 알림', '오늘', '내일', '이번 주', '다음 주', '그 이후', '시간 미정']);
  return screen
    .getAllByRole('header')
    .map(({ props }) => String(props.children))
    .filter((name) => names.has(name));
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

describe('내 파티', () => {
  it('groups the Quests, the running Parties first, then by the next Sub Quest’s day', async () => {
    setAnswers({ quests: [DINNER, MY_HIKE, PICNIC, ...TIMED] });
    answerMyParty(server, myPicnicParty());
    server.on('GET /parties', { status: 200, body: [DINNER_PARTY] });
    await openAt('/party?tab=mine');

    expect(groups()).toEqual([
      '활성화 중',
      '활성화 알림',
      '오늘',
      '내일',
      '이번 주',
      '다음 주',
      '그 이후',
      '시간 미정',
    ]);
    expect(card(PICNIC.title).getByText('활성화 중 · 2명 위치 공유')).toBeVisible();
    expect(card(DINNER.title).getByText('🔒 비공개 파티')).toBeVisible();
    expect(card(DINNER.title).getByText('멤버 2명')).toBeVisible();
    expect(card(DINNER.title).getByText('나, 김민준')).toBeVisible();
    expect(card(MY_HIKE.title).getByText('👥 공개 파티')).toBeVisible();
    expect(card(MY_HIKE.title).getByText('모집 중 · 1/6명')).toBeVisible();
    expect(card(MY_HIKE.title).getByText('20:10 · 7시간 후')).toBeVisible();
    expect(card(MY_HIKE.title).getByText('저녁 약속 · 학생회관 (63동)')).toBeVisible();
    expect(card('내일 점심').getByText('내일 12:00')).toBeVisible();
  });

  it('counts the Quests in the chips and filters by them', async () => {
    const user = await openAt('/party?tab=mine');

    expect(screen.getByText('전체 2')).toBeVisible();
    await user.press(screen.getByText('비공개 1'));
    expect(screen.getByRole('button', { name: DINNER.title })).toBeVisible();
    expect(screen.queryByRole('button', { name: MY_HIKE.title })).toBeNull();

    await user.press(screen.getByText('공개 1'));
    expect(screen.getByRole('button', { name: MY_HIKE.title })).toBeVisible();
    expect(screen.queryByRole('button', { name: DINNER.title })).toBeNull();
  });
});

describe('내 파티 without a Quest', () => {
  it.each([
    ['전체', '참여 중인 파티가 없어요'],
    ['비공개', '비공개 파티가 없어요'],
    ['공개', '참여 중인 공개 파티가 없어요'],
  ])('says when %s has no Quest', async (chip, words) => {
    setAnswers({ quests: [] });
    const user = await openAt('/party?tab=mine');

    await user.press(screen.getByText(`${chip} 0`));

    expect(screen.getByText(words)).toBeVisible();
  });
});

describe('a card of 내 파티', () => {
  it('shows the strip of a Party running without the User, whose 참여 enters it', async () => {
    server.on('GET /parties', { status: 200, body: [DINNER_PARTY] });
    server.on(`POST /parties/${DINNER_PARTY.id}/join`, { status: 201, body: DINNER_PARTY_MINE });
    const user = await openAt('/party?tab=mine');

    expect(card(DINNER.title).getByText('김민준님이 활성화했어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: `${DINNER.title} 활성화 참여` }));
    await pass(500);

    expect(server.received(`POST /parties/${DINNER_PARTY.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('활성화에 참여했어요 · 위치 공유 시작');
  });

  it('opens a card’s room', async () => {
    const user = await openAt('/party?tab=mine');

    await user.press(screen.getByRole('button', { name: MY_HIKE.title }));

    expect(shownAddress()).toBe(`/room/${MY_HIKE.id}`);
  });
});

describe('the requests to join waiting on a card of 내 파티', () => {
  it('shows their number on a Quest the User leads, and nothing when none waits', async () => {
    setAnswers({ quests: [DINNER, { ...MY_HIKE, waitingJoinRequests: 2 }] });
    await openAt('/party?tab=mine');

    expect(card(MY_HIKE.title).getByLabelText('기다리는 참여 신청 2건')).toHaveTextContent('2');
    expect(card(DINNER.title).queryByLabelText(/기다리는 참여 신청/u)).toBeNull();
  });

  it('follows the requests after quests-changed, and goes when none waits', async () => {
    setAnswers({ quests: [{ ...MY_HIKE, waitingJoinRequests: 1 }] });
    await openAt('/party?tab=mine');
    await socketServer((socket) => {
      socket.accept();
    });
    expect(card(MY_HIKE.title).getByLabelText('기다리는 참여 신청 1건')).toBeVisible();

    setAnswers({ quests: [{ ...MY_HIKE, waitingJoinRequests: 3 }] });
    await socketServer((socket) => {
      socket.send('quests-changed');
    });
    await pass(500);
    expect(card(MY_HIKE.title).getByLabelText('기다리는 참여 신청 3건')).toHaveTextContent('3');

    setAnswers({ quests: [{ ...MY_HIKE, waitingJoinRequests: 0 }] });
    await socketServer((socket) => {
      socket.send('quests-changed');
    });
    await pass(500);
    expect(card(MY_HIKE.title).queryByLabelText(/기다리는 참여 신청/u)).toBeNull();
  });
});

describe('초대', () => {
  beforeEach(() => {
    setAnswers({ invitations: [INVITATION] });
  });

  it('shows an invitation, which 수락 accepts', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/accept`, { status: 201, body: DINNER });
    const user = await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 1')).toBeVisible();
    const invitation = within(screen.getByLabelText(INVITATION.quest.title));
    expect(invitation.getByText('윤태오님이 비공개 파티에 초대했어요')).toBeVisible();
    expect(invitation.getByText('30분 전')).toBeVisible();
    expect(invitation.getByText(INVITATION.quest.description)).toBeVisible();
    expect(invitation.getByText('1명 참여 중')).toBeVisible();
    await user.press(invitation.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/accept`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('파티에 참여했어요');
  });

  it('declines with 거절, which removes the card', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/decline`, { status: 204 });
    const user = await openAt('/party?tab=invites');

    setAnswers({ invitations: [] });
    await user.press(screen.getByRole('button', { name: '거절' }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/decline`)).toHaveLength(1);
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
  });
});

describe('a refused acceptance', () => {
  beforeEach(() => {
    setAnswers({ invitations: [INVITATION] });
  });

  it.each([
    [refusal(404, 'QUEST_INVITATION_NOT_FOUND'), '이미 끝난 초대예요'],
    [refusal(409, 'QUEST_FULL'), '자리가 다 찼어요'],
    [refusal(409, 'QUEST_ENDED'), '이미 끝난 파티예요'],
    [refusal(409, 'SHARED_QUEST_HELD'), '이 행사에 함께 가는 파티가 이미 있어요'],
  ] as [Reply, string][])('says why an acceptance was refused and keeps the invitation: %j', async (reply, words) => {
    server.on(`POST /quest-invitations/${INVITATION.id}/accept`, reply);
    const user = await openAt('/party?tab=invites');

    await user.press(screen.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(toast()).toHaveTextContent(words);
    expect(screen.getByText(INVITATION.quest.title)).toBeVisible();
  });
});

describe('초대 without an invitation', () => {
  it('says when no invitation waits', async () => {
    setAnswers({ invitations: [] });
    await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 0')).toBeVisible();
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
  });
});
