/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type RoomRequestState } from '../dto/answer.dto.js';
import { clockOfMinutes, lastBookableDate, minutesOfClock } from '../library/booking-rules.js';
import { pickStudyTime, type StudyBooking, type StudyFacts } from '../library/study-pick.js';
import { groupRooms } from '../library/study-room.js';
import { windowOpening } from '../library/window-opening.js';
import { factsOf, groupKeyOf, type GroupTime, type GroupTimeArgs, noPlanOf } from './study-group.js';

// The study answer of a sent room request (P10 ticket 08): locked at the request's room kind, day, start and length, so
// that no other kind or time is offered, and carrying the request's state.

export interface SentRoom {
  spaceId: string;
  date: string;
  start: string;
  minutes: number;
  // As GET /library/room-requests/:id gives it.
  moreNeeded: number;
}

// Each person for the whole booking, when the pick leaves somebody out of the request's time.
function wholeStays({ people }: StudyFacts, date: string, start: string, end: string, minutes: number): StudyBooking {
  return {
    date,
    start,
    end,
    stays: people.map(({ id }) => ({ personId: id, from: start, until: end, minutes })),
    shortestMinutes: minutes,
    totalMinutes: minutes * people.length,
    threeOrMoreMinutes: people.length >= 3 ? minutes : 0,
  };
}

// The request's room and time with each person's stay in it, whenever it is: a booking past its start stays as it was.
export function lockedGroupTime(args: GroupTimeArgs, sent: SentRoom): GroupTime {
  const room = groupRooms(args.catalogue).find(({ id }) => id === sent.spaceId);
  if (room === undefined) {
    return noPlanOf('no-fit', ['그룹스터디룸을 찾지 못했어요']);
  }
  const { date, start, minutes } = sent;
  const end = clockOfMinutes(minutesOfClock(start) + minutes);
  const facts = { ...factsOf(args, room, { open: start, close: end }, minutes, [date]), earliest: undefined };
  const [picked] = pickStudyTime(facts);
  const booking = picked?.booking ?? wholeStays(facts, date, start, end, minutes);
  const waits = date > lastBookableDate(room, args.now);
  return {
    kind: 'pick',
    pick: {
      room,
      rooms: [room],
      minutes,
      booking,
      facts,
      others: [],
      fewest: room.capacity.min,
      moreNeeded: sent.moreNeeded,
      key: groupKeyOf(room.id, booking, minutes, waits),
      opens: waits ? windowOpening(room, date) : null,
    },
  };
}

// The answer with the request's state on its plan's group.
export function withRequest(answer: AnswerReply, request: RoomRequestState): AnswerReply {
  return {
    ...answer,
    plans: answer.plans.map((plan) => {
      const group = plan.study?.group;
      return plan.study === undefined || group === undefined
        ? plan
        : { ...plan, study: { ...plan.study, group: { ...group, request } } };
    }),
  };
}
