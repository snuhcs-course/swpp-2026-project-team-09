/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import type { CardOutcome } from '@/features/assistant/use-chat';
import type { ConfirmedPress } from '@/library/client';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import { doneOf } from '@/library/cards/done';
import { type Slot, seatBookingOf } from '@/library/cards/payloads';
import { chooseSeat, nextFreeSeat, seatState } from '@/library/cards/seats';
import { nextStart, siteBookTime, siteDate, whenWords } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibrarySeat } from '@/library/replies';
import { useAskForPush } from '@/push/push-ask-host';
import { CardBox, FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { seatsBubble } from './own-bubbles';
import { LargeSeatMap } from './seat-map';
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

// The book card of a reading room's seat (the MainChatLibReserve frame). It reads the sector's seats for the time,
// offers the named or tapped seat, else the first free one, and books it only on 예약하기. The done message is the
// app's own bubble.

export const SEAT_TAKEN = '그 자리는 방금 다른 사람이 예약했어요';
export const NO_FREE_SEAT = '그 시간에 빈 자리가 없어요';
export const NOT_BOOKED = '알겠어요. 예약하지 않았어요.';
export const BOOK_FAILED = '예약하지 못했어요';
// 대학원 열람실, which the library may refuse to an undergraduate: the card then says only that it failed.
const GRADUATE_ROOM = '8F-grad-reading-room';

// After 예약하기 or 취소, the card offers nothing more: the chat keeps how it ended (`LibraryCardActions.finish`).
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
  actions: LibraryCardActions;
}

function seatsFor(space: LibrarySpace, slot: Slot): Promise<LibrarySeat[]> {
  return library.seats({
    roomNo: space.roomNo,
    sectorNo: space.sectorNo,
    useTime: slot.minutes,
    bookDate: siteDate(slot.date),
    bookTime: siteBookTime(slot.start, slot.minutes),
  });
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
}

function OfferButtons({
  seat,
  write,
  close,
  actions,
  onPick,
}: Pick<OfferProps, 'seat' | 'write' | 'close' | 'actions'> & {
  onPick: () => void;
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
      <Pill label="다른 자리 고르기" onPress={onPick} />
      <Pill
        label="취소"
        onPress={() => {
          close('declined');
          actions.addOwn({ text: NOT_BOOKED });
        }}
      />
    </Pills>
  );
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
      {write.busy ? <Said>예약하는 중이에요</Said> : null}
      <Notes notes={card.notes} />
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

export function BookSeatCard(props: BookSeatCardProps): ReactElement {
  const { card, space, actions, place } = props;
  const [slot, setSlot] = useState<Slot>(() => slotOf(card));
  const [named, setNamed] = useState<string | null>(card.seat);
  const askForPush = useAskForPush();
  const setClosed = (closed: Closed): void => {
    actions.finish(place, CLOSED[closed]);
    if (closed === 'booked') {
      askForPush();
    }
  };
  const { loaded, reload } = useLibraryLoad(() => seatsFor(space, slot), `${slot.start} ${String(slot.minutes)}`);
  const booking: Booking = { card, space, slot, actions, close: setClosed, choose: setNamed, reload };
  const write = useWrite<LibrarySeat>(
    (seat, press) => sendBooking(booking, seat, press),
    undefined,
    pendingMark(actions, place),
  );
  const logIn = useLogInReload(reload);
  const seats = loaded.state === 'ready' ? loaded.value : [];
  const seat = chooseSeat(seats, named);
  const offer = { ...props, seats, slot, setSlot, choose: setNamed, write, close: setClosed };
  return (
    <CardBox testID={`library-book-${card.key}`}>
      {loaded.state === 'loading' ? <Said>빈 자리를 찾고 있어요</Said> : null}
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'ready' && seat === null ? <NoFreeSeat {...props} /> : null}
      {seat === null ? null : <SeatOffer {...offer} seat={seat} />}
    </CardBox>
  );
}
