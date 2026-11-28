/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { answerEvents, CAREER } from './support/events';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';
import { FAVORITE_LABEL } from '@/screens/events/favorite-toggle';

// The user (2026-11-28): "파티 만들 때, 관련 행사 고르기를 들어갔다가 핸드폰 자체의 뒤로가기를 누르면 아예 파티 탭까지로
// 뒤로가지네." A page drawn inside a screen takes Android's back as its own ‹, before the screen under it leaves.

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

const PICKER = '관련 행사 고르기';

let server: FakeServer;

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

describe("Android's back on 파티 만들기's 관련 행사 고르기", () => {
  it('goes back to the form, with what was typed, as the page’s ‹ does', async () => {
    const pressBack = holdBackButton();
    const user = await openAt('/party-form');
    await user.type(screen.getByLabelText('제목'), '설명회 같이 가요');
    await user.press(screen.getByRole('button', { name: PICKER }));
    expect(screen.getByRole('header', { name: PICKER })).toBeVisible();

    expect(await pressBack()).toBe(true);
    await pass(500);

    expect(shownAddress()).toBe('/party-form');
    expect(screen.queryByRole('header', { name: PICKER })).toBeNull();
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('설명회 같이 가요');
  });

  it("closes an event's sheet over the page first, then the page", async () => {
    const pressBack = holdBackButton();
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: PICKER }));
    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));
    await pass(500);
    expect(screen.getByTestId('event-detail')).toBeVisible();

    await pressBack();
    await pass(500);
    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(screen.getByRole('header', { name: PICKER })).toBeVisible();

    await pressBack();
    await pass(500);
    expect(screen.queryByRole('header', { name: PICKER })).toBeNull();
    expect(shownAddress()).toBe('/party-form');
  });
});

// From PR 782's review: the form re-renders when the events change, as a press on the sheet's ☆ makes them, and gives
// the page a new close each time; the page's hold on the back must keep its place under the sheet's.
describe("Android's back after the form has drawn again", () => {
  it("still closes the event's sheet first, then the page, and leaves the form", async () => {
    const pressBack = holdBackButton();
    server.on(`PUT /global-events/${CAREER.id}/favorite`, { status: 204 });
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: PICKER }));
    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));
    await pass(500);
    await user.press(within(screen.getByTestId('event-detail')).getByRole('button', { name: FAVORITE_LABEL }));
    await pass(500);

    await pressBack();
    await pass(500);
    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(screen.getByRole('header', { name: PICKER })).toBeVisible();

    await pressBack();
    await pass(500);
    expect(screen.queryByRole('header', { name: PICKER })).toBeNull();
    expect(shownAddress()).toBe('/party-form');
  });
});
