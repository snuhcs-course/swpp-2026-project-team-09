/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { userEvent } from '@testing-library/react-native';
import { clearInitialURL, getLinkingURL } from 'expo-linking';
import { Linking, Platform } from 'react-native';
import { pass, screen, startApp } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { ONBOARDING, saveOnboarding } from './support/onboarding';
import { mockFriendships } from '@/api/mock/friendships';
import { keep, readKept } from '@/storage/kept';

// An Invite Link that starts the stopped app on Android, against the mocks: the router's way of getting the first
// address there is in `src/app/+native-intent.ts`.

jest.mock('expo-location');
// The app's scheme, which the router's address at a start from the home screen is made of.
jest.mock('expo-linking', () => ({
  ...jest.requireActual<object>('expo-linking'),
  createURL: (path: string): string => `snunow://${path}`,
  addEventListener: (): { remove: () => void } => ({ remove: (): void => undefined }),
  getLinkingURL: jest.fn(),
  clearInitialURL: jest.fn(),
}));
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const INVITE = '유지안님의 친구 초대';
const SCHEME_LINK = 'snunow://invite/from-yujian';
const HTTPS_LINK = 'https://api.snunow.com/invite/from-yujian';

// What expo-linking holds on the phone: the address that started the app, for as long as the app's process lives.
let held: string | null = null;

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  jest.replaceProperty(Platform, 'OS', 'android');
  held = null;
  jest.mocked(getLinkingURL).mockImplementation(() => held);
  jest.mocked(clearInitialURL).mockImplementation(() => {
    held = null;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Starts the app as Android does, by the link or from the home screen, and lets the loading screen and the screen
// after it load. React Native answers the address at once, or `late`, after the router has stopped waiting for it.
async function startBy(link: string | null, { late = false }: { late?: boolean } = {}): Promise<void> {
  if (link !== null) {
    held = link;
  }
  jest.spyOn(Linking, 'getInitialURL').mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(
          () => {
            resolve(link);
          },
          late ? 300 : 10,
        );
      }),
  );
  await startApp(null);
  await pass(1000);
  await pass(1000);
  await pass(1000);
}

// A User who signed in on this phone and finished Onboarding.
function signedIn(): Promise<unknown> {
  return keep({
    signedIn: true,
    consent: { version: 1, usage: false },
    onboardingCompleted: true,
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear: 2022,
      hashtags: [],
      gender: null,
    },
  });
}

describe('an Invite Link that starts the stopped app on Android', () => {
  it.each([
    [SCHEME_LINK, 'at once', false],
    [HTTPS_LINK, 'at once', false],
    [SCHEME_LINK, 'late', true],
    [HTTPS_LINK, 'late', true],
  ])(
    'shows a signed-in User the accept screen of %s after the loading screen, React Native answering %s',
    async (link, _, late) => {
      await signedIn();
      await startBy(link, { late });

      expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
    },
  );

  it('shows a signed-out User its accept screen after the sign-in, the consent and Onboarding', async () => {
    await startBy(SCHEME_LINK);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    await pass(400);
    await user.press(screen.getByRole('button', { name: '동의하고 시작' }));
    await pass(400);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('header', { name: INVITE })).toBeNull();

    await saveOnboarding(user);
    await pass(1000);
    expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
  });
});

describe('the accept screen reached from the stopped app on Android', () => {
  it('makes the two Friends on 수락', async () => {
    await signedIn();
    await startBy(SCHEME_LINK);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.press(screen.getByRole('button', { name: '수락' }));
    await pass(1000);

    expect(screen.queryByRole('header', { name: INVITE })).toBeNull();
    expect(screen.getByText('유지안님과 친구가 됐어요')).toBeVisible();
    expect(mockFriendships.listFriends().map(({ name }) => name)).toContain('유지안');
  });

  it('opens once: a later start from the home screen shows the map', async () => {
    await signedIn();
    await startBy(SCHEME_LINK);
    expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
    expect((await readKept()).inviteToken).toBeNull();

    await screen.unmount();
    await startBy(null);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.queryByRole('header', { name: INVITE })).toBeNull();
  });
});

describe('a start of the app from the home screen on Android', () => {
  it('keeps no Invite Link', async () => {
    await signedIn();
    await startBy(null);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect((await readKept()).inviteToken).toBeNull();
  });
});
