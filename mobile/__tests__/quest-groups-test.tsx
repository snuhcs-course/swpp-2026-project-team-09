import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { FULL_SCREEN } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER, PHONE_NOW } from './support/server';
import type { Quest } from '@/api/types';

// The groups of the Quest list on the whole screen, by the days to each Quest's start, against the main server.

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

beforeEach(async () => {
  // Tuesday 6 October 2026, 13:00 in Korea.
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The dinner with 김민준 under another title, starting at `startsAt`, or without a start; `ended` when it is over.
function dinner(id: string, title: string, startsAt: string | null, ended = false): Quest {
  const [subQuest] = DINNER.subQuests;
  if (subQuest === undefined) {
    throw new Error('The dinner has a Sub Quest');
  }
  return {
    ...DINNER,
    id,
    title,
    subQuests: [{ ...subQuest, id: `${id}-1`, title, startsAt, endsAt: null, ended }],
  };
}

async function openQuests(quests: Quest[]): Promise<void> {
  server.on('GET /quests', { status: 200, body: quests });
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FULL_SCREEN }));
  await pass(0);
}

describe("the Quest list on the whole screen's groups", () => {
  it('puts each Quest under the days to its start, a Quest without one last, and leaves out ended ones', async () => {
    await openQuests([
      dinner('later', 'MT', '2026-10-26T01:00:00.000Z'),
      dinner('untimed', '보드게임', null),
      dinner('next-week', '축제', '2026-10-13T09:00:00.000Z'),
      dinner('tomorrow', '점심', '2026-10-07T03:00:00.000Z'),
      DINNER,
      dinner('this-week', '스터디', '2026-10-09T05:00:00.000Z'),
      dinner('over', '지난 모임', '2026-10-05T09:00:00.000Z', true),
    ]);

    expect(screen.getByRole('header', { name: '퀘스트 6' })).toBeVisible();
    const headers = screen.getAllByRole('header').map((header) => header.props.children as unknown);
    expect(headers.slice(1)).toEqual([
      '오늘 · 10월 6일 (화)',
      '내일 · 10월 7일 (수)',
      '이번 주',
      '다음 주',
      '그 이후',
      '시간 미정',
    ]);
    const rows = screen.getAllByRole('button', { name: /^비공개 파티 · 김민준 · /u });
    expect(rows.map((row) => String(row.props.accessibilityLabel))).toEqual([
      '비공개 파티 · 김민준 · 저녁 약속 · 학생회관 (63동) · 20:10',
      '비공개 파티 · 김민준 · 점심 · 학생회관 (63동) · 12:00',
      '비공개 파티 · 김민준 · 스터디 · 학생회관 (63동) · 14:00',
      '비공개 파티 · 김민준 · 축제 · 학생회관 (63동) · 18:00',
      '비공개 파티 · 김민준 · MT · 학생회관 (63동) · 10:00',
      '비공개 파티 · 김민준 · 보드게임 · 학생회관 (63동)',
    ]);
    expect(screen.queryByText('지난 모임')).toBeNull();
  });
});
