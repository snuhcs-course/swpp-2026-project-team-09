// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { apiClient } from '@/api/client';
import type { ClassSave, Place, TimetableClass } from '@/api/types';
import { googleAvailable } from '@/auth/google';

// The timetable's routes and the Places' against the fake main server, and the classes and the Quests fetched again
// after a change made on the screens. `GET /timetable/classes` and `GET /places` are in `api/server-me-test.ts`.

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

const ENGINEERING: Place = { id: 'p302', number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 };
const SAVE: ClassSave = {
  courseName: '선형대수',
  times: [{ weekday: 'saturday', startTime: '13:00', endTime: '14:30', placeId: 'p302', room: null }],
};
const SAVED: TimetableClass = {
  id: 'c9',
  courseName: '선형대수',
  times: [{ id: 't9', weekday: 'saturday', startTime: '13:00', endTime: '14:30', placeId: 'p302', room: null }],
  overlaps: [],
};

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the routes', () => {
  it('adds a class with a new Idempotency-Key each time', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /timetable/classes', { status: 201, body: SAVED });

    expect(await apiClient.addClass(SAVE)).toEqual(SAVED);
    await apiClient.addClass(SAVE);

    const [first, second] = server.received('POST /timetable/classes');
    expect(first?.body).toEqual(SAVE);
    expect(first?.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(second?.idempotencyKey).not.toBe(first?.idempotencyKey);
  });

  it('replaces a class whole and deletes one, without a key', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('PUT /timetable/classes/c9', { status: 200, body: SAVED });
    server.on('DELETE /timetable/classes/c9', { status: 204 });

    expect(await apiClient.replaceClass('c9', SAVE)).toEqual(SAVED);
    await apiClient.deleteClass('c9');

    expect(server.received('PUT /timetable/classes/c9')).toEqual([
      expect.objectContaining({ body: SAVE, idempotencyKey: undefined }),
    ]);
    expect(server.received('DELETE /timetable/classes/c9')).toHaveLength(1);
  });

  it('throws the refusals with their codes', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /timetable/classes', refusal(409, 'TIMETABLE_FULL'));
    server.on('PUT /timetable/classes/c9', refusal(404, 'PLACE_NOT_FOUND'));
    server.on('DELETE /timetable/classes/c9', refusal(404, 'CLASS_NOT_FOUND'));

    await expect(apiClient.addClass(SAVE)).rejects.toMatchObject({ status: 409, code: 'TIMETABLE_FULL' });
    await expect(apiClient.replaceClass('c9', SAVE)).rejects.toMatchObject({ status: 404, code: 'PLACE_NOT_FOUND' });
    await expect(apiClient.deleteClass('c9')).rejects.toMatchObject({ status: 404, code: 'CLASS_NOT_FOUND' });
  });

  it('searches the Places by the words', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /places/search', { status: 200, body: [ENGINEERING] });

    expect(await apiClient.searchPlaces('302동')).toEqual([ENGINEERING]);
    expect(server.received('GET /places/search').map(({ query }) => query)).toEqual([{ q: '302동' }]);
  });
});

async function choose(user: Awaited<ReturnType<typeof openMain>>, select: string, choice: string): Promise<void> {
  await user.press(screen.getByRole('combobox', { name: select }));
  await user.press(screen.getByRole('button', { name: choice }));
}

function answerTimetable(server: FakeServer, classes: () => TimetableClass[]): void {
  answerMainScreen(server);
  server.on('GET /timetable/classes', () => ({ status: 200, body: classes() }));
  server.on('GET /places', { status: 200, body: [ENGINEERING] });
  server.on('GET /places/search', { status: 200, body: [ENGINEERING] });
}

describe('a change on the screens', () => {
  it('fetches the classes and the Quests again, and 내 정보 and the timetable follow', async () => {
    const server = await askMainServer({ signedIn: true });
    let classes: TimetableClass[] = [];
    answerTimetable(server, () => classes);
    server.on('POST /timetable/classes', () => {
      classes = [SAVED];
      return { status: 201, body: SAVED };
    });
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '직접 입력' }));
    await pass(500);
    expect(screen.getByText('등록된 수업이 없어요')).toBeVisible();
    const classesBefore = server.received('GET /timetable/classes').length;
    const questsBefore = server.received('GET /quests').length;

    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);
    await user.type(screen.getByLabelText('과목명'), '선형대수');
    await user.press(screen.getByRole('togglebutton', { name: '토' }));
    await choose(user, '시작 시각 · 시', '13');
    await choose(user, '종료 시각 · 시', '14');
    await choose(user, '종료 시각 · 분', '30');
    await user.press(screen.getByRole('button', { name: '장소 선택' }));
    await pass(500);
    await user.type(screen.getByLabelText('장소 검색'), '302');
    await pass(300);
    await pass(500);
    await user.press(screen.getByRole('button', { name: '제2공학관 302동' }));
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(server.received('POST /timetable/classes').map(({ body }) => body)).toEqual([SAVE]);
    expect(server.received('GET /places/search').map(({ query }) => query)).toEqual([{ q: '302' }]);
    expect(server.received('GET /timetable/classes').length).toBeGreaterThan(classesBefore);
    expect(server.received('GET /quests').length).toBeGreaterThan(questsBefore);
    expect(screen.getByText('수업을 추가했어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '선형대수 수정' })).toBeVisible();
  });
});
