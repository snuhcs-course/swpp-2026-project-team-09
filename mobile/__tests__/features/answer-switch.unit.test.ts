/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { forgetAnswerSwitch, setAnswerSwitch, useAnswerSwitch } from '@/features/assistant/answer-switch';
import { type Kept, keep, readKept } from '@/storage/kept';

// The switch of the answer on the map (P02 ticket 01, "The switch"), over a stand-in of what the phone keeps.

jest.mock('@/storage/kept', () => ({ readKept: jest.fn(), keep: jest.fn() }));

// What the phone keeps, of which the switch reads one field.
function phoneKeeps(answerOnMap: boolean): void {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the switch reads only this field of what is kept
  jest.mocked(readKept).mockResolvedValue({ answerOnMap } as Kept);
}

beforeEach(() => {
  forgetAnswerSwitch();
  jest.mocked(readKept).mockReset();
  jest.mocked(keep).mockReset();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- what keep gives back is not read
  jest.mocked(keep).mockResolvedValue({} as Kept);
});

// Partitions: before the phone has said, after it said on, after it said off.
describe('the switch of the answer on the map, as the phone kept it', () => {
  it('is off until the phone has said', async () => {
    jest.mocked(readKept).mockReturnValue(
      new Promise(() => {
        // The phone has not said yet.
      }),
    );

    const { result } = await renderHook(() => useAnswerSwitch());

    expect(result.current).toBe(false);
  });

  it('is on once the phone says it kept it on', async () => {
    phoneKeeps(true);

    const { result } = await renderHook(() => useAnswerSwitch());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });

  it('stays off when the phone says it kept it off', async () => {
    phoneKeeps(false);

    const { result } = await renderHook(() => useAnswerSwitch());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(false);
  });
});

// Partitions: a change made by one reader seen by another; a change made before the phone's answer comes; a new start
// of the app after a change.
describe('a change of the switch of the answer on the map', () => {
  it('tells every reader of a change at once, and the phone keeps it', async () => {
    phoneKeeps(false);
    const first = await renderHook(() => useAnswerSwitch());
    const second = await renderHook(() => useAnswerSwitch());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await setAnswerSwitch(true);
    });

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    expect(keep).toHaveBeenCalledWith({ answerOnMap: true });
  });

  it('keeps a change made before the phone has said', async () => {
    phoneKeeps(false);
    const { result } = await renderHook(() => useAnswerSwitch());

    await act(async () => {
      await setAnswerSwitch(true);
    });

    expect(result.current).toBe(true);
  });

  it('reads the phone again after a new start of the app', async () => {
    phoneKeeps(false);
    await setAnswerSwitch(true);

    forgetAnswerSwitch();
    const { result } = await renderHook(() => useAnswerSwitch());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(false);
    expect(readKept).toHaveBeenCalledTimes(1);
  });
});
