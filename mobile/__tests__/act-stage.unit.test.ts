/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { type ActTold, useActStage } from '@/screens/main/library/act-stage';

// The main button a booking's ticket tells (P01 ticket 15, PR 646's review): of two cards in one reply that both act,
// the first that told keeps it, whichever renders last, until it tells none; then the next one has it.

function told(words: string): ActTold & { onPress: jest.Mock } {
  return { words, onPress: jest.fn(), disabled: false, danger: false };
}

describe("a ticket's main button", () => {
  it('belongs to the first card that told it, and passes to the next once the first tells none', async () => {
    const { result } = await renderHook(() => useActStage());
    const first = told('예약 취소');
    const second = told('반납하기');

    await act(() => {
      result.current.tell('first', 1, first);
      result.current.tell('second', 1, second);
    });
    expect(result.current.seen?.words).toBe('예약 취소');
    result.current.press();
    expect(first.onPress).toHaveBeenCalledTimes(1);
    expect(second.onPress).not.toHaveBeenCalled();

    await act(() => {
      result.current.tell('second', 1, second);
    });
    expect(result.current.seen?.words).toBe('예약 취소');

    await act(() => {
      result.current.tell('first', 1, null);
    });
    expect(result.current.seen?.words).toBe('반납하기');
  });
});
