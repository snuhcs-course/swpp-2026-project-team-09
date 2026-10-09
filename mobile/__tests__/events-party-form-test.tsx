// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, CAREER, MAJOR, MY_CAREER } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// 관련 행사 in 파티 만들기: the event picker, and recruiting for an event by attending it and changing the Quest, against
// the fake main server.

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

type User = Awaited<ReturnType<typeof openAt>>;

async function fillRecruiting(user: User): Promise<void> {
  await user.type(screen.getByLabelText('본문'), '설명회 끝나고 저녁도 같이 먹어요');
  await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
  await user.press(screen.getByRole('radio', { name: '진로 게시판' }));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('관련 행사', () => {
  it('chooses an event in the picker, which fills the form with its title, time and place, and 행사 빼기 leaves the title', async () => {
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    expect(screen.getByRole('header', { name: '행사' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));

    expect(screen.getByTestId('chosen-event')).toHaveTextContent(`${CAREER.title}오늘 18:00–20:00 · 301동 대강당`, {
      exact: false,
    });
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(CAREER.title);
    expect(screen.getByLabelText('제목')).toBeEnabled();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('301동 대강당');

    await user.press(screen.getByRole('button', { name: '행사 빼기' }));
    expect(screen.getByRole('button', { name: '관련 행사 선택' })).toBeVisible();
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(CAREER.title);
  });

  it('lets the User change the filled-in title, which choosing another event replaces again', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '설명회 같이 가요');
    await user.press(screen.getByRole('button', { name: '행사 빼기' }));
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('설명회 같이 가요');

    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await user.press(screen.getByRole('button', { name: `행사 · ${MAJOR.title}` }));
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(MAJOR.title);
  });
});

describe('recruiting for an event', () => {
  it('attends the event, then changes the Quest into the recruiting, and shows 내 파티', async () => {
    server.on('POST /quests', { status: 201, body: MY_CAREER });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await fillRecruiting(user);

    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    expect(server.received('POST /quests').map(({ body }) => body)).toEqual([{ globalEventId: CAREER.id }]);
    expect(server.received(`PATCH /quests/${MY_CAREER.id}`).map(({ body }) => body)).toEqual([
      { description: '설명회 끝나고 저녁도 같이 먹어요', capacity: 4, joinPolicy: 'open', board: 'career' },
    ]);
    expect(server.received(`POST /quests/${MY_CAREER.id}/sub-quests`)).toEqual([]);
    expect(toast()).toHaveTextContent('파티를 올렸어요');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });

  it('opens the room of the attended Quest when changing it is refused', async () => {
    server.on('POST /quests', { status: 201, body: MY_CAREER });
    server.on(`PATCH /quests/${MY_CAREER.id}`, refusal(409, 'NOT_QUEST_LEADER'));
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await fillRecruiting(user);

    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    expect(toast()).toHaveTextContent('파티장만 할 수 있어요');
    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
  });
});

describe('recruiting for an event under a title of the User’s', () => {
  it('attends the event with the title the User gave it', async () => {
    const titled = { ...MY_CAREER, title: '설명회 같이 가요' };
    server.on('POST /quests', { status: 201, body: titled });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: titled });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '설명회 같이 가요');
    await fillRecruiting(user);

    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    expect(server.received('POST /quests').map(({ body }) => body)).toEqual([
      { globalEventId: CAREER.id, title: '설명회 같이 가요' },
    ]);
    expect(server.received(`PATCH /quests/${MY_CAREER.id}`).map(({ body }) => body)).toEqual([
      { description: '설명회 끝나고 저녁도 같이 먹어요', capacity: 4, joinPolicy: 'open', board: 'career' },
    ]);
  });

  it('gives the title to a Quest for the event the User already held, which attending leaves as it was', async () => {
    server.on('POST /quests', { status: 201, body: MY_CAREER });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '설명회 같이 가요');
    await fillRecruiting(user);

    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    expect(server.received(`PATCH /quests/${MY_CAREER.id}`).map(({ body }) => body)).toEqual([
      {
        title: '설명회 같이 가요',
        description: '설명회 끝나고 저녁도 같이 먹어요',
        capacity: 4,
        joinPolicy: 'open',
        board: 'career',
      },
    ]);
  });
});

describe('editing a Quest for an event', () => {
  it('lets the Leader change its title', async () => {
    const recruiting = {
      ...MY_CAREER,
      capacity: 4,
      joinPolicy: 'open' as const,
      board: 'career' as const,
      description: '같이 가요',
    };
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: recruiting });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: { ...recruiting, title: '설명회 모임' } });
    const user = await openAt(`/party-form?questId=${MY_CAREER.id}`);

    expect(screen.getByLabelText('제목')).toBeEnabled();
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '설명회 모임');
    await user.press(screen.getByRole('button', { name: '수정 완료' }));
    await pass(500);

    expect(server.received(`PATCH /quests/${MY_CAREER.id}`).map(({ body }) => body)).toEqual([
      { title: '설명회 모임' },
    ]);
  });
});
