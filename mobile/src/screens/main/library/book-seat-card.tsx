/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font } from '@/design-system';
import type { CardOutcome } from '@/features/assistant/use-chat';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { chooseSeat, freeSeats } from '@/library/cards/seats';
import { liveSlot, sameSlot } from '@/library/cards/slot-band';
import { kioskDeadline, whenWords } from '@/library/cards/times';
import type { LibrarySeat } from '@/library/replies';
import { useAskForPush } from '@/push/push-ask-host';
import { CardBox, FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { seatsBubble } from './own-bubbles';
import { type Booking, NO_FREE_SEAT, NOT_BOOKED, SEATS_UNREAD, sendBooking, TIME_CHANGED } from './seat-booking';
import { SeatPicker } from './seat-picker';
import { cardSlot, RoomTop, RoomWords, type SeatRoom, useFullRoomSwap, useSeatRoom } from './seat-room';
import { BOOKING_CLOSED } from './seats-card';
import { SlotBand } from './slot-band';
import {
  type LibraryCardActions,
  useLibraryLoad,
  useLogInReload,
  pendingMark,
  useWrite,
  type Write,
} from './use-library-call';
import { seatsFor } from './use-room-counts';
import { useSeatStay } from './use-seat-stay';
import { useSeatOnMap } from './booking-stage';

// The book card of a reading room's seat (the MainChatLibReserve frame). It reads the sector's seats for the time,
// offers the named or tapped seat, else the first free one, and books it only on 예약하기; 닫기 beside it ends the card
// unbooked, and the foot under them says until when a seat booked now is confirmed at the seat kiosk. The done message
// is the app's own bubble. A card the Assistant gave for a seat space the room chip knows starts with that chip: it
// lists the rooms by floor and kind and switches the card to another for the same time, and a room full for that time
// is swapped for one with free seats.

export {
  BOOK_FAILED,
  NO_FREE_SEAT,
  NOT_BOOKED,
  SEAT_TAKEN,
  SEATS_UNREAD,
  SLOT_PASSED,
  TIME_CHANGED,
} from './seat-booking';

// After 예약하기 or 취소 (the seat card's 닫기), the card offers nothing more: the chat keeps how it ended
// (`LibraryCardActions.finish`).
export type Closed = 'booked' | 'declined';

export const CLOSED: Readonly<Record<Closed, CardOutcome>> = {
  booked: { kind: 'booked', words: '예약했어요' },
  declined: { kind: 'declined', words: '예약하지 않았어요' },
};

interface BookSeatCardProps {
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
  // 되돌리기, while the card shows another room than the one it first showed.
  undo: (() => void) | null;
  picking: boolean;
  setPicking: (picking: boolean) => void;
  // The map draws its booking: the time bar holds its band, the button beside the input 예약하기, and the flag's card
  // 다른 자리 고르기 (P04 ticket 07).
  onMap: boolean;
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
      {undo === null ? null : <Pill label="되돌리기" onPress={undo} />}
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

// The site's note on the seat kiosk, which the card's foot says with its time instead.
const KIOSK = '좌석배정기';

function KioskFoot(): ReactElement {
  return <Text style={styles.foot}>{`예약하면 ${kioskDeadline(now())}까지 ${KIOSK}에서 확인해야 해요.`}</Text>;
}

// The seat offered, its time, the card's buttons and the site's notes.
function SeatOffer(props: OfferProps): ReactElement {
  const { card, space, seat, seats, slot, choose, write, picking, setPicking, onMap } = props;
  const open = !write.busy;
  return (
    <>
      <SpaceRow
        meta={whenWords(slot.date, slot.start, slot.minutes, now())}
        title={`${spaceWords(space)} · ${seatWords(seat.VNAME)}`}
      />
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
      {open && onMap && props.undo !== null ? (
        <Pills>
          <Pill label="되돌리기" onPress={props.undo} />
        </Pills>
      ) : null}
      {open && !onMap ? (
        <OfferButtons
          {...props}
          onPick={
            space.mapImage === null
              ? null
              : () => {
                  setPicking(true);
                }
          }
        />
      ) : null}
      {open ? <KioskFoot /> : null}
      {write.busy ? <Said>예약하는 중이에요</Said> : null}
      <Notes notes={card.notes.filter((note) => !note.includes(KIOSK))} />
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

function NoFreeSeat({ space, card, actions }: Pick<BookSeatCardProps, 'space' | 'card' | 'actions'>): ReactElement {
  return (
    <>
      <Said>{NO_FREE_SEAT}</Said>
      <Pills>
        <Pill
          label="좌석 현황 보기"
          onPress={() => {
            actions.addOwn(seatsBubble(space, card.notes));
          }}
        />
      </Pills>
    </>
  );
}

// After 예약하기 or 닫기: the chat keeps how the card ended, and a booking asks for push.
function useClose(actions: LibraryCardActions, place: string): (closed: Closed) => void {
  const askForPush = useAskForPush();
  return (closed) => {
    actions.finish(place, CLOSED[closed]);
    if (closed === 'booked') {
      askForPush();
    }
  };
}

interface SeatPartProps extends BookSeatCardProps {
  room: SeatRoom;
  slot: Slot;
  setSlot: (slot: Slot) => void;
  named: string | null;
  setNamed: (seat: string | null) => void;
}

// The seats of the room on screen and what the card offers of them. It stays mounted while the room list is open, so
// that a booking under way is not lost, and shows nothing then.
function SeatPart(props: SeatPartProps): ReactElement | null {
  const { card, actions, place, room, slot, named, setNamed } = props;
  const { shown } = room;
  const close = useClose(actions, place);
  const { loaded, reload } = useLibraryLoad(
    () => seatsFor(shown, slot),
    `${shown.id} ${slot.start} ${String(slot.minutes)}`,
  );
  const hold = useSeatStay();
  const booking: Booking = { card, space: shown, slot, actions, close, choose: setNamed, reload, hold };
  const write = useWrite<LibrarySeat>(
    (seat, press) => sendBooking(booking, seat, press),
    undefined,
    pendingMark(actions, place),
  );
  const logIn = useLogInReload(reload);
  const seats = loaded.state === 'ready' ? loaded.value : [];
  const seat = chooseSeat(seats, named);
  const searching = useFullRoomSwap(room, props.space, loaded.state === 'ready' && seat === null);
  const onMap = useSeatOnMap(actions.onMap?.(place) ?? null, { place, seat, loaded, write, logIn, shown });
  if (room.listing) {
    return null;
  }
  const offer = { ...props, space: shown, seats, choose: setNamed, write, close, undo: room.undo, ...onMap };
  const free = loaded.state === 'ready' ? freeSeats(seats).length : null;
  return (
    <>
      {room.chip === null ? null : <RoomWords free={free} full={room.full} rooms={room.counting.rooms} shown={shown} />}
      {loaded.state === 'loading' || searching ? <Said>빈 자리를 찾고 있어요</Said> : null}
      <FailureNote
        failure={loaded.state === 'failed' ? loaded.failure : null}
        onLogIn={logIn}
        reading={{
          words: SEATS_UNREAD,
          onRetry: reload,
          onClose: () => {
            close('declined');
          },
        }}
      />
      {loaded.state === 'ready' && seat === null && !searching ? (
        <NoFreeSeat actions={actions} card={card} space={shown} />
      ) : null}
      {seat === null ? null : <SeatOffer {...offer} seat={seat} />}
    </>
  );
}

// The one time the card holds: the kept time as it may be booked now. A start that went by while the card was open
// moves the kept time on (P15 ticket 58), so that what the card shows, the seats it reads, what it books and the done
// message name the same time at every moment; while a booking is on its way the kept time stays as it was booked.
function useOneSlot(room: SeatRoom, busy: boolean): Slot | null {
  const live = busy ? room.slot : liveSlot(room.shown, room.slot, now());
  const moved = live !== null && !sameSlot(live, room.slot);
  useEffect(() => {
    if (moved && live !== null) {
      room.setSlot(live);
    }
  });
  return live;
}

// The card's time as it may be booked now; the card says so when no time is left that day.
export function BookSeatCard(props: BookSeatCardProps): ReactElement {
  const { card } = props;
  const room = useSeatRoom(props);
  // While a booking is on its way its time stays.
  const busy = props.actions.outcomeOf(props.place)?.kind === 'pending';
  const live = useOneSlot(room, busy);
  const changed = card.start !== null && !sameSlot(room.slot, cardSlot(card, now()));
  return (
    <CardBox testID={`library-book-${card.key}`}>
      {room.listing || busy || live === null || props.actions.onMap?.(props.place) ? null : (
        <SlotBand onChange={room.setSlot} slot={live} space={room.shown} />
      )}
      {changed && !room.listing ? <Text style={styles.foot}>{TIME_CHANGED}</Text> : null}
      <RoomTop room={room} slot={live ?? room.slot} />
      {live === null ? (
        <Said>{BOOKING_CLOSED}</Said>
      ) : (
        <SeatPart
          {...props}
          named={room.named}
          room={room}
          setNamed={room.setNamed}
          setSlot={room.setSlot}
          slot={live}
        />
      )}
    </CardBox>
  );
}

const styles = StyleSheet.create({
  foot: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
