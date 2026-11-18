/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { useGuideGivesWay } from '@/screens/main/tutorial/use-guide-flow';

// A 새내기 튜토리얼 quest's guide gives way to what opens over the map (P15 ticket 53, review of #359): a card selected
// by a tapped push, an invitation's card or the answer frame closes it.

interface Given {
  open: boolean;
  otherOpen: boolean;
}

async function render(close: () => void, given: Given): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ open, otherOpen }: Given) => {
      useGuideGivesWay(open, otherOpen, close);
    },
    { initialProps: given },
  );
  return async (next) => {
    await rerender(next);
  };
}

// Partitions: the guide open and something else opening; the guide closed; nothing else open.
describe('a guide while something else opens over the map', () => {
  it('closes once a card, a framed answer or an invitation opens', async () => {
    const closed: string[] = [];
    const next = await render(
      () => {
        closed.push('guide');
      },
      { open: true, otherOpen: false },
    );
    expect(closed).toEqual([]);

    await next({ open: true, otherOpen: true });

    expect(closed).toEqual(['guide']);
  });

  it('does nothing while no guide is open', async () => {
    const closed: string[] = [];
    const next = await render(
      () => {
        closed.push('guide');
      },
      { open: false, otherOpen: false },
    );

    await next({ open: false, otherOpen: true });

    expect(closed).toEqual([]);
  });
});
