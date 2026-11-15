/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, type RenderHookResult, renderHook } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import type { CardView } from '@/features/map/adapter';
import { type Selection, useSelection } from '@/screens/main/use-selection';

function friendCard(id: string, name: string): CardView {
  return {
    id: `friend:${id}`,
    kind: 'friend',
    mark: { type: 'person', id, name, photo: null, presence: 'free', stale: false },
    marker: { name, short: name, count: 0, minutesOld: null },
    subLabel: '컴퓨터공학부 22',
    title: name,
    lines: [],
    primary: { label: '파티 만들기', action: 'not-ready' },
    secondary: null,
    position: { latitude: 37.4598, longitude: 126.9521 },
  };
}

const MIN_JUN = friendCard('f1', '김민준');
const JI_HO = friendCard('f3', '박지호');

describe('the selection of the main screen', () => {
  it('is dropped for good when its card leaves the map: the card does not open again on its return', async () => {
    const { result, rerender } = await renderHook(({ cards }: { cards: CardView[] }) => useSelection(cards, true), {
      initialProps: { cards: [MIN_JUN, JI_HO] },
    });
    await act(() => {
      result.current.select(MIN_JUN.id);
    });
    expect(result.current.selected?.title).toBe('김민준');

    // The Friend turns their location off, and on again.
    await rerender({ cards: [JI_HO] });
    expect(result.current.open).toBe(false);
    await rerender({ cards: [MIN_JUN, JI_HO] });

    expect(result.current.selected).toBeNull();
    expect(result.current.open).toBe(false);
  });

  it('stays while its card is only worded anew', async () => {
    const { result, rerender } = await renderHook(({ cards }: { cards: CardView[] }) => useSelection(cards, true), {
      initialProps: { cards: [MIN_JUN] },
    });
    await act(() => {
      result.current.select(MIN_JUN.id);
    });

    await rerender({ cards: [{ ...MIN_JUN, subLabel: '컴퓨터공학부 23' }] });

    expect(result.current.selected?.subLabel).toBe('컴퓨터공학부 23');
  });
});

const ME = 'me';

// The selection over the two Friends' cards; `mine`: whether the User's own dot takes a press.
function render(initialProps: { mine: boolean }): Promise<RenderHookResult<Selection, { mine: boolean }>> {
  return renderHook(({ mine }: { mine: boolean }) => useSelection([MIN_JUN, JI_HO], true, mine), { initialProps });
}

// Partitions: the User's own dot taking a press and not.
describe("the User's own card in the selection", () => {
  it('opens from a press on the dot while the dot takes one, as no thing of the map', async () => {
    const { result } = await render({ mine: true });

    await act(() => {
      result.current.select(ME);
    });

    expect(result.current.mine).toBe(true);
    expect(result.current.open).toBe(true);
    expect(result.current.selected).toBeNull();
  });

  it('does not open while the dot takes no press', async () => {
    const { result } = await render({ mine: false });

    await act(() => {
      result.current.select(ME);
    });

    expect(result.current.mine).toBe(false);
    expect(result.current.open).toBe(false);
  });
});

// Partitions: another thing selected after it; the dot gone while it is open.
describe("the User's own card once open", () => {
  it("is replaced by a thing's card that is selected after it", async () => {
    const { result } = await render({ mine: true });
    await act(() => {
      result.current.select(ME);
    });

    await act(() => {
      result.current.select(MIN_JUN.id);
    });

    expect(result.current.mine).toBe(false);
    expect(result.current.selected?.title).toBe('김민준');
  });

  it('is closed for good once the dot no longer takes a press', async () => {
    const { result, rerender } = await render({ mine: true });
    await act(() => {
      result.current.select(ME);
    });

    await rerender({ mine: false });
    await rerender({ mine: true });

    expect(result.current.mine).toBe(false);
    expect(result.current.open).toBe(false);
  });
});

const STUDENT_HALL: Place = { id: 'p63', number: '63', name: '학생회관', latitude: 37.45932, longitude: 126.95058 };

// The selection over the two Friends' cards; `buildings`: whether a building takes a press, the switch being on, which
// gives the Friends a card may be open for without their mark (P02 ticket 22).
function renderBuildings(initialProps: {
  buildings: boolean;
}): Promise<RenderHookResult<Selection, { buildings: boolean }>> {
  return renderHook(
    ({ buildings }: { buildings: boolean }) => useSelection([MIN_JUN, JI_HO], true, false, buildings ? [] : null),
    { initialProps },
  );
}

// Partitions: buildings taking a press and not.
describe("a pressed building's card in the selection", () => {
  it('opens while buildings take a press, as no thing of the map', async () => {
    const { result } = await renderBuildings({ buildings: true });

    await act(() => {
      result.current.selectPlace(STUDENT_HALL);
    });

    expect(result.current.place).toEqual(STUDENT_HALL);
    expect(result.current.open).toBe(true);
    expect(result.current.selected).toBeNull();
  });

  it('does not open while buildings take no press', async () => {
    const { result } = await renderBuildings({ buildings: false });

    await act(() => {
      result.current.selectPlace(STUDENT_HALL);
    });

    expect(result.current.place).toBeNull();
    expect(result.current.open).toBe(false);
  });
});

// Partitions: a thing selected after it; buildings no longer taking a press while it is open.
describe("a pressed building's card once open", () => {
  it("is replaced by a thing's card that is selected after it", async () => {
    const { result } = await renderBuildings({ buildings: true });
    await act(() => {
      result.current.selectPlace(STUDENT_HALL);
    });

    await act(() => {
      result.current.select(MIN_JUN.id);
    });

    expect(result.current.place).toBeNull();
    expect(result.current.selected?.title).toBe('김민준');
  });

  it('is closed for good once buildings no longer take a press', async () => {
    const { result, rerender } = await renderBuildings({ buildings: true });
    await act(() => {
      result.current.selectPlace(STUDENT_HALL);
    });

    await rerender({ buildings: false });
    await rerender({ buildings: true });

    expect(result.current.place).toBeNull();
    expect(result.current.open).toBe(false);
  });
});
