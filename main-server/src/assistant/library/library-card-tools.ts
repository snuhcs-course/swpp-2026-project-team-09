/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, type Tool } from '../feature.js';
import { clockOf } from '../free-time/free-time.js';
import { clockTime, dateInput } from '../free-time/tool-parts.js';
import { koreaDate } from '../korea-time.js';
import { addDays, windowRefusal } from './booking-rules.js';
import { type LibraryTarget, myBookingsCard, seatsCard, targetCard } from './library-card.js';
import {
  bookableSpace,
  dayWords,
  gated,
  type LibraryServices,
  refused,
  showCard,
  spaceIdInput,
  targetSpace,
} from './library-parts.js';
import { closedToday } from './closed-today.js';

// The library cards other than book: cancel, return, seats and myBookings. Each shows what the phone fills from the
// library, and none of them sees it. No summary names a card, so that no reply says a card was shown (P05 ticket 59).

// A seat tapped on the map, or seats asked for at a time, last 2 hours unless the User said.
const DEFAULT_SEAT_MINUTES = 120;
const MY_BOOKINGS_BEFORE_DAYS = 7;
const MY_BOOKINGS_AFTER_DAYS = 3;

const CANCEL_PRESS = '예약 취소를 눌러야 취소돼요.';

export function proposeLibraryCancel(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Shows a cancel card for the User's 관정도서관 bookings not yet in use that match what the User said (the day, the space, the start). The card finds them on the phone and cancels nothing until the User presses 예약 취소. Answers 'shown' with a summary.",
    input: z.object({
      date: dateInput.optional(),
      spaceId: spaceIdInput.optional(),
      start: clockTime.optional().describe("The booking's start, as HH:MM, when the User named it."),
    }),
    run: ({ date, spaceId, start }, context) => {
      const blocked = gated(services, context);
      if (blocked !== null) {
        return Promise.resolve(blocked);
      }
      const space = targetSpace(services, spaceId, context);
      const target: LibraryTarget = {
        ...(date === undefined ? {} : { date }),
        ...(spaceId === undefined ? {} : { spaceId }),
        ...(start === undefined ? {} : { start }),
      };
      showCard(context.presented, targetCard('cancel', space, target));
      return Promise.resolve({ result: 'shown', summary: CANCEL_PRESS });
    },
  });
}

// 반납 is only for a seat confirmed at the 좌석배정기. A seat booked through the app whose time has not started is not in
// use, so its booking is cancelled instead, by the cancel card for its day and start. From the start on, the server
// cannot tell whether the seat was confirmed, and the return card is shown. A room named is never a seat's stay.
export function proposeLibraryReturn(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Shows a return card for the 관정도서관 seat or room the User is using now. The card finds it on the phone and returns nothing until the User presses 반납하기. When the User's seat booked through the app has not started yet, it is not in use: the cancel card for that booking is shown instead, and the answer says notInUse. Answers 'shown' with a summary.",
    input: z.object({ spaceId: spaceIdInput.optional() }),
    run: async ({ spaceId }, context) => {
      const blocked = gated(services, context);
      if (blocked !== null) {
        return blocked;
      }
      const space = targetSpace(services, spaceId, context);
      const stay = space?.unit === 'room' ? null : await services.seatStay(context.userId, context.now);
      if (stay !== null && stay.start > context.now) {
        const start = clockOf(stay.start);
        showCard(context.presented, targetCard('cancel', null, { date: koreaDate(stay.start), start }));
        const summary = `${start}부터 예약한 자리는 아직 사용 전이라 반납이 아니라 취소해요. ${CANCEL_PRESS}`;
        return { result: 'shown', notInUse: true, summary };
      }
      showCard(context.presented, targetCard('return', space, spaceId === undefined ? {} : { spaceId }));
      return { result: 'shown', summary: '반납하기를 눌러야 반납돼요.' };
    },
  });
}

export function showLibrarySeats(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Shows a seats card for a 관정도서관 space: a reading room's seat map with its free seats, or a room sector's free rooms and slots, which the phone loads. You never see them. Answers 'shown', 'refused' with the reason, or the space's status.",
    input: z.object({
      spaceId: spaceIdInput,
      date: dateInput.optional().describe('The day, today when not given.'),
      start: clockTime.optional(),
      minutes: z.int().min(1).max(1440).optional(),
    }),
    run: async ({ spaceId, date, start, minutes }, context) => {
      const checked = await bookableSpace(services, spaceId, context);
      if ('answer' in checked) {
        return checked.answer;
      }
      const { space } = checked;
      const day = date ?? koreaDate(context.now);
      const window = windowRefusal(space, day, context.now);
      if (window !== null) {
        return refused([window]);
      }
      const closed = closedToday(space, day, context, services.arrival.places);
      if (closed !== null) {
        return closed;
      }
      const length = start === undefined ? null : (minutes ?? DEFAULT_SEAT_MINUTES);
      showCard(context.presented, seatsCard(space, { date: day, start: start ?? null, minutes: length }));
      const when = dayWords(day, context.now);
      return { result: 'shown', summary: `${space.floor}층 ${space.name}의 ${when} 좌석 현황이 아래에 나와요.` };
    },
  });
}

export function showMyLibraryBookings(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Shows a card that lists the User's 관정도서관 bookings for a period, each with its state, such as 사용 중, 취소 or 반납, which the phone loads. You never see them. From a week ago to 3 days ahead when not given. Answers 'shown' or 'refused'.",
    input: z.object({ from: dateInput.optional(), to: dateInput.optional() }),
    run: ({ from, to }, context) => {
      const blocked = gated(services, context);
      if (blocked !== null) {
        return Promise.resolve(blocked);
      }
      const today = koreaDate(context.now);
      const start = from ?? addDays(today, -MY_BOOKINGS_BEFORE_DAYS);
      const end = to ?? addDays(today, MY_BOOKINGS_AFTER_DAYS);
      if (end < start) {
        return Promise.resolve(refused([{ field: 'to', reason: '끝 날짜가 시작 날짜보다 앞이에요' }]));
      }
      showCard(context.presented, myBookingsCard(start, end));
      return Promise.resolve({ result: 'shown', summary: '관정도서관 예약마다 지금 상태가 아래에 나와요.' });
    },
  });
}
