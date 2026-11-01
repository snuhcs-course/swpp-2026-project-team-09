/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';
import { googleAvailable } from '@/auth/google';

// 프로필 편집's 도서관 예약 정보: the 학번, the 학적상 이름 and the 소속.

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

const STUDENT_NUMBER = '도서관 예약 학번';
const REFUSED = '학번은 2026-12345처럼 숫자 9자리로 적어 주세요';

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

async function openEdit(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: '프로필 편집' }));
  await pass(500);
  return user;
}

async function save(user: Awaited<ReturnType<typeof openMain>>): Promise<void> {
  await user.press(screen.getByRole('button', { name: '저장' }));
  await pass(500);
}

describe('도서관 예약 정보', () => {
  it('starts empty, with the 학번 format and what an empty registered name means', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    await openEdit();

    expect(screen.getByRole('header', { name: '도서관 예약 정보' })).toBeVisible();
    expect(screen.getByLabelText(STUDENT_NUMBER)).toHaveDisplayValue('');
    expect(screen.getByText('예: 2026-12345 (하이픈은 없어도 돼요)')).toBeVisible();
    expect(screen.getByLabelText('학적상 이름')).toHaveDisplayValue('');
    expect(screen.getByText('비워 두면 이름을 써요')).toBeVisible();
    for (const affiliation of ['학부', '대학원', '교환학생']) {
      expect(screen.getByRole('radio', { name: affiliation })).not.toBeChecked();
    }
  });

  it('sends the three fields the User entered, and goes back', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('PATCH /users/me/profile', {
      status: 200,
      body: { ...LOBBY.profile, studentNumber: '202612345', registeredName: '홍길순', affiliation: 'exchange' },
    });
    const user = await openEdit();

    await user.type(screen.getByLabelText(STUDENT_NUMBER), '2026-12345');
    await user.type(screen.getByLabelText('학적상 이름'), '홍길순');
    await user.press(screen.getByRole('radio', { name: '교환학생' }));
    await save(user);

    expect(server.received('PATCH /users/me/profile').map(({ body }) => body)).toEqual([
      { studentNumber: '2026-12345', registeredName: '홍길순', affiliation: 'exchange' },
    ]);
    expect(screen.queryByRole('header', { name: '프로필 편집' })).toBeNull();
  });

});

describe('도서관 예약 정보 saved before', () => {
  it('shows the saved ones, the 학번 with its hyphen, and sends an emptied one empty', async () => {
    const server = await askMainServer({ signedIn: true });
    const profile = { ...LOBBY.profile, studentNumber: '202612345', registeredName: '홍길순', affiliation: 'graduate' };
    answerMainScreen(server);
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, profile } });
    server.on('PATCH /users/me/profile', { status: 200, body: { ...profile, studentNumber: null } });
    const user = await openEdit();

    expect(screen.getByLabelText(STUDENT_NUMBER)).toHaveDisplayValue('2026-12345');
    expect(screen.getByLabelText('학적상 이름')).toHaveDisplayValue('홍길순');
    expect(screen.getByRole('radio', { name: '대학원' })).toBeChecked();
    await user.clear(screen.getByLabelText(STUDENT_NUMBER));
    await save(user);

    expect(server.received('PATCH /users/me/profile').map(({ body }) => body)).toEqual([{ studentNumber: '' }]);
  });
});

describe('A 학번 the main server refuses', () => {
  it('is marked on its field with how to write it, and the screen stays', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('PATCH /users/me/profile', {
      status: 400,
      body: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['studentNumber: Invalid string: must be a 학번 such as 2026-12345'],
      },
    });
    const user = await openEdit();

    await user.type(screen.getByLabelText(STUDENT_NUMBER), '2026-1234');
    await save(user);

    expect(screen.getByText(REFUSED)).toBeVisible();
    expect(screen.queryByText('저장하지 못했어요. 다시 시도해 주세요')).toBeNull();
    expect(screen.getByRole('header', { name: '프로필 편집' })).toBeVisible();
    expect(screen.getByLabelText(STUDENT_NUMBER)).toHaveDisplayValue('2026-1234');

    await user.type(screen.getByLabelText(STUDENT_NUMBER), '5');
    expect(screen.queryByText(REFUSED)).toBeNull();
  });
});

describe('도서관 예약 정보 against the mocks', () => {
  it('refuses a wrong 학번 as the main server does', async () => {
    const user = await openEdit();

    await user.type(screen.getByLabelText(STUDENT_NUMBER), '2026-1234a');
    await save(user);

    expect(screen.getByText(REFUSED)).toBeVisible();
  });

  it('keeps a right one, which the screen shows again', async () => {
    const user = await openEdit();

    await user.type(screen.getByLabelText(STUDENT_NUMBER), '202612345');
    await user.press(screen.getByRole('radio', { name: '학부' }));
    await save(user);
    await user.press(screen.getByRole('button', { name: '프로필 편집' }));
    await pass(500);

    expect(screen.getByLabelText(STUDENT_NUMBER)).toHaveDisplayValue('2026-12345');
    expect(screen.getByRole('radio', { name: '학부' })).toBeChecked();
  });
});
