/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { answerEvents, BOOK_TALK, CAREER, MAJOR, MY_CAREER } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, openRoom } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// The card of a Quest's Global Event in its room, against the fake main server: a press shows the 행사 tab's detail
// sheet over the room, without its party button, for an event the app's list holds.

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

// The User's Quest for the Thursday talk, which has no page.
const MY_MAJOR = {
  ...MY_CAREER,
  id: '9a7e0c1d-0000-4f00-8000-0000000c0020',
  title: MAJOR.title,
  globalEvent: { id: MAJOR.id, title: MAJOR.title },
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sheet(): ReturnType<typeof within> {
  return within(screen.getByTestId('event-detail'));
}

describe("a press on the event's card in a Quest's room", () => {
  it('opens the detail sheet over the room, with 원문 보기 and no party button, and its scrim closes it', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    answerRoom(server, MY_CAREER);
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    const user = await openRoom(MY_CAREER);

    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
    expect(sheet().getByRole('header', { name: CAREER.title })).toBeVisible();
    expect(sheet().getByText('오늘 18:00–20:00')).toBeVisible();
    expect(sheet().getByText(CAREER.place ?? '')).toBeVisible();
    expect(sheet().getByText(CAREER.description)).toBeVisible();
    expect(screen.queryByRole('button', { name: /찾기\/모집/u })).toBeNull();
    await user.press(screen.getByRole('button', { name: '원문 보기' }));
    expect(openURL).toHaveBeenCalledWith(CAREER.sourceUrl);

    await user.press(screen.getByRole('button', { name: `${CAREER.title} 닫기` }));
    await pass(500);

    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
    expect(screen.getByRole('button', { name: `행사 · ${CAREER.title}` })).toBeVisible();
  });

  it('has neither 원문 보기 nor the party button without a page, and the back button closes it', async () => {
    const back = holdBackButton();
    answerRoom(server, MY_MAJOR);
    answerEvents(server, { quests: [DINNER, MY_MAJOR] });
    const user = await openRoom(MY_MAJOR);

    await user.press(screen.getByRole('button', { name: `행사 · ${MAJOR.title}` }));
    await pass(500);

    expect(sheet().getByRole('header', { name: MAJOR.title })).toBeVisible();
    expect(screen.queryByRole('button', { name: '원문 보기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /찾기\/모집/u })).toBeNull();

    expect(await back()).toBe(true);
    await pass(500);

    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(shownAddress()).toBe(`/room/${MY_MAJOR.id}`);
  });
});

describe("the event's card in a Quest's room, for an event the app's list does not hold", () => {
  it.each([
    ['that ended or was withdrawn, so the list lacks it', { status: 200, body: [MAJOR, BOOK_TALK] }],
    ['whose list failed', refusal(500)],
  ])('leaves the card unpressable for an event %s', async (_case, events) => {
    answerRoom(server, MY_CAREER);
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    server.on('GET /global-events', events);
    const user = await openRoom(MY_CAREER);

    expect(screen.queryByRole('button', { name: `행사 · ${CAREER.title}` })).toBeNull();
    const eventCard = screen.getByLabelText(`행사 · ${CAREER.title}`);
    expect(within(eventCard).getByText(CAREER.title)).toBeVisible();
    await user.press(eventCard);
    await pass(500);

    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(shownAddress()).toBe(`/room/${MY_CAREER.id}`);
  });
});
