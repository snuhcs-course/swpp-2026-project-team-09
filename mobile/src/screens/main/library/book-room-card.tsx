/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import type { ConfirmedPress } from '@/library/client';
import { spaceWords } from '@/library/cards/bookings';
import { doneOf } from '@/library/cards/done';
import { roomBookingOf, type Slot } from '@/library/cards/payloads';
import { freeRooms, nearestStarts } from '@/library/cards/rooms';
import { nextStart, whenWords } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibraryRoomTimes } from '@/library/replies';
import { BOOK_FAILED, type Closed, NOT_BOOKED } from './book-seat-card';
import { CardBox, FailureNote, Notes, Pill, Pills, Said, SpaceRow } from './library-parts';
import { Choices, Pledge } from './room-parts';
import { roomTimesFor } from './room-times';
import {
  bseqnoOf,
  type CardFailure,
  type LibraryCardActions,
  libraryMessage,
  useLibraryLoad,
  useLogInReload,
  useWrite,
  type Write,
} from './use-library-call';

// The book card of a room: a group study room or a media room. It reads the sector's rooms that day and offers those
// free for the whole slot, the first chosen, or else the nearest free starts. It asks the 사용 용도 when the card has
// none, and a media room's 서약서 must be agreed to; 예약하기 waits for both. The booking is the applicant's alone:
// companions are ticket 09's room request.

export const NO_FREE_ROOM = '그 시간에 빈 방이 없어요';

interface BookRoomCardProps {
  card: LibraryCardData;
  space: LibrarySpace;
  actions: LibraryCardActions;
}

interface RoomWrite {
  room: LibraryRoomTimes;
  useDesc: string;
}

function slotOf(card: LibraryCardData): Slot {
  return { date: card.date ?? koreaDateKey(now()), start: card.start ?? nextStart(now()), minutes: card.minutes ?? 60 };
}

// 예약하기: the room form's own values (the applicant, and the phone number and email the site prefilled, which stay on
// the phone), then the booking, then the done message.
async function sendBooking(
  { card, space, actions }: BookRoomCardProps,
  slot: Slot,
  { room, useDesc }: RoomWrite,
  press: ConfirmedPress,
): Promise<CardFailure | null> {
  const form = await library.roomForm();
  const result = await library.book(roomBookingOf(space, slot, room, useDesc, form), press);
  const info = result.bookingResultInfo;
  if (info === undefined) {
    const message = libraryMessage(result);
    return { failure: null, message: message === '' ? BOOK_FAILED : `${BOOK_FAILED}: ${message}` };
  }
  const done = doneOf(space, { slot, label: room.NAME, bseqno: bseqnoOf(info), notes: card.notes }, now());
  actions.addOwn({ text: done.title, done });
  return null;
}

interface FormProps extends BookRoomCardProps {
  room: LibraryRoomTimes;
  rooms: readonly LibraryRoomTimes[];
  slot: Slot;
  choose: (seatNo: string) => void;
  write: Write<RoomWrite>;
  closed: Closed;
  close: (closed: Closed) => void;
}

// The room's choices, 예약하기 once both the 사용 용도 and the 서약서 are given, and 취소.
function RoomChoices(props: FormProps): ReactElement {
  const { card, room, rooms, choose, write, close, actions } = props;
  const [useDesc, setUseDesc] = useState<string | null>(card.useDesc);
  const [agreed, setAgreed] = useState(false);
  const ready = useDesc !== null && (card.pledge === null || agreed);
  const nameOf = (seatNo: string): string => rooms.find(({ SEATNO }) => SEATNO === seatNo)?.NAME ?? seatNo;
  return (
    <>
      {rooms.length > 1 ? (
        <Choices
          chosen={room.SEATNO}
          onChoose={choose}
          options={rooms.map(({ SEATNO }) => SEATNO)}
          title="방"
          words={nameOf}
        />
      ) : null}
      {card.useDesc === null ? (
        <Choices chosen={useDesc} onChoose={setUseDesc} options={card.useDescOptions} title="사용 용도" />
      ) : null}
      {card.pledge === null ? null : (
        <Pledge
          agreed={agreed}
          onToggle={() => {
            setAgreed(!agreed);
          }}
          words={card.pledge}
        />
      )}
      <RoomButtons
        onBook={
          ready
            ? () => {
                write.run({ room, useDesc });
              }
            : null
        }
        onDecline={() => {
          close('declined');
          actions.addOwn({ text: NOT_BOOKED });
        }}
      />
    </>
  );
}

// 예약하기, which waits for the 사용 용도 and the 서약서, and 취소.
function RoomButtons({ onBook, onDecline }: { onBook: (() => void) | null; onDecline: () => void }): ReactElement {
  return (
    <Pills>
      <Pill disabled={onBook === null} label="예약하기" onPress={onBook ?? onDecline} primary />
      <Pill label="취소" onPress={onDecline} />
    </Pills>
  );
}

function RoomOffer(props: FormProps): ReactElement {
  const { space, room, slot, write, closed } = props;
  const open = closed === null && !write.busy;
  return (
    <>
      <SpaceRow
        icon="users"
        meta={whenWords(slot.date, slot.start, slot.minutes, now())}
        title={`${spaceWords(space)} · ${room.NAME}`}
      />
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
      {open ? <RoomChoices {...props} /> : null}
      {write.busy ? <Said>예약하는 중이에요</Said> : null}
      {closed === 'booked' ? <Said>예약했어요</Said> : null}
    </>
  );
}

function NoFreeRoom({
  starts,
  onStart,
}: {
  starts: readonly string[];
  onStart: (start: string) => void;
}): ReactElement {
  return (
    <>
      <Said>{NO_FREE_ROOM}</Said>
      {starts.length > 0 ? (
        <Choices
          chosen={null}
          onChoose={onStart}
          options={starts}
          title="가까운 빈 시간"
          words={(start) => `${start}부터`}
        />
      ) : null}
    </>
  );
}

export function BookRoomCard(props: BookRoomCardProps): ReactElement {
  const { card, space } = props;
  const [slot, setSlot] = useState<Slot>(() => slotOf(card));
  const [chosen, setChosen] = useState<string | null>(null);
  const [closed, setClosed] = useState<Closed>(null);
  const { loaded, reload } = useLibraryLoad(() => roomTimesFor(space, slot.date), slot.date);
  const logIn = useLogInReload(reload);
  const write = useWrite<RoomWrite>(async (chosenRoom, press) => {
    const failed = await sendBooking(props, slot, chosenRoom, press);
    setClosed(failed === null ? 'booked' : null);
    return failed;
  });
  const all = loaded.state === 'ready' ? loaded.value : [];
  const rooms = freeRooms(all, space.seatNos, slot);
  const room = rooms.find(({ SEATNO }) => SEATNO === chosen) ?? rooms[0] ?? null;
  const earliest = slot.date === koreaDateKey(now()) ? nextStart(now()) : space.hours.open;
  const form = { ...props, rooms, slot, choose: setChosen, write, closed, close: setClosed };
  return (
    <CardBox testID={`library-book-${card.key}`}>
      {loaded.state === 'loading' ? <Said>빈 방을 찾고 있어요</Said> : null}
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'ready' && room === null ? (
        <NoFreeRoom
          onStart={(start) => {
            setSlot({ ...slot, start });
          }}
          starts={nearestStarts(all, space.seatNos, { ...slot, earliest })}
        />
      ) : null}
      {room === null ? null : <RoomOffer {...form} room={room} />}
      <Notes notes={card.notes} />
    </CardBox>
  );
}
