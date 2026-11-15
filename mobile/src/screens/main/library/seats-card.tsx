/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font, radius, space as spacing, text } from '@/design-system';
import { koreaDateKey } from '@/korea-time';
import { spaceWords } from '@/library/cards/bookings';
import { tappedSlot } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';
import { freeStretches, roomsOf } from '@/library/cards/rooms';
import { freeSeats } from '@/library/cards/seats';
import { dayWords, minutesOf, siteBookTime, siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibraryRoomTimes, LibrarySeat } from '@/library/replies';
import { roomPhotoUrl } from '@/library/site';
import { CardBox, FailureNote, Notes, Pill, Pills, Said } from './library-parts';
import { seatBookBubble } from './own-bubbles';
import { roomTimesFor } from './room-times';
import { LargeSeatMap, SmallSeatMap } from './seat-map';
import { type LibraryCardActions, useLibraryLoad, useLogInReload } from './use-library-call';

// The seats card (the MainChatLibSeats frame). A reading room's sector draws the site's seat map with the free seats
// lit, small in the chat and large on a tap, and a tapped free seat gives a book card for it. A room sector lists its
// rooms with their free times that day and their photos.

interface SeatsCardProps {
  card: LibraryCardData;
  space: LibrarySpace;
  actions: LibraryCardActions;
}

function seatsOf(space: LibrarySpace, slot: Slot): Promise<LibrarySeat[]> {
  return library.seats({
    roomNo: space.roomNo,
    sectorNo: space.sectorNo,
    useTime: slot.minutes,
    bookDate: siteDate(slot.date),
    bookTime: siteBookTime(slot.start, slot.minutes),
  });
}

interface SeatMapsProps extends SeatsCardProps {
  seats: readonly LibrarySeat[];
  slot: Slot;
}

// The small map at the card's width, its caption, 자리 예약하기, and the large view.
export const BOOKING_CLOSED = '오늘은 예약 시간이 끝났어요';

// Under the caption while seats can be booked: what a tap on a free seat does.
export const SEAT_TAP_HINT = '빈자리를 누르면 그 자리로 예약할 수 있어요';

function BookAnySeat({ card, space, actions, slot }: Omit<SeatMapsProps, 'seats'>): ReactElement {
  return (
    <Pills>
      <Pill
        label="자리 예약하기"
        onPress={() => {
          actions.addOwn(seatBookBubble(space, null, slot, card.notes));
        }}
        primary
      />
    </Pills>
  );
}

function SeatMaps({ card, space, actions, seats, slot }: SeatMapsProps): ReactElement {
  const [width, setWidth] = useState(0);
  const [large, setLarge] = useState(false);
  const when = card.start === null ? '지금 기준' : `${dayWords(slot.date, now())} ${slot.start} 기준`;
  // Past the closing time nothing is booked today: no seat is tapped and no 자리 예약하기 is offered.
  const bookable = minutesOf(slot.start) + space.minMinutes <= minutesOf(space.hours.close);
  const tap = bookable
    ? (seat: LibrarySeat): void => {
        setLarge(false);
        actions.addOwn(seatBookBubble(space, seat.VNAME, slot, card.notes));
      }
    : null;
  const open = (): void => {
    setLarge(true);
  };
  return (
    <>
      <View
        onLayout={({ nativeEvent }) => {
          setWidth(nativeEvent.layout.width);
        }}
        testID="seat-map-room"
      >
        <SmallSeatMap onOpen={open} onSeat={tap} seats={seats} space={space} width={width} />
      </View>
      <Text
        style={styles.caption}
      >{`${spaceWords(space)} · ${when} · 빈 자리 ${String(freeSeats(seats).length)}석`}</Text>
      {bookable ? <Text style={styles.caption}>{SEAT_TAP_HINT}</Text> : null}
      {bookable ? <BookAnySeat {...{ card, space, actions, slot }} /> : <Said>{BOOKING_CLOSED}</Said>}
      <LargeSeatMap
        onClose={() => {
          setLarge(false);
        }}
        onSeat={tap}
        seats={seats}
        space={space}
        visible={large}
      />
    </>
  );
}

function SeatSector(props: SeatsCardProps): ReactElement {
  const { card, space } = props;
  const slot = tappedSlot(space, now(), { start: card.start, minutes: card.minutes });
  const { loaded, reload } = useLibraryLoad(() => seatsOf(space, slot), `${slot.start} ${String(slot.minutes)}`);
  const logIn = useLogInReload(reload);
  return (
    <CardBox testID={`library-seats-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>좌석 현황을 읽고 있어요</Said> : null}
      {loaded.state === 'ready' ? <SeatMaps {...props} seats={loaded.value} slot={slot} /> : null}
    </CardBox>
  );
}

function RoomPhoto({ seatNo }: { seatNo: string }): ReactElement {
  const [kind, setKind] = useState<'png' | 'jpg' | 'none'>('png');
  if (kind === 'none') {
    return <View style={styles.photo} />;
  }
  return (
    <Image
      accessibilityIgnoresInvertColors
      onError={() => {
        setKind(kind === 'png' ? 'jpg' : 'none');
      }}
      source={{ uri: roomPhotoUrl(seatNo, kind) }}
      style={styles.photo}
    />
  );
}

function RoomRow({ room, date }: { room: LibraryRoomTimes; date: string }): ReactElement {
  const stretches = freeStretches(room, date);
  return (
    <View accessibilityLabel={`${room.NAME} ${stretches.join(', ')}`} accessible style={styles.room}>
      <RoomPhoto seatNo={room.SEATNO} />
      <View style={styles.roomWords}>
        <Text style={styles.roomName}>{room.NAME}</Text>
        <Text style={styles.roomTimes}>{stretches.join(', ')}</Text>
      </View>
    </View>
  );
}

function RoomSector({ card, space }: SeatsCardProps): ReactElement {
  const date = card.date ?? koreaDateKey(now());
  const { loaded, reload } = useLibraryLoad(() => roomTimesFor(space, date), date);
  const logIn = useLogInReload(reload);
  const rooms = loaded.state === 'ready' ? roomsOf(loaded.value, space.seatNos) : [];
  const free = rooms.filter((room) => freeStretches(room, date).length > 0);
  return (
    <CardBox testID={`library-seats-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>빈 방을 찾고 있어요</Said> : null}
      {loaded.state === 'ready' ? (
        <>
          <Text style={styles.caption}>{`${spaceWords(space)} · ${dayWords(date, now())} 빈 시간`}</Text>
          {free.length === 0 ? <Said>그날 빈 방이 없어요</Said> : null}
          {free.map((room) => (
            <RoomRow date={date} key={room.SEATNO} room={room} />
          ))}
        </>
      ) : null}
      <Notes notes={card.notes} />
    </CardBox>
  );
}

export function SeatsCard(props: SeatsCardProps): ReactElement {
  return props.space.unit === 'seat' && props.space.mapImage !== null ? (
    <SeatSector {...props} />
  ) : (
    <RoomSector {...props} />
  );
}

const PHOTO = 48;

const styles = StyleSheet.create({
  caption: { ...text.caption, color: color.inkMuted },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  photo: { width: PHOTO, height: PHOTO, borderRadius: 8, backgroundColor: color.surfaceSunken },
  roomWords: { flex: 1, minWidth: 0, gap: spacing[1] / 2 },
  roomName: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  roomTimes: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
