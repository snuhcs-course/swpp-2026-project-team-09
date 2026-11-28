/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { onNov2 } from './support/day-quests';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { openMain } from './support/main';

// P01 ticket 40: a seat answer whose reply gives the conversation's Classes left out back (`skipped`, the main
// server's P05 ticket 70). The seat's time card draws them apart, "뺀 수업" with a ✕ each, off the lane and out of its
// words; a ✕ puts that Class back on the lane at once, with its clash words, and asks the main server nothing. The
// phone's clock stands on Monday 2026-11-02 at 16:00; the card is for 7층 7A 열람실 2 구역 from 17:00 for an hour, and
// 운영체제 at 302동 from 17:30, which the band runs into, is left out.

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
const PUT_BACK = '17:30 302동 수업 다시 넣기';

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
  server.on('GET /quests', { status: 200, body: [onNov2('c2', '운영체제', '17:30', '18:45', '302동 208호', true)] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(): Promise<Awaited<ReturnType<typeof openMain>>> {
  await markLibraryLoggedIn();
  const skipped = [{ date: '2026-11-02', classId: 'c2-1' }];
  const body = { text: '카드에서 확인해 주세요.', mapButtons: [], cards: [SEAT_CARD], proposal: null, skipped };
  server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await sendFromBar(user, '관정 7층 열람실 17시에 한 시간 예약해줘');
  await layStage(390, 760);
  await pass(500);
  return user;
}

function bar(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-bar'));
}

function clashes(): number {
  return within(bar().getByTestId('time-band-lane-me')).queryAllByTestId('time-band-clash').length;
}

// Partitions: the Class left out; put back with its ✕. Expected values: worked by hand from 17:00–18:00 and the Class
// from 17:30.
describe("a seat answer with the conversation's Class left out", () => {
  it('draws the Class apart with its ✕, off the lane and out of the words', async () => {
    await asked();

    expect(bar().getByText('뺀 수업')).toBeVisible();
    expect(bar().getByRole('button', { name: PUT_BACK })).toBeVisible();
    expect(bar().getByTestId('time-band-words')).toHaveTextContent('17:00–18:00 · 1시간', { exact: true });
    expect(clashes()).toBe(0);
  });

  it('puts the Class back on the lane with its ✕, the clash words back, asking nothing', async () => {
    const user = await asked();
    const sent = server.received('POST /assistant/messages').length;

    await user.press(bar().getByRole('button', { name: PUT_BACK }));
    await pass(500);

    expect(bar().queryByText('뺀 수업')).toBeNull();
    expect(bar().getByTestId('time-band-words')).toHaveTextContent('17:00–18:00 · 17:30 수업과 겹쳐요', {
      exact: true,
    });
    expect(clashes()).toBe(1);
    expect(server.received('POST /assistant/messages')).toHaveLength(sent);
  });
});
