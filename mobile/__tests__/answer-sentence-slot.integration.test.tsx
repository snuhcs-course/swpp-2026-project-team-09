/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, card, inDock, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// The answer card's one sentence slot (P01 ticket 20, the user's rule of 2026-11-27): top to bottom, one sentence →
// the ticket → the main button. The slot holds the app's line made by a button, else the model's latest reply, else the
// app's explaining line; the waiting dots stand there too. A seat card on the map (7층 열람실 today from 17:00 for an
// hour, its start filled from the walk from 301동), then a follow-up answered with words alone.

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
const ARRIVED = card({ ...SEAT_CARD.library, arrival: { at: '16:51', walkMinutes: 9, from: '301동' } });
const EXPLAINING = '301동에서 걸음 9분이라 17:00부터예요.';
const FLOOR = '7층이에요.';
const FLAG = /^관정 7층 열람실 · 17:00/u;

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type Found = ReturnType<typeof screen.getByTestId>;

// The answer card's words and testIDs in the order they are drawn, top to bottom.
function drawn(): string[] {
  const out: string[] = [];
  const walk = (node: Found): void => {
    if (typeof node.props.testID === 'string') {
      out.push(`#${node.props.testID}`);
    }
    for (const child of node.children) {
      if (typeof child === 'string') {
        out.push(child);
      } else {
        walk(child);
      }
    }
  };
  walk(screen.getByTestId('answer-card'));
  return out;
}

function at(thing: string): number {
  const index = drawn().findIndex((one) => one.includes(thing));
  if (index < 0) {
    throw new Error(`${thing} is not in the card: ${drawn().join(' | ')}`);
  }
  return index;
}

async function asked(): Promise<Awaited<ReturnType<typeof askForCards>>> {
  const chat = await askForCards({ server, library }, [ARRIVED]);
  await layStage(390, 760);
  await pass(500);
  return chat;
}

function wordsReply(text: string, more: object = {}): { status: number; body: unknown } {
  return { status: 200, body: { text, mapButtons: [], cards: [], proposal: null, ...more } };
}

describe("a seat card's sentence slot", () => {
  it('holds the explaining line over the ticket at first', async () => {
    await asked();

    expect(at(EXPLAINING)).toBeLessThan(at('#seat-ticket'));
  });

  it('holds the reply to a follow-up over the ticket, and the explaining line gives way', async () => {
    const { user } = await asked();
    server.on('POST /assistant/messages', wordsReply(FLOOR));

    await sendFromBar(user, '거기 몇 층이야?');

    expect(at(FLOOR)).toBeLessThan(at('#seat-ticket'));
    expect(screen.queryByText(EXPLAINING)).toBeNull();
    expect(inDock().getByRole('button', { name: '예약하기' })).toBeEnabled();
  });

  it('holds the waiting dots over the ticket while the reply is on its way', async () => {
    const { user } = await asked();
    server.on('POST /assistant/messages', { ...wordsReply(FLOOR), afterMs: 5000 });

    await sendFromBar(user, '거기 몇 층이야?');

    expect(at('#answer-waiting')).toBeLessThan(at('#seat-ticket'));
    expect(screen.queryByText(EXPLAINING)).toBeNull();
  });
});

describe("a seat card's sentence slot after a button", () => {
  it('keeps no earlier reply over the booked ticket', async () => {
    const { user } = await asked();
    server.on('POST /assistant/messages', wordsReply(FLOOR));
    await sendFromBar(user, '거기 몇 층이야?');

    await user.press(inDock().getByRole('button', { name: '예약하기' }));
    await pass(500);

    expect(screen.getByTestId('library-done')).toBeVisible();
    expect(screen.queryByText(FLOOR)).toBeNull();
  });
});

describe('when the ticket leaves', () => {
  it('leaves under a reply the server says clears the screen', async () => {
    const { user } = await asked();
    server.on('POST /assistant/messages', wordsReply('캠퍼스 안의 일만 도와 드려요.', { clears: true }));

    await sendFromBar(user, '강남역 맛집 추천해 줘');

    expect(screen.queryByTestId('seat-ticket')).toBeNull();
    expect(mapThings().some((thing) => FLAG.test(thing))).toBe(false);
  });

  it('stays under words alone that do not say so, as a thank-you', async () => {
    const { user } = await asked();
    server.on('POST /assistant/messages', wordsReply('네, 필요하면 또 불러 주세요.'));

    await sendFromBar(user, '고마워');

    expect(screen.getByTestId('seat-ticket')).toBeVisible();
    expect(mapThings().some((thing) => FLAG.test(thing))).toBe(true);
  });
});
