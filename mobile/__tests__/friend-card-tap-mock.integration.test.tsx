/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { pass } from './support/app';
import { factLines } from './support/building';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';

// A Friend's card over the mocks with the switch on (P02 ticket 22's Friend half): the mock answers 김민준's face with
// the main server's real card of him (`friend-taps.json`), whose fact lines stand in place of the status and the way
// the mock's Friend list gives the app.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// 김민준's status and way in the mock's Friend list (`friends.ts`).
const STATUS = '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요';
const WAY = '도보 4분';

// Partitions: the card before the main server's card came, and after.
describe("김민준's card over the mocks", () => {
  it("holds the app's status and way until the card comes, then the card's facts in their place", async () => {
    const user = await openMain({ answerOnMap: true });

    await press(user, FRIEND);
    const card = within(screen.getByTestId('map-card'));
    expect(card.getByText(STATUS)).toBeVisible();
    expect(card.getByText(WAY)).toBeVisible();
    await pass(3000);

    expect(factLines()).toEqual(['공강 · 15:00까지', '62동', '나에게서 걸어서 17분']);
    expect(card.queryByText(STATUS)).toBeNull();
    expect(card.queryByText(WAY)).toBeNull();
    expect(card.getByText('친구 ID KM4J8QZA')).toBeVisible();
  });
});
