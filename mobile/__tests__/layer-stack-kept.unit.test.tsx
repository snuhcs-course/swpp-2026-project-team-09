/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { type Layers, useLayerStack } from '@/screens/main/layers';
import { keepMapLayers, readMapLayers } from '@/storage/map-layers';

// The 편의기능 stack's layers and what the phone keeps of them (P06 ticket 03), with the phone's storage stood in for:
// the start's "off" writes over nothing, and a change made before the read ends wins over what was kept.

jest.mock('@/storage/map-layers', () => ({ readMapLayers: jest.fn(), keepMapLayers: jest.fn() }));
jest.mock('@/hooks/use-back-to-close', () => ({ useBackToClose: jest.fn() }));

const ALL_OFF: Layers = { dining: false, shuttle: false, study: false };
const STUDY_AND_SHUTTLE: Layers = { dining: false, shuttle: true, study: true };

// The read of what was kept, which ends when the test gives it.
function readLater(): (layers: Layers) => Promise<void> {
  const read: { give?: (layers: Layers) => void } = {};
  jest.mocked(readMapLayers).mockReturnValue(
    new Promise((resolve) => {
      read.give = resolve;
    }),
  );
  return async (layers) => {
    await act(async () => {
      read.give?.(layers);
      await Promise.resolve();
    });
  };
}

function kept(): Layers[] {
  return jest.mocked(keepMapLayers).mock.calls.map(([layers]) => layers);
}

beforeEach(() => {
  jest.mocked(keepMapLayers).mockReset().mockResolvedValue();
});

describe('the layers when the main screen starts', () => {
  it('are off and keep nothing until what was kept is read, then come as kept', async () => {
    const read = readLater();
    const { result } = await renderHook(() => useLayerStack(true));
    expect(result.current.layers).toEqual(ALL_OFF);

    await read(STUDY_AND_SHUTTLE);

    expect(result.current.layers).toEqual(STUDY_AND_SHUTTLE);
    expect(kept()).toEqual([]);
  });

  it('keep a change made before the read ends over what was kept, and the rest as kept', async () => {
    const read = readLater();
    const { result } = await renderHook(() => useLayerStack(true));
    await act(() => {
      result.current.turnOn('dining');
    });
    await act(() => {
      result.current.toggleStudy();
    });
    expect(kept()).toEqual([]);

    await read(STUDY_AND_SHUTTLE);

    expect(result.current.layers).toEqual({ dining: true, shuttle: true, study: true });
    expect(kept()).toEqual([{ dining: true, shuttle: true, study: true }]);
  });
});

describe('the layers after the read', () => {
  it("are kept at each change, the chat's included, and not for a layer turned on that is on", async () => {
    const read = readLater();
    const { result } = await renderHook(() => useLayerStack(true));
    await read(ALL_OFF);

    await act(() => {
      result.current.toggleStudy();
    });
    await act(() => {
      result.current.turnOn('shuttle');
    });
    await act(() => {
      result.current.turnOn('shuttle');
    });
    await act(() => {
      result.current.toggleStudy();
    });

    expect(result.current.layers).toEqual({ dining: false, shuttle: true, study: false });
    expect(kept()).toEqual([
      { dining: false, shuttle: false, study: true },
      { dining: false, shuttle: true, study: true },
      { dining: false, shuttle: true, study: false },
    ]);
  });
});
