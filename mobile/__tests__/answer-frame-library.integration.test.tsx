/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { AI_INPUT, LAYERS } from './support/lists';
import { openMain } from './support/main';
import { press, zoomIn } from './support/markers';

// The library's cards and 관정관's 좌석 현황 with the answer frame (P02 ticket 01), against the fake main server and
// the fake library, with the switch on.

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

const KWANJEONG = '공부공간 · 관정관';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /study-spaces', { status: 200, body: STUDY_BUILDINGS });
  await markLibraryLoggedIn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

// Partitions: an answer with a library card, asked from the bar; the Assistant asked by a card on the map.
describe('a library card in the frame', () => {
  it('offers the seat with its buttons, and 예약하기 books it and adds the done message to the card', async () => {
    const body = { text: '카드에서 확인해 주세요.', mapButtons: [], cards: [SEAT_CARD], proposal: null };
    server.on('POST /assistant/messages', { status: 200, body });
    const user = await openMain({ answerOnMap: true });
    await user.type(screen.getByLabelText(AI_INPUT), '관정 7층 열람실 17시에 한 시간 예약해줘');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    const seat = within(card().getByTestId(`library-book-${SEAT_CARD.library.key}`));
    expect(seat.getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();

    await pressIn(seat, '예약하기');

    expect(library.writes()).toHaveLength(1);
    expect(card().getByText('7193번 예약되었어요!')).toBeVisible();
  });
});

describe("관정관's 좌석 현황 with the switch on", () => {
  it('asks the Assistant and shows the frame, not the chat sheet', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '좌석 현황이에요.', mapButtons: [], cards: [], proposal: null },
    });
    const user = await openMain({ answerOnMap: true });
    await press(user, LAYERS);
    await user.press(screen.getByRole('togglebutton', { name: /^공부공간/u }));
    await press(user, '편의기능 레이어 닫기');
    await pass(500);
    await zoomIn(user, 2);
    await press(user, KWANJEONG);
    await pass(500);

    await user.press(within(screen.getByTestId('map-card')).getByRole('button', { name: '좌석 현황' }));
    await pass(500);

    expect(within(screen.getByTestId('answer-pill')).getByText('관정도서관 좌석 현황 보여줘')).toBeVisible();
    expect(card().getByText('좌석 현황이에요.')).toBeVisible();
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
  });
});
