/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { SeatStay, SeatStayMade } from '@/api/seat-stay-types';
import { answer } from './answer';
import { frameTime, ME } from './data/frame';
import { GROUP_ROOM, READING_ROOM, STUDIO } from './data/library';
import { storedPlace } from './room';

const MINUTE_MS = 60_000;

// A seat's stay without a main server: the Quest the User holds alone at 관정관, with no leave-by, since the mock does
// not plan the User's day.
function stayOf({ spaceId, date, start, minutes }: SeatStay): SeatStayMade {
  const space = [READING_ROOM, GROUP_ROOM, STUDIO].find(({ id }) => id === spaceId);
  const title = space === undefined ? '관정관' : `관정 ${String(space.floor)}층 ${space.name}`;
  const startsAt = new Date(`${date}T${start}:00+09:00`);
  const id = `stay-${spaceId}-${date}-${start}`;
  return {
    quest: {
      id,
      title,
      globalEvent: null,
      leader: ME,
      capacity: 1,
      joinPolicy: 'closed',
      takenAlone: true,
      holders: [ME],
      subQuests: [
        {
          id: `${id}-1`,
          attending: false,
          title,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + minutes * MINUTE_MS).toISOString(),
          place: storedPlace({ label: '관정관 (62-1동)' }),
          completion: 'by_hand',
          cancelled: false,
          done: false,
          ended: false,
        },
      ],
      classQuest: false,
      waitingJoinRequests: 0,
      board: null,
      description: '',
      createdAt: frameTime('13:37'),
    },
    leaveAt: null,
  };
}

export const mockSeatStays: Pick<ApiClient, 'makeSeatStay'> = {
  makeSeatStay: (stay) => answer('makeSeatStay', () => stayOf(stay)),
};
