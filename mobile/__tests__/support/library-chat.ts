/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, type userEvent, within } from '@testing-library/react-native';
import type { LibraryCard, LibraryCardData } from '@/api/assistant-types';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { forgetLoginOpened, markLibraryLoggedIn } from '@/library/flag';
import { pass, screen } from './app';
import { PLACES } from './dining';
import type { FakeServer } from './fake-server';
import { sockets } from './fake-socket';
import { FAKE_ROOM_FORM, FakeLibrary } from './kwanjeong/fake-library';
import { hideKeyboard, KEYBOARD, showKeyboard } from './keyboard';
import { answerFromFakeLibrary } from './library-session';
import { AI_INPUT } from './lists';
import { givePhone, ON_CAMPUS, openMain } from './main';
import { startFresh } from './mocks';
import { answerParty } from './party';
import { askMainServer } from './server';

export { bookingRow } from './booking-row';

// What the library cards' tests share: the phone's clock on Monday 2026-11-02 at 16:00 in Korea, the fake main server
// whose Assistant answers with library cards (as P06 ticket 07's tools will), and the fake library behind the hidden
// web view's transport.

export const LIBRARY_NOW = new Date('2026-11-02T07:00:00.000Z');

export const SEAT_CARD: LibraryCard = {
  kind: 'library',
  library: libraryCard('book:7F-7A-zone2:2026-11-02:1700:60', 'book', {
    space: READING_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    notes: SEAT_NOTES,
  }),
};

// The request context every ask of these tests carries: the User's position on campus, and nothing of an answer on
// screen.
export const ASK_CONTEXT = {
  location: ON_CAMPUS,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

export function card(data: LibraryCardData): LibraryCard {
  return { kind: 'library', library: data };
}

export interface LibraryChat {
  server: FakeServer;
  library: FakeLibrary;
  user: ReturnType<typeof userEvent.setup>;
}

export async function startLibraryChat(now: Date = LIBRARY_NOW): Promise<{ server: FakeServer; library: FakeLibrary }> {
  jest.useFakeTimers({ now });
  await startFresh();
  forgetLoginOpened();
  sockets.length = 0;
  const server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  return { server, library: answerFromFakeLibrary(new FakeLibrary()) };
}

// Sends the words from the map's bar and lets the Assistant answer with these cards, which the answer frame's card
// draws. The library's "logged in" flag is set unless `loggedIn` is false.
export async function askForCards(
  given: { server: FakeServer; library: FakeLibrary },
  // As the main server sends them, which may be a raw object.
  cards: readonly object[],
  { loggedIn = true, words = '관정 7층 열람실 17시에 한 시간 예약해줘' } = {},
): Promise<LibraryChat> {
  if (loggedIn) {
    await markLibraryLoggedIn();
  }
  const body = { text: '카드에서 확인해 주세요.', mapButtons: [], cards, proposal: null };
  given.server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await sendFromBar(user, words);
  return { ...given, user };
}

// The words sent from the map's bar, and the reply let in.
export async function sendFromBar(user: LibraryChat['user'], words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// The answer frame's card, which holds the turn: the reply's cards and the app's own bubbles after it.
export function inFrame(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

// Beside the input: the answer's main button, which is a booking ticket's act (P01 ticket 15).
export function inDock(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

export function inCard(testID: string): ReturnType<typeof within> {
  return within(inFrame().getByTestId(testID));
}

// M4: no request that changes a booking reached the library.
export function expectNoWrite(library: FakeLibrary): void {
  expect(library.writes()).toEqual([]);
}

// What must never reach the main server: the booking numbers, the applicant's 학번, phone and email, and any reply of
// the library (its seat labels and its numbers).
export function expectNothingOfTheLibrarySent(server: FakeServer, also: readonly string[] = []): void {
  const sent = JSON.stringify(server.received().map(({ body, query, path }) => ({ body, query, path })));
  const secrets = [
    FAKE_ROOM_FORM.phoneNum,
    FAKE_ROOM_FORM.eMail,
    FAKE_ROOM_FORM.tmpSchoolNos,
    FAKE_ROOM_FORM.tmpSchoolNos.replaceAll('-', ''),
    'BSEQNO',
    '17202001',
    '예약되었어요',
    ...also,
  ];
  for (const secret of secrets) {
    expect(sent).not.toContain(secret);
  }
}

// A press on the button (or the checkbox, the radio) of that name within the card, and the reads it starts.
export async function pressIn(
  scope: ReturnType<typeof within> | typeof screen,
  name: string | RegExp,
  role: 'button' | 'checkbox' | 'radio' = 'button',
): Promise<void> {
  const found = scope.getAllByRole(role, { name }).at(-1);
  if (found === undefined) {
    throw new Error(`No ${role} ${String(name)}`);
  }
  await fireEvent.press(found);
  await pass(0);
}

// The frame's card drawn anew, the conversation kept: the keyboard, up for the next words, empties the card, and its
// going down draws the turn again.
export async function redrawFrame(): Promise<void> {
  await showKeyboard(KEYBOARD);
  expect(inFrame().queryAllByTestId(/^library-/u)).toEqual([]);
  await hideKeyboard();
  await pass(0);
}
