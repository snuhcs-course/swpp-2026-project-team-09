import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, HIS_PICNIC, toast } from './support/room';
import { answerParty, CODING, JAZZ, MY_HIKE, openAt, requestFor, RUN } from './support/party';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// 전체 파티, its boards and 파티 모집글, against the fake main server.

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

// 김민준's Approval Quest on the hobby board, which the User holds, posted yesterday.
const HIS_HOLD = { ...HIS_PICNIC, joinPolicy: 'approval', createdAt: '2026-10-05T01:00:00.000Z' } as const;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { quests: [DINNER, MY_HIKE, HIS_HOLD] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('전체 파티', () => {
  it('counts each board’s posts, the User’s own among them, with N for a post of today', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '전체 보기' }));

    expect(screen.getByRole('button', { name: '식사 게시판 · 모집글 0개' })).not.toHaveTextContent(/N/u);
    expect(screen.getByRole('button', { name: '진로 게시판 · 모집글 1개' })).not.toHaveTextContent(/N/u);
    expect(screen.getByRole('button', { name: '취미 게시판 · 모집글 3개' })).toHaveTextContent(/N/u);
    expect(screen.getByRole('button', { name: '공연 게시판 · 모집글 1개' })).not.toHaveTextContent(/N/u);
  });
});

describe('a board', () => {
  it('merges the User’s own posts with the others’, the newest first, with their Badges', async () => {
    const user = await openAt('/boards/hobby');

    const posts = screen.getAllByRole('button', { name: /^(관악산|버들골|자하연)/u });
    expect(posts.map((post) => String(post.props.accessibilityLabel))).toEqual([
      MY_HIKE.title,
      RUN.title,
      HIS_HOLD.title,
    ]);
    const [mine, others, held] = posts.map((post) => within(post));
    expect(mine?.getByText('내 파티')).toBeVisible();
    expect(mine?.getByText('12:50')).toBeVisible();
    expect(others?.getByText('오늘 19:30 · 버들골 (100동) 입구')).toBeVisible();
    expect(others?.getByText('3/8명')).toBeVisible();
    expect(held?.getByText('참여 중')).toBeVisible();
    expect(held?.getByText('10/05 (월) 10:00')).toBeVisible();

    await user.press(screen.getByRole('button', { name: RUN.title }));
    expect(shownAddress()).toBe(`/post/${RUN.id}`);
  });

  it('opens the room for the User’s own post', async () => {
    const user = await openAt('/boards/hobby');

    await user.press(screen.getByRole('button', { name: MY_HIKE.title }));

    expect(shownAddress()).toBe(`/room/${MY_HIKE.id}`);
  });

  it('says when it has no post', async () => {
    await openAt('/boards/meal');

    expect(screen.getByText('아직 모집글이 없어요')).toBeVisible();
  });
});

describe('파티 모집글', () => {
  it('shows the post with 참여하기 for an Open Quest', async () => {
    await openAt(`/post/${RUN.id}`);

    expect(screen.getByText('최유나 · 모집자')).toBeVisible();
    expect(screen.getByText('디자인학부 · 30분 전')).toBeVisible();
    expect(screen.getByRole('header', { name: RUN.title })).toBeVisible();
    expect(screen.getByText('최유나 외 2명')).toBeVisible();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
  });

  it('asks to join an Approval Quest, then waits with 신청 취소, which withdraws', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: requestFor(CODING) });
    server.on('POST /quest-join-requests/qr1/withdraw', { status: 204 });
    const user = await openAt(`/post/${CODING.id}`);

    await user.press(screen.getByRole('button', { name: '참여 신청' }));
    setAnswers({ requests: [requestFor(CODING)] });
    await answer(user, '참여 신청');
    expect(screen.getByText('참여 신청을 기다리는 중이에요')).toBeVisible();

    setAnswers({ requests: [] });
    await user.press(screen.getByRole('button', { name: '신청 취소' }));
    await pass(500);
    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '참여 신청' })).toBeVisible();
  });

  it('says why a withdrawal was refused', async () => {
    setAnswers({ requests: [requestFor(CODING)] });
    server.on('POST /quest-join-requests/qr1/withdraw', refusal(404, 'QUEST_JOIN_REQUEST_NOT_FOUND'));
    const user = await openAt(`/post/${CODING.id}`);

    await user.press(screen.getByRole('button', { name: '신청 취소' }));
    await pass(500);

    expect(toast()).toHaveTextContent('이미 끝난 신청이에요');
  });
});

describe('파티 모집글 of a Quest the User holds', () => {
  it('notes that another Holder already holds it', async () => {
    await openAt(`/post/${HIS_HOLD.id}`);

    expect(screen.getByText('이미 참여 중인 파티예요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '참여하기' })).toBeNull();
  });

  it('lets the Leader end it with 없애기, for every Holder', async () => {
    server.on(`POST /quests/${MY_HIKE.id}/end`, { status: 204 });
    const user = await openAt(`/post/${MY_HIKE.id}`);

    await user.press(screen.getByRole('button', { name: '없애기' }));
    expect(screen.getByText('모집글과 파티가 함께 사라져요.')).toBeVisible();
    await answer(user, '없애기');

    expect(server.received(`POST /quests/${MY_HIKE.id}/end`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('파티를 없앴어요');
  });

  it('opens the form in its edit mode with 수정하기', async () => {
    server.on(`GET /quests/${MY_HIKE.id}`, { status: 200, body: MY_HIKE });
    const user = await openAt(`/post/${MY_HIKE.id}`);

    await user.press(screen.getByRole('button', { name: '수정하기' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '모집글 수정' })).toBeVisible();
    expect(screen.getByDisplayValue(MY_HIKE.title)).toBeVisible();
  });

  it('shows the Global Event’s post as any other', async () => {
    await openAt(`/post/${JAZZ.id}`);

    expect(screen.getByText('시간 미정')).toBeVisible();
    expect(screen.getByText('장소 미정')).toBeVisible();
  });
});
