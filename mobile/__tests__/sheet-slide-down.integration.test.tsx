/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, cardName, openAt, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// A sheet slides down when it closes, with what it showed still in it, though 찾기 drops the 모집글's content the
// moment it closes; a tap on its handle bar closes it as a tap on the scrim does (P06 ticket 35). The phone allows
// motion here, so the sheet stays drawn while it slides out; the test's animations end within a few frames.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const SHEET = '파티 모집글';

type User = Awaited<ReturnType<typeof openAt>>;

function title(): ReturnType<ReturnType<typeof within>['queryByRole']> {
  return screen.queryByRole('header', { name: RUN.title });
}

// 찾기, with the 모집글 of 버들골 저녁 러닝 크루 slid up.
async function openSheet(): Promise<User> {
  const user = await openAt('/party');
  await user.press(screen.getByLabelText(cardName(RUN.title)));
  await pass(300);
  return user;
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  const server = await askMainServer({ signedIn: true });
  answerParty(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: closed by the scrim and by the handle bar; the 모집글 as its slide starts, and after it.
describe('a closing 모집글', () => {
  it('slides down with its title and text still in it after a tap on the scrim, and is gone once it is down', async () => {
    const user = await openSheet();
    expect(title()).toBeVisible();

    await user.press(screen.getByRole('button', { name: `${SHEET} 닫기` }));

    expect(title()).toBeVisible();
    expect(within(screen.getByLabelText(SHEET)).getByText(RUN.description)).toBeVisible();

    await pass(400);

    expect(title()).toBeNull();
    expect(screen.queryByLabelText(SHEET)).toBeNull();
  });

  it('closes on a tap on its handle bar, sliding down as it does after the scrim', async () => {
    const user = await openSheet();

    await user.press(screen.getByTestId('sheet-handle'));

    expect(title()).toBeVisible();

    await pass(400);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
  });
});
