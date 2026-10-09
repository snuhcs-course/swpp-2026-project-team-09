/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';
import { googleAvailable } from '@/auth/google';

// 프로필 편집, the `ProfileEdit` frame with the fields the main server stores.

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

describe('프로필 편집', () => {
  it("starts from the Lobby's profile, with no photo, course level or gender", async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    await openEdit();

    expect(screen.getByRole('header', { name: '프로필 편집' })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
    expect(screen.getByRole('combobox', { name: '학번' })).toHaveAccessibilityValue({ text: '22학번' });
    expect(screen.getByText('#러닝')).toBeVisible();
    expect(screen.queryByText('과정')).toBeNull();
    expect(screen.queryByText('성별')).toBeNull();
    expect(screen.queryByLabelText('프로필 사진 바꾸기')).toBeNull();
  });

  it('sends the changed fields, shows the answer on 내 정보 and goes back', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('PATCH /users/me/profile', {
      status: 200,
      body: { ...LOBBY.profile, name: '홍길순', admissionYear: null },
    });
    const user = await openEdit();

    await user.clear(screen.getByLabelText('이름'));
    await user.type(screen.getByLabelText('이름'), '홍길순');
    await user.press(screen.getByRole('combobox', { name: '학번' }));
    await user.press(screen.getByRole('button', { name: '그 외' }));
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(server.received('PATCH /users/me/profile').map(({ body }) => body)).toEqual([
      { name: '홍길순', admissionYear: null },
    ]);
    expect(screen.queryByRole('header', { name: '프로필 편집' })).toBeNull();
    expect(screen.getByText('홍길순')).toBeVisible();
    expect(screen.getByText('컴퓨터공학부')).toBeVisible();
  });
});

describe('프로필 편집 that could not be saved', () => {
  it('stays with a toast', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'updateProfile';
    const user = await openEdit();

    await user.type(screen.getByLabelText('이름'), '순');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('저장하지 못했어요. 다시 시도해 주세요');
    expect(screen.getByRole('header', { name: '프로필 편집' })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동순');
  });
});
