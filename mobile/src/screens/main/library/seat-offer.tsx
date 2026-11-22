/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font } from '@/design-system';
import { bookingTitle } from '@/features/assistant/booking-scene';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { kioskDeadline, whenWords } from '@/library/cards/times';
import type { LibrarySeat } from '@/library/replies';
import { FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { NOT_BOOKED } from './seat-booking';
import { SeatPicker } from './seat-picker';
import type { LibraryCardActions, Write } from './use-library-call';

// What the seat card offers of the seat it chose (moved out of `book-seat-card.tsx` with P01 ticket 03): the seat
// with its time, the card's buttons, and the notes; on the map, one sentence while the answer's card is lowered.

// After 예약하기 or 취소 (the seat card's 닫기), the card offers nothing more: the chat keeps how it ended
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
  // The User's words named the room, so its chip is the User's own condition.
  roomNamed?: boolean;
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
  // 처음 열람실로, while the card shows another room than the one it first showed.
  undo: (() => void) | null;
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
  undo,
  onPick,
}: Pick<OfferProps, 'seat' | 'write' | 'close' | 'actions' | 'undo'> & {
  // 자리 선택하기, which opens the seat picture; null for a space without one.
  onPick: (() => void) | null;
}): ReactElement {
  return (
    <Pills>
      {undo === null ? null : <Pill label={UNDO_ROOM} onPress={undo} />}
      <Pill
        label="예약하기"
        onPress={() => {
          write.run(seat);
        }}
        primary
      />
      <Pill
        label="닫기"
        onPress={() => {
          close('declined');
          actions.addOwn({ text: NOT_BOOKED });
        }}
      />
      {onPick === null ? null : <Pill label="자리 선택하기" onPress={onPick} />}
    </Pills>
  );
}

// Back to the room the card first showed.
export const UNDO_ROOM = '처음 열람실로';

// The site's note on the seat kiosk, which the card's foot says with its time instead.
const KIOSK = '좌석배정기';

function KioskFoot(): ReactElement {
  return <Text style={styles.foot}>{`예약하면 ${kioskDeadline(now())}까지 ${KIOSK}에서 확인해야 해요.`}</Text>;
}

// The top of the offer: the room with the seat, and the time; nothing on the map lowered, where the study answer's
// sentence above says it. On the
// map the room has the one name it has on the map's label and the bar's card ("관정 7층 열람실").
function OfferHead({ space, seat, slot, docked, onMap }: OfferProps): ReactElement | null {
  if (docked) {
    return null;
  }
  return (
    <SpaceRow
      meta={whenWords(slot.date, slot.start, slot.minutes, now())}
      title={`${onMap ? bookingTitle(space) : spaceWords(space)} · ${seatWords(seat.VNAME)}`}
    />
  );
}

// The seat offered, its time, the card's buttons and the site's notes. On the map the card's own 예약하기 is the button
// beside the input, and the raised card offers 다른 자리 고르기 and 처음 열람실로; lowered, the card says one sentence and
// keeps only the seat picture, which the flag's card opens.
export function SeatOffer(props: OfferProps): ReactElement {
  const { card, space, seat, seats, choose, write, picking, setPicking, onMap, docked, undo } = props;
  const open = !write.busy;
  const onPick =
    space.mapImage === null
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
      {open && onMap && !docked ? (
        <Pills>
          {onPick === null ? null : <Pill label="다른 자리 고르기" onPress={onPick} />}
          {undo === null ? null : <Pill label={UNDO_ROOM} onPress={undo} />}
        </Pills>
      ) : null}
      {open && !onMap ? <OfferButtons {...props} onPick={onPick} /> : null}
      {docked ? null : <OfferFoot notes={card.notes} busy={write.busy} />}
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

// Under the offer: until when a seat booked now is confirmed, or that it is being booked, and the site's notes.
function OfferFoot({ notes, busy }: { notes: readonly string[]; busy: boolean }): ReactElement {
  return (
    <>
      {busy ? <Said>{BOOKING}</Said> : <KioskFoot />}
      <Notes notes={notes.filter((note) => !note.includes(KIOSK))} />
    </>
  );
}

const styles = StyleSheet.create({
  foot: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
