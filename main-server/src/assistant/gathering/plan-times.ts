/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Plan } from '../dto/answer.dto.js';
import { othersText } from '../others-text.js';

// A meal's or a meet's Plan in the words its tool gives the model.

const clock = (time: string | null): string | null => (time === null ? null : time.slice(11, 16));

const nameOf = ({ me, name }: Plan['parts'][number]): string => (me ? '나' : othersText('friend.name', name));

// When everyone is there and until when, where they meet on the way, and each person's way, in words and minutes.
export function timesAndWays(plan: Plan): object {
  const { startAt, endAt, togetherMinutes, meeting, parts } = plan;
  return {
    start: clock(startAt),
    end: clock(endAt),
    togetherMinutes,
    meeting:
      meeting === null
        ? null
        : {
            at: clock(meeting.at),
            place: meeting.place.label,
            with: parts.filter(({ me, userId }) => !me && meeting.userIds.includes(userId)).map((part) => nameOf(part)),
          },
    people: parts.map((part) => ({
      name: nameOf(part),
      from: part.origin?.place.label ?? null,
      walkMinutes: part.walkMinutes,
      by: part.mode === 'shuttle' ? { shuttle: part.shuttle ?? null } : 'walk',
      leaveAt: clock(part.leaveAt),
      leaveBy: clock(part.leaveBy),
    })),
  };
}
