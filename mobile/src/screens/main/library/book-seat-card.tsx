/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import type { CardOutcome } from '@/features/assistant/use-chat';
import type { ConfirmedPress } from '@/library/client';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import { doneOf } from '@/library/cards/done';
import { type Slot, seatBookingOf } from '@/library/cards/payloads';
import { chooseSeat, freeSeats, nextFreeSeat, seatState } from '@/library/cards/seats';
import { kioskDeadline, nextStart, whenWords } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibrarySeat } from '@/library/replies';
import { useAskForPush } from '@/push/push-ask-host';
import { CardBox, FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { seatsBubble } from './own-bubbles';
import { LargeSeatMap } from './seat-map';
import { RoomTop, RoomWords, type SeatRoom, useFullRoomSwap, useSeatRoom } from './seat-room';
import { SlotSteps } from './slot-steps';
import {
  bseqnoOf,
  type CardFailure,
  type LibraryCardActions,
  libraryMessage,
  useLibraryLoad,
  useLogInReload,
  pendingMark,
  useWrite,
  type Write,
} from './use-library-call';
import { seatsFor } from './use-room-counts';

// The book card of a reading room's seat (the MainChatLibReserve frame). It reads the sector's seats for the time,
// offers the named or tapped seat, else the first free one, and books it only on 예약하기; 닫기 beside it ends the card
// unbooked, and the foot under them says until when a seat booked now is confirmed at the seat kiosk. The done message
// is the app's own bubble. A card the Assistant gave for a seat space the room chip knows starts with that chip: it
// lists the rooms by floor and kind and switches the card to another for the same time, and a room full for that time
// is swapped for one with free seats.

export const SEAT_TAKEN = '그 자리는 방금 다른 사람이 예약했어요';
export const NO_FREE_SEAT = '그 시간에 빈 자리가 없어요';
export const NOT_BOOKED = '알겠어요. 예약하지 않았어요.';
export const BOOK_FAILED = '예약하지 못했어요';
export const SEATS_UNREAD = '관정의 자리 정보를 받지 못했어요';
// 대학원 열람실, which the library may refuse to an undergraduate: the card then says only that it failed.
const GRADUATE_ROOM = '8F-grad-reading-room';

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

function slotOf(card: LibraryCardData): Slot {
  return {
    date: card.date ?? koreaDateKey(now()),
    start: card.start ?? nextStart(now()),
    minutes: card.minutes ?? 120,
  };
}

interface Booking {
  card: LibraryCardData;
  space: LibrarySpace;
  slot: Slot;
  actions: LibraryCardActions;
  close: (closed: Closed) => void;
  choose: (label: string) => void;
  reload: () => void;
}

// 예약하기: the booking, then the done message; a seat just taken offers the next free one.
async function sendBooking(booking: Booking, seat: LibrarySeat, press: ConfirmedPress): Promise<CardFailure | null> {
  const { card, space, slot } = booking;
  const result = await library.book(seatBookingOf(space, slot, seat), press);
  const info = result.bookingResultInfo;
  if (info !== undefined) {
    booking.close('booked');
    const made = { slot, label: seat.VNAME, bseqno: bseqnoOf(info), notes: card.notes };
    const done = doneOf(space, made, now());
    booking.actions.addOwn({ text: done.title, done });
    return null;
  }
  const fresh = await seatsFor(space, slot);
  const after = fresh.find(({ SEATNO }) => SEATNO === seat.SEATNO);
  if (after !== undefined && seatState(after) !== 'free') {
    const next = nextFreeSeat(fresh, seat.VNAME);
    if (next !== null) {
      booking.choose(next.VNAME);
    }
    booking.reload();
    return { failure: null, message: SEAT_TAKEN };
  }
  const message = libraryMessage(result);
  return {
    failure: null,
    message: space.id === GRADUATE_ROOM || message === '' ? BOOK_FAILED : `${BOOK_FAILED}: ${message}`,
  };
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
}

function OfferButtons({
  seat,
  write,
  close,
  actions,
  undo,
  onPick,
}: Pick<OfferProps, 'seat' | 'write' | 'close' | 'actions' | 'undo'> & {
  onPick: () => void;
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
      <Pill label="다른 자리 고르기" onPress={onPick} />
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
  const { card, space, adjustable, seat, seats, slot, setSlot, choose, write } = props;
  const [picking, setPicking] = useState(false);
  const open = !write.busy;
  return (
    <>
      <SpaceRow
        meta={whenWords(slot.date, slot.start, slot.minutes, now())}
        title={`${spaceWords(space)} · ${seatWords(seat.VNAME)}`}
      />
      {adjustable && open ? <SlotSteps onChange={setSlot} slot={slot} space={space} /> : null}
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
      {open ? (
        <OfferButtons
          {...props}
          onPick={() => {
            setPicking(true);
          }}
        />
      ) : null}
      {open ? <KioskFoot /> : null}
      {write.busy ? <Said>예약하는 중이에요</Said> : null}
      <Notes notes={card.notes.filter((note) => !note.includes(KIOSK))} />
      <LargeSeatMap
        onClose={() => {
          setPicking(false);
        }}
        onSeat={(chosen) => {
          choose(chosen.VNAME);
          setPicking(false);
        }}
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
  const booking: Booking = { card, space: shown, slot, actions, close, choose: setNamed, reload };
  const write = useWrite<LibrarySeat>(
    (seat, press) => sendBooking(booking, seat, press),
    undefined,
    pendingMark(actions, place),
  );
  const logIn = useLogInReload(reload);
  const seats = loaded.state === 'ready' ? loaded.value : [];
  const seat = chooseSeat(seats, named);
  const searching = useFullRoomSwap(room, props.space, loaded.state === 'ready' && seat === null);
  if (room.listing) {
    return null;
  }
  const offer = { ...props, space: shown, seats, choose: setNamed, write, close, undo: room.undo };
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

export function BookSeatCard(props: BookSeatCardProps): ReactElement {
  const { card } = props;
  const [slot, setSlot] = useState<Slot>(() => slotOf(card));
  const [named, setNamed] = useState<string | null>(card.seat);
  const room = useSeatRoom(props, slot, setNamed);
  return (
    <CardBox testID={`library-book-${card.key}`}>
      <RoomTop room={room} slot={slot} />
      <SeatPart {...props} named={named} room={room} setNamed={setNamed} setSlot={setSlot} slot={slot} />
    </CardBox>
  );
}

const styles = StyleSheet.create({
  foot: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
