/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { bookingTitle } from '@/features/assistant/booking-scene';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { whenWords } from '@/library/cards/times';
import type { LibrarySeat } from '@/library/replies';
import { DECLINE, FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { NOT_BOOKED } from './seat-booking';
import { SeatPicker } from './seat-picker';
import type { LibraryCardActions, Write } from './use-library-call';

// What the seat card offers of the seat it chose (moved out of `book-seat-card.tsx` with P01 ticket 03): the seat
// with its time and the card's buttons, where its ticket does not say them (P01 ticket 09).

// After 예약하기 or 예약 안 함, the card offers nothing more: the chat keeps how it ended
// (`LibraryCardActions.finish`).
export type Closed = 'booked' | 'declined';

const BOOKING = '예약하는 중이에요';

export interface BookSeatCardProps {
  card: LibraryCardData;
  space: LibrarySpace;
  // The card's place in the chat, by which the chat keeps how it ended.
  place: string;
  // A card the app gave for a tapped seat: its time can be changed.
  adjustable: boolean;
  actions: LibraryCardActions;
}

interface OfferProps extends BookSeatCardProps {
  seat: LibrarySeat;
  seats: readonly LibrarySeat[];
  slot: Slot;
  setSlot: (slot: Slot) => void;
  choose: (label: string) => void;
  write: Write<LibrarySeat>;
  close: (closed: Closed) => void;
  // The card's ticket says the room and the seat, and opens the seat picture (P01 ticket 09).
  ticketed: boolean;
  picking: boolean;
  setPicking: (picking: boolean) => void;
  // The map draws its booking: the time bar holds its band, the button beside the input 예약하기, and the flag's card
  // 다른 자리 고르기 (P04 ticket 07).
  onMap: boolean;
  // The booking on the map while the answer's card is lowered: one sentence (P01 ticket 03).
  docked: boolean;
}

function OfferButtons({
  seat,
  write,
  close,
  actions,
  onPick,
}: Pick<OfferProps, 'seat' | 'write' | 'close' | 'actions'> & {
  // 자리 선택하기, which opens the seat picture; null for a space without one, or where the ticket opens it.
  onPick: (() => void) | null;
}): ReactElement {
  return (
    <Pills>
      <Pill
        label="예약하기"
        onPress={() => {
          write.run(seat);
        }}
        primary
      />
      <Pill
        label={DECLINE}
        onPress={() => {
          close('declined');
          actions.addOwn({ text: NOT_BOOKED });
        }}
      />
      {onPick === null ? null : <Pill label="자리 선택하기" onPress={onPick} />}
    </Pills>
  );
}

// The main server's first note when the User asked the Assistant to book (`propose-library-booking.ts`): the one note
// the card keeps, for it answers what the User asked; the site's cautions are said once the seat is booked (P01 ticket 09).
const OWN_PRESS_NOTE = '예약은 직접 눌러 주세요';

// The top of the offer: the room with the seat, and the time; nothing where the ticket says them, or on the map
// lowered, where the study answer's sentence above says it. On the map the room has the one name it has on the map's
// label and the bar's card ("관정 7층 열람실").
function OfferHead({ space, seat, slot, docked, onMap, ticketed }: OfferProps): ReactElement | null {
  if (docked || ticketed) {
    return null;
  }
  return (
    <SpaceRow
      meta={whenWords(slot.date, slot.start, slot.minutes, now())}
      title={`${onMap ? bookingTitle(space) : spaceWords(space)} · ${seatWords(seat.VNAME)}`}
    />
  );
}

// The seat offered, its time and the card's buttons. On the map the card's own 예약하기 is the button beside the input,
// and the seat picture opens from the ticket's seat, or from 다른 자리 고르기 on a card without the ticket. The kiosk's
// time and the site's notes are said once the seat is booked (P01 ticket 09).
export function SeatOffer(props: OfferProps): ReactElement {
  const { card, space, seat, seats, choose, write, picking, setPicking, onMap, docked, ticketed } = props;
  const open = !write.busy;
  const onPick =
    space.mapImage === null || ticketed
      ? null
      : (): void => {
          setPicking(true);
        };
  return (
    <>
      <OfferHead {...props} />
      <FailureNote
        failure={write.failure?.failure ?? null}
        message={write.failure?.message}
        onLogIn={props.actions.bandOnBar?.(props.place) === true ? null : write.logIn}
      />
      {open && onMap && !docked && onPick !== null ? (
        <Pills>
          <Pill label="다른 자리 고르기" onPress={onPick} />
        </Pills>
      ) : null}
      {open && !onMap ? <OfferButtons {...props} onPick={onPick} /> : null}
      {docked || !write.busy ? null : <Said byButton>{BOOKING}</Said>}
      {docked ? null : <Notes notes={card.notes.filter((note) => note === OWN_PRESS_NOTE)} />}
      <SeatPicker
        onClose={() => {
          setPicking(false);
        }}
        onSeat={(chosen) => {
          choose(chosen.VNAME);
          setPicking(false);
        }}
        current={seat.VNAME}
        seats={seats}
        space={space}
        visible={picking}
      />
    </>
  );
}
