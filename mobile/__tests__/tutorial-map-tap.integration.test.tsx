/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { MOCK_TUTORIAL_SWITCHES } from '@/api/mock/tutorial';
import { pass, screen } from './support/app';
import { mapLines } from './support/answer-map';
import { tapGround } from './support/building';
import { button } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh, withoutInterestMarks } from './support/mocks';
import { openGuide, openSheet } from './support/tutorial';

// A tap on the map while the 새내기 튜토리얼 draws something on it (P15 tickets 53 and 55), over the mocks. On the
// everyday map one tap on empty map takes away both the tutorial's place pin and the walking route: the pin goes for
// any tap that is not on it, the route for a tap where no Place is found. While a quest's guide is open the map is the
// guide's, not the everyday map, and a tap clears nothing: the route a 길찾기 drew stays.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// Each quest is reached through the start button, the list and its tab.
jest.setTimeout(150000);

const LINE = 'walking-route';
const PIN = 'tutorialPlace';

beforeEach(async () => {
  jest.useFakeTimers();
  jest.spyOn(apiClient, 'findPlaceAt').mockResolvedValue({ place: null, relation: 'none' });
  await startFresh();
  withoutInterestMarks();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Partitions: the everyday map with a pin and a route; a guide with the route a 길찾기 drew.
describe('a tap on empty map', () => {
  it('takes away both the tutorial place pin and the walking route on the everyday map', async () => {
    MOCK_TUTORIAL_SWITCHES.guides = false;
    const user = await openSheet('lost-and-found');
    await user.press(button('아시아연구소 1층 지도에서 보기'));
    await pass(1000);
    expect(screen.queryAllByTestId(PIN)).toHaveLength(1);
    expect(mapLines()).toContain(LINE);

    await tapGround();

    expect(screen.queryAllByTestId(PIN)).toEqual([]);
    expect(mapLines()).not.toContain(LINE);
  });

  it("clears nothing while a guide is open: the route of the guide's 길찾기 stays", async () => {
    const user = await openGuide('lost-and-found');
    await user.press(button('길찾기'));
    await pass(1000);
    expect(mapLines()).toContain(LINE);

    await tapGround();

    expect(mapLines()).toContain(LINE);
  });
});
