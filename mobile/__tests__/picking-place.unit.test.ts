/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { placeAfterPicking, usePickingPlace } from '@/screens/main/answer/picking-place';
import type { GripPlace } from '@/screens/main/answer/time-card-grip';

// The time card's place around picking people (P04 ticket 64, the user's phone on 2026-11-25), with a stand-in grip
// that only records where it is told to settle.

interface Props {
  picking: boolean;
  place: GripPlace;
  high?: boolean;
  moving?: boolean;
}

async function heldFrom(place: GripPlace): Promise<{
  settled: jest.Mock<void, [GripPlace]>;
  rerender: (props: Props) => Promise<void>;
}> {
  const settled = jest.fn<void, [GripPlace]>();
  const { rerender } = await renderHook(
    ({ picking, place: at, high = false, moving = false }: Props) => {
      usePickingPlace(picking, { place: at, moving, settleTo: settled }, high);
    },
    { initialProps: { picking: false, place } },
  );
  return {
    settled,
    rerender: async (props): Promise<void> => {
      await rerender(props);
    },
  };
}

// Partitions: the card folded, open, and tucked before "＋ 같이".
describe('the time card after picking', () => {
  it.each<[GripPlace, GripPlace]>([
    ['shown', 'shown'],
    ['open', 'open'],
    ['tucked', 'shown'],
  ])('goes back from %s to %s', async (before, after) => {
    const held = await heldFrom(before);

    await held.rerender({ picking: true, place: before });
    await held.rerender({ picking: true, place: 'open' });
    await held.rerender({ picking: false, place: 'open' });

    expect(held.settled.mock.calls).toEqual([['open'], [after]]);
    expect(placeAfterPicking(before)).toBe(after);
  });

  // The card comes back with picking on after the keyboard took it away a while: it opens again.
  it('opens when it comes back with picking already on, and goes back to where it then stood', async () => {
    const settled = jest.fn<void, [GripPlace]>();
    const { rerender } = await renderHook(
      ({ picking, place }: Props) => {
        usePickingPlace(picking, { place, moving: false, settleTo: settled }, false);
      },
      { initialProps: { picking: true, place: 'shown' as GripPlace } },
    );

    await rerender({ picking: false, place: 'open' });

    expect(settled.mock.calls).toEqual([['open'], ['shown']]);
  });

  it('is left alone while nobody picks', async () => {
    const held = await heldFrom('shown');

    await held.rerender({ picking: false, place: 'open' });

    expect(held.settled).not.toHaveBeenCalled();
  });
});

// Partitions: picking with the sheet rising to high and coming back, twice; the same after picking ends.
describe('the picking rows and the answer’s sheet', () => {
  // The user's rule (2026-11-26): a yield is not undone by itself; the grip brings the rows back.
  it('leaves the folded rows folded when the sheet comes back from high, until the grip opens them', async () => {
    const held = await heldFrom('shown');
    await held.rerender({ picking: true, place: 'shown' });
    await held.rerender({ picking: true, place: 'shown', high: true });
    await held.rerender({ picking: true, place: 'shown', high: false });
    await held.rerender({ picking: true, place: 'open', high: false });
    await held.rerender({ picking: false, place: 'open', high: false });

    expect(held.settled.mock.calls).toEqual([['open'], ['shown']]);
  });

  // The user's phone (2026-11-25): raised to high while the rows were still opening, the sheet left them open under it.
  it('folds the rows that finish opening while the sheet stands high, and leaves a moving card to finish', async () => {
    const held = await heldFrom('shown');
    await held.rerender({ picking: true, place: 'shown' });
    await held.rerender({ picking: true, place: 'shown', moving: true, high: true });
    await held.rerender({ picking: true, place: 'open', moving: false, high: true });

    expect(held.settled.mock.calls).toEqual([['open'], ['shown']]);
  });
});
