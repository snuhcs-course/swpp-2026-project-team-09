/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { CardView } from '@/features/map/adapter';
import { useSelection } from '@/screens/main/use-selection';

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
