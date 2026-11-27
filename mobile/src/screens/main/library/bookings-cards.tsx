/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import type { LibraryCardData, PlacePoint } from '@/api/assistant-types';
import { placesQuery } from '@/api/queries';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import {
  actingOn,
  bookingDeadline,
  canCancel,
  canReturn,
  cancelPeriod,
  myBookingsPeriod,
  shownBookings,
  ticketOfBooking,
} from '@/library/cards/bookings';
import { confirmWords } from '@/library/cards/done';
import { library } from '@/library/library';
import type { LibraryBooking } from '@/library/replies';
import type { CardOutcome } from '@/features/assistant/use-chat';
import { useRowFourActions } from '../answer/row-four-actions';
import { type ActTold, useTellAct } from './act-stage';
import { BookedTicket, TicketLine, TicketWithLine } from './booked-ticket';
import { CardBox, FailureNote, Said } from './library-parts';
import {
  type Act,
  type Acted,
  ACT_WORDS,
  ENDED_WORDS,
  type Ended,
  NOT_YET_USED,
  NOTHING_HELD,
  useConfirming,
} from './use-confirming';
import { type LibraryCardActions, pendingMark, useLibraryLoad, useLogInReload, type Write } from './use-library-call';

// The cards that act on the User's own bookings (P01 ticket 15), each booking as its ticket, and the main button
// beside the input. A return card finds the seat in use, else a seat booked and not yet confirmed at the 좌석배정기,
// which it offers to cancel instead; a cancel card finds the bookings its target names; 내 예약 lists those booked or
// in use, each with "예약 취소 ›" or "반납 ›" under it, and offers 가는 길. Each sends setCancelBooking only on its
// main button; none has a 그만두기, which the answer's ✕ is.

interface CardProps {
  card: LibraryCardData;
  bubbleId: number;
  actions: LibraryCardActions;
}

// 관정관, the building every 관정도서관 space is in.
const LIBRARY_PLACE = '62-1';

// The main button of an act on one booking, in red for a cancel; disabled until one is chosen.
function actTold(act: Act, write: Write<Acted>, booking: LibraryBooking | undefined): ActTold {
  return {
    words: write.busy ? '처리하는 중' : ACT_WORDS[act].confirm,
    onPress: () => {
      if (booking !== undefined) {
        write.run(booking);
      }
    },
    disabled: booking === undefined || write.busy,
    danger: act === 'cancel',
  };
}

// How a cancel or a return card ended, as the chat keeps it: with the booking's ticket, greyed.
function endOf(act: Act, ended: Ended, booking: LibraryBooking | undefined): CardOutcome {
  if (ended === 'stopped') {
    return { kind: 'stopped', words: '그만뒀어요' };
  }
  const ticket = booking === undefined ? {} : { ticket: ticketOfBooking(booking, now(), ENDED_WORDS[act]) };
  return { kind: act === 'cancel' ? 'cancelled' : 'returned', words: ACT_WORDS[act].done, ...ticket };
}

// The bookings found, as tickets: several are chosen from as radio buttons.
function Found({
  found,
  booking,
  choose,
}: {
  found: readonly LibraryBooking[];
  booking: LibraryBooking | undefined;
  choose: ((bseqno: number) => void) | null;
}): ReactElement {
  const several = found.length > 1;
  return (
    <>
      {found.map((each) => (
        <BookedTicket
          chosen={several && each === booking}
          key={each.BSEQNO}
          onChoose={
            several && choose !== null
              ? (): void => {
                  choose(each.BSEQNO);
                }
              : null
          }
          ticket={ticketOfBooking(each, now())}
        />
      ))}
    </>
  );
}

// A cancel or a return card: the bookings of yesterday to three days on that it acts on.
export function CancelReturnCard({ card, place, bubbleId, actions }: CardProps & { place: string }): ReactElement {
  const { start, end } = cancelPeriod(koreaDateKey(now()));
  const { loaded, reload } = useLibraryLoad(() => library.myBookings(start, end), `${start}-${end}`);
  const acting = loaded.state === 'ready' ? actingOn(loaded.value, card, koreaDateKey(now())) : null;
  const act: Act = acting?.act ?? (card.action === 'return' ? 'return' : 'cancel');
  const found = acting?.found ?? [];
  const [chosen, setChosen] = useState<number | null>(null);
  const booking = found.length === 1 ? found[0] : found.find(({ BSEQNO }) => BSEQNO === chosen);
  const { outcome, write } = useConfirming(act, reload, {
    onEnd: (ended) => {
      actions.finish(place, endOf(act, ended, booking));
    },
    mark: pendingMark(actions, place),
  });
  const logIn = useLogInReload(reload);
  const idle = outcome === 'idle' && !write.busy;
  // A cancel card the main server showed for "반납해줘" on a seat not yet in use (P05 ticket 59) says why, as a return
  // card that turned to a cancel does: the Assistant's words are not shown over it.
  const returnAsked = card.action === 'cancel' && /반납/u.test(actions.askedBefore(bubbleId));
  useTellAct(
    actions.act ?? null,
    bubbleId,
    outcome === 'idle' && found.length > 0 ? actTold(act, write, booking) : null,
  );
  return (
    <CardBox testID={`library-${card.action}-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>예약을 찾고 있어요</Said> : null}
      {acting !== null && found.length === 0 ? <Said>{ACT_WORDS[act].none}</Said> : null}
      {found.length > 0 && (acting?.instead === true || returnAsked) ? <Said>{NOT_YET_USED}</Said> : null}
      <Found booking={booking} choose={idle ? setChosen : null} found={found} />
      <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
    </CardBox>
  );
}

function actOf(booking: LibraryBooking): Act | null {
  if (canCancel(booking)) {
    return 'cancel';
  }
  return canReturn(booking) ? 'return' : null;
}

const LINK_WORDS: Record<Act, string> = { cancel: ACT_WORDS.cancel.confirm, return: '반납' };

// A booking of 내 예약: its ticket, and under it its confirm time and the link to its act, unless it is being acted on.
function MyBooking({
  booking,
  acting,
  walk,
  onAct,
}: {
  booking: LibraryBooking;
  acting: boolean;
  walk: number | null;
  onAct: (act: Act) => void;
}): ReactElement {
  const act = actOf(booking);
  const deadline = bookingDeadline(booking);
  const ended = act === null ? booking.STATUS_NAME : null;
  return (
    <TicketWithLine>
      <BookedTicket ticket={ticketOfBooking(booking, now(), ended)} />
      <TicketLine
        link={
          act === null || acting
            ? null
            : {
                words: LINK_WORDS[act],
                onPress: () => {
                  onAct(act);
                },
              }
        }
        words={deadline === null ? null : confirmWords(deadline, walk, now())}
      />
    </TicketWithLine>
  );
}

// The act on one booking of 내 예약, from its link to its main button; once done, what it did and the ticket greyed.
function MyBookingAct({
  booking,
  act,
  bubbleId,
  actions,
  reload,
}: {
  booking: LibraryBooking;
  act: Act;
  bubbleId: number;
  actions: LibraryCardActions;
  reload: () => void;
}): ReactElement | null {
  const { outcome, write } = useConfirming(act, reload, { reloadAfter: true });
  useTellAct(actions.act ?? null, bubbleId, outcome === 'idle' ? actTold(act, write, booking) : null);
  if (outcome === 'done') {
    return (
      <>
        <Said byButton>{ACT_WORDS[act].done}</Said>
        <BookedTicket ticket={ticketOfBooking(booking, now(), ENDED_WORDS[act])} />
      </>
    );
  }
  return (
    <FailureNote failure={write.failure?.failure ?? null} message={write.failure?.message} onLogIn={write.logIn} />
  );
}

// 가는 길 to 관정관 while a booking is held and the route guidance can start.
function useGuideTold(held: boolean): ActTold | null {
  const { guide, cannotGuide } = useRowFourActions();
  const building = useQuery(placesQuery).data?.find(({ number }) => number === LIBRARY_PLACE);
  if (!held || building === undefined || cannotGuide !== null) {
    return null;
  }
  const to: PlacePoint = {
    placeId: building.id,
    label: building.name,
    latitude: building.latitude,
    longitude: building.longitude,
  };
  const onPress = (): void => {
    guide(to);
  };
  return { words: '가는 길', onPress, disabled: false, danger: false };
}

// 내 예약: the bookings of the card's period booked or in use, soonest first, else one sentence (P01 ticket 15).
export function MyBookingsCard({ card, bubbleId, actions }: CardProps): ReactElement {
  const today = koreaDateKey(now());
  const { start, end } = myBookingsPeriod(today, card);
  const { loaded, reload } = useLibraryLoad(() => library.myBookings(start, end), `${start}-${end}`);
  const logIn = useLogInReload(reload);
  const [acting, setActing] = useState<{ booking: LibraryBooking; act: Act } | null>(null);
  const bookings = loaded.state === 'ready' ? shownBookings(loaded.value, card, today) : [];
  const walk = actions.bookingWalk?.()?.minutes ?? null;
  const guide = useGuideTold(bookings.some((booking) => actOf(booking) !== null));
  useTellAct(actions.act ?? null, bubbleId, acting === null ? guide : null);
  return (
    <CardBox testID={`library-myBookings-${card.key}`}>
      <FailureNote failure={loaded.state === 'failed' ? loaded.failure : null} onLogIn={logIn} />
      {loaded.state === 'loading' ? <Said>예약을 읽고 있어요</Said> : null}
      {loaded.state === 'ready' && bookings.length === 0 && acting === null ? <Said>{NOTHING_HELD}</Said> : null}
      {bookings.map((booking) => (
        <MyBooking
          acting={acting?.booking.BSEQNO === booking.BSEQNO}
          booking={booking}
          key={booking.BSEQNO}
          onAct={(act) => {
            setActing({ booking, act });
          }}
          walk={walk}
        />
      ))}
      {acting === null ? null : (
        <MyBookingAct
          act={acting.act}
          actions={actions}
          booking={acting.booking}
          bubbleId={bubbleId}
          key={acting.booking.BSEQNO}
          reload={reload}
        />
      )}
    </CardBox>
  );
}
