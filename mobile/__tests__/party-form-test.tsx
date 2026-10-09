/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Keyboard } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, MIN_JUN_HOLDER, SEO_YEON_HOLDER, toast } from './support/room';
import { answerParty, MY_HIKE, openAt } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// 파티 만들기 in public and in private, and its edit mode, against the fake main server.

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

const UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;

let server: FakeServer;

type User = Awaited<ReturnType<typeof openAt>>;

function submit(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

async function openForm(): Promise<User> {
  const user = await openAt('/party');
  await user.press(screen.getByRole('button', { name: '만들기' }));
  await pass(500);
  return user;
}

// A title, a description and a board: what 파티 올리기 waits for.
async function fillPublic(user: User): Promise<void> {
  await user.type(screen.getByLabelText('제목'), '보드게임 카페 가실 분');
  await user.type(screen.getByLabelText('본문'), '룰 몰라도 알려드려요');
  await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
  await user.press(screen.getByRole('radio', { name: '취미 게시판' }));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, ({ body }) =>
    JSON.stringify(body).includes(SEO_YEON_HOLDER.id) ? refusal(409, 'QUEST_INVITATION_ALREADY_SENT') : { status: 204 },
  );
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a public 파티', () => {
  it('waits for a title, a description and a board', async () => {
    const user = await openForm();

    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
    expect(submit('파티 올리기')).toBeDisabled();
    await user.type(screen.getByLabelText('제목'), '보드게임');
    await user.type(screen.getByLabelText('본문'), '같이 해요');
    expect(screen.getByText('5/200')).toBeVisible();
    expect(submit('파티 올리기')).toBeDisabled();
    await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
    await user.press(screen.getByRole('radio', { name: '취미 게시판' }));

    expect(screen.getByRole('button', { name: '게시판 취미 게시판' })).toBeVisible();
    expect(submit('파티 올리기')).toBeEnabled();
  });

  it('posts it with a fresh Idempotency-Key, invites the Friends chosen and shows 내 파티', async () => {
    const user = await openForm();
    await fillPublic(user);
    await user.press(screen.getByRole('button', { name: '인원 늘리기' }));
    await user.press(screen.getByText('승인 후 참여'));
    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
    await user.press(screen.getByRole('button', { name: '확인' }));
    await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));
    await user.press(screen.getByRole('checkbox', { name: SEO_YEON_HOLDER.name }));
    expect(screen.getByText('2명에게 요청')).toBeVisible();

    await user.press(submit('파티 올리기'));
    await pass(500);

    const [made] = server.received('POST /quests/own');
    expect(made?.body).toEqual({
      title: '보드게임 카페 가실 분',
      description: '룰 몰라도 알려드려요',
      capacity: 5,
      joinPolicy: 'approval',
      board: 'hobby',
      subQuest: { title: '보드게임 카페 가실 분', startsAt: '2026-10-06T10:00:00.000Z' },
    });
    expect(made?.idempotencyKey).toMatch(UUID);
    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`).map(({ body }) => body)).toEqual([
      { userId: MIN_JUN_HOLDER.id },
      { userId: SEO_YEON_HOLDER.id },
    ]);
    expect(toast()).toHaveTextContent('파티를 올렸어요 · 1명은 초대하지 못했어요');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });
});

describe('어디서, typed', () => {
  const ENGINEERING = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };

  it.each([
    ['301동', { placeId: 'p301' }],
    ['제1공학관 (301동)', { placeId: 'p301' }],
    ['서울대입구역', { label: '서울대입구역' }],
  ])('posts %j as the Place it names, or as the words alone', async (words, place) => {
    server.on('GET /places', { status: 200, body: [ENGINEERING] });
    const user = await openForm();
    await fillPublic(user);

    await user.type(screen.getByLabelText('어디서'), words);
    expect(screen.queryByText('지도에서 위치를 골라 주세요')).toBeNull();
    expect(submit('파티 올리기')).toBeEnabled();
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({
      subQuest: { title: '보드게임 카페 가실 분', place },
    });
  });
});

describe('언제', () => {
  it('closes the keyboard before the time sheet opens', async () => {
    const sheetShownWhenDismissed: boolean[] = [];
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
      sheetShownWhenDismissed.push(screen.queryByRole('button', { name: '확인' }) !== null);
    });
    const user = await openForm();
    await user.type(screen.getByLabelText('제목'), '보드게임');

    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));

    expect(sheetShownWhenDismissed).toEqual([false]);
    expect(screen.getByRole('button', { name: '확인' })).toBeVisible();
  });
});

describe('a refused 파티 올리기', () => {
  it.each([
    [refusal(409, 'CAPACITY_BELOW_HOLDERS'), '지금 멤버 수보다 적게 정할 수 없어요'],
    [refusal(409, 'BOARD_REQUIRED'), '게시판을 골라 주세요'],
    [refusal(403, 'NOT_QUEST_LEADER'), '파티장만 할 수 있어요'],
    [refusal(404, 'PLACE_NOT_FOUND'), '장소를 다시 골라 주세요'],
    [refusal(500), '저장하지 못했어요. 다시 시도해 주세요'],
  ] as [Reply, string][])('says why it was refused and stays open: %j', async (reply, words) => {
    server.on('POST /quests/own', reply);
    const user = await openForm();
    await fillPublic(user);

    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(toast()).toHaveTextContent(words);
    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });
});

describe('a private 파티', () => {
  it('waits for a title and a Friend, and is made Closed for 8 without a board', async () => {
    const user = await openForm();
    await user.press(screen.getByRole('radio', { name: '비공개' }));
    expect(screen.getByText('초대한 친구만 볼 수 있어요')).toBeVisible();
    expect(screen.getByText('1명 이상')).toBeVisible();
    expect(screen.queryByLabelText('인원 늘리기')).toBeNull();
    await user.type(screen.getByLabelText('제목'), '저녁 같이');
    expect(submit('파티 만들기')).toBeDisabled();
    await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));

    await user.press(submit('파티 만들기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toEqual({
      title: '저녁 같이',
      description: '',
      capacity: 8,
      joinPolicy: 'closed',
      subQuest: { title: '저녁 같이' },
    });
    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 1명에게 초대 요청');
  });
});

describe('the edit mode', () => {
  it('sends what changed and invites the Friends newly chosen', async () => {
    server.on(`GET /quests/${MY_HIKE.id}`, { status: 200, body: MY_HIKE });
    server.on(`PATCH /quests/${MY_HIKE.id}`, { status: 200, body: MY_HIKE });
    const user = await openAt(`/party-form?questId=${MY_HIKE.id}`);

    expect(screen.getByRole('header', { name: '모집글 수정' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '언제 날짜·시간 선택' })).toBeNull();
    expect(screen.queryByLabelText('어디서')).toBeNull();
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '관악산 등산');
    await user.press(screen.getByText('승인 후 참여'));
    await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));
    await answer(user, '수정 완료');

    expect(server.received(`PATCH /quests/${MY_HIKE.id}`)[0]?.body).toEqual({
      title: '관악산 등산',
      joinPolicy: 'approval',
    });
    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('모집글을 수정했어요');
  });
});
