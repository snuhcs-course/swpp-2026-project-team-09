/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext } from '../feature.js';
import { clockTime, dateInput } from '../free-time/tool-parts.js';
import { checkBooking, type CheckedBooking, clockOfMinutes, minutesOfClock, type Refusal } from './booking-rules.js';
import { type LibrarySpace } from './catalogue.js';
import { bookCard, type LibraryCompanion } from './library-card.js';
import { bookableSpace, dayWords, type LibraryServices, refused, showCard, spaceIdInput } from './library-parts.js';

const words = (max: number): z.ZodString => z.string().trim().min(1).max(max);

const input = z.object({
  spaceId: spaceIdInput,
  date: dateInput,
  start: clockTime.optional().describe('When it starts, as HH:MM. Leave it out when the User gave no time.'),
  minutes: z.int().min(1).max(1440).optional().describe('How long, in minutes: 2시간 is 120.'),
  end: clockTime.optional().describe('When it ends, as HH:MM, for "~까지", instead of minutes.'),
  seat: words(20).optional().describe('A seat or room the User named: 7193, G405, STUDIO A.'),
  equipment: words(40)
    .optional()
    .describe("An equipment group's id from findLibrarySpace, when the User asked for that equipment."),
  useDesc: words(20)
    .optional()
    .describe("The 사용용도, one of the space's useDescOptions, only when the User said the purpose."),
  friendIds: z
    .array(z.uuid())
    .max(20)
    .optional()
    .describe('The companions, by the ids resolveFriend returned in this message.'),
  questId: z.uuid().optional().describe('A 파티 the User holds, whose Holders are the companions.'),
});

interface Party {
  people: number;
  companions: LibraryCompanion[];
  questId: string | null;
}

// The companions of a booking: Friends resolveFriend returned in this message, or the other Holders of a Quest the User
// holds. Each by id and name only.
async function partyOf(
  { friends, quests }: LibraryServices,
  { friendIds = [], questId }: z.output<typeof input>,
  context: ToolContext,
): Promise<Party | { refusal: Refusal }> {
  if (questId !== undefined && friendIds.length > 0) {
    return { refusal: { field: 'questId', reason: '함께할 사람은 친구나 파티 중 하나로 정해 주세요' } };
  }
  if (questId !== undefined) {
    try {
      const quest = await quests.read(context.userId, questId);
      return { people: quest.holders.length, companions: [], questId };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { refusal: { field: 'questId', reason: '내가 참여 중인 파티 중에 그런 파티가 없어요' } };
      }
      throw error;
    }
  }
  const ids = [...new Set(friendIds)];
  context.found.refuseUnfound('friend', ids);
  const names = new Map((await friends.list(context.userId)).map(({ id, name }) => [id, name]));
  const companions = ids.flatMap((id) => {
    const name = names.get(id);
    return name === undefined ? [] : [{ friendId: id, name }];
  });
  return { people: 1 + companions.length, companions, questId: null };
}

// The summary in words, with no live data.
function summaryOf(space: LibrarySpace, booking: CheckedBooking, party: Party, now: Date): string {
  const end = clockOfMinutes(minutesOfClock(booking.start) + booking.minutes);
  const where = `${space.floor}층 ${space.name}${booking.seat === null ? '' : ` ${booking.seat}`}`;
  const who = party.people > 1 ? `, ${party.people}명` : '';
  const asks = space.unit === 'room' && booking.useDesc === null ? ' 사용 용도는 카드에서 골라요.' : '';
  const when = `${dayWords(booking.date, now)} ${booking.start}–${end}`;
  return `${where}, ${when}${who} 예약 카드를 보여 줬어요. 예약하기를 눌러야 예약돼요.${asks}`;
}

// Checks a booking against the catalogue, every refusal at once, and shows a book card when nothing is refused.
export function proposeLibraryBooking(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Checks a 관정도서관 booking and shows a book card, which books nothing until the User presses 예약하기 on it. Give the space's id from findLibrarySpace, the day, start, and minutes or end, as the User said them, and only what they said of the seat, the room's equipment, the 사용용도 and companions. Answers 'shown' with a summary; 'refused' with every refusal at once, each with its reason and bound; or the space's status with its reason.",
    input,
    run: async (asked, context) => {
      const checked = await bookableSpace(services, asked.spaceId, context);
      if ('answer' in checked) {
        return checked.answer;
      }
      const { space } = checked;
      const party = await partyOf(services, asked, context);
      const people = 'refusal' in party ? undefined : party.people;
      const result = checkBooking(services.catalogue, space, { ...asked, people }, context.now);
      if ('refusal' in party || 'refusals' in result) {
        return refused([
          ...('refusal' in party ? [party.refusal] : []),
          ...('refusals' in result ? result.refusals : []),
        ]);
      }
      const { booking } = result;
      showCard(
        context.presented,
        bookCard(space, { ...booking, companions: party.companions, questId: party.questId }),
      );
      return { result: 'shown', summary: summaryOf(space, booking, party, context.now) };
    },
  });
}
