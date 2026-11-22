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

import { type ReactElement, type ReactNode, useEffect } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { bookingTitle } from '@/features/assistant/booking-scene';
import type { CardOutcome } from '@/features/assistant/use-chat';
import type { Slot } from '@/library/cards/payloads';
import { chooseSeat, freeSeats } from '@/library/cards/seats';
import { lengthWords, liveSlot, sameSlot } from '@/library/cards/slot-band';
import type { LibrarySeat } from '@/library/replies';
import { useAskForPush } from '@/push/push-ask-host';
import { CardBox, FailureNote, Pill, Pills, Said } from './library-parts';
import { seatsBubble } from './own-bubbles';
import { type Booking, NO_FREE_SEAT, SEATS_UNREAD, sendBooking } from './seat-booking';
import { type BookSeatCardProps, type Closed, SeatOffer } from './seat-offer';
import { RoomTop, RoomWords, type SeatRoom, useFullRoomSwap, useSeatRoom } from './seat-room';
import { BOOKING_CLOSED } from './seats-card';
import { SlotBand } from './slot-band';
import {
  type LibraryCardActions,
  useLibraryLoad,
  useLogInReload,
  pendingMark,
  type Loaded,
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

export { BOOK_FAILED, NO_FREE_SEAT, NOT_BOOKED, SEAT_TAKEN, SEATS_UNREAD, SLOT_PASSED } from './seat-booking';
export { type Closed, UNDO_ROOM } from './seat-offer';

export const CLOSED: Readonly<Record<Closed, CardOutcome>> = {
  booked: { kind: 'booked', words: '예약했어요' },
  declined: { kind: 'declined', words: '예약하지 않았어요' },
};

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
  docked: boolean;
  // The room chip and its list, which a booking on the map shows under its sentence.
  top: ReactNode;
}

// The study answer's one sentence on the map, lowered and raised (P01 ticket 03): the room, the time, and the free seats,
// or what is being looked for. A failure or a full room says its own line instead.
function StudyLine({
  space,
  slot,
  free,
  busy,
}: {
  space: LibrarySpace;
  slot: Slot;
  free: number | null;
  busy: boolean;
}): ReactElement {
  const when = `${slot.start}부터 ${lengthWords(slot.minutes)}`;
  if (busy) {
    return <Said>예약하는 중이에요</Said>;
  }
  return (
    <Said>
      {free === null
        ? `${bookingTitle(space)}에서 ${when}, 빈 자리를 찾고 있어요.`
        : `${bookingTitle(space)}에 ${when}, 빈 자리 ${String(free)}석이에요.`}
    </Said>
  );
}

// The seats' reading and the booking's write for the room and time on screen.
function useSeatCalls({ card, actions, place, room, slot, setNamed }: SeatPartProps): {
  loaded: Loaded<readonly LibrarySeat[]>;
  reload: () => void;
  write: Write<LibrarySeat>;
  close: (closed: Closed) => void;
  logIn: () => void;
} {
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
  return { loaded, reload, write, close, logIn: useLogInReload(reload) };
}

// The seats of the room on screen and what the card offers of them. It stays mounted while the room list is open, so
// that a booking under way is not lost, and shows only the room chip and its list then. On the map it opens with the
// study answer's sentence.
function SeatPart(props: SeatPartProps): ReactElement | null {
  const { card, actions, place, room, named, setNamed } = props;
  const { shown } = room;
  const { loaded, reload, write, close, logIn } = useSeatCalls(props);
  const seats = loaded.state === 'ready' ? loaded.value : [];
  const seat = chooseSeat(seats, named);
  const searching = useFullRoomSwap(room, props.space, loaded.state === 'ready' && seat === null);
  // While the rooms are listed no seat is offered, so the button beside the input does not book one out of sight.
  const onMap = useSeatOnMap(actions.onMap?.(place) ?? null, {
    place,
    seat: room.listing ? null : seat,
    loaded,
    write,
    logIn,
    shown,
    choosing: room.listing || searching,
  });
  const mapped = actions.bandOnBar?.(place) === true;
  const offer = { ...props, space: shown, seats, choose: setNamed, write, close, undo: room.undo, ...onMap };
  const looking = loaded.state === 'loading' || searching;
  const free = loaded.state === 'ready' && !searching ? freeSeats(seats).length : null;
  const line = looking || (seat !== null && loaded.state === 'ready');
  return (
    <>
      {mapped && line ? <StudyLine busy={write.busy} free={free} slot={props.slot} space={shown} /> : null}
      {props.top}
      {room.listing ? null : (
        <SeatRest {...props} free={free} looking={looking && !mapped}>
          <FailureNote
            failure={loaded.state === 'failed' ? loaded.failure : null}
            onLogIn={mapped ? null : logIn}
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
        </SeatRest>
      )}
    </>
  );
}

// Under the chip: the space filled with its free seats, and "빈 자리를 찾고 있어요" in the chat, then the rest.
function SeatRest(props: SeatPartProps & { free: number | null; looking: boolean; children: ReactNode }): ReactElement {
  const { room, free, looking, docked, children } = props;
  return (
    <>
      {room.chip === null || docked ? null : (
        <RoomWords free={free} full={room.full} rooms={room.counting.rooms} shown={room.shown} />
      )}
      {looking ? <Said>빈 자리를 찾고 있어요</Said> : null}
      {children}
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
  const docked = props.actions.docked?.(props.place) === true;
  const { listing, setListing } = room;
  // Lowered, the card shows no room list: the chip waits for the raised card.
  useEffect(() => {
    if (docked && listing) {
      setListing(false);
    }
  }, [docked, listing, setListing]);
  const top = docked ? null : <RoomTop room={room} slot={live ?? room.slot} />;
  return (
    <CardBox testID={`library-book-${card.key}`}>
      {room.listing || busy || live === null || props.actions.bandOnBar?.(props.place) === true ? null : (
        <SlotBand onChange={room.setSlot} slot={live} space={room.shown} />
      )}
      {live === null ? (
        <>
          {top}
          <Said>{BOOKING_CLOSED}</Said>
        </>
      ) : (
        <SeatPart
          {...props}
          docked={docked}
          named={room.named}
          room={room}
          setNamed={room.setNamed}
          setSlot={room.setSlot}
          slot={live}
          top={top}
        />
      )}
    </CardBox>
  );
}
