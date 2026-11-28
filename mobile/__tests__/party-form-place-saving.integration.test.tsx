/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { CAREER, MY_CAREER } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MY_HIKE, openAt } from './support/party';
import { answerForm, fillPublic, invite, searchPlace, setPlace, submit } from './support/party-form';
import { answer, MIN_JUN_HOLDER } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// What the 파티 form saves of the place and the time, and when an edit's 수정 완료 turns on, for the corner cases of
// the user's phone check of 2026-11-28 (P06 ticket 34): a place added to a step that had none, a change undone, one
// thing changed alone, and a place changed for an event at the event's own time.

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

const STUDENT_HALL = { id: 'p63', number: '63', name: '학생회관', latitude: 37.45932, longitude: 126.95058 };
// The building that holds AI 커리어 설명회 (301동 대강당).
const ENGINEERING_1 = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const BUILDINGS = [STUDENT_HALL, ENGINEERING_1];
const [STEP] = MY_HIKE.subQuests;
const STEP_PATH = `PUT /quests/${MY_HIKE.id}/sub-quests/${STEP?.id ?? ''}`;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  server.on('GET /places', { status: 200, body: BUILDINGS });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openAt>>;

// The edit of MY_HIKE, its one step as given.
function openEdit(step = STEP): Promise<User> {
  const hike = { ...MY_HIKE, subQuests: step === undefined ? [] : [step] };
  server.on(`GET /quests/${MY_HIKE.id}`, { status: 200, body: hike });
  server.on(`PATCH /quests/${MY_HIKE.id}`, { status: 200, body: hike });
  server.on(STEP_PATH, { status: 200, body: step });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  return openAt(`/party-form?questId=${MY_HIKE.id}`);
}

// The phone check: 장소 미정, a place added, 수정 완료, and the place was not saved.
describe('a place added in an edit to a step that had none', () => {
  it.each([
    ['with a time', STEP?.startsAt ?? null],
    ['with no time either', null],
  ])('is saved, %s', async (_, startsAt) => {
    const user = await openEdit(STEP === undefined ? undefined : { ...STEP, startsAt, place: null });
    expect(screen.getByRole('button', { name: '어디서 장소 검색' })).toBeVisible();

    await setPlace(user, '정문');
    expect(submit('수정 완료')).toBeEnabled();
    await answer(user, '수정 완료');

    expect(server.received(STEP_PATH).map(({ body }) => body)).toEqual([
      { title: STEP?.title, startsAt, place: { label: '정문' } },
    ]);
  });
});

describe('a change undone in an edit', () => {
  it('greys 수정 완료 again once the place is the same Place as before', async () => {
    const user = await openEdit();

    await setPlace(user, '정문');
    expect(submit('수정 완료')).toBeEnabled();
    await setPlace(user, '학생회관', '학생회관 63동');

    expect(submit('수정 완료')).toBeDisabled();
  });

  it('greys 수정 완료 again after 공개, 비공개 and 공개 again', async () => {
    const user = await openEdit();

    await user.press(screen.getByRole('radio', { name: '비공개' }));
    expect(submit('수정 완료')).toBeEnabled();
    await user.press(screen.getByRole('radio', { name: '공개' }));

    expect(submit('수정 완료')).toBeDisabled();
  });
});

describe('an edit that changes one thing', () => {
  it('saves the time alone, with the place as it was', async () => {
    const user = await openEdit();

    await user.press(screen.getByRole('button', { name: '언제 오늘 20:10' }));
    await user.press(screen.getByRole('button', { name: '21시' }));
    await user.press(screen.getByRole('button', { name: '확인' }));
    await answer(user, '수정 완료');

    expect(server.received(STEP_PATH).map(({ body }) => body)).toEqual([
      { title: STEP?.title, startsAt: '2026-10-06T12:10:00.000Z', place: { placeId: 'p63' } },
    ]);
    expect(server.received(`PATCH /quests/${MY_HIKE.id}`)).toEqual([]);
  });

  it('saves 인원 alone', async () => {
    const user = await openEdit();

    await user.press(screen.getByRole('button', { name: '인원 늘리기' }));
    await answer(user, '수정 완료');

    expect(server.received(`PATCH /quests/${MY_HIKE.id}`).map(({ body }) => body)).toEqual([{ capacity: 7 }]);
    expect(server.received(STEP_PATH)).toEqual([]);
  });

  it('invites the Friends alone', async () => {
    const user = await openEdit();

    await invite(user, [MIN_JUN_HOLDER.name]);
    await answer(user, '수정 완료');

    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`).map(({ body }) => body)).toEqual([
      { userId: MIN_JUN_HOLDER.id },
    ]);
    expect(server.received(`PATCH /quests/${MY_HIKE.id}`)).toEqual([]);
    expect(server.received(STEP_PATH)).toEqual([]);
  });
});

// A place as `setPlace` takes it: the words searched, and the row pressed when it is not the words kept as typed.
type PlaceRow = [words: string, row?: string];

describe('a place set, then replaced', () => {
  it.each<[string, PlaceRow, PlaceRow, object]>([
    ['a building by words', ['학생회관', '학생회관 63동'], ['정문'], { label: '정문' }],
    ['words by a building’s exact name', ['정문'], ['학생회관 63동'], { placeId: 'p63' }],
    ['words by a building of the list', ['정문'], ['학생회관', '학생회관 63동'], { placeId: 'p63' }],
  ])('sends the last one: %s', async (_, first, last, place) => {
    const user = await openAt('/party-form');
    await fillPublic(user);

    await setPlace(user, ...first);
    await setPlace(user, ...last);
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place } });
  });
});

describe('the place sheet closed without 이 장소로 정하기', () => {
  it('leaves the place as it was, and opens again on its words with nothing chosen', async () => {
    const user = await openAt('/party-form');
    await setPlace(user, '정문');

    await searchPlace(user, '학생회관');
    await user.press(screen.getByRole('button', { name: '학생회관 63동' }));
    await user.press(screen.getByLabelText('장소 닫기'));
    await pass(500);
    expect(screen.getByRole('button', { name: '어디서 정문' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '어디서 정문' }));
    expect(screen.getByLabelText('장소 검색')).toHaveDisplayValue('정문');
    expect(screen.queryByTestId('place-choice')).toBeNull();
    expect(screen.getByRole('button', { name: '이 장소로 정하기' })).toBeDisabled();
  });
});

// The event gives the time and its place. A place of the User's own at the event's time is a 모이기 too.
describe('a place changed for an event, at the event’s own time', () => {
  it('meets at it with 모이기 for a new 파티', async () => {
    server.on('POST /quests', { status: 201, body: MY_CAREER });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    server.on(`POST /quests/${MY_CAREER.id}/sub-quests`, { status: 201, body: MY_CAREER.subQuests[0] });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await fillPublic(user);

    await setPlace(user, '정문');
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received(`POST /quests/${MY_CAREER.id}/sub-quests`).map(({ body }) => body)).toEqual([
      { title: '모이기', startsAt: CAREER.startsAt, place: { label: '정문' } },
    ]);
  });

  // The review of 2026-11-28: the event's own building, picked from the search, is no place of the User's own.
  it.each([
    ['the event’s own building', '제1공학관', '제1공학관 301동', []],
    [
      'another building',
      '학생회관',
      '학생회관 63동',
      [{ title: '모이기', startsAt: CAREER.startsAt, place: { placeId: 'p63' } }],
    ],
  ])('meets with 모이기 at %s only if it is not the event’s', async (_, words, row, steps) => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation: 'inside' } });
    server.on('POST /quests', { status: 201, body: MY_CAREER });
    server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    server.on(`POST /quests/${MY_CAREER.id}/sub-quests`, { status: 201, body: MY_CAREER.subQuests[0] });
    const user = await openAt(`/party-form?eventId=${CAREER.id}`);
    await fillPublic(user);

    await setPlace(user, words, row);
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests')).toHaveLength(1);
    expect(server.received(`POST /quests/${MY_CAREER.id}/sub-quests`).map(({ body }) => body)).toEqual(steps);
  });
});

describe('a place changed in an edit for an event, at the event’s own time', () => {
  it('meets at it with 모이기, and the event stays', async () => {
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    server.on(`POST /quests/${MY_CAREER.id}/sub-quests`, { status: 201, body: MY_CAREER.subQuests[0] });
    const user = await openAt(`/party-form?questId=${MY_CAREER.id}`);

    await setPlace(user, '정문');
    await answer(user, '수정 완료');

    expect(server.received(`POST /quests/${MY_CAREER.id}/sub-quests`).map(({ body }) => body)).toEqual([
      { title: '모이기', startsAt: CAREER.startsAt, place: { label: '정문' } },
    ]);
  });
});
