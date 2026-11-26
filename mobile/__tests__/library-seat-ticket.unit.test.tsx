/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, within } from '@testing-library/react-native';
import { text } from '@/design-system';
import { LOW_LINES } from '@/screens/main/answer/card-caps';
import { SeatTicket, ticketHeightAt } from '@/screens/main/library/seat-ticket';

// The seat card's ticket (P01 ticket 09), from the user's phone: whole at the card's low step, and in its final place
// and size from the first frame, its values filling in where they stand.
// Partitions: font scale 1 and 1.3; the seat and the count known, and not yet. Expected values: the low step's two
// lines of an answer's words (`card-caps.ts`).

const ROOM = { room: '7층 열람실', open: false, onRoom: (): void => undefined };

describe("the ticket's height", () => {
  it.each([1, 1.3])('fits the two lines the card shows at its low step, at font scale %s', (fontScale) => {
    expect(ticketHeightAt(fontScale)).toBeLessThanOrEqual(LOW_LINES * text.bodyLg.lineHeight * fontScale);
  });
});

describe('the ticket while its values are read', () => {
  it('stands whole with the room and "좌석", the seat cell waiting for its value, and nothing to press there', async () => {
    await render(<SeatTicket {...ROOM} free={null} onSeat={null} seat={null} />);

    const seat = within(screen.getByTestId('seat-ticket-seat'));
    expect(screen.getByText('7층 열람실')).toBeOnTheScreen();
    expect(seat.getByText('좌석')).toBeOnTheScreen();
    expect(seat.queryByText(/\d+번/u)).toBeNull();
    expect(screen.getByTestId('seat-ticket-seat')).toBeDisabled();
    // Nothing to press there yet, so no chevron says there is.
    expect(seat.queryByTestId('seat-ticket-seat-chevron')).toBeNull();
  });

  it('fills in the seat where it stands once it is read', async () => {
    await render(<SeatTicket {...ROOM} free={42} onSeat={(): void => undefined} seat="7193번" />);

    expect(within(screen.getByTestId('seat-ticket-seat')).getByText('7193번')).toBeOnTheScreen();
    expect(screen.getByTestId('seat-ticket-seat-chevron')).toBeOnTheScreen();
    expect(screen.getByText('빈 자리 42석')).toBeOnTheScreen();
  });
});
