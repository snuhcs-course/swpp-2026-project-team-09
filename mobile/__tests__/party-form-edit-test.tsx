/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
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
import { answerForm, fillPublic, pressTimes, submit } from './support/party-form';
import { answer, MIN_JUN_HOLDER, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';
import { readQuestEntries } from '@/storage/quest-entries';

// 파티 만들기's 인원 for 공개 and 비공개, editing 언제, 어디서 and 관련 행사, and the toasts after posting, against the
// fake main server.

jest.mock('expo-location');
jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
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
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('인원', () => {
  it('goes up to 8 for a public 파티', async () => {
    const user = await openAt('/party-form');
    expect(screen.getByText('4명')).toBeVisible();

    await pressTimes(user, '인원 늘리기', 4);

    expect(screen.getByText('8명')).toBeVisible();
    expect(screen.getByRole('button', { name: '인원 늘리기' })).toBeDisabled();
  });

  it('is shown for 비공개 and goes no lower than the User and the Friends invited, so that the form can be sent', async () => {
    const user = await openAt(`/party-form?friendId=${MIN_JUN_HOLDER.id}`);
    expect(screen.getByRole('radio', { name: '비공개' })).toBeChecked();

    await pressTimes(user, '인원 줄이기', 2);

    expect(screen.getByText('2명')).toBeVisible();
    expect(screen.getByRole('button', { name: '인원 줄이기' })).toBeDisabled();
    await user.type(screen.getByLabelText('제목'), '저녁 같이');
    await user.press(submit('파티 만들기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ capacity: 2, joinPolicy: 'closed' });
    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(1);
  });

  it('goes down to the User alone with no Friend invited', async () => {
    const user = await openAt('/party-form');

    await pressTimes(user, '인원 줄이기', 3);

    expect(screen.getByText('1명')).toBeVisible();
    expect(screen.getByRole('button', { name: '인원 줄이기' })).toBeDisabled();
  });
});

describe('editing', () => {
  it('shows 언제, 어디서 and 관련 행사, and saves the time and place to the plan and the event on the phone', async () => {
    const hike = { ...MY_HIKE, holders: [...MY_HIKE.holders] };
    const [step] = hike.subQuests;
    server.on(`GET /quests/${hike.id}`, { status: 200, body: hike });
    server.on(`PATCH /quests/${hike.id}`, { status: 200, body: hike });
    server.on(`PUT /quests/${hike.id}/sub-quests/${step?.id ?? ''}`, { status: 200, body: step });
    const user = await openAt(`/party-form?questId=${hike.id}`);

    expect(screen.getByRole('button', { name: '언제 오늘 20:10' })).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('학생회관 (63동)');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(MY_HIKE.title);
    await answer(user, '수정 완료');

    expect(server.received(`PUT /quests/${hike.id}/sub-quests/${step?.id ?? ''}`).map(({ body }) => body)).toEqual([
      {
        title: step?.title,
        startsAt: CAREER.startsAt,
        place: { latitude: CAREER.latitude, longitude: CAREER.longitude, label: '301동 대강당' },
      },
    ]);
    expect(server.received(`PATCH /quests/${hike.id}`)).toEqual([]);
    const kept = (await readQuestEntries())[hike.id];
    expect(kept?.event).toEqual({ id: CAREER.id, title: CAREER.title });
    expect(kept?.tags).toEqual(expect.arrayContaining(['진로', 'AI', '커리어']));
    expect(toast()).toHaveTextContent('모집글을 수정했어요');
  });

  it('shows the event of a Quest made for one, and 행사 빼기 leaves its time and place', async () => {
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: { ...MY_CAREER, board: 'career' } });
    const user = await openAt(`/party-form?questId=${MY_CAREER.id}`);

    expect(screen.getByTestId('chosen-event')).toHaveTextContent(CAREER.title, { exact: false });
    expect(screen.getByRole('button', { name: '언제 오늘 18:00' })).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('301동 대강당');

    await user.press(screen.getByRole('button', { name: '행사 빼기' }));
    expect(screen.getByRole('button', { name: '관련 행사 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '언제 오늘 18:00' })).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('301동 대강당');
  });
});

describe('the toast after posting', () => {
  it('counts the Friends invited to a public 파티', async () => {
    const user = await openAt('/party-form');
    await fillPublic(user);
    await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));

    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(toast()).toHaveTextContent('파티를 올렸어요 · 1명에게 초대 요청');
  });

  it('says only that a public 파티 was posted when nobody was invited', async () => {
    const user = await openAt('/party-form');
    await fillPublic(user);

    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(toast()).toHaveTextContent(/^파티를 올렸어요$/u);
  });
});
