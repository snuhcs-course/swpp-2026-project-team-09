/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { SlotHeld } from '@/screens/main/answer/sentence-slot';
import { Said } from '@/screens/main/library/library-parts';

// The shared line of every library card under the answer card's one sentence slot (P01 ticket 20): a card kept from an
// earlier turn, whatever its kind (seat, room, waiting room, bookings, done message), draws through `Said`. While the
// slot holds a newer reply or the dots, its own explaining, loading and empty lines give way; a line a button made and
// a failure stay.

async function drawHeld(held: boolean): Promise<void> {
  await render(
    <SlotHeld value={held}>
      <Said>301동에서 걸음 9분이라 17:00부터예요.</Said>
      <Said>빈 방을 찾고 있어요</Said>
      <Said byButton>예약하는 중이에요</Said>
      <Said byButton>예약을 취소했어요</Said>
      <Said tone="danger">예약하지 못했어요</Said>
    </SlotHeld>,
  );
}

describe("a kept card's lines under the sentence slot", () => {
  it('are all said while the slot holds nothing newer', async () => {
    await drawHeld(false);

    expect(screen.getByText('301동에서 걸음 9분이라 17:00부터예요.')).toBeVisible();
    expect(screen.getByText('빈 방을 찾고 있어요')).toBeVisible();
  });

  it('give way, the explaining and loading ones, under a newer reply', async () => {
    await drawHeld(true);

    expect(screen.queryByText('301동에서 걸음 9분이라 17:00부터예요.')).toBeNull();
    expect(screen.queryByText('빈 방을 찾고 있어요')).toBeNull();
  });

  it('stay, those a button made and a failure, under a newer reply', async () => {
    await drawHeld(true);

    expect(screen.getByText('예약하는 중이에요')).toBeVisible();
    expect(screen.getByText('예약을 취소했어요')).toBeVisible();
    expect(screen.getByText('예약하지 못했어요')).toBeVisible();
  });
});
