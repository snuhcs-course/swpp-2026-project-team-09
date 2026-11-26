/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { holdBackButton } from './support/back';
import { raiseCard } from './support/card-grip';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, card as cardOf, expectNoWrite, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// P01 ticket 04: the study answer on the map when the seats do not come (the read on the map gives up and offers
// 다시 찾기), Android's back over the open room list, and the walk on the label. P01 tickets 08 and 09: the flag kept
// while the rooms are listed, and the line over the ticket. The phone's clock stands on Monday
// 2026-11-02 at 16:00 in Korea; the card is for 7층 7A 열람실 2 구역 today from 17:00 for an hour.

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

const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};
const DOCKED = /^관정 7층 열람실에 17:00부터 1시간, 빈 자리 \d+석이에요\.$/u;
const ROOM = '열람실: 7층 열람실';

let server: FakeServer;
let library: FakeLibrary;
let back: () => Promise<boolean>;

beforeEach(async () => {
  back = holdBackButton();
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(): Promise<Awaited<ReturnType<typeof askForCards>>> {
  const chat = await askForCards({ server, library }, [SEAT_CARD]);
  await layStage(390, 760);
  await pass(500);
  return chat;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

describe('the seats that do not come', () => {
  it('says so in one line with 다시 찾기, which looks again', async () => {
    library.answerNext('network');
    const { user } = await asked();

    expect(card().getByText('관정 7층 열람실의 빈 자리를 받지 못했어요.')).toBeVisible();
    expect(card().queryByText(/찾고 있어요/u)).toBeNull();

    await user.press(card().getByRole('button', { name: '다시 찾기' }));
    await pass(500);

    // The ticket says the room, the seat and the free seats, and no sentence repeats them (P01 ticket 09).
    expect(within(card().getByTestId('seat-ticket')).getByText(/^\d+번$/u)).toBeVisible();
    expect(card().queryByText(DOCKED)).toBeNull();
    expect(card().queryByText('관정 7층 열람실의 빈 자리를 받지 못했어요.')).toBeNull();
  });
});

describe("Android's back over the room list", () => {
  it('closes the list first and keeps the answer', async () => {
    const { user } = await asked();
    await raiseCard();
    await pass(500);
    await user.press(card().getByRole('button', { name: '열람실: 7층 열람실' }));
    await pass(500);
    expect(screen.getByText(/에 빈 자리$/u)).toBeVisible();

    expect(await back()).toBe(true);
    await pass(500);

    expect(screen.queryByText(/에 빈 자리$/u)).toBeNull();
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

// P01 ticket 10: the walk follows the meal's policy, its minutes on the way's line and none on the label.
describe('the way on the map', () => {
  it('carries the walk there on its line, and the label says the room, the start, the seat and the free seats', async () => {
    await asked();

    expect(mapThings()).toContainEqual(expect.stringMatching(/^걸음 \d+분$/u));
    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 · 17:00 · \d+번 · 빈 자리 \d+석$/u));
    expect(mapThings().some((thing) => thing.startsWith('관정') && thing.includes('걸음'))).toBe(false);
  });
});

// P01 ticket 09: over the ticket, a line only for what the ticket and the time bar cannot say.
describe('the line over the ticket', () => {
  it('says why the start is that time when the server filled it from the arrival', async () => {
    const arrived = cardOf({ ...SEAT_CARD.library, arrival: { at: '16:51', walkMinutes: 9, from: '301동' } });
    await askForCards({ server, library }, [arrived]);
    await layStage(390, 760);
    await pass(500);

    expect(card().getByText('301동에서 걸음 9분이라 17:00부터예요.')).toBeVisible();
    expect(card().queryByText(DOCKED)).toBeNull();
  });

  it('shows the whole ticket from the first frame while the seats are read, with no sentence, 예약하기 dimmed', async () => {
    library.holdSeats();
    await asked();

    // The user's phone: a sentence while the seats came, then the ticket in its place (P01 ticket 09).
    expect(card().queryByText(/찾고 있어요/u)).toBeNull();
    const ticket = within(card().getByTestId('seat-ticket'));
    expect(ticket.getByText('7층 열람실')).toBeOnTheScreen();
    expect(within(ticket.getByTestId('seat-ticket-seat')).getByText('좌석')).toBeOnTheScreen();
    expect(ticket.queryByText(/^\d+번$/u)).toBeNull();
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' })).toBeDisabled();
    library.release();
  });
});

// P01 ticket 08: the rooms listed and closed leave the flag as it is; another room chosen changes it.
describe("the booking's flag while the rooms are listed", () => {
  it('keeps the room and the seat through the list opened and closed, and names the room chosen after it', async () => {
    server.on('GET /study-spaces', { status: 200, body: STUDY_BUILDINGS });
    const { user } = await asked();
    await raiseCard();
    await pass(500);
    const before = mapThings().find((thing) => thing.startsWith('관정 7층 열람실 · 17:00'));
    if (before === undefined) {
      throw new Error(`No booking flag among ${mapThings().join(', ')}`);
    }
    expect(before).toMatch(/ · \d+번/u);

    await user.press(card().getByRole('button', { name: ROOM }));
    await pass(500);
    expect(screen.getByText('17:00–18:00에 빈 자리')).toBeVisible();
    expect(mapThings()).toContain(before);
    await user.press(card().getByRole('button', { name: ROOM }));
    await pass(500);
    expect(mapThings()).toContain(before);

    await user.press(card().getByRole('button', { name: ROOM }));
    await pass(500);
    expect(mapThings()).toContain(before);
    const other = card()
      .getAllByRole('button', { name: /^[78]층 .+ \d+석$/u })
      .find((cell) => !String(cell.props.accessibilityLabel).startsWith('7층 열람실'));
    if (other === undefined) {
      throw new Error('No other room with free seats');
    }
    const room = String(other.props.accessibilityLabel).replace(/ \d+석$/u, '');
    await user.press(other);
    await pass(500);

    expect(mapThings()).not.toContain(before);
    expect(mapThings()).toContainEqual(expect.stringMatching(new RegExp(`^관정 ${room} · 17:00 · \\d+번`, 'u')));
    expectNoWrite(library);
  });
});
